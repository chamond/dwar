export const HUNT_CHECK_REQUEST = {
  method: 'GET',
  url: 'https://w1.dwar.ru/entry_point.php?object=fight&action=HuntCheck&json_mode_on=1'
} as const;

export function buildHuntCheckUrl(mobId: string): string {
  const normalizedMobId = mobId.trim();

  if (normalizedMobId.length === 0) {
    throw new Error('Hunt mob id is required.');
  }

  return `${HUNT_CHECK_REQUEST.url}&bot_id=${encodeURIComponent(normalizedMobId)}`;
}
