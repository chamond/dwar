export const HUNT_ZONE_DIAGNOSTICS_REQUEST = {
  method: 'GET',
  url: 'https://w1.dwar.ru/hunt_conf.php?mode=hunt_farm'
} as const;

export function buildHuntZoneDiagnosticsUrl(areaId: number): string {
  if (!Number.isInteger(areaId) || areaId <= 0) {
    throw new Error('Hunt zone area id must be a positive integer.');
  }

  return `${HUNT_ZONE_DIAGNOSTICS_REQUEST.url}&area_id=${areaId}&instance_id=0`;
}
