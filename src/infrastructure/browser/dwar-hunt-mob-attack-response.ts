export function isSuccessfulDwarHuntMobAttackResponse(body: string): boolean {
  let response: unknown;

  try {
    response = JSON.parse(body);
  } catch {
    return false;
  }

  if (!isRecord(response)) {
    return false;
  }

  const actionResponse = response['common|action'];

  return response.redirect_error === false
    || (isRecord(actionResponse) && actionResponse.redirect_error === false);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
