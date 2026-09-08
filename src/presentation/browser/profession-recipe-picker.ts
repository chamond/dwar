import type { ProfessionRecipeId, ProfessionRecipeSnapshot } from '../../domain/entities/profession-recipe';
import { createMultiSelectPicker, type MultiSelectPickerElements } from './multi-select-picker';
import { formatProfessionRecipeLabel } from './profession-recipe-label';

export interface ProfessionRecipePickerElements
  extends Omit<MultiSelectPickerElements<ProfessionRecipeSnapshot>, 'getSelectedItems'> {
  getSelectedRecipes(): readonly ProfessionRecipeSnapshot[];
}

export interface ProfessionRecipePickerOptions {
  selectedRecipeIds?: readonly ProfessionRecipeId[] | null | undefined;
  onSelectionChange?: ((recipes: readonly ProfessionRecipeSnapshot[]) => void) | undefined;
}

export function createProfessionRecipePicker(
  recipes: readonly ProfessionRecipeSnapshot[],
  options: ProfessionRecipePickerOptions = {}
): ProfessionRecipePickerElements {
  const picker = createMultiSelectPicker(recipes, {
    selectedItemIds: options.selectedRecipeIds,
    onSelectionChange: options.onSelectionChange,
    toggleLabel: 'Рецепты',
    menuId: 'dwar-recipe-picker-menu',
    formatItemLabel: formatProfessionRecipeLabel
  });

  return {
    root: picker.root,
    toggleButton: picker.toggleButton,
    menu: picker.menu,
    close: picker.close,
    getSelectedRecipes(): readonly ProfessionRecipeSnapshot[] {
      return picker.getSelectedItems();
    }
  };
}
