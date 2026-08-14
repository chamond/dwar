import { concat, defer, map, of, switchMap, take, tap, type Observable } from 'rxjs';
import type { HuntAttackEvent, HuntAttackMobInfo } from '../events/hunt-attack-event';
import type { BotHuntTargetId } from '../../domain/entities/bot-hunt-target';
import type { HuntMob } from '../../domain/entities/hunt-mob';
import { getMobAggressionProfile } from '../../domain/services/mob-aggression';
import { selectHuntMobForAttack } from '../../domain/services/hunt-mob-attack-selection';
import type { FightFinishedReader } from '../ports/fight-finished-reader';
import type { GetAreaId } from '../ports/get-area-id';
import type { HuntMobAttacker } from '../ports/hunt-mob-attacker';
import type { HuntTargetRepository } from '../ports/hunt-target-repository';
import type { HuntZoneScanner } from '../ports/hunt-zone-scanner';
import type { HuntZoneScanStore } from '../ports/hunt-zone-scan-store';

const DEFAULT_DANGER_RADIUS = 100;

export interface AttackHuntMobInput {
  targetId: BotHuntTargetId;
  preferCrowdedTarget: boolean;
}

export interface AttackHuntMobConfig {
  dangerRadius: number;
}

export class AttackHuntMobUseCase {
  private readonly config: AttackHuntMobConfig;

  constructor(
    private readonly scanner: HuntZoneScanner,
    private readonly scanStore: HuntZoneScanStore,
    private readonly huntTargetRepository: HuntTargetRepository,
    private readonly attacker: HuntMobAttacker,
    private readonly fightFinishedReader: FightFinishedReader,
    private readonly getAreaId: GetAreaId,
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

      return this.getAreaId().pipe(
        take(1),
        switchMap((areaId) => this.scanner.scan({ areaId }).pipe(take(1))),
        tap((scan) => {
          this.scanStore.save(scan);
        }),
        switchMap((scan): Observable<HuntAttackEvent> => {
          const selection = selectHuntMobForAttack(
            scan.getMobs(),
            target.getArticleId(),
            {
              dangerRadius: this.config.dangerRadius,
              preferCrowdedTarget: input.preferCrowdedTarget
            }
          );

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
              of<HuntAttackEvent>({
                type: 'attack-request-sent',
                mob: mobInfo
              }),
              this.fightFinishedReader.observe().pipe(
                take(1),
                map((): HuntAttackEvent => ({
                  type: 'fight-finished',
                  mob: mobInfo
                }))
              )
            ))
          );
        })
      );
    });
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
