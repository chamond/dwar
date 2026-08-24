export function isSuccessfulDwarHuntMobAttackResponse(body: string): boolean {
  const response = parseResponse(body);

  if (!isRecord(response)) {
    return false;
  }

  const actionResponse = response['common|action'];

  return response.redirect_error === false
    || (isRecord(actionResponse) && actionResponse.redirect_error === false);
}

export function isDwarHuntAttackMinigameResponse(body: string): boolean {
  const response = parseResponse(body);

  return isRecord(response)
    && Object.prototype.hasOwnProperty.call(response, 'farm|minigame');
}

export function readDwarHuntAttackFightId(body: string): string | null {
  const response = parseResponse(body);

  if (!isRecord(response) || !isRecord(response.state)) {
    return null;
  }

  return readPositiveIntegerId(response.state.fight_id);
}

function parseResponse(body: string): unknown {
  let response: unknown;

  try {
    response = JSON.parse(body);
  } catch {
    return null;
  }

  return response;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readPositiveIntegerId(value: unknown): string | null {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) && value > 0 ? String(value) : null;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const normalizedValue = value.trim();

  return /^[1-9]\d*$/.test(normalizedValue) ? normalizedValue : null;
}
