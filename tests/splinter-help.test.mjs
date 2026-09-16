import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import test from 'node:test';
import { transformSync } from '@swc/core';
import { Observable, Subject, of } from 'rxjs';

const runtimeRequire = createRequire(import.meta.url);

function loadTypeScriptModule(relativePath, overrides = {}) {
  const absolutePath = path.resolve(relativePath);
  const { code } = transformSync(readFileSync(absolutePath, 'utf8'), {
    jsc: { parser: { syntax: 'typescript' }, target: 'es2022' },
    module: { type: 'commonjs' }
  });
  const loadedModule = { exports: {} };
  const localRequire = (specifier) => overrides[specifier] ?? (specifier.startsWith('.')
    ? loadTypeScriptModule(path.resolve(path.dirname(absolutePath), `${specifier}.ts`), overrides)
    : runtimeRequire(specifier));

  Function('require', 'module', 'exports', code)(
    localRequire, loadedModule, loadedModule.exports
  );
  return loadedModule.exports;
}

const { RequestSplinterHelpUseCase } = loadTypeScriptModule(
  'src/application/use-cases/request-splinter-help.ts'
);

function readLifeStatus(responseText) {
  const { detectCurrentPlayerAlive } = loadTypeScriptModule(
    'src/infrastructure/browser/detect-current-player-alive.ts',
    { 'rxjs/fetch': { fromFetch: () => of({ ok: true, text: () => of(responseText) }) } }
  );
  let result;
  let error;
  detectCurrentPlayerAlive().subscribe({
    next: (value) => { result = value; },
    error: (value) => { error = value; }
  });
  if (error) throw error;
  return result;
}

test('читает жизнь из фактического state common/dummy без выдуманных полей hp и alive', () => {
  const state = {
    server_time: 1789545674,
    area_id: '6',
    level: '3',
    kind: '1',
    money: '46630.22',
    money_gold: '0.20',
    money_silver: '245.00',
    party: 0,
    clan: 0,
    instance: 0,
    flags: 1,
    flags2: 0,
    flags3: 0
  };

  assert.equal(readLifeStatus(JSON.stringify({ state })), true);
});

function createHelpScenario(aliveResults) {
  const calls = [];
  const waiting = new Subject();
  const useCase = new RequestSplinterHelpUseCase(
    { execute: () => {
      calls.push('players');
      return of([{ nick: 'Лекарь', level: 3, clanId: 0 }]);
    } },
    { send: () => {
      calls.push('send');
      return of(undefined);
    } },
    () => of(true),
    () => {
      calls.push('alive');
      assert.notEqual(aliveResults.length, 0, 'Unexpected extra life check');
      return of(aliveResults.shift());
    },
    () => {
      calls.push('area');
      return of(1);
    },
    { wait: () => waiting },
    { execute: () => {
      assert.fail('Must not equip the pickaxe while the splinter is present');
    } }
  );
  useCase.confirmSplinter();
  return { useCase, calls, waiting };
}

test('живой персонаж проходит обе проверки и отправляет просьбу', () => {
  const { useCase, calls, waiting } = createHelpScenario([true, true]);
  const events = [];
  const subscription = useCase.execute().subscribe((event) => events.push(event.type));

  assert.deepEqual(calls, ['alive', 'players', 'alive', 'area', 'send']);
  assert.deepEqual(events, ['recipients-selected', 'message-sent', 'waiting-for-help']);
  assert.equal(waiting.observed, true);
  subscription.unsubscribe();
  assert.equal(waiting.observed, false);
});

test('смерть перед раундом завершает помощь без поиска игроков и отправки', () => {
  const { useCase, calls } = createHelpScenario([false]);
  const events = [];
  const subscription = useCase.execute().subscribe((event) => events.push(event.type));

  assert.deepEqual(calls, ['alive']);
  assert.deepEqual(events, ['player-dead']);
  assert.equal(subscription.closed, true);
});

test('смерть после поиска игроков блокирует отправку просьбы', () => {
  const { useCase, calls } = createHelpScenario([true, false]);
  const events = [];
  const subscription = useCase.execute().subscribe((event) => events.push(event.type));

  assert.deepEqual(calls, ['alive', 'players', 'alive']);
  assert.deepEqual(events, ['player-dead']);
  assert.equal(subscription.closed, true);
});

test('отмена помощи отменяет незавершённую проверку жизни', () => {
  let cancelled = false;
  const useCase = new RequestSplinterHelpUseCase(
    { execute: () => assert.fail('Must not list players before the life check') },
    { send: () => assert.fail('Must not send before the life check') },
    () => of(true),
    () => new Observable(() => () => { cancelled = true; }),
    () => of(1),
    { wait: () => assert.fail('Must not wait before the life check') },
    { execute: () => assert.fail('Must not equip while the splinter is present') }
  );
  useCase.confirmSplinter();
  const subscription = useCase.execute().subscribe();
  subscription.unsubscribe();

  assert.equal(cancelled, true);
});
