export class UnexpectedServerResponseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnexpectedServerResponseError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export function isUnexpectedServerResponseError(error: unknown): error is UnexpectedServerResponseError {
  return error instanceof UnexpectedServerResponseError
    || (error instanceof Error && error.name === 'UnexpectedServerResponseError');
}
