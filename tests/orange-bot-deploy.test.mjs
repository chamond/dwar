import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const localScript = join(repo, 'scripts/deploy-orange-bot.sh');
const remoteScript = join(repo, 'scripts/run-orange-bot-release.sh');
const oldImage = 'orange-telegram-bot:old';
const nextImage = 'orange-telegram-bot:new';

// Simulate the Docker CLI, retaining a container's image and recording mutations.
const dockerMock = `#!${process.execPath}
const fs = require('node:fs');
const args = process.argv.slice(2);
const state = JSON.parse(fs.readFileSync(process.env.MOCK_STATE, 'utf8'));
fs.appendFileSync(process.env.MOCK_CALLS, JSON.stringify({tool:'docker',args,image:process.env.ORANGE_BOT_IMAGE,buildkit:process.env.DOCKER_BUILDKIT})+'\\n');
const save = () => fs.writeFileSync(process.env.MOCK_STATE, JSON.stringify(state));
if (args[0] === 'info' || args.join(' ') === 'compose version') process.exit(0);
if (args.join(' ') === 'buildx version') process.exit(state.noBuildx ? 1 : 0);
if (args[0] === 'version') { console.log(state.localPlatform ?? 'linux/arm64'); process.exit(0); }
if (args[0] === 'buildx' || args[0] === 'build') process.exit(state.failBuild ? 1 : 0);
if (args[0] === 'image') {
  if (args[1] === 'save') process.stdout.write('mock image archive');
  process.exit((args[1] === 'load' && state.failLoad) || (args[1] === 'save' && state.failSave) ? 1 : 0);
}
if (args[0] === 'ps') {
  if (state.hasContainer) console.log('container-id');
  process.exit(0);
}
if (args[0] === 'inspect') {
  if (args[2].includes('Config.Image')) console.log(state.image);
  else console.log(state.image === '${nextImage}' && state.crash ? 'false 1' : 'true 0');
  process.exit(0);
}
if (args[0] === 'compose') {
  const action = args[args.indexOf('--file')+2];
  if (action === 'config') process.exit(state.failConfig && process.env.ORANGE_BOT_IMAGE === '${nextImage}' ? 1 : 0);
  if (action === 'up') {
    state.hasContainer = true;
    state.image = process.env.ORANGE_BOT_IMAGE;
    save();
    if (state.interruptUp && state.image === '${nextImage}') process.kill(process.ppid, 'SIGHUP');
    process.exit(state.failUp && state.image === '${nextImage}' ? 1 : 0);
  }
  if (action === 'ps' && state.hasContainer) console.log('container-id');
  if (action === 'stop') { state.hasContainer = false; save(); }
  process.exit(0);
}
console.error('Unhandled mock command', args);
process.exit(1);
`;

const sshMock = `#!${process.execPath}
const fs = require('node:fs');
const args = process.argv.slice(2);
const state = JSON.parse(fs.readFileSync(process.env.MOCK_STATE, 'utf8'));
const command = args.at(-1);
const input = fs.readFileSync(0, 'utf8');
fs.appendFileSync(process.env.MOCK_CALLS, JSON.stringify({tool:'ssh',args,input})+'\\n');
if (input.includes('uname -m')) {
  if (state.failPreflight) process.exit(1);
  console.log('linux/arm64');
}
if (command.startsWith('mktemp')) console.log(process.env.ORANGE_DEPLOY_DIR+'/.incoming.abcdef');
`;

function fixture(t, overrides = {}) {
  const directory = mkdtempSync(join(tmpdir(), 'orange-deploy-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const bin = join(directory, 'bin');
  const server = join(directory, 'server');
  mkdirSync(bin);
  mkdirSync(server);
  const state = join(directory, 'state.json');
  const calls = join(directory, 'calls.jsonl');
  writeFileSync(state, JSON.stringify({ hasContainer: true, image: oldImage, ...overrides }));
  writeFileSync(calls, '');
  for (const [name, contents] of Object.entries({
    docker: dockerMock,
    ssh: sshMock,
    sleep: '#!/bin/sh\nexit 0\n',
    scp: `#!${process.execPath}
const fs = require('node:fs');
fs.appendFileSync(process.env.MOCK_CALLS, JSON.stringify({tool:'scp',args:process.argv.slice(2)})+'\\n');
process.exit(JSON.parse(fs.readFileSync(process.env.MOCK_STATE)).failTransfer ? 1 : 0);
`,
  })) {
    writeFileSync(join(bin, name), contents);
    chmodSync(join(bin, name), 0o755);
  }
  writeFileSync(join(server, '.env'), 'BOT_TOKEN=secret-stays-on-server\n');
  writeFileSync(join(server, 'database-marker'), 'persistent SQLite data');
  writeFileSync(join(server, 'docker-compose.yml'), 'old compose');
  writeFileSync(join(server, '.release.env'), `ORANGE_BOT_IMAGE=${oldImage}\n`);
  const env = {
    ...process.env,
    PATH: `${bin}:${process.env.PATH}`,
    MOCK_STATE: state,
    MOCK_CALLS: calls,
    ORANGE_DEPLOY_SSH: 'root@mock-server',
    ORANGE_DEPLOY_DIR: server,
  };
  const staged = join(server, '.incoming.abcdef');
  mkdirSync(staged);
  writeFileSync(join(staged, 'docker-compose.yml'), 'new compose');
  writeFileSync(join(staged, 'image.tar.gz'), 'image archive');
  return {
    server,
    env,
    staged,
    state: () => JSON.parse(readFileSync(state, 'utf8')),
    calls: () => readFileSync(calls, 'utf8').trim().split('\n').filter(Boolean).map((line) => JSON.parse(line)),
    run: (mode = 'deploy') => spawnSync('bash', [remoteScript, server, mode, nextImage, staged], { env, encoding: 'utf8' }),
    local: (...args) => spawnSync('bash', [localScript, ...args], { env, encoding: 'utf8' }),
  };
}

function assertDataPreserved(f) {
  assert.equal(readFileSync(join(f.server, '.env'), 'utf8'), 'BOT_TOKEN=secret-stays-on-server\n');
  assert.equal(readFileSync(join(f.server, 'database-marker'), 'utf8'), 'persistent SQLite data');
  assert(!f.calls().some(({ args }) => args.includes('down') || args.includes('--volumes')));
}

test('successful activation preserves secrets/data and records previous image and Compose', (t) => {
  const f = fixture(t);
  const result = f.run();
  assert.equal(result.status, 0, result.stderr);
  assert.equal(f.state().image, nextImage);
  assert.equal(readFileSync(join(f.server, '.previous-image'), 'utf8').trim(), oldImage);
  assert.equal(readFileSync(join(f.server, '.previous-compose.yml'), 'utf8'), 'old compose');
  assert.equal(readFileSync(join(f.server, '.release.env'), 'utf8'), `ORANGE_BOT_IMAGE=${nextImage}\n`);
  assert.equal(readFileSync(join(f.server, 'docker-compose.yml'), 'utf8'), 'new compose');
  assert(!existsSync(f.staged));
  assertDataPreserved(f);
});

for (const failure of ['failUp', 'crash']) {
  test(`${failure}: failed activation automatically restores the previous release`, (t) => {
    const f = fixture(t, { [failure]: true });
    const result = f.run();
    assert.equal(result.status, 1);
    assert.equal(f.state().image, oldImage);
    assert.equal(readFileSync(join(f.server, 'docker-compose.yml'), 'utf8'), 'old compose');
    assert.equal(readFileSync(join(f.server, '.release.env'), 'utf8'), `ORANGE_BOT_IMAGE=${oldImage}\n`);
    assert.match(result.stderr, /Восстановлен предыдущий образ/);
    assertDataPreserved(f);
  });
}

for (const failure of ['failLoad', 'failConfig']) {
  test(`${failure}: pre-activation failure leaves the running container alone`, (t) => {
    const f = fixture(t, { [failure]: true });
    assert.equal(f.run().status, 1);
    assert.equal(f.state().image, oldImage);
    assert.equal(readFileSync(join(f.server, 'docker-compose.yml'), 'utf8'), 'old compose');
    assert(!f.calls().some(({ args }) => args.includes('up') || args.includes('stop')));
    assertDataPreserved(f);
  });
}

test('failed first deployment stops the candidate without deleting data', (t) => {
  const f = fixture(t, { hasContainer: false, crash: true });
  rmSync(join(f.server, '.release.env'));
  const result = f.run();
  assert.equal(result.status, 1);
  assert.equal(f.state().hasContainer, false);
  assert.match(result.stderr, /Первый запуск не удался/);
  assert(!existsSync(join(f.server, '.release.env')));
  assertDataPreserved(f);
});

test('interrupted activation restores the old release before removing rollback files', (t) => {
  const f = fixture(t, { interruptUp: true });
  const result = f.run();
  assert.equal(result.status, 129, result.stderr);
  assert.equal(f.state().image, oldImage);
  assert.equal(readFileSync(join(f.server, 'docker-compose.yml'), 'utf8'), 'old compose');
  assert.equal(readFileSync(join(f.server, '.release.env'), 'utf8'), `ORANGE_BOT_IMAGE=${oldImage}\n`);
  assert(!existsSync(f.staged));
  assertDataPreserved(f);
});

test('manual rollback restores the saved Compose and can be reversed', (t) => {
  const f = fixture(t);
  assert.equal(f.run().status, 0);
  const result = f.run('rollback');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(f.state().image, oldImage);
  assert.equal(readFileSync(join(f.server, 'docker-compose.yml'), 'utf8'), 'old compose');
  assert.equal(readFileSync(join(f.server, '.previous-image'), 'utf8').trim(), nextImage);
  assertDataPreserved(f);
});

test('rollback without history fails without changing the container', (t) => {
  const f = fixture(t);
  assert.equal(f.run('rollback').status, 1);
  assert.equal(f.calls().length, 2); // Only Docker/Compose availability checks.
  assertDataPreserved(f);
});

test('server activation lock prevents a concurrent release', (t) => {
  const f = fixture(t);
  writeFileSync(join(f.env.PATH.split(':')[0], 'flock'), '#!/bin/sh\nexit 1\n');
  chmodSync(join(f.env.PATH.split(':')[0], 'flock'), 0o755);
  const result = f.run();
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Другой деплой уже выполняется/);
  assert.equal(f.calls().length, 0);
});

test('local delivery builds for the server architecture and transfers only image/Compose', (t) => {
  const f = fixture(t);
  const result = f.local();
  assert.equal(result.status, 0, result.stderr);
  const calls = f.calls();
  const build = calls.find(({ args }) => args[0] === 'buildx' && args[1] === 'build');
  assert.equal(build.args[build.args.indexOf('--platform') + 1], 'linux/arm64');
  const transfer = calls.find(({ tool }) => tool === 'scp');
  const files = transfer.args.slice(-3);
  assert(files[0].endsWith('/image.tar.gz'));
  assert(files[1].endsWith('/docker-compose.yml'));
  assert(!JSON.stringify(calls).includes('secret-stays-on-server'));
  assert(calls.some(({ tool, args }) => tool === 'ssh' && args.at(-1).includes("' deploy '")));
});

test('missing Buildx uses the native builder when Docker and the server have the same platform', (t) => {
  const f = fixture(t, { noBuildx: true });
  f.env.DOCKER_BUILDKIT = '1';
  const result = f.local();
  assert.equal(result.status, 0, result.stderr);
  const build = f.calls().find(({ tool, args }) => tool === 'docker' && args[0] === 'build');
  assert.equal(build.buildkit, '0');
  assert.equal(build.args[build.args.indexOf('--platform') + 1], 'linux/arm64');
  assert(f.calls().some(({ tool }) => tool === 'scp'));
});

test('missing Buildx with a different platform stops before building or transferring an image', (t) => {
  const f = fixture(t, { noBuildx: true, localPlatform: 'linux/amd64' });
  const result = f.local();
  assert.equal(result.status, 1);
  assert.match(result.stderr, /установите Buildx/);
  assert(!f.calls().some(({ tool, args }) => tool === 'scp' || args[0] === 'build'));
});

test('native build failure never transfers or activates the release', (t) => {
  const f = fixture(t, { noBuildx: true, failBuild: true });
  assert.equal(f.local().status, 1);
  assert(!f.calls().some(({ tool }) => tool === 'scp'));
});

for (const failure of ['failPreflight', 'failBuild', 'failSave', 'failTransfer']) {
  test(`${failure}: local failure never activates the server release`, (t) => {
    const f = fixture(t, { [failure]: true });
    assert.equal(f.local().status, 1);
    assert(!f.calls().some(({ tool, args }) => tool === 'ssh' && args.at(-1).includes("' deploy '")));
  });
}

test('local rollback does not build or transfer an image', (t) => {
  const f = fixture(t);
  assert.equal(f.local('--rollback').status, 0);
  assert.equal(f.calls().length, 1);
  assert.equal(f.calls()[0].tool, 'ssh');
  assert(f.calls()[0].args.at(-1).endsWith(' rollback'));
});

test('unsafe SSH target, directory and staging path are rejected before activation', (t) => {
  const f = fixture(t);
  f.env.ORANGE_DEPLOY_SSH = 'root@host; echo unsafe';
  assert.equal(f.local().status, 1);
  f.env.ORANGE_DEPLOY_SSH = 'root@mock-server';
  f.env.ORANGE_DEPLOY_DIR = '/var/www/../other';
  assert.equal(f.local().status, 1);
  assert.equal(f.calls().length, 0);
  const result = spawnSync('bash', [remoteScript, f.server, 'deploy', nextImage, `${f.staged}/../..`], { env: f.env, encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert(existsSync(f.server));
  assert(!f.calls().some(({ args }) => args.includes('load') || args.includes('up')));
});
