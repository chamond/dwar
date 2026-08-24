import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import test from 'node:test';
import { transformSync } from '@swc/core';
import { Observable, Subject } from 'rxjs';

const runtimeRequire = createRequire(import.meta.url);

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

const loadCommonJsTypeScriptModule = (relativePath) => {
  const source = readFileSync(path.resolve(relativePath), 'utf8');
  const compiledSource = transformSync(source, {
    jsc: {
      parser: {
        syntax: 'typescript'
      },
      target: 'es2022'
    },
    module: {
      type: 'commonjs'
    }
  }).code;
  const loadedModule = { exports: {} };

  Function('require', 'module', 'exports', compiledSource)(
    runtimeRequire,
    loadedModule,
    loadedModule.exports
  );

  return loadedModule.exports;
};

const { selectHuntMobForAttack } = await loadTypeScriptModule(
  'src/domain/services/hunt-mob-attack-selection.ts'
);
const {
  isDwarHuntAttackMinigameResponse,
  isSuccessfulDwarHuntMobAttackResponse,
  readDwarHuntAttackFightId
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
const { selectDwarHuntFightAngerTarget } = await loadTypeScriptModule(
  'src/infrastructure/browser/dwar-hunt-fight-anger-target-selector.ts'
);
const { createHuntFightLifecycle } = loadCommonJsTypeScriptModule(
  'src/application/services/hunt-fight-lifecycle.ts'
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

test('читает идентификатор начавшегося боя из состояния ответа нападения', () => {
  assert.equal(
    readDwarHuntAttackFightId(
      '{"common|action":{"redirect_error":false},"state":{"fight_id":87457906001232}}'
    ),
    '87457906001232'
  );
  assert.equal(readDwarHuntAttackFightId('{"state":{"fight_id":"0"}}'), null);
  assert.equal(readDwarHuntAttackFightId('not json'), null);
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

test('штатным событием выбирает доступного для злости моба из команды противника', () => {
  const dispatchedEvents = [];
  const canvas = {
    EventManager: {
      dispatchEvent(eventName, source, participantId) {
        dispatchedEvents.push({ eventName, source, participantId });
        canvas.app.mem.model.selectedPers = participantId;
      }
    },
    app: {
      battle: {
        model: {
          angers: {
            bots: {
              2011666152: 1,
              2011666153: 1,
              2011666154: 1
            }
          }
        }
      },
      mem: {
        Event: {
          PERS_SELECT: 'Mem.PERS_SELECT'
        },
        model: {
          myTeam: 1,
          selectedPers: 0,
          persList: [
            [{ id: 2011666150, isBot: false, status: 4, flags: 0 }],
            [
              { id: 2011666152, isBot: true, status: 2, flags: 0 },
              { id: 2011666153, isBot: true, status: 4, flags: 65_536 },
              { id: 2011666154, isBot: true, status: 4, flags: 0 }
            ]
          ]
        }
      }
    }
  };

  assert.equal(selectDwarHuntFightAngerTarget(canvas), '2011666154');
  assert.equal(canvas.app.mem.model.selectedPers, 2011666154);
  assert.deepEqual(dispatchedEvents, [{
    eventName: 'Mem.PERS_SELECT',
    source: null,
    participantId: 2011666154
  }]);

  assert.equal(selectDwarHuntFightAngerTarget(canvas), '2011666154');
  assert.equal(dispatchedEvents.length, 1);
});

test('завершение боя отменяет незавершённую злобу без ошибки', () => {
  const fightFinishedSignal = new Subject();
  let fightFinishedSubscriptions = 0;
  let fightFinishedTeardowns = 0;
  let angerTeardowns = 0;
  let angerCompleted = false;
  let angerError = null;
  const fightFinishedSource = new Observable((subscriber) => {
    fightFinishedSubscriptions += 1;
    const subscription = fightFinishedSignal.subscribe(subscriber);

    return () => {
      fightFinishedTeardowns += 1;
      subscription.unsubscribe();
    };
  });
  const anger = new Observable(() => () => {
    angerTeardowns += 1;
  });
  const lifecycle = createHuntFightLifecycle(fightFinishedSource);
  const fightFinishedSubscription = lifecycle.fightFinished.subscribe();
  const angerSubscription = lifecycle.cancelAngerWhenFightFinishes(anger).subscribe({
    complete: () => {
      angerCompleted = true;
    },
    error: (error) => {
      angerError = error;
    }
  });

  assert.equal(fightFinishedSubscriptions, 1);

  fightFinishedSignal.next();

  assert.equal(angerCompleted, true);
  assert.equal(angerError, null);
  assert.equal(angerTeardowns, 1);
  assert.equal(fightFinishedTeardowns, 1);
  assert.equal(fightFinishedSubscription.closed, true);
  assert.equal(angerSubscription.closed, true);
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
