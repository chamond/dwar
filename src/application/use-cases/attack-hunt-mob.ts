import {
  EMPTY,
  concat,
  defer,
  map,
  of,
  switchMap,
  take,
  tap,
  type Observable
} from 'rxjs';
import type { HuntAttackEvent, HuntAttackMobInfo } from '../events/hunt-attack-event';
import { createHuntFightLifecycle } from '../services/hunt-fight-lifecycle';
import type { BotHuntTargetId } from '../../domain/entities/bot-hunt-target';
import type { HuntMob } from '../../domain/entities/hunt-mob';
import { getMobAggressionProfile } from '../../domain/services/mob-aggression';
import { canAngerHuntMob } from '../../domain/services/hunt-mob-anger-availability';
import { selectHuntMobForAttack } from '../../domain/services/hunt-mob-attack-selection';
import type { FightFinishedReader } from '../ports/fight-finished-reader';
import type { GetAreaId } from '../ports/get-area-id';
import type { HuntMobAngerSender } from '../ports/hunt-mob-anger-sender';
import type { HuntMobAttacker } from '../ports/hunt-mob-attacker';
import type { HuntTargetRepository } from '../ports/hunt-target-repository';
import type { HuntZoneScanner } from '../ports/hunt-zone-scanner';
import type { HuntZoneScanStore } from '../ports/hunt-zone-scan-store';
import type { TaskScheduler } from '../ports/task-scheduler';

const DEFAULT_DANGER_RADIUS = 100;

export interface AttackHuntMobInput {
  targetIds: readonly BotHuntTargetId[];
  preferCrowdedTarget: boolean;
  aggressiveHunting: boolean;
  angerMob: boolean;
  excludedMobIds: ReadonlySet<string>;
}

export interface AttackHuntMobConfig {
  dangerRadius: number;
}

type NoSafeTargetEvent = Extract<HuntAttackEvent, { type: 'no-safe-target' }>;
type AttackRequestSentEvent = Extract<HuntAttackEvent, { type: 'attack-request-sent' }>;

type HuntAttackTaskResult =
  | {
      event: NoSafeTargetEvent;
    }
  | {
      event: AttackRequestSentEvent;
      fightFinished: Observable<void>;
    };

export class AttackHuntMobUseCase {
  private readonly config: AttackHuntMobConfig;

  constructor(
    private readonly scanner: HuntZoneScanner,
    private readonly scanStore: HuntZoneScanStore,
    private readonly huntTargetRepository: HuntTargetRepository,
    private readonly attacker: HuntMobAttacker,
    private readonly angerSender: HuntMobAngerSender,
    private readonly fightFinishedReader: FightFinishedReader,
    private readonly getAreaId: GetAreaId,
    private readonly taskScheduler: TaskScheduler,
    config: Partial<AttackHuntMobConfig> = {}
  ) {
    this.config = {
      dangerRadius: config.dangerRadius ?? DEFAULT_DANGER_RADIUS
    };
  }

  execute(input: AttackHuntMobInput): Observable<HuntAttackEvent> {
    return defer(() => {
      if (input.targetIds.length === 0) {
        throw new Error('Selected hunt targets are not known by the bot.');
      }

      const targets = input.targetIds.map((targetId) => {
        const target = this.huntTargetRepository.findById(targetId);

        if (!target) {
          throw new Error('Selected hunt targets are not known by the bot.');
        }

        return target;
      });
      const targetArticleIds = targets.map((target) => target.getArticleId());

      return this.taskScheduler.schedule(() => this.getAreaId().pipe(
        take(1),
        switchMap((areaId) => this.scanner.scan({ areaId }).pipe(take(1))),
        tap((scan) => {
          this.scanStore.save(scan);
        }),
        switchMap((scan): Observable<HuntAttackTaskResult> => {
          const selection = selectHuntMobForAttack(scan.getMobs(), targetArticleIds, {
            dangerRadius: this.config.dangerRadius,
            preferCrowdedTarget: input.preferCrowdedTarget,
            aggressiveHunting: input.aggressiveHunting,
            excludedMobIds: input.excludedMobIds
          });

          if (!selection.selectedMob) {
            return of({
              event: {
                type: 'no-safe-target',
                targetCandidateCount: selection.targetCandidateCount
              }
            });
          }

          const selectedMob = selection.selectedMob;
          const mobInfo = createMobInfo(selectedMob);

          return this.attacker.attack(selectedMob).pipe(
            take(1),
            switchMap((attackResult) => {
              const fightLifecycle = createHuntFightLifecycle(
                this.fightFinishedReader.observe()
              );

              return concat(
                of<HuntAttackTaskResult>({
                  event: {
                    type: 'attack-request-sent',
                    mob: mobInfo
                  },
                  fightFinished: fightLifecycle.fightFinished
                }),
                input.angerMob && canAngerHuntMob(selectedMob, targets)
                  ? fightLifecycle.cancelAngerWhenFightFinishes(
                      this.angerSender.send({
                        expectedFightId: attackResult.fightId
                      })
                    )
                  : EMPTY
              );
            })
          );
        })
      )).pipe(
        switchMap((result): Observable<HuntAttackEvent> => {
          if (!('fightFinished' in result)) {
            return of(result.event);
          }

          return concat(
            of(result.event),
            this.mapFightFinished(result.fightFinished, result.event.mob)
          );
        })
      );
    });
  }

  observeFightFinished(mob: HuntAttackMobInfo): Observable<HuntAttackEvent> {
    return this.mapFightFinished(this.fightFinishedReader.observe(), mob);
  }

  private mapFightFinished(
    fightFinished: Observable<void>,
    mob: HuntAttackMobInfo
  ): Observable<HuntAttackEvent> {
    return fightFinished.pipe(
      take(1),
      map((): HuntAttackEvent => ({
        type: 'fight-finished',
        mob
      }))
    );
  }
}

function createMobInfo(mob: HuntMob): HuntAttackMobInfo {
  return {
    id: mob.getId(),
    name: mob.getName(),
    level: mob.getLevel(),
    aggressionLevel: mob.getAggressionLevel(),
    aggressionColor: getMobAggressionProfile(mob.getAggressionLevel()).color
  };
}
