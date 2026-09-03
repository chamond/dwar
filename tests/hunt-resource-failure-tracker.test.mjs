import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { transformSync } from '@swc/core';

const loadTypeScriptModule = async (relativePath) => {
  const source = readFileSync(path.resolve(relativePath), 'utf8');
  const compiledSource = transformSync(source, {
    jsc: {
      parser: {
        syntax: 'typescript'
      },
      target: 'es2022'
    },
    module: {
      type: 'es6'
    }
  }).code;
  const moduleUrl = `data:text/javascript;base64,${Buffer.from(compiledSource).toString('base64')}`;

  return import(moduleUrl);
};

const { HuntResourceFailureTracker } = await loadTypeScriptModule(
  'src/domain/services/hunt-resource-failure-tracker.ts'
);

test('блокирует ресурс после двух неудач с одинаковыми num и координатами', () => {
  const tracker = new HuntResourceFailureTracker();
  const resource = createResource('101', 200, 300);

  tracker.synchronizeVisibleResources([resource]);
  tracker.recordFailure(resource);
  assert.equal(tracker.isBlocked(resource), false);

  tracker.recordFailure(resource);
  assert.equal(tracker.isBlocked(resource), true);
});

test('считает ресурс с тем же num и другими координатами другим узлом', () => {
  const tracker = new HuntResourceFailureTracker();
  const failedResource = createResource('101', 200, 300);
  const movedResource = createResource('101', 201, 300);

  tracker.recordFailure(failedResource);
  tracker.recordFailure(failedResource);

  assert.equal(tracker.isBlocked(failedResource), true);
  assert.equal(tracker.isBlocked(movedResource), false);
});

test('забывает заблокированный ресурс после его исчезновения из локации', () => {
  const tracker = new HuntResourceFailureTracker();
  const resource = createResource('101', 200, 300);

  tracker.recordFailure(resource);
  tracker.recordFailure(resource);
  tracker.synchronizeVisibleResources([]);

  assert.equal(tracker.isBlocked(resource), false);
});

function createResource(serverNumber, x, y) {
  return {
    getServerNumber: () => serverNumber,
    getPosition: () => ({
      getX: () => x,
      getY: () => y
    })
  };
}
