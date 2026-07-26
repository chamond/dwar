import { map, take, type Observable } from 'rxjs';
import { fromFetch } from 'rxjs/fetch';
import { UnexpectedServerResponseError } from '../../application/errors/unexpected-server-response-error';
import type { ProfessionRecipeCrafter } from '../../application/ports/profession-recipe-crafter';
import type { ProfessionRecipe } from '../../domain/entities/profession-recipe';
import {
  buildProfessionRecipeCraftBody,
  buildProfessionRecipeCraftUrl,
  PROFESSION_RECIPE_CRAFT_REQUEST
} from './profession-recipe-craft-request';

export class BrowserProfessionRecipeCrafter implements ProfessionRecipeCrafter {
  craft(recipe: ProfessionRecipe, amount: number): Observable<void> {
    const requestInit: RequestInit = {
      method: PROFESSION_RECIPE_CRAFT_REQUEST.method,
      credentials: 'same-origin',
      body: buildProfessionRecipeCraftBody(amount)
    };

    return fromFetch(buildProfessionRecipeCraftUrl(recipe.getRecipeId()), requestInit).pipe(
      map((response) => {
        if (!response.ok) {
          throw new UnexpectedServerResponseError(`Profession recipe craft failed with HTTP ${response.status}.`);
        }
      }),
      take(1)
    );
  }
}
