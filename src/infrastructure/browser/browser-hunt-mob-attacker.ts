import { map, take, type Observable } from 'rxjs';
import { fromFetch } from 'rxjs/fetch';
import { UnexpectedServerResponseError } from '../../application/errors/unexpected-server-response-error';
import type { HuntMobAttacker } from '../../application/ports/hunt-mob-attacker';
import type { HuntMob } from '../../domain/entities/hunt-mob';
import {
  buildHuntMobAttackUrl,
  HUNT_MOB_ATTACK_REQUEST
} from './hunt-mob-attack-request';

export class BrowserHuntMobAttacker implements HuntMobAttacker {
  attack(mob: HuntMob): Observable<void> {
    return fromFetch(buildHuntMobAttackUrl(mob.getId()), {
      method: HUNT_MOB_ATTACK_REQUEST.method,
      credentials: 'same-origin'
    }).pipe(
      map((response): void => {
        if (!response.ok) {
          throw new UnexpectedServerResponseError(
            `Hunt mob attack failed with HTTP ${response.status}.`
          );
        }
      }),
      take(1)
    );
  }
}
