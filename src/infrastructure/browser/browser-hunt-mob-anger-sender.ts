import { defer, from, map, switchMap, take, type Observable } from 'rxjs';
import { fromFetch } from 'rxjs/fetch';
import { UnexpectedServerResponseError } from '../../application/errors/unexpected-server-response-error';
import type { HuntMobAngerSender } from '../../application/ports/hunt-mob-anger-sender';
import { isSuccessfulDwarHuntMobAngerResponse } from './dwar-hunt-mob-anger-response';
import {
  buildHuntMobAngerRequestBody,
  HUNT_MOB_ANGER_REQUEST
} from './hunt-mob-anger-request';
import { readCurrentHuntFightAngerInput } from './read-current-hunt-fight-anger-input';

export class BrowserHuntMobAngerSender implements HuntMobAngerSender {
  send(): Observable<void> {
    return defer(() => {
      const input = readCurrentHuntFightAngerInput();

      return fromFetch(HUNT_MOB_ANGER_REQUEST.url, {
        method: HUNT_MOB_ANGER_REQUEST.method,
        credentials: 'same-origin',
        body: buildHuntMobAngerRequestBody(input)
      });
    }).pipe(
      switchMap((response) => from(response.text()).pipe(
        map((body) => ({
          body,
          isSuccessfulHttpStatus: response.ok,
          status: response.status
        }))
      )),
      map(({ body, isSuccessfulHttpStatus, status }): void => {
        if (!isSuccessfulHttpStatus) {
          throw new UnexpectedServerResponseError(
            `Запрос злости моба завершился с HTTP ${status}. Ответ: ${formatResponseBody(body)}`
          );
        }

        if (!isSuccessfulDwarHuntMobAngerResponse(body)) {
          throw new UnexpectedServerResponseError(
            `Ответ запроса злости моба: ${formatResponseBody(body)}`
          );
        }
      }),
      take(1)
    );
  }
}

function formatResponseBody(body: string): string {
  return body.length > 0 ? body : '(пустой ответ)';
}
