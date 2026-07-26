export const BACKPACK_CONTENT_REQUEST = {
  method: 'GET',
  url: 'https://w1.dwar.ru/user_iframe.php'
} as const;

export function buildBackpackContentUrl(group: number): string {
  if (!Number.isInteger(group) || group < 0) {
    throw new Error('Backpack group must be a non-negative integer.');
  }

  return `${BACKPACK_CONTENT_REQUEST.url}?group=${encodeURIComponent(String(group))}`;
}
