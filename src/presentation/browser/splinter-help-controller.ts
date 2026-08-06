import {
  EMPTY,
  catchError,
  finalize,
  tap,
  type Subscription
} from 'rxjs';
import type { RequestSplinterHelpUseCase } from '../../application/use-cases/request-splinter-help';
import type { AddBotLog } from './bot-log-appender';
import type { ProcessErrorReporter } from './process-error-reporter';
import { presentSplinterHelpEvent } from './splinter-help-event-presenter';

export interface SplinterHelpControllerOptions {
  button: HTMLButtonElement;
  requestSplinterHelp: RequestSplinterHelpUseCase;
  addLog: AddBotLog;
  reportError: ProcessErrorReporter;
}

export interface SplinterHelpController {
  confirmSplinter(): void;
  toggle(): void;
  destroy(): void;
}

export function createSplinterHelpController(
  options: SplinterHelpControllerOptions
): SplinterHelpController {
  let splinterConfirmed = false;
  let executionSubscription: Subscription | null = null;

  const setButtonState = (): void => {
    const isRunning = executionSubscription !== null && !executionSubscription.closed;
    options.button.disabled = !splinterConfirmed;

    if (isRunning && splinterConfirmed) {
      options.button.textContent = 'Отмена';
      options.button.classList.add('is-active');
      options.button.setAttribute('aria-label', 'Отменить цикл просьб о помощи');
      options.button.setAttribute('aria-busy', 'true');
      return;
    }

    options.button.textContent = 'Помощь';
    options.button.classList.remove('is-active');
    options.button.setAttribute('aria-label', 'Попросить игроков снять занозу');
    options.button.removeAttribute('aria-busy');
  };

  const start = (): void => {
    if (
      !splinterConfirmed
      || (executionSubscription && !executionSubscription.closed)
    ) {
      return;
    }

    const subscription = options.requestSplinterHelp.execute().pipe(
      tap((event) => {
        if (event.type === 'splinter-removed') {
          splinterConfirmed = false;
          setButtonState();
        }

        presentSplinterHelpEvent(event, options.addLog);
      }),
      catchError((error: unknown) => {
        options.reportError(error);
        return EMPTY;
      }),
      finalize(() => {
        executionSubscription = null;
        setButtonState();
      })
    ).subscribe();

    executionSubscription = subscription.closed ? null : subscription;
    setButtonState();
  };

  const cancel = (): void => {
    if (!executionSubscription || executionSubscription.closed) {
      return;
    }

    options.addLog('Протокол помощи отменён.');
    executionSubscription.unsubscribe();
  };

  const toggle = (): void => {
    if (executionSubscription && !executionSubscription.closed) {
      cancel();
      return;
    }

    start();
  };

  setButtonState();

  return {
    confirmSplinter(): void {
      options.requestSplinterHelp.confirmSplinter();
      splinterConfirmed = true;
      setButtonState();
    },
    toggle,
    destroy(): void {
      splinterConfirmed = false;
      executionSubscription?.unsubscribe();
      executionSubscription = null;
      setButtonState();
    }
  };
}
