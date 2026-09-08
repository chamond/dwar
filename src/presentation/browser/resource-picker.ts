import type { BotResourceId, BotResourceSnapshot } from '../../domain/entities/bot-resource';
import type { ResourceProbabilities } from '../../application/ports/resource-probability-store';
import { createMultiSelectPicker, type MultiSelectPickerElements } from './multi-select-picker';
import { formatResourceLabel } from './resource-label';

export interface ResourcePickerElements extends Omit<MultiSelectPickerElements<BotResourceSnapshot>, 'getSelectedItems' | 'getItemPercentages'> {
  getSelectedResources(): readonly BotResourceSnapshot[];
  getResourceProbabilities(): ResourceProbabilities;
}

export interface ResourcePickerOptions {
  selectedResourceIds?: readonly BotResourceId[] | null | undefined;
  resourceProbabilities?: ResourceProbabilities | null | undefined;
  onSelectionChange?: ((resources: readonly BotResourceSnapshot[]) => void) | undefined;
  onProbabilitiesChange?: ((probabilities: ResourceProbabilities) => void) | undefined;
}

export function createResourcePicker(
  resources: readonly BotResourceSnapshot[],
  options: ResourcePickerOptions = {}
): ResourcePickerElements {
  const picker = createMultiSelectPicker(resources, {
    selectedItemIds: options.selectedResourceIds,
    onSelectionChange: options.onSelectionChange,
    initialItemPercentages: options.resourceProbabilities,
    onItemPercentagesChange: options.onProbabilitiesChange,
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
    },
    getResourceProbabilities(): ResourceProbabilities {
      return picker.getItemPercentages();
    }
  };
}
