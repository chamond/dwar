import { from, map, switchMap, take, type Observable } from 'rxjs';
import { fromFetch } from 'rxjs/fetch';
import { UnexpectedServerResponseError } from '../../application/errors/unexpected-server-response-error';
import type {
  HuntMobAttacker,
  HuntMobAttackResponse
} from '../../application/ports/hunt-mob-attacker';
import type { HuntMob } from '../../domain/entities/hunt-mob';
import {
  buildHuntMobAttackUrl,
  HUNT_MOB_ATTACK_REQUEST
} from './hunt-mob-attack-request';

export class BrowserHuntMobAttacker implements HuntMobAttacker {
  attack(mob: HuntMob): Observable<HuntMobAttackResponse> {
    return fromFetch(buildHuntMobAttackUrl(mob.getId()), {
      method: HUNT_MOB_ATTACK_REQUEST.method,
      credentials: 'same-origin'
    }).pipe(
      switchMap((response) => {
        if (!response.ok) {
          throw new UnexpectedServerResponseError(
            `Hunt mob attack failed with HTTP ${response.status}.`
          );
        }

        return from(response.text());
      }),
      map((body): HuntMobAttackResponse => ({ body })),
      take(1)
    );
  }
}
