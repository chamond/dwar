import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import test from 'node:test';
import { transformSync } from '@swc/core';
import { Observable, Subject } from 'rxjs';

const runtimeRequire = createRequire(import.meta.url);
const commonJsModuleCache = new Map();

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
  const absolutePath = path.resolve(relativePath);
  const cachedModule = commonJsModuleCache.get(absolutePath);

  if (cachedModule) {
    return cachedModule.exports;
  }

  const source = readFileSync(absolutePath, 'utf8');
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
  commonJsModuleCache.set(absolutePath, loadedModule);
  const localRequire = (specifier) => {
    if (!specifier.startsWith('.')) {
      return runtimeRequire(specifier);
    }

    const resolvedPath = path.resolve(path.dirname(absolutePath), specifier);
    const typescriptPath = resolvedPath.endsWith('.js')
      ? `${resolvedPath.slice(0, -3)}.ts`
      : resolvedPath.endsWith('.ts')
        ? resolvedPath
        : `${resolvedPath}.ts`;

    return loadCommonJsTypeScriptModule(typescriptPath);
  };

  Function('require', 'module', 'exports', compiledSource)(
    localRequire,
    loadedModule,
    loadedModule.exports
  );

  return loadedModule.exports;
};

const { selectHuntMobForAttack } = await loadTypeScriptModule(
  'src/domain/services/hunt-mob-attack-selection.ts'
);
const { canAngerHuntMob } = await loadTypeScriptModule(
  'src/domain/services/hunt-mob-anger-availability.ts'
);
const {
  normalizeHuntTargetSelection,
  updateOrderedSelection
} = await loadTypeScriptModule(
  'src/domain/services/hunt-target-selection.ts'
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
const { LocalStorageHuntingSettingsStore } = loadCommonJsTypeScriptModule(
  'src/infrastructure/browser/local-storage-hunting-settings-store.ts'
);
const { StaticHuntTargetRepository } = loadCommonJsTypeScriptModule(
  'src/infrastructure/local-data/static-hunt-target-repository.ts'
);

test('не выбирает предыдущего моба и не учитывает его в кучности', () => {
  const previousMob = createMob('10', 9);
  const isolatedMob = createMob('20', 10);
  const crowdedMob = createMob('30', 100);
  const crowdedNeighbour = createMob('40', 101);

  const selection = selectHuntMobForAttack(
    [previousMob, isolatedMob, crowdedMob, crowdedNeighbour],
    [268],
    {
      dangerRadius: 100,
      preferCrowdedTarget: true,
      aggressiveHunting: false,
      excludedMobIds: new Set(['10'])
    }
  );

  assert.equal(selection.targetCandidateCount, 3);
  assert.equal(selection.selectedMob?.getId(), '30');
});

test('без агрессивной охоты не выбирает цель рядом с мобом другого вида', () => {
  const target = createMob('10', 10);
  const blockingMob = createMob('20', 50, 19);

  const selection = selectHuntMobForAttack(
    [target, blockingMob],
    [268],
    {
      dangerRadius: 100,
      preferCrowdedTarget: false,
      aggressiveHunting: false,
      excludedMobIds: new Set()
    }
  );

  assert.equal(selection.targetCandidateCount, 1);
  assert.equal(selection.selectedMob, null);
});

test('агрессивная охота игнорирует безопасное расстояние до соседних мобов', () => {
  const target = createMob('10', 10);
  const blockingMob = createMob('20', 50, 19);

  const selection = selectHuntMobForAttack(
    [target, blockingMob],
    [268],
    {
      dangerRadius: 100,
      preferCrowdedTarget: false,
      aggressiveHunting: true,
      excludedMobIds: new Set()
    }
  );

  assert.equal(selection.targetCandidateCount, 1);
  assert.equal(selection.selectedMob?.getId(), '10');
});

test('среди выбранных разновидностей выбирает моба максимального уровня', () => {
  const lowerLevelMob = createMob('10', 10, 19, 2);
  const higherLevelMob = createMob('20', 300, 268, 3);

  const selection = selectHuntMobForAttack(
    [lowerLevelMob, higherLevelMob],
    [19, 268],
    {
      dangerRadius: 100,
      preferCrowdedTarget: false,
      aggressiveHunting: false,
      excludedMobIds: new Set()
    }
  );

  assert.equal(selection.targetCandidateCount, 2);
  assert.equal(selection.selectedMob?.getId(), '20');
});

test('при равном уровне соблюдает порядок выбора разновидностей', () => {
  const firstTypeMob = createMob('10', 10, 19, 3);
  const secondTypeMob = createMob('20', 300, 268, 3);

  assert.equal(
    selectHuntMobForAttack(
      [firstTypeMob, secondTypeMob],
      [19, 268],
      {
        dangerRadius: 100,
        preferCrowdedTarget: true,
        aggressiveHunting: false,
        excludedMobIds: new Set()
      }
    ).selectedMob?.getId(),
    '10'
  );
  assert.equal(
    selectHuntMobForAttack(
      [firstTypeMob, secondTypeMob],
      [268, 19],
      {
        dangerRadius: 100,
        preferCrowdedTarget: true,
        aggressiveHunting: false,
        excludedMobIds: new Set()
      }
    ).selectedMob?.getId(),
    '20'
  );
});

test('последовательные снятия сохраняют порядок и убирают разрывы индексов', () => {
  let selectedIds = updateOrderedSelection([], 'krets', true);
  selectedIds = updateOrderedSelection(selectedIds, 'mad-dog', true);
  selectedIds = updateOrderedSelection(selectedIds, 'zigred', true);
  assert.deepEqual(selectedIds, ['krets', 'mad-dog', 'zigred']);

  selectedIds = updateOrderedSelection(selectedIds, 'mad-dog', false);
  assert.deepEqual(selectedIds, ['krets', 'zigred']);

  selectedIds = updateOrderedSelection(selectedIds, 'krets', false);
  assert.deepEqual(selectedIds, ['zigred']);

  selectedIds = updateOrderedSelection(selectedIds, 'mad-dog', true);
  assert.deepEqual(selectedIds, ['zigred', 'mad-dog']);

  selectedIds = updateOrderedSelection(selectedIds, 'zigred', false);
  selectedIds = updateOrderedSelection(selectedIds, 'mad-dog', false);
  assert.deepEqual(selectedIds, []);
});

test('восстанавливает сохранённый порядок целей и сохраняет пустой выбор', () => {
  const availableIds = ['mad-dog', 'rabid-dog', 'warrior-skeleton'];

  assert.deepEqual(
    normalizeHuntTargetSelection(
      availableIds,
      ['warrior-skeleton', 'rabid-dog']
    ),
    ['warrior-skeleton', 'rabid-dog']
  );
  assert.deepEqual(normalizeHuntTargetSelection(availableIds, []), []);
  assert.deepEqual(normalizeHuntTargetSelection(availableIds, null), ['mad-dog']);
});

test('разрешает злость только для отмеченной в справочнике разновидности', () => {
  const targets = [
    createTarget(268, false),
    createTarget(20, true)
  ];

  assert.equal(canAngerHuntMob(createMob('10', 10, 20), targets), true);
  assert.equal(canAngerHuntMob(createMob('20', 10, 268), targets), false);
});

test('в справочнике злость доступна только бешеному псу и скелету-воину', () => {
  const angerableTargetIds = new StaticHuntTargetRepository()
    .findAll()
    .filter((target) => target.canBeAngered())
    .map((target) => target.getId());

  assert.deepEqual(angerableTargetIds, ['rabid-dog', 'warrior-skeleton']);
});

test('сохраняет порядок целей и все настройки охоты в localStorage', () => {
  const values = new Map();
  const originalWindow = globalThis.window;
  globalThis.window = {
    localStorage: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value)
    }
  };

  try {
    const store = new LocalStorageHuntingSettingsStore();
    const settings = {
      targetIds: ['warrior-skeleton', 'rabid-dog'],
      preferCrowdedTarget: true,
      aggressiveHunting: true,
      angerMob: true
    };

    store.save(settings);

    assert.deepEqual(store.load(), settings);
  } finally {
    if (originalWindow === undefined) {
      delete globalThis.window;
    } else {
      globalThis.window = originalWindow;
    }
  }
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

test('не принимает идентификаторы старого боя или неподтверждённой цели', () => {
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
          selectedPers: 2011666154
        }
      }
    }
  };

  assert.equal(readDwarHuntFightAngerInput(canvas, {
    expectedFightId: '87457906001233',
    expectedBotArtikulId: '2011666154'
  }), null);
  assert.equal(readDwarHuntFightAngerInput(canvas, {
    expectedFightId: '87457906001232',
    expectedBotArtikulId: '2011666155'
  }), null);
  assert.deepEqual(readDwarHuntFightAngerInput(canvas, {
    expectedFightId: '87457906001232',
    expectedBotArtikulId: '2011666154'
  }), {
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

test('после события выбора ждёт подтверждения selectedPers', () => {
  const dispatchedEvents = [];
  const canvas = {
    EventManager: {
      dispatchEvent(eventName, source, participantId) {
        dispatchedEvents.push({ eventName, source, participantId });
      }
    },
    app: {
      battle: {
        model: {
          fightId: 87457906001232,
          angers: {
            bots: {
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
          myId: '2011666150',
          myTeam: 1,
          selectedPers: 2011666199,
          persList: [
            [{ id: 2011666150, isBot: false, status: 4, flags: 0 }],
            [{ id: 2011666154, isBot: true, status: 4, flags: 0 }]
          ]
        }
      }
    }
  };

  const targetId = selectDwarHuntFightAngerTarget(canvas);

  assert.equal(targetId, '2011666154');
  assert.equal(canvas.app.mem.model.selectedPers, 2011666199);
  assert.equal(readDwarHuntFightAngerInput(canvas, {
    expectedFightId: '87457906001232',
    expectedBotArtikulId: targetId
  }), null);
  assert.deepEqual(dispatchedEvents, [{
    eventName: 'Mem.PERS_SELECT',
    source: null,
    participantId: 2011666154
  }]);

  canvas.app.mem.model.selectedPers = 2011666154;

  assert.deepEqual(readDwarHuntFightAngerInput(canvas, {
    expectedFightId: '87457906001232',
    expectedBotArtikulId: targetId
  }), {
    fightId: '87457906001232',
    persId: '2011666150',
    botArtikulId: '2011666154'
  });
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

function createMob(id, x, articleId = 268, level = 1) {
  const position = {
    x,
    distanceTo(other) {
      return Math.abs(this.x - other.x);
    }
  };

  return {
    getArticleId: () => articleId,
    getId: () => id,
    getLevel: () => level,
    getPosition: () => position,
    isAvailableForAttack: () => true,
    isFriendly: () => false
  };
}

function createTarget(articleId, canBeAngered) {
  return {
    getArticleId: () => articleId,
    canBeAngered: () => canBeAngered
  };
}
