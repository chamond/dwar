import { EMPTY, catchError, finalize, tap, type Subscription } from 'rxjs';
import type { RunHuntMobAttacksUseCase } from '../../application/use-cases/run-hunt-mob-attacks';
import type { AddBotLog } from './bot-log-appender';
import { presentHuntAttackEvent } from './hunt-attack-event-presenter';
import type { HuntingControlsElements } from './hunting-controls';
import type { ProcessErrorReporter } from './process-error-reporter';

export interface HuntingController {
  toggle(): void;
  destroy(): void;
}

export interface HuntingControllerOptions {
  controls: HuntingControlsElements;
  runHuntMobAttacks: RunHuntMobAttacksUseCase;
  addLog: AddBotLog;
  reportError: ProcessErrorReporter;
}

export function createHuntingController(
  options: HuntingControllerOptions
): HuntingController {
  let executionSubscription: Subscription | null = null;
  let fightInProgress = false;
  let stopRequested = false;
  let stoppedByUser = false;

  const setRunning = (isRunning: boolean, isStopping = false): void => {
    options.controls.actionButton.disabled = isStopping
      || (!isRunning && options.controls.getSelectedTargetId() === null);
    options.controls.targetSelect.disabled = isRunning;
    options.controls.preferCrowdedTargetCheckbox.disabled = isRunning;
    options.controls.actionButton.classList.toggle('is-active', isRunning && !isStopping);
    options.controls.actionButton.classList.toggle('is-busy', isStopping);

    if (isRunning) {
      options.controls.actionButton.setAttribute(
        'aria-label',
        isStopping ? 'Автоматическая охота завершается' : 'Завершить автоматическую охоту'
      );
      options.controls.actionButton.textContent = 'Завершить';
      return;
    }

    options.controls.actionButton.setAttribute('aria-label', 'Начать автоматическую охоту');
    options.controls.actionButton.textContent = 'Начать';
  };

  const start = (): void => {
    if (executionSubscription && !executionSubscription.closed) {
      return;
    }

    const targetId = options.controls.getSelectedTargetId();

    if (!targetId) {
      options.addLog('Не выбран целевой моб.', {
        tone: 'failure'
      });
      return;
    }

    fightInProgress = false;
    stopRequested = false;
    stoppedByUser = false;
    setRunning(true);
    options.addLog('Автоматическая охота начата.');

    const subscription = options.runHuntMobAttacks.execute({
      targetId,
      preferCrowdedTarget: options.controls.preferCrowdedTargetCheckbox.checked
    }).pipe(
      tap((event) => {
        presentHuntAttackEvent(event, options.addLog);

        if (event.type === 'attack-request-sent') {
          fightInProgress = true;
        }

        if (event.type === 'fight-finished') {
          fightInProgress = false;

          if (stopRequested) {
            stoppedByUser = true;
            executionSubscription?.unsubscribe();
          }
        }
      }),
      catchError((error: unknown) => {
        options.reportError(error);
        return EMPTY;
      }),
      finalize(() => {
        executionSubscription = null;
        fightInProgress = false;
        stopRequested = false;
        setRunning(false);

        if (stoppedByUser) {
          options.addLog('Автоматическая охота завершена.');
        }

        stoppedByUser = false;
      })
    ).subscribe();

    executionSubscription = subscription.closed ? null : subscription;
  };

  const stop = (): void => {
    if (!executionSubscription || executionSubscription.closed || stopRequested) {
      return;
    }

    stopRequested = true;
    setRunning(true, fightInProgress);

    if (fightInProgress) {
      options.addLog('Автоматическая охота завершится после текущего боя.');
      return;
    }

    stoppedByUser = true;
    executionSubscription.unsubscribe();
  };

  return {
    toggle(): void {
      if (executionSubscription && !executionSubscription.closed) {
        stop();
        return;
      }

      start();
    },
    destroy(): void {
      executionSubscription?.unsubscribe();
      executionSubscription = null;
      fightInProgress = false;
      stopRequested = false;
      stoppedByUser = false;
      setRunning(false);
    }
  };
}
