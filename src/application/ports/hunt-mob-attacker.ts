import type { Observable } from 'rxjs';
import type { HuntMob } from '../../domain/entities/hunt-mob';

export interface HuntMobAttackResult {
  fightId: string | null;
  rejection?: 'target-not-recovered';
}

export interface HuntMobAttacker {
  attack(mob: HuntMob): Observable<HuntMobAttackResult>;
}
