export class HuntAttackMinigameRequiredError extends Error {
  constructor() {
    super('Обнаружена мини-игра охоты.');
    this.name = 'HuntAttackMinigameRequiredError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export function isHuntAttackMinigameRequiredError(
  error: unknown
): error is HuntAttackMinigameRequiredError {
  return error instanceof HuntAttackMinigameRequiredError
    || (error instanceof Error && error.name === 'HuntAttackMinigameRequiredError');
}
