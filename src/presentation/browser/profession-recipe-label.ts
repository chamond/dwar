import type { ProfessionCraftingRecipeInfo } from '../../application/use-cases/run-profession-crafting';
import type { ProfessionRecipeSnapshot } from '../../domain/entities/profession-recipe';

export function formatProfessionRecipeLabel(recipe: ProfessionRecipeSnapshot | ProfessionCraftingRecipeInfo): string {
  return `${recipe.name} [${recipe.level}]`;
}
