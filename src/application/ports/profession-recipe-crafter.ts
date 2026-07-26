import type { Observable } from 'rxjs';
import type { ProfessionRecipe } from '../../domain/entities/profession-recipe';

export interface ProfessionRecipeCrafter {
  craft(recipe: ProfessionRecipe, amount: number): Observable<void>;
}
