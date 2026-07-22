import type { Delay } from '../../application/ports/delay';

export class BrowserDelay implements Delay {
  wait(durationMs: number, signal?: AbortSignal): Promise<void> {
    if (durationMs <= 0) {
      return Promise.resolve();
    }

    if (signal?.aborted) {
      return Promise.reject(createAbortError());
    }

    return new Promise((resolve, reject) => {
      let timeoutId = 0;
      let cleanup = (): void => undefined;
      const abort = (): void => {
        window.clearTimeout(timeoutId);
        cleanup();
        reject(createAbortError());
      };
      cleanup = (): void => {
        signal?.removeEventListener('abort', abort);
      };

      timeoutId = window.setTimeout(() => {
        cleanup();
        resolve();
      }, durationMs);

      signal?.addEventListener('abort', abort, { once: true });
    });
  }
}

function createAbortError(): Error {
  const error = new Error('Operation was stopped.');
  error.name = 'AbortError';

  return error;
}
