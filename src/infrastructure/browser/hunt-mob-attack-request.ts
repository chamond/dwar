export const HUNT_MOB_ATTACK_REQUEST = {
  method: 'GET',
  url: 'https://w1.dwar.ru/entry_point.php'
} as const;

export function buildHuntMobAttackUrl(
  mobId: string,
  cacheBuster = Date.now()
): string {
  const normalizedMobId = mobId.trim();

  if (normalizedMobId.length === 0) {
    throw new Error('Hunt mob id is required.');
  }

  if (!Number.isSafeInteger(cacheBuster) || cacheBuster <= 0) {
    throw new Error('Hunt mob attack cache buster must be a positive safe integer.');
  }

  const query = new URLSearchParams({
    json_mode_on: '1',
    object: 'common',
    action: 'action',
    code: 'ATTACK_BOT',
    bot_id: normalizedMobId,
    url_error: 'hunt.php',
    'in[need_confirm]': '1',
    'in[confirmed]': '0',
    'in[tSearch]': '0',
    _: String(cacheBuster)
  });

  return `${HUNT_MOB_ATTACK_REQUEST.url}?${query.toString()}`;
}
