import type { ProfessionRecipe } from '../../domain/entities/profession-recipe';
import type { ProfessionRecipeRepository } from '../ports/profession-recipe-repository';

export class ListProfessionRecipesUseCase {
  constructor(private readonly professionRecipeRepository: ProfessionRecipeRepository) {}

  execute(): readonly ProfessionRecipe[] {
    return this.professionRecipeRepository.findAll();
  }
}
