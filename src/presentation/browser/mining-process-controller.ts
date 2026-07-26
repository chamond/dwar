import { EMPTY, catchError, finalize, type Subscription } from 'rxjs';
import type { RunResourceMiningUseCase } from '../../application/use-cases/run-resource-mining';
import type { AddBotLog } from './bot-log-appender';
import type { HuntLocationSelectElements } from './hunt-location-select';
import {
  getMiningPhase,
  isMiningAttemptTerminal,
  presentMiningEvent,
  type MiningPhase
} from './mining-event-presenter';
import { getPickaxeIcon } from './pickaxe-icon';
import type { ProcessBarController } from './process-bar';
import type { ProcessErrorReporter } from './process-error-reporter';
import type { ResourcePickerElements } from './resource-picker';
import { formatResourceLabel } from './resource-label';

export interface MiningProcessController {
  toggle(): void;
}

export interface MiningProcessControllerOptions {
  button: HTMLButtonElement;
  resourcePicker: ResourcePickerElements;
  locationSelect: HuntLocationSelectElements;
  processBar: ProcessBarController;
  runResourceMining: RunResourceMiningUseCase;
  addLog: AddBotLog;
  prepareHumanAttentionAlarm(): void;
  reportError: ProcessErrorReporter;
}

export function createMiningProcessController(
  options: MiningProcessControllerOptions
): MiningProcessController {
  let executionSubscription: Subscription | null = null;
  let phase: MiningPhase = 'idle';
  let stopRequested = false;
  let stoppedByUser = false;

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
    setButtonActive(options.button, true);
    options.addLog(
      `Добыча запущена: ${selectedResources.map(formatResourceLabel).join(', ')}. Локация: ${selectedLocation.name}.`
    );

    const subscription = options.runResourceMining.execute({
      getSelectedResourceIds: () => options.resourcePicker.getSelectedResources().map(({ id }) => id),
      selectedLocationId: selectedLocation.id
    }).pipe(
      catchError((error: unknown) => {
        options.reportError(error);
        return EMPTY;
      }),
      finalize(() => {
        executionSubscription = null;
        setButtonActive(options.button, false);
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
    setButtonActive(options.button, false);

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
    setButtonActive(options.button, true);
    options.addLog('Добыча продолжена.');
  };

  return {
    toggle(): void {
      if (executionSubscription && !executionSubscription.closed) {
        if (stopRequested) {
          resume();
          return;
        }

        stop();
        return;
      }

      start();
    }
  };
}

function setButtonActive(button: HTMLButtonElement, isActive: boolean): void {
  button.classList.toggle('is-active', isActive);
  button.setAttribute('aria-label', isActive ? 'Остановить добычу' : 'Начать добычу');
  button.innerHTML = `${getPickaxeIcon()}<span>${isActive ? 'Стоп' : 'Добыча'}</span>`;
}
