export interface HuntMobAngerRequestInput {
  fightId: string;
  persId: string;
  botArtikulId: string;
}

export const HUNT_MOB_ANGER_REQUEST = {
  method: 'POST',
  url: 'https://w1.dwar.ru/entry_point.php?object=bot&action=anger&json_mode_on=1'
} as const;

export function buildHuntMobAngerRequestBody(
  input: HuntMobAngerRequestInput
): URLSearchParams {
  return new URLSearchParams({
    json_mode_on: '1',
    object: 'bot',
    action: 'anger',
    fight_id: normalizePositiveIntegerId(input.fightId, 'Hunt fight id'),
    pers_id: normalizePositiveIntegerId(input.persId, 'Hunt fight player id'),
    bot_artikul_id: normalizePositiveIntegerId(
      input.botArtikulId,
      'Hunt fight selected bot id'
    )
  });
}

function normalizePositiveIntegerId(value: string, label: string): string {
  const normalizedValue = value.trim();

  if (!/^[1-9]\d*$/.test(normalizedValue)) {
    throw new Error(`${label} must be a positive integer.`);
  }

  return normalizedValue;
}
