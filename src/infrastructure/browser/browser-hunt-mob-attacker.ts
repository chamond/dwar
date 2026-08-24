import { from, map, switchMap, take, type Observable } from 'rxjs';
import { fromFetch } from 'rxjs/fetch';
import { HuntAttackMinigameRequiredError } from '../../application/errors/hunt-attack-minigame-required-error';
import { UnexpectedServerResponseError } from '../../application/errors/unexpected-server-response-error';
import type { HuntMobAttacker } from '../../application/ports/hunt-mob-attacker';
import type { HuntMob } from '../../domain/entities/hunt-mob';
import {
  buildHuntMobAttackUrl,
  HUNT_MOB_ATTACK_REQUEST
} from './hunt-mob-attack-request';
import {
  isDwarHuntAttackMinigameResponse,
  isSuccessfulDwarHuntMobAttackResponse,
  readDwarHuntAttackFightId
} from './dwar-hunt-mob-attack-response';
import { openDwarHuntFight } from './dwar-hunt-fight-opener';

export class BrowserHuntMobAttacker implements HuntMobAttacker {
  attack(mob: HuntMob): Observable<void> {
    return fromFetch(buildHuntMobAttackUrl(mob.getId()), {
      method: HUNT_MOB_ATTACK_REQUEST.method,
      credentials: 'same-origin'
    }).pipe(
      switchMap((response) => from(response.text()).pipe(
        map((body) => ({
          body,
          isSuccessfulHttpStatus: response.ok,
          status: response.status
        }))
      )),
      map(({ body, isSuccessfulHttpStatus, status }): void => {
        if (isDwarHuntAttackMinigameResponse(body)) {
          throw new HuntAttackMinigameRequiredError();
        }

        if (!isSuccessfulHttpStatus) {
          throw new UnexpectedServerResponseError(
            `Запрос нападения завершился с HTTP ${status}. Ответ: ${formatResponseBody(body)}`
          );
        }

        assertSuccessfulAttackResponse(body);
        openDwarHuntFight(readDwarHuntAttackFightId(body));
      }),
      take(1)
    );
  }
}

function assertSuccessfulAttackResponse(body: string): void {
  if (!isSuccessfulDwarHuntMobAttackResponse(body)) {
    throw createUnexpectedAttackResponseError(body);
  }
}

function createUnexpectedAttackResponseError(body: string): UnexpectedServerResponseError {
  return new UnexpectedServerResponseError(
    `Ответ запроса нападения: ${formatResponseBody(body)}`
  );
}

function formatResponseBody(body: string): string {
  return body.length > 0 ? body : '(пустой ответ)';
}
