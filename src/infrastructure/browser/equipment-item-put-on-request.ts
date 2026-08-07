const EQUIPMENT_RETURN_URL = 'user_iframe.php?group=2&update_swf=1';

export const EQUIPMENT_ITEM_PUT_ON_REQUEST = {
  method: 'GET',
  url: 'https://w1.dwar.ru/action_run.php'
} as const;

export function buildEquipmentItemPutOnUrl(
  artifactId: number,
  cacheBuster = Date.now() + Math.random()
): string {
  if (!Number.isSafeInteger(artifactId) || artifactId <= 0) {
    throw new Error('Equipment artifact id must be a positive safe integer.');
  }

  const query = new URLSearchParams({
    code: 'PUT_ON',
    url_success: EQUIPMENT_RETURN_URL,
    url_error: EQUIPMENT_RETURN_URL,
    artifact_id: String(artifactId),
    'in[slot_num]': '0',
    'in[variant_effect]': '0',
    ajax: '1',
    _: String(cacheBuster)
  });

  return `${EQUIPMENT_ITEM_PUT_ON_REQUEST.url}?${query.toString()}`;
}
