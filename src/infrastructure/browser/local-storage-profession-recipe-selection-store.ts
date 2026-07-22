import type { ProfessionRecipeSelectionStore } from '../../application/ports/profession-recipe-selection-store';
import type { ProfessionRecipeId } from '../../domain/entities/profession-recipe';
import { loadJsonFromLocalStorage, saveJsonToLocalStorage } from './local-storage-json';

const STORAGE_KEY = 'dwar-bot.profession-recipe-selection.v1';
const KNOWN_RECIPE_IDS: readonly ProfessionRecipeId[] = ['agate-dust', 'aquamarine-dust', 'turquoise-dust'];

export class LocalStorageProfessionRecipeSelectionStore implements ProfessionRecipeSelectionStore {
  load(): readonly ProfessionRecipeId[] | null {
    return loadJsonFromLocalStorage(STORAGE_KEY, isRecipeSelection);
  }

  save(recipeIds: readonly ProfessionRecipeId[]): void {
    saveJsonToLocalStorage(STORAGE_KEY, Array.from(new Set(recipeIds)).filter(isProfessionRecipeId));
  }
}

function isRecipeSelection(value: unknown): value is readonly ProfessionRecipeId[] {
  return Array.isArray(value) && value.every(isProfessionRecipeId);
}

function isProfessionRecipeId(value: unknown): value is ProfessionRecipeId {
  return typeof value === 'string' && KNOWN_RECIPE_IDS.includes(value as ProfessionRecipeId);
}
