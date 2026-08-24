export function isSuccessfulDwarHuntMobAngerResponse(body: string): boolean {
  const response = parseResponse(body);

  if (!isRecord(response)) {
    return false;
  }

  const angerResponse = response['bot|anger'];
  const result = isRecord(angerResponse) ? angerResponse : response;

  return normalizeStatus(result.status) === 100;
}

function parseResponse(body: string): unknown {
  try {
    return JSON.parse(body) as unknown;
  } catch {
    return null;
  }
}

function normalizeStatus(value: unknown): number {
  return typeof value === 'number'
    ? value
    : typeof value === 'string'
      ? Number(value)
      : Number.NaN;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
