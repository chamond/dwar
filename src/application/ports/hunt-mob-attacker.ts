import type { Observable } from 'rxjs';
import type { HuntMob } from '../../domain/entities/hunt-mob';

export type HuntMobAttackResult =
  | {
      type: 'fight-opened';
    }
  | {
      type: 'confirmation-opened';
    };

export interface HuntMobAttacker {
  attack(mob: HuntMob): Observable<HuntMobAttackResult>;
}
