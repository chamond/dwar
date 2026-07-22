import type { ProfessionRecipe } from '../../domain/entities/profession-recipe';

export interface ProfessionRecipeCraftOptions {
  signal?: AbortSignal | undefined;
}

export interface ProfessionRecipeCrafter {
  craft(recipe: ProfessionRecipe, amount: number, options?: ProfessionRecipeCraftOptions): Promise<void>;
}
