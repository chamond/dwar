import type { BotResourceId, BotResourceSnapshot } from '../../domain/entities/bot-resource';
import { createMultiSelectPicker, type MultiSelectPickerElements } from './multi-select-picker';
import { formatResourceLabel } from './resource-label';

export interface ResourcePickerElements extends Omit<MultiSelectPickerElements<BotResourceSnapshot>, 'getSelectedItems'> {
  getSelectedResources(): readonly BotResourceSnapshot[];
}

export interface ResourcePickerOptions {
  selectedResourceIds?: readonly BotResourceId[] | null | undefined;
  onSelectionChange?: ((resources: readonly BotResourceSnapshot[]) => void) | undefined;
}

export function createResourcePicker(
  resources: readonly BotResourceSnapshot[],
  options: ResourcePickerOptions = {}
): ResourcePickerElements {
  const picker = createMultiSelectPicker(resources, {
    selectedItemIds: options.selectedResourceIds,
    onSelectionChange: options.onSelectionChange,
    toggleLabel: 'Ресурсы',
    menuId: 'dwar-resource-picker-menu',
    formatItemLabel: formatResourceLabel
  });

  return {
    root: picker.root,
    toggleButton: picker.toggleButton,
    menu: picker.menu,
    close: picker.close,
    getSelectedResources(): readonly BotResourceSnapshot[] {
      return picker.getSelectedItems();
    }
  };
}
