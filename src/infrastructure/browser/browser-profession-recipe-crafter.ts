import { UnexpectedServerResponseError } from '../../application/errors/unexpected-server-response-error';
import type {
  ProfessionRecipeCraftOptions,
  ProfessionRecipeCrafter
} from '../../application/ports/profession-recipe-crafter';
import type { ProfessionRecipe } from '../../domain/entities/profession-recipe';
import {
  buildProfessionRecipeCraftBody,
  buildProfessionRecipeCraftUrl,
  PROFESSION_RECIPE_CRAFT_REQUEST
} from './profession-recipe-craft-request';

export class BrowserProfessionRecipeCrafter implements ProfessionRecipeCrafter {
  async craft(recipe: ProfessionRecipe, amount: number, options: ProfessionRecipeCraftOptions = {}): Promise<void> {
    const requestInit: RequestInit = {
      method: PROFESSION_RECIPE_CRAFT_REQUEST.method,
      credentials: 'same-origin',
      body: buildProfessionRecipeCraftBody(amount)
    };

    if (options.signal) {
      requestInit.signal = options.signal;
    }

    const response = await fetch(buildProfessionRecipeCraftUrl(recipe.getRecipeId()), requestInit);

    if (!response.ok) {
      throw new UnexpectedServerResponseError(`Profession recipe craft failed with HTTP ${response.status}.`);
    }
  }
}
