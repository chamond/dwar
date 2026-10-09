import type {
  ProfessionCraftingEvent,
  ProfessionCraftingRecipeInfo
} from '../../application/events/profession-crafting-event';
import type { AddBotLog } from './bot-log-appender';
import type { CraftingProcessBarsController } from './crafting-process-bars';
import type { BotLogLinePart } from './log-list';
import { formatProfessionRecipeLabel } from './profession-recipe-label';
import { formatResourceLabel } from './resource-label';

export function presentCraftingEvent(
  event: ProfessionCraftingEvent,
  addLog: AddBotLog,
  processBars: CraftingProcessBarsController
): void {
  processBars.handle(event);
  logCraftingEvent(event, addLog);
}

function logCraftingEvent(
  event: ProfessionCraftingEvent,
  addLog: AddBotLog
): void {
  switch (event.type) {
    case 'craft-started': {
      const remainder = event.remainingResourceAmount === null
        ? '.'
        : `, ресурсов остается: ${event.remainingResourceAmount}.`;

      addLog(
        `Крафтим ${event.amount} шт. ${formatProfessionRecipeLabel(event.recipe)}${remainder}`,
        {
          parts: [
            'Крафтим ',
            `${event.amount} шт. `,
            createRecipeLogPart(event.recipe),
            remainder
          ]
        }
      );
      return;
    }

    case 'recipe-stopped':
      addLog(
        `Крафт ${formatProfessionRecipeLabel(event.recipe)} остановлен: нет ${formatCraftingResourceLabel(event.recipe)}.`,
        {
          parts: [
            'Крафт ',
            createRecipeLogPart(event.recipe),
            ' остановлен: нет ',
            createCraftingResourceLogPart(event.recipe),
            '.'
          ]
        }
      );
      return;

    case 'no-recipe-selected':
    case 'backpack-check-started':
    case 'craft-request-started':
    case 'craft-completed':
    case 'crafting-cycle-completed':
      return;
  }
}

function createRecipeLogPart(recipe: ProfessionCraftingRecipeInfo): BotLogLinePart {
  const label = formatProfessionRecipeLabel(recipe);

  return {
    text: label,
    color: recipe.markerColor,
    title: `Рецепт ${label}`
  };
}

function formatCraftingResourceLabel(recipe: ProfessionCraftingRecipeInfo): string {
  if (recipe.resourceName === null || recipe.level === null) {
    return recipe.name;
  }

  return formatResourceLabel({
    name: recipe.resourceName,
    level: recipe.level
  });
}

function createCraftingResourceLogPart(recipe: ProfessionCraftingRecipeInfo): BotLogLinePart {
  const label = formatCraftingResourceLabel(recipe);

  return {
    text: label,
    color: recipe.markerColor,
    title: `Ресурс ${label}`
  };
}
