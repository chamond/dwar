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
const {
  buildHuntMobAngerRequestBody,
  HUNT_MOB_ANGER_REQUEST
} = await loadTypeScriptModule(
  'src/infrastructure/browser/hunt-mob-anger-request.ts'
);
const { isSuccessfulDwarHuntMobAngerResponse } = await loadTypeScriptModule(
  'src/infrastructure/browser/dwar-hunt-mob-anger-response.ts'
);
const { readDwarHuntFightAngerInput } = await loadTypeScriptModule(
  'src/infrastructure/browser/dwar-hunt-fight-anger-input.ts'
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

test('формирует POST-запрос злости только из идентификаторов текущего боя', () => {
  assert.deepEqual(HUNT_MOB_ANGER_REQUEST, {
    method: 'POST',
    url: 'https://w1.dwar.ru/entry_point.php?object=bot&action=anger&json_mode_on=1'
  });
  assert.equal(
    buildHuntMobAngerRequestBody({
      fightId: '87457906001232',
      persId: '2011666150',
      botArtikulId: '2011666154'
    }).toString(),
    'json_mode_on=1&object=bot&action=anger&fight_id=87457906001232&pers_id=2011666150&bot_artikul_id=2011666154'
  );
});

test('принимает ответ злости только со status=100', () => {
  assert.equal(
    isSuccessfulDwarHuntMobAngerResponse('{"bot|anger":{"status":100}}'),
    true
  );
  assert.equal(isSuccessfulDwarHuntMobAngerResponse('{"status":"100"}'), true);
  assert.equal(
    isSuccessfulDwarHuntMobAngerResponse('{"bot|anger":{"status":99}}'),
    false
  );
  assert.equal(isSuccessfulDwarHuntMobAngerResponse('not json'), false);
});

test('считает Canvas боя готовым только после появления всех идентификаторов', () => {
  const canvas = {
    app: {
      battle: {
        model: {
          fightId: 87457906001232
        }
      },
      mem: {
        model: {
          myId: '2011666150',
          selectedPers: 0
        }
      }
    }
  };

  assert.equal(readDwarHuntFightAngerInput(canvas), null);

  canvas.app.mem.model.selectedPers = 2011666154;

  assert.deepEqual(readDwarHuntFightAngerInput(canvas), {
    fightId: '87457906001232',
    persId: '2011666150',
    botArtikulId: '2011666154'
  });
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
