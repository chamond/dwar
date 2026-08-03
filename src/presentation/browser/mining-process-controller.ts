import { EMPTY, catchError, finalize, ignoreElements, tap, type Subscription } from 'rxjs';
import { isHuntMinigameRequiredError } from '../../application/errors/hunt-minigame-required-error';
import type {
  HuntMinigameRecognition,
  HuntMinigameRecognizer
} from '../../application/ports/hunt-minigame-recognizer';
import type { ForceStopResourceMiningUseCase } from '../../application/use-cases/force-stop-resource-mining';
import type { RunResourceMiningUseCase } from '../../application/use-cases/run-resource-mining';
import type { SolveHuntMinigameUseCase } from '../../application/use-cases/solve-hunt-minigame';
import type { AddBotLog } from './bot-log-appender';
import type { HuntLocationSelectElements } from './hunt-location-select';
import {
  getMiningPhase,
  isMiningAttemptTerminal,
  presentMiningEvent,
  type MiningPhase
} from './mining-event-presenter';
import type { MiningActionControl } from './mining-action-control';
import type { ProcessBarController } from './process-bar';
import type { ProcessErrorReporter } from './process-error-reporter';
import type { ResourcePickerElements } from './resource-picker';
import { formatResourceLabel } from './resource-label';

export interface MiningProcessController {
  toggle(): void;
  forceStop(): void;
}

export interface MiningProcessControllerOptions {
  action: MiningActionControl;
  resourcePicker: ResourcePickerElements;
  locationSelect: HuntLocationSelectElements;
  processBar: ProcessBarController;
  forceStopResourceMining: ForceStopResourceMiningUseCase;
  runResourceMining: RunResourceMiningUseCase;
  huntMinigameRecognizer: HuntMinigameRecognizer;
  solveHuntMinigame: SolveHuntMinigameUseCase;
  addLog: AddBotLog;
  presentMinigameRecognition(
    recognition: HuntMinigameRecognition,
    solve: () => void
  ): void;
  prepareHumanAttentionAlarm(): void;
  reportError: ProcessErrorReporter;
}

export function createMiningProcessController(
  options: MiningProcessControllerOptions
): MiningProcessController {
  let executionSubscription: Subscription | null = null;
  let forceStopSubscription: Subscription | null = null;
  let minigameSolutionSubscription: Subscription | null = null;
  let phase: MiningPhase = 'idle';
  let stopRequested = false;
  let stoppedByUser = false;

  const solveMinigame = (targetToSourceSequence: readonly number[]): void => {
    if (minigameSolutionSubscription && !minigameSolutionSubscription.closed) {
      return;
    }

    options.addLog(`Отправляю решение мини-игры: ${targetToSourceSequence.join(',')}.`);

    const subscription = options.solveHuntMinigame
      .execute(targetToSourceSequence)
      .pipe(
        tap(() => {
          options.addLog('Головоломка решена, текущая добыча отменена.', {
            tone: 'success'
          });
        }),
        catchError((error: unknown) => {
          options.reportError(error);
          return EMPTY;
        }),
        finalize(() => {
          minigameSolutionSubscription = null;
        })
      )
      .subscribe();

    minigameSolutionSubscription = subscription.closed ? null : subscription;
  };

  const start = (): void => {
    const selectedResources = options.resourcePicker.getSelectedResources();
    const selectedLocation = options.locationSelect.getSelectedLocation();

    if (selectedResources.length === 0) {
      options.addLog('Выберите хотя бы один ресурс для добычи.');
      return;
    }

    if (!selectedLocation) {
      options.addLog('Выберите локацию для добычи.');
      return;
    }

    options.prepareHumanAttentionAlarm();

    stopRequested = false;
    stoppedByUser = false;
    options.resourcePicker.close();
    options.action.setState('active');
    options.addLog(
      `Добыча запущена: ${selectedResources.map(formatResourceLabel).join(', ')}. Локация: ${selectedLocation.name}.`
    );

    const subscription = options.runResourceMining.execute({
      getSelectedResourceIds: () => options.resourcePicker.getSelectedResources().map(({ id }) => id),
      selectedLocationId: selectedLocation.id
    }).pipe(
      catchError((error: unknown) => {
        options.reportError(error);

        if (isHuntMinigameRequiredError(error)) {
          return options.huntMinigameRecognizer.recognize().pipe(
            tap((recognition) => {
              const targetToSourceSequence = [
                ...recognition.targetToSourceSequence
              ];
              options.presentMinigameRecognition(
                recognition,
                () => solveMinigame(targetToSourceSequence)
              );
            }),
            catchError((recognitionError: unknown) => {
              options.addLog(
                `Не удалось распознать мини-игру: ${getErrorMessage(recognitionError)}.`
              );
              return EMPTY;
            }),
            ignoreElements()
          );
        }

        return EMPTY;
      }),
      finalize(() => {
        executionSubscription = null;
        options.action.setState('idle');
        phase = 'idle';
        stopRequested = false;
        options.processBar.reset();

        if (stoppedByUser) {
          options.addLog('Добыча остановлена.');
        }

        stoppedByUser = false;
      })
    ).subscribe({
      next: (event) => {
        phase = getMiningPhase(event);
        presentMiningEvent(event, options.addLog, options.processBar);

        if (stopRequested && isMiningAttemptTerminal(event)) {
          stoppedByUser = true;
          executionSubscription?.unsubscribe();
        }
      }
    });

    executionSubscription = subscription.closed ? null : subscription;
  };

  const stop = (): void => {
    if (!executionSubscription || executionSubscription.closed || stopRequested) {
      return;
    }

    stopRequested = true;
    options.action.setState('idle');

    if (phase === 'active' || phase === 'waiting') {
      options.addLog('Добыча остановится после результата текущего сбора.');
      return;
    }

    options.addLog('Останавливаю добычу.');
    stoppedByUser = true;
    executionSubscription.unsubscribe();
  };

  const resume = (): void => {
    if (!executionSubscription || executionSubscription.closed || !stopRequested) {
      return;
    }

    stopRequested = false;
    options.action.setState('active');
    options.addLog('Добыча продолжена.');
  };

  const forceStop = (): void => {
    if (
      !executionSubscription
      || executionSubscription.closed
      || (forceStopSubscription && !forceStopSubscription.closed)
    ) {
      return;
    }

    stopRequested = false;
    stoppedByUser = false;
    options.action.closeMenu();
    options.addLog('Принудительно останавливаю добычу.');
    executionSubscription.unsubscribe();
    options.action.setState('cancelling');

    const subscription = options.forceStopResourceMining.execute().pipe(
      tap(() => {
        options.addLog('Добыча принудительно остановлена.');
      }),
      catchError((error: unknown) => {
        options.reportError(error);
        return EMPTY;
      }),
      finalize(() => {
        forceStopSubscription = null;
        options.action.setState('idle');
      })
    ).subscribe();

    forceStopSubscription = subscription.closed ? null : subscription;
  };

  return {
    toggle(): void {
      if (forceStopSubscription && !forceStopSubscription.closed) {
        return;
      }

      if (executionSubscription && !executionSubscription.closed) {
        if (stopRequested) {
          resume();
          return;
        }

        stop();
        return;
      }

      start();
    },
    forceStop
  };
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'неизвестная ошибка';
}
