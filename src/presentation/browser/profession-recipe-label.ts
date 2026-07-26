import type { ProfessionCraftingRecipeInfo } from '../../application/events/profession-crafting-event';
import type { ProfessionRecipeSnapshot } from '../../domain/entities/profession-recipe';

export function formatProfessionRecipeLabel(recipe: ProfessionRecipeSnapshot | ProfessionCraftingRecipeInfo): string {
  return `${recipe.name} [${recipe.level}]`;
}
