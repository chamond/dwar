import {
  EMPTY,
  concat,
  defer,
  ignoreElements,
  map,
  of,
  switchMap,
  take,
  tap,
  type Observable
} from 'rxjs';
import type { HuntAttackEvent, HuntAttackMobInfo } from '../events/hunt-attack-event';
import type { BotHuntTargetId } from '../../domain/entities/bot-hunt-target';
import type { HuntMob } from '../../domain/entities/hunt-mob';
import { getMobAggressionProfile } from '../../domain/services/mob-aggression';
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
  targetId: BotHuntTargetId;
  preferCrowdedTarget: boolean;
  angerMob: boolean;
  excludedMobIds: ReadonlySet<string>;
}

export interface AttackHuntMobConfig {
  dangerRadius: number;
}

type HuntAttackRequestEvent = Exclude<HuntAttackEvent, { type: 'fight-finished' }>;

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
      const target = this.huntTargetRepository.findById(input.targetId);

      if (!target) {
        throw new Error('Selected hunt target is not known by the bot.');
      }

      return this.taskScheduler.schedule(() => this.getAreaId().pipe(
        take(1),
        switchMap((areaId) => this.scanner.scan({ areaId }).pipe(take(1))),
        tap((scan) => {
          this.scanStore.save(scan);
        }),
        switchMap((scan): Observable<HuntAttackRequestEvent> => {
          const selection = selectHuntMobForAttack(scan.getMobs(), target.getArticleId(), {
            dangerRadius: this.config.dangerRadius,
            preferCrowdedTarget: input.preferCrowdedTarget,
            excludedMobIds: input.excludedMobIds
          });

          if (!selection.selectedMob) {
            return of({
              type: 'no-safe-target',
              targetCandidateCount: selection.targetCandidateCount
            });
          }

          const selectedMob = selection.selectedMob;
          const mobInfo = createMobInfo(selectedMob);

          return this.attacker.attack(selectedMob).pipe(
            take(1),
            switchMap(() => concat(
              of<HuntAttackRequestEvent>({
                type: 'attack-request-sent',
                mob: mobInfo
              }),
              input.angerMob ? this.angerMob() : EMPTY
            ))
          );
        })
      )).pipe(
        switchMap((event): Observable<HuntAttackEvent> => {
          if (event.type === 'no-safe-target') {
            return of(event);
          }

          return concat(
            of(event),
            this.observeFightFinished(event.mob)
          );
        })
      );
    });
  }

  observeFightFinished(mob: HuntAttackMobInfo): Observable<HuntAttackEvent> {
    return this.fightFinishedReader.observe().pipe(
      take(1),
      map((): HuntAttackEvent => ({
        type: 'fight-finished',
        mob
      }))
    );
  }

  private angerMob(): Observable<never> {
    return this.angerSender.send().pipe(
      take(1),
      ignoreElements()
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
