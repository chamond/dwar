import type {
  ProfessionCraftingEvent,
  ProfessionCraftingRecipeInfo
} from '../../application/use-cases/run-profession-crafting';
import type { ProfessionRecipeId } from '../../domain/entities/profession-recipe';
import {
  createProcessBar,
  createProcessBarController,
  type ProcessBarController
} from './process-bar';
import { formatProfessionRecipeLabel } from './profession-recipe-label';

type CraftingProcessPhase = 'busy' | 'active' | 'pause' | 'complete';

interface CraftingProcessBarEntry {
  controller: ProcessBarController;
  phase: CraftingProcessPhase;
}

export interface CraftingProcessBarsController {
  handle(event: ProfessionCraftingEvent): void;
  reset(): void;
}

export function createCraftingProcessBarsController(container: HTMLElement): CraftingProcessBarsController {
  const idleElements = createProcessBar('Крафт: ожидание');
  const idleController = createProcessBarController(idleElements);
  const entries = new Map<ProfessionRecipeId, CraftingProcessBarEntry>();

  const showIdle = (): void => {
    if (idleElements.root.parentElement !== container) {
      container.append(idleElements.root);
    }
  };

  const hideIdle = (): void => {
    idleElements.root.remove();
  };

  const reset = (): void => {
    entries.clear();
    container.replaceChildren(idleElements.root);
    idleController.reset();
  };

  const getEntry = (recipe: ProfessionCraftingRecipeInfo): CraftingProcessBarEntry => {
    const existingEntry = entries.get(recipe.id);

    if (existingEntry) {
      return existingEntry;
    }

    const elements = createProcessBar(`Крафт: ${formatProfessionRecipeLabel(recipe)}`);
    const entry: CraftingProcessBarEntry = {
      controller: createProcessBarController(elements),
      phase: 'busy'
    };
    entries.set(recipe.id, entry);
    container.append(elements.root);

    return entry;
  };

  reset();

  return {
    handle(event: ProfessionCraftingEvent): void {
      if (event.type === 'no-recipe-selected') {
        if (entries.size === 0) {
          showIdle();
          idleController.start({
            label: 'Ожидание рецепта',
            durationMs: event.delayMs
          });
        }

        return;
      }

      hideIdle();
      const entry = getEntry(event.recipe);

      switch (event.type) {
        case 'craft-request-started':
          entry.phase = 'busy';
          entry.controller.busy({
            label: `Отправка ${formatProfessionRecipeLabel(event.recipe)}`,
            accentColor: event.recipe.markerColor
          });
          return;

        case 'craft-started':
          entry.phase = 'active';
          entry.controller.start({
            label: `Крафт ${formatProfessionRecipeLabel(event.recipe)}`,
            durationMs: event.cooldownMs,
            accentColor: event.recipe.markerColor
          });
          return;

        case 'craft-completed':
          entry.phase = 'complete';
          entry.controller.complete();
          return;

        case 'next-craft-delayed':
          entry.phase = 'pause';
          entry.controller.start({
            label: `Пауза ${formatProfessionRecipeLabel(event.recipe)}`,
            durationMs: event.delayMs,
            accentColor: event.recipe.markerColor
          });
          return;
      }
    },

    reset
  };
}
