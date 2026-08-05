import { map, switchMap, take, type Observable } from 'rxjs';
import { fromFetch } from 'rxjs/fetch';
import { UnexpectedServerResponseError } from '../../application/errors/unexpected-server-response-error';
import { CURRENT_STATE_REQUEST } from './current-state-request';

export function getAreaId(): Observable<number> {
  return fromFetch(CURRENT_STATE_REQUEST.url, {
    method: CURRENT_STATE_REQUEST.method
  }).pipe(
    switchMap((response) => {
      if (!response.ok) {
        throw new UnexpectedServerResponseError(
          `Current state request failed with HTTP ${response.status}.`
        );
      }

      return response.text();
    }),
    map(parseAreaId),
    take(1)
  );
}

function parseAreaId(responseText: string): number {
  let response: unknown;

  try {
    response = JSON.parse(responseText);
  } catch {
    throw new UnexpectedServerResponseError('Current state response is not valid JSON.');
  }

  if (!isRecord(response) || !isRecord(response.state)) {
    throw new UnexpectedServerResponseError('Current state response does not contain state.');
  }

  const rawAreaId = response.state.area_id;
  const areaId = typeof rawAreaId === 'number'
    ? rawAreaId
    : typeof rawAreaId === 'string'
      ? Number(rawAreaId)
      : Number.NaN;

  if (!Number.isInteger(areaId) || areaId <= 0) {
    throw new UnexpectedServerResponseError('Current state response contains an invalid area id.');
  }

  return areaId;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
