import { EMPTY, catchError, finalize, tap, type Subscription } from 'rxjs';
import { isHuntAttackMinigameRequiredError } from '../../application/errors/hunt-attack-minigame-required-error';
import type { HuntAttackMobInfo } from '../../application/events/hunt-attack-event';
import type { RunHuntMobAttacksUseCase } from '../../application/use-cases/run-hunt-mob-attacks';
import type { AddBotLog } from './bot-log-appender';
import { presentHuntAttackEvent } from './hunt-attack-event-presenter';
import type { HuntingControlsElements } from './hunting-controls';
import type { ProcessErrorReporter } from './process-error-reporter';

export interface HuntingController {
  toggle(): void;
  restart(): void;
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
  let activeFightMob: HuntAttackMobInfo | null = null;
  let stopRequested = false;
  let stoppedByUser = false;

  const setRunning = (isRunning: boolean, isStopping = false): void => {
    options.controls.actionButton.disabled = isStopping
      || (!isRunning && options.controls.getSelectedTargetIds().length === 0);
    options.controls.targetPicker.setDisabled(isRunning);
    options.controls.preferCrowdedTargetCheckbox.disabled = isRunning;
    options.controls.aggressiveHuntingCheckbox.disabled = isRunning;
    options.controls.angerMobCheckbox.disabled = isRunning
      || options.controls.getSelectedTargetIds().length > 1;
    options.controls.restartButton.disabled = !isRunning;
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

  const start = (
    isRestart = false,
    fightToResume: HuntAttackMobInfo | null = null
  ): void => {
    if (executionSubscription && !executionSubscription.closed) {
      return;
    }

    const targetIds = options.controls.getSelectedTargetIds();

    if (targetIds.length === 0) {
      options.addLog('Не выбраны целевые мобы.', {
        tone: 'failure'
      });
      return;
    }

    fightInProgress = fightToResume !== null;
    activeFightMob = fightToResume;
    stopRequested = false;
    stoppedByUser = false;
    setRunning(true);
    options.addLog(
      isRestart
        ? 'Автоматическая охота полностью перезапущена.'
        : 'Автоматическая охота начата.'
    );

    const subscription = options.runHuntMobAttacks.execute({
      targetIds,
      preferCrowdedTarget: options.controls.preferCrowdedTargetCheckbox.checked,
      aggressiveHunting: options.controls.aggressiveHuntingCheckbox.checked,
      angerMob: options.controls.angerMobCheckbox.checked,
      ...(fightToResume ? { activeFight: fightToResume } : {})
    }).pipe(
      tap((event) => {
        presentHuntAttackEvent(event, options.addLog);

        if (event.type === 'attack-request-sent') {
          fightInProgress = true;
          activeFightMob = event.mob;
        }

        if (event.type === 'fight-finished') {
          fightInProgress = false;
          activeFightMob = null;

          if (stopRequested) {
            stoppedByUser = true;
            executionSubscription?.unsubscribe();
          }
        }
      }),
      catchError((error: unknown) => {
        if (isHuntAttackMinigameRequiredError(error)) {
          options.addLog('Обнаружена мини-игра охоты.', {
            tone: 'failure'
          });
          return EMPTY;
        }

        options.reportError(error);
        return EMPTY;
      }),
      finalize(() => {
        executionSubscription = null;
        fightInProgress = false;
        activeFightMob = null;
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

  const restart = (): void => {
    if (!executionSubscription || executionSubscription.closed) {
      return;
    }

    const fightToResume = activeFightMob;
    stoppedByUser = false;
    executionSubscription.unsubscribe();
    start(true, fightToResume);
  };

  return {
    toggle(): void {
      if (executionSubscription && !executionSubscription.closed) {
        stop();
        return;
      }

      start();
    },
    restart,
    destroy(): void {
      executionSubscription?.unsubscribe();
      executionSubscription = null;
      fightInProgress = false;
      activeFightMob = null;
      stopRequested = false;
      stoppedByUser = false;
      setRunning(false);
    }
  };
}
