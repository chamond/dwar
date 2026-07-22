import type { ProfessionRecipe, ProfessionRecipeId } from '../../domain/entities/profession-recipe';

export interface ProfessionRecipeRepository {
  findAll(): readonly ProfessionRecipe[];
  findById(id: ProfessionRecipeId): ProfessionRecipe | null;
}
