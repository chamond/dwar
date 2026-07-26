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
    case 'craft-started':
      addLog(
        `Крафтим ${event.amount} шт. ${formatProfessionRecipeLabel(event.recipe)}, ресурсов остается: ${event.remainingResourceAmount}.`,
        {
          parts: [
            'Крафтим ',
            `${event.amount} шт. `,
            createRecipeLogPart(event.recipe),
            `, ресурсов остается: ${event.remainingResourceAmount}.`
          ]
        }
      );
      return;

    case 'recipe-stopped':
      addLog(
        `Крафт ${formatProfessionRecipeLabel(event.recipe)} остановлен: ${formatCraftingResourceLabel(event.recipe)} отсутствует в рюкзаке.`,
        {
          parts: [
            'Крафт ',
            createRecipeLogPart(event.recipe),
            ' остановлен: ',
            createCraftingResourceLogPart(event.recipe),
            ' отсутствует в рюкзаке.'
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
