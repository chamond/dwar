import { map, switchMap, take, type Observable } from 'rxjs';
import { fromFetch } from 'rxjs/fetch';
import { UnexpectedServerResponseError } from '../../application/errors/unexpected-server-response-error';
import { CURRENT_STATE_REQUEST } from './current-state-request';

const ALIVE_FLAG_KEYS = ['is_alive', 'alive'] as const;
const DEAD_FLAG_KEYS = ['is_dead', 'dead'] as const;
const HEALTH_VALUE_KEYS = [
  'hp',
  'health',
  'life',
  'current_hp',
  'current_health',
  'current_life',
  'hp_current',
  'health_current',
  'life_current'
] as const;

export function detectCurrentPlayerAlive(): Observable<boolean> {
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
    map(parseCurrentPlayerAlive),
    take(1)
  );
}

function parseCurrentPlayerAlive(responseText: string): boolean {
  let response: unknown;

  try {
    response = JSON.parse(responseText);
  } catch {
    throw new UnexpectedServerResponseError('Current state response is not valid JSON.');
  }

  if (!isRecord(response) || !isRecord(response.state)) {
    throw new UnexpectedServerResponseError('Current state response does not contain state.');
  }

  const state = response.state;
  const alive = readBoolean(state, ALIVE_FLAG_KEYS);

  if (alive !== null) {
    return alive;
  }

  const dead = readBoolean(state, DEAD_FLAG_KEYS);

  if (dead !== null) {
    return !dead;
  }

  const health = readNonNegativeNumber(state, HEALTH_VALUE_KEYS);

  if (health !== null) {
    return health > 0;
  }

  throw new UnexpectedServerResponseError(
    'Current state response does not contain a player life status.'
  );
}

function readBoolean(
  state: Record<string, unknown>,
  keys: readonly string[]
): boolean | null {
  for (const key of keys) {
    const value = state[key];

    if (typeof value === 'boolean') {
      return value;
    }

    if (value === 1 || value === '1' || value === 'true') {
      return true;
    }

    if (value === 0 || value === '0' || value === 'false') {
      return false;
    }
  }

  return null;
}

function readNonNegativeNumber(
  state: Record<string, unknown>,
  keys: readonly string[]
): number | null {
  for (const key of keys) {
    const value = state[key];
    const numberValue = typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim().length > 0
        ? Number(value)
        : Number.NaN;

    if (Number.isFinite(numberValue) && numberValue >= 0) {
      return numberValue;
    }
  }

  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
