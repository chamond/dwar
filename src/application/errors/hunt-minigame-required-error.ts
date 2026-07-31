import { UnexpectedServerResponseError } from './unexpected-server-response-error';

export class HuntMinigameRequiredError extends UnexpectedServerResponseError {
  constructor(readonly timeLeftSeconds: number) {
    super(`Сервер запросил мини-игру охоты (time_left: ${timeLeftSeconds}).`);
    this.name = 'HuntMinigameRequiredError';
  }
}

export function isHuntMinigameRequiredError(
  error: unknown
): error is HuntMinigameRequiredError {
  return error instanceof HuntMinigameRequiredError;
}
