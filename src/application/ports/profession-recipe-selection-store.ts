import type { ProfessionRecipeId } from '../../domain/entities/profession-recipe';

export interface ProfessionRecipeSelectionStore {
  load(): readonly ProfessionRecipeId[] | null;
  save(recipeIds: readonly ProfessionRecipeId[]): void;
}
