import {
  EMPTY,
  catchError,
  filter,
  finalize,
  map,
  of,
  retry,
  switchMap,
  tap,
  type Observable,
  type Subscription
} from 'rxjs';
import { isHuntMinigameRequiredError } from '../../application/errors/hunt-minigame-required-error';
import type { ResourceMiningEvent } from '../../application/events/resource-mining-event';
import type { HuntMinigameImageDownloader } from '../../application/ports/hunt-minigame-image-downloader';
import type {
  HuntMinigameRecognition,
  HuntMinigameRecognizer
} from '../../application/ports/hunt-minigame-recognizer';
import type { ForceStopResourceMiningUseCase } from '../../application/use-cases/force-stop-resource-mining';
import type { RunResourceMiningUseCase } from '../../application/use-cases/run-resource-mining';
import type { SolveHuntMinigameUseCase } from '../../application/use-cases/solve-hunt-minigame';
import type { AddBotLog } from './bot-log-appender';
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
import type { SplinterAlertSound } from './splinter-alert-sound';

export interface MiningProcessController {
  toggle(): void;
  forceStop(): void;
  restartAfterSplinter(): void;
}

export interface MiningProcessControllerOptions {
  action: MiningActionControl;
  resourcePicker: ResourcePickerElements;
  processBar: ProcessBarController;
  forceStopResourceMining: ForceStopResourceMiningUseCase;
  runResourceMining: RunResourceMiningUseCase;
  huntMinigameRecognizer: HuntMinigameRecognizer;
  huntMinigameImageDownloader: HuntMinigameImageDownloader;
  solveHuntMinigame: SolveHuntMinigameUseCase;
  splinterAlertSound: SplinterAlertSound;
  addLog: AddBotLog;
  onSplinterDetected(): void;
  presentMinigameRecognition(recognition: HuntMinigameRecognition): void;
  reportError: ProcessErrorReporter;
}

export function createMiningProcessController(
  options: MiningProcessControllerOptions
): MiningProcessController {
  let executionSubscription: Subscription | null = null;
  let forceStopSubscription: Subscription | null = null;
  let phase: MiningPhase = 'idle';
  let stopRequested = false;
  let stoppedByUser = false;

  const recoverFromMiningError = (error: unknown): Observable<unknown> => {
    if (!isHuntMinigameRequiredError(error)) {
      options.reportError(error);
      return EMPTY;
    }

    phase = 'busy';
    options.processBar.reset();
    options.addLog(
      `Обнаружена мини-игра, осталось ${error.timeLeftSeconds} сек. Распознаю изображение.`
    );

    return options.huntMinigameRecognizer.recognize().pipe(
      tap((recognition) => {
        options.presentMinigameRecognition(recognition);
      }),
      switchMap((recognition) =>
        options.solveHuntMinigame.execute(recognition.targetToSourceSequence).pipe(
          tap((event) => {
            if (event.type !== 'solution-delay-started') {
              return;
            }

            options.processBar.start({
              label: 'Ожидание решения мини-игры',
              durationMs: event.delayMs
            });
            options.addLog(
              `Решение мини-игры будет отправлено через ${formatDelaySeconds(event.delayMs)} сек.`
            );
          }),
          filter((event) => event.type === 'solution-submitted'),
          map(({ result }) => ({
            image: recognition.image,
            result
          }))
        )
      ),
      switchMap(({ image, result }) => {
        options.processBar.reset();

        if (result.isSuccessful) {
          if (stopRequested) {
            stoppedByUser = true;
            options.addLog('Мини-игра решена успешно (status="1"). Выполняю отложенную остановку.', {
              tone: 'success'
            });
            return EMPTY;
          }

          options.addLog(
            'Мини-игра решена успешно (status="1"). Добыча продолжается.',
            { tone: 'success' }
          );
          return of(undefined);
        }

        options.addLog(createRejectedSolutionMessage(result.status, result.message), {
          tone: 'failure'
        });

        try {
          options.huntMinigameImageDownloader.download(image);
        } catch {
          options.addLog('Не удалось скачать исходный PNG мини-игры.');
        }

        return EMPTY;
      }),
      catchError((minigameError: unknown) => {
        options.processBar.reset();
        options.reportError(minigameError);
        return EMPTY;
      })
    );
  };

  const start = (isRestartAfterSplinter = false): void => {
    const selectedResources = options.resourcePicker.getSelectedResources();

    if (selectedResources.length === 0) {
      options.addLog('Выберите хотя бы один ресурс для добычи.');
      return;
    }

    options.splinterAlertSound.prepare();

    stopRequested = false;
    stoppedByUser = false;
    options.resourcePicker.close();
    options.action.setState('active');
    const actionLabel = isRestartAfterSplinter
      ? 'Добыча возобновлена после снятия занозы'
      : 'Добыча запущена';
    options.addLog(`${actionLabel}: ${selectedResources.map(formatResourceLabel).join(', ')}.`);

    const miningEvents: Observable<ResourceMiningEvent> = options.runResourceMining.execute({
      getSelectedResourceIds: () => options.resourcePicker.getSelectedResources().map(({ id }) => id)
    }).pipe(
      retry({
        delay: recoverFromMiningError
      })
    );

    const subscription = miningEvents.pipe(
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

        if (event.type === 'splinter-detected') {
          options.splinterAlertSound.play();
          options.onSplinterDetected();
        }

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
    forceStop,
    restartAfterSplinter(): void {
      if (
        (executionSubscription && !executionSubscription.closed)
        || (forceStopSubscription && !forceStopSubscription.closed)
      ) {
        return;
      }

      start(true);
    }
  };
}

function createRejectedSolutionMessage(status: string | null, message: string | null): string {
  const statusLabel = status ?? 'отсутствует';
  const serverMessage = message ? ` Сообщение сервера: ${message}.` : '';

  return `Мини-игра не решена (status="${statusLabel}"). Добыча прекращена.${serverMessage}`;
}

function formatDelaySeconds(delayMs: number): string {
  return (delayMs / 1_000).toFixed(1).replace(/\.0$/, '');
}
