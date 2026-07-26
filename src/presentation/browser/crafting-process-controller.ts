import { EMPTY, catchError, finalize, type Subscription } from 'rxjs';
import type { RunProfessionCraftingUseCase } from '../../application/use-cases/run-profession-crafting';
import type { ProfessionRecipeId } from '../../domain/entities/profession-recipe';
import type { AddBotLog } from './bot-log-appender';
import type { CraftAmountInputElements } from './craft-amount-input';
import { getCraftIcon } from './craft-icon';
import type { CraftingProcessBarsController } from './crafting-process-bars';
import { presentCraftingEvent } from './crafting-event-presenter';
import type { ProcessErrorReporter } from './process-error-reporter';
import type { ProfessionRecipePickerElements } from './profession-recipe-picker';

const EMPTY_SELECTION_FEEDBACK_DURATION_MS = 3_000;

export interface CraftingProcessController {
  toggle(): void;
}

export interface CraftingProcessControllerOptions {
  button: HTMLButtonElement;
  recipePicker: ProfessionRecipePickerElements;
  craftAmountInput: CraftAmountInputElements;
  processBars: CraftingProcessBarsController;
  runProfessionCrafting: RunProfessionCraftingUseCase;
  addLog: AddBotLog;
  prepareHumanAttentionAlarm(): void;
  reportError: ProcessErrorReporter;
}

export function createCraftingProcessController(
  options: CraftingProcessControllerOptions
): CraftingProcessController {
  let executionSubscription: Subscription | null = null;
  let stopRequested = false;
  let restartRequested = false;
  const activeRecipeIds = new Set<ProfessionRecipeId>();

  const start = (): void => {
    if (options.recipePicker.getSelectedRecipes().length === 0) {
      presentCraftingEvent({
        type: 'no-recipe-selected',
        delayMs: EMPTY_SELECTION_FEEDBACK_DURATION_MS
      }, options.addLog, options.processBars);
      return;
    }

    options.prepareHumanAttentionAlarm();

    stopRequested = false;
    restartRequested = false;
    activeRecipeIds.clear();
    options.processBars.reset();
    options.recipePicker.close();
    setButtonActive(options.button, true);

    const subscription = options.runProfessionCrafting.execute({
      getSelectedRecipeIds: () => options.recipePicker.getSelectedRecipes().map(({ id }) => id),
      getAmountPerRequest: () => options.craftAmountInput.getAmount()
    }).pipe(
      catchError((error: unknown) => {
        options.reportError(error);
        return EMPTY;
      }),
      finalize(() => {
        executionSubscription = null;
        setButtonActive(options.button, false);
        const shouldRestart = restartRequested;
        stopRequested = false;
        restartRequested = false;
        activeRecipeIds.clear();
        options.processBars.reset();

        if (shouldRestart) {
          start();
        }
      })
    ).subscribe({
      next: (event) => {
        presentCraftingEvent(event, options.addLog, options.processBars);

        if (event.type === 'craft-started') {
          activeRecipeIds.add(event.recipe.id);
        } else if (event.type === 'craft-completed') {
          activeRecipeIds.delete(event.recipe.id);
        } else if (event.type === 'crafting-cycle-completed' && stopRequested) {
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
    restartRequested = false;
    setButtonActive(options.button, false);

    if (activeRecipeIds.size === 0) {
      executionSubscription.unsubscribe();
    }
  };

  const toggleRestartAfterStop = (): void => {
    if (!executionSubscription || executionSubscription.closed || !stopRequested) {
      return;
    }

    restartRequested = !restartRequested;
    setButtonActive(options.button, restartRequested);
    options.addLog(
      restartRequested
        ? 'Крафт продолжится после текущего отката.'
        : 'Продолжение крафта отменено.'
    );
  };

  return {
    toggle(): void {
      if (executionSubscription && !executionSubscription.closed) {
        if (stopRequested) {
          toggleRestartAfterStop();
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
  button.setAttribute('aria-label', isActive ? 'Остановить крафт' : 'Начать крафт');
  button.innerHTML = `${getCraftIcon()}<span>${isActive ? 'Стоп' : 'Крафт'}</span>`;
}
