const HUNT_MINIGAME_CHECK_URL =
  'https://w1.dwar.ru/hunt_conf.php?mode=farm&action=minigame_check';

export const HUNT_MINIGAME_CHECK_REQUEST = {
  method: 'POST'
} as const;

export function buildHuntMinigameCheckUrl(
  targetToSourceSequence: readonly number[]
): string {
  return `${HUNT_MINIGAME_CHECK_URL}&sequence=${targetToSourceSequence.join(',')}`;
}
