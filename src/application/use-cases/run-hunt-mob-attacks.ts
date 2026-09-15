import { concat, defer, of, repeat, tap, type Observable } from 'rxjs';
import type {
  HuntAttackEvent,
  HuntAttackMobInfo
} from '../events/hunt-attack-event';
import type { BotHuntTargetId } from '../../domain/entities/bot-hunt-target';
import type { Delay } from '../ports/delay';
import type { AttackHuntMobUseCase } from './attack-hunt-mob';

const DEFAULT_NO_TARGET_RETRY_DELAY_MS = 5_000;

export interface RunHuntMobAttacksInput {
  targetIds: readonly BotHuntTargetId[];
  preferCrowdedTarget: boolean;
  aggressiveHunting: boolean;
  angerMob: boolean;
  activeFight?: HuntAttackMobInfo;
}

export interface RunHuntMobAttacksConfig {
  noTargetRetryDelayMs: number;
}

export class RunHuntMobAttacksUseCase {
  private readonly config: RunHuntMobAttacksConfig;
  constructor(
    private readonly attackHuntMob: AttackHuntMobUseCase,
    private readonly delay: Delay,
    config: Partial<RunHuntMobAttacksConfig> = {}
  ) {
    this.config = {
      noTargetRetryDelayMs: config.noTargetRetryDelayMs ?? DEFAULT_NO_TARGET_RETRY_DELAY_MS
    };

    if (this.config.noTargetRetryDelayMs <= 0) {
      throw new Error('Hunt no-target retry delay must be greater than zero.');
    }
  }

  execute(input: RunHuntMobAttacksInput): Observable<HuntAttackEvent> {
    return defer(() => {
      let retryDelayRequired = false;
      let excludedMobIds = input.activeFight
        ? new Set([input.activeFight.id])
        : new Set<string>();

      const iteration = defer(() => {
        retryDelayRequired = false;

        return this.attackHuntMob.execute({
          targetIds: input.targetIds,
          preferCrowdedTarget: input.preferCrowdedTarget,
          aggressiveHunting: input.aggressiveHunting,
          angerMob: input.angerMob,
          excludedMobIds
        }).pipe(
          tap((event) => {
            if (event.type === 'no-safe-target') {
              retryDelayRequired = true;
              excludedMobIds = new Set<string>();
              return;
            }

            if (event.type === 'attack-target-not-recovered') {
              retryDelayRequired = true;
              excludedMobIds = new Set([event.mob.id]);
              return;
            }

            if (event.type === 'attack-request-sent') {
              excludedMobIds = new Set([event.mob.id]);
            }
          })
        );
      });

      const attackLoop = iteration.pipe(
        repeat({
          delay: () => retryDelayRequired
            ? this.delay.wait(this.config.noTargetRetryDelayMs)
            : of(undefined)
        })
      );

      return input.activeFight
        ? concat(
            this.attackHuntMob.observeFightFinished(input.activeFight),
            attackLoop
          )
        : attackLoop;
    });
  }
}
