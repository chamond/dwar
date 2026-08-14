import assert from 'node:assert/strict';
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

const { selectHuntMobForAttack } = await loadTypeScriptModule(
  'src/domain/services/hunt-mob-attack-selection.ts'
);
const {
  isDwarHuntAttackMinigameResponse,
  isSuccessfulDwarHuntMobAttackResponse
} = await loadTypeScriptModule(
  'src/infrastructure/browser/dwar-hunt-mob-attack-response.ts'
);

test('не выбирает предыдущего моба и не учитывает его в кучности', () => {
  const previousMob = createMob('10', 9);
  const isolatedMob = createMob('20', 10);
  const crowdedMob = createMob('30', 100);
  const crowdedNeighbour = createMob('40', 101);

  const selection = selectHuntMobForAttack(
    [previousMob, isolatedMob, crowdedMob, crowdedNeighbour],
    268,
    {
      dangerRadius: 100,
      preferCrowdedTarget: true,
      excludedMobIds: new Set(['10'])
    }
  );

  assert.equal(selection.targetCandidateCount, 3);
  assert.equal(selection.selectedMob?.getId(), '30');
});

test('принимает ответ нападения только с redirect_error=false', () => {
  assert.equal(
    isSuccessfulDwarHuntMobAttackResponse('{"common|action":{"redirect_error":false}}'),
    true
  );
  assert.equal(
    isSuccessfulDwarHuntMobAttackResponse('{"redirect_error":false}'),
    true
  );
  assert.equal(
    isSuccessfulDwarHuntMobAttackResponse('{"common|action":{"redirect_error":true}}'),
    false
  );
  assert.equal(isSuccessfulDwarHuntMobAttackResponse('not json'), false);
});

test('отдельно распознаёт мини-игру в ответе нападения', () => {
  assert.equal(
    isDwarHuntAttackMinigameResponse('{"farm|minigame":{"time_left":10}}'),
    true
  );
  assert.equal(
    isDwarHuntAttackMinigameResponse('{"common|action":{"redirect_error":false}}'),
    false
  );
  assert.equal(isDwarHuntAttackMinigameResponse('not json'), false);
});

function createMob(id, x) {
  const position = {
    x,
    distanceTo(other) {
      return Math.abs(this.x - other.x);
    }
  };

  return {
    getArticleId: () => 268,
    getId: () => id,
    getPosition: () => position,
    isAvailableForAttack: () => true,
    isFriendly: () => false
  };
}
