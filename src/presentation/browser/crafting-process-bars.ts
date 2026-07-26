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

export interface CraftingProcessBarsController {
  handle(event: ProfessionCraftingEvent): void;
  reset(): void;
}

export function createCraftingProcessBarsController(container: HTMLElement): CraftingProcessBarsController {
  const idleElements = createProcessBar('Крафт: ожидание');
  const idleController = createProcessBarController(idleElements);
  const entries = new Map<ProfessionRecipeId, ProcessBarController>();

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

  const getController = (recipe: ProfessionCraftingRecipeInfo): ProcessBarController => {
    const existingController = entries.get(recipe.id);

    if (existingController) {
      return existingController;
    }

    const elements = createProcessBar(`Крафт: ${formatProfessionRecipeLabel(recipe)}`);
    const controller = createProcessBarController(elements);
    entries.set(recipe.id, controller);
    container.append(elements.root);

    return controller;
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

      if (event.type === 'backpack-check-started') {
        hideIdle();

        for (const recipe of event.recipes) {
          getController(recipe).busy({
            label: `Проверка ресурсов: ${formatProfessionRecipeLabel(recipe)}`,
            accentColor: recipe.markerColor
          });
        }

        return;
      }

      hideIdle();
      const controller = getController(event.recipe);

      switch (event.type) {
        case 'craft-request-started':
          controller.busy({
            label: `Отправка ${formatProfessionRecipeLabel(event.recipe)}`,
            accentColor: event.recipe.markerColor
          });
          return;

        case 'craft-started':
          controller.start({
            label: `Крафт ${formatProfessionRecipeLabel(event.recipe)}`,
            durationMs: event.durationMs,
            accentColor: event.recipe.markerColor
          });
          return;

        case 'craft-completed':
          controller.complete();
          return;

        case 'recipe-stopped':
          controller.reset();
          controller.setLabel(`Нет ресурсов: ${formatProfessionRecipeLabel(event.recipe)}`);
          return;
      }
    },

    reset
  };
}
