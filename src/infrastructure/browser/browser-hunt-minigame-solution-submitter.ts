import { defer, map, switchMap, take, type Observable } from 'rxjs';
import { fromFetch } from 'rxjs/fetch';
import { UnexpectedServerResponseError } from '../../application/errors/unexpected-server-response-error';
import type {
  HuntMinigameSolutionResult,
  HuntMinigameSolutionSubmitter
} from '../../application/ports/hunt-minigame-solution-submitter';
import { createDwarHuntMinigameTelemetry } from './dwar-hunt-minigame-telemetry';
import {
  buildHuntMinigameCheckUrl,
  HUNT_MINIGAME_CHECK_REQUEST
} from './hunt-minigame-check-request';

export class BrowserHuntMinigameSolutionSubmitter implements HuntMinigameSolutionSubmitter {
  submit(targetToSourceSequence: readonly number[]): Observable<HuntMinigameSolutionResult> {
    return defer(() => fromFetch(
      buildHuntMinigameCheckUrl(targetToSourceSequence),
      {
        method: HUNT_MINIGAME_CHECK_REQUEST.method,
        body: new URLSearchParams({
          m: createDwarHuntMinigameTelemetry()
        })
      }
    )).pipe(
      switchMap((response) => {
        if (!response.ok) {
          throw new UnexpectedServerResponseError(
            `Hunt minigame solution request failed with HTTP ${response.status}.`
          );
        }

        return response.text();
      }),
      map(parseSolutionResponse),
      take(1)
    );
  }
}

function parseSolutionResponse(responseText: string): HuntMinigameSolutionResult {
  const document = new DOMParser().parseFromString(responseText, 'application/xml');
  const parserError = document.querySelector('parsererror');

  if (parserError) {
    throw new UnexpectedServerResponseError('Hunt minigame solution response is not valid XML.');
  }

  const status = document.documentElement.getAttribute('status');
  const message = document.documentElement.getAttribute('msg');

  return {
    status,
    message,
    isSuccessful: status === '1'
  };
}
