import { HuntMinigameRequiredError } from '../../application/errors/hunt-minigame-required-error';
import { UnexpectedServerResponseError } from '../../application/errors/unexpected-server-response-error';

export function throwIfHuntMinigameRequired(document: Document): void {
  const timeLeft = document.documentElement.getAttribute('time_left');

  if (timeLeft === null) {
    return;
  }

  if (!/^\d+$/.test(timeLeft)) {
    throw new UnexpectedServerResponseError(
      'Hunt minigame time_left must be a non-negative integer.'
    );
  }

  const timeLeftSeconds = Number(timeLeft);

  if (!Number.isSafeInteger(timeLeftSeconds)) {
    throw new UnexpectedServerResponseError(
      'Hunt minigame time_left exceeds the supported integer range.'
    );
  }

  throw new HuntMinigameRequiredError(timeLeftSeconds);
}
