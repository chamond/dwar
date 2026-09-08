import type { BotResourceId, BotResourceSnapshot } from '../../domain/entities/bot-resource';
import type { ResourceProbabilities } from '../../application/ports/resource-probability-store';
import {
  createMultiSelectPicker,
  type MultiSelectItemOptionElements,
  type MultiSelectPickerElements
} from './multi-select-picker';
import { formatResourceLabel } from './resource-label';

interface ResourceProbabilityControls {
  slider: HTMLInputElement;
  percentage: HTMLSpanElement;
}

export interface ResourcePickerElements
  extends Omit<MultiSelectPickerElements<BotResourceSnapshot>, 'getSelectedItems'> {
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
  const probabilities = new Map<BotResourceId, number>();
  const controls = new Map<BotResourceId, ResourceProbabilityControls>();
  let previouslySelectedIds = new Set<BotResourceId>();
  let selectedResourceIds = new Set<BotResourceId>();

  resources.forEach((resource) => {
    probabilities.set(resource.id, clampPercentage(options.resourceProbabilities?.[resource.id] ?? 0));
  });

  const updateControls = (): void => {
    controls.forEach(({ slider, percentage }, resourceId) => {
      const value = probabilities.get(resourceId) ?? 0;
      slider.value = String(value);
      percentage.textContent = `${value}%`;
      slider.setAttribute('aria-valuetext', `${value}%`);
    });
  };

  const rebalanceProbabilities = (changedId?: BotResourceId, changedValue?: number): void => {
    const selectedIds = [...selectedResourceIds];

    if (selectedIds.length === 0) {
      return;
    }

    if (changedId !== undefined && changedValue !== undefined && selectedIds.includes(changedId)) {
      probabilities.set(changedId, clampPercentage(changedValue));
      distributeRemaining(
        selectedIds.filter((resourceId) => resourceId !== changedId),
        100 - (probabilities.get(changedId) ?? 0),
        probabilities
      );
    } else {
      distributeRemaining(selectedIds, 100, probabilities);
    }

    updateControls();
  };

  const syncSelectedProbabilities = (selectedResources: readonly BotResourceSnapshot[]): void => {
    const nextSelectedIds = selectedResources.map(({ id }) => id);
    const addedIds = nextSelectedIds.filter((id) => !previouslySelectedIds.has(id));
    const existingIds = nextSelectedIds.filter((id) => !addedIds.includes(id));

    if (addedIds.length > 0) {
      const addedTotal = Math.floor((100 * addedIds.length) / nextSelectedIds.length);
      distributeRemaining(addedIds, addedTotal, probabilities);
      distributeRemaining(existingIds, 100 - addedTotal, probabilities);
    }

    selectedResourceIds = new Set(nextSelectedIds);
    rebalanceProbabilities();
    previouslySelectedIds = new Set(nextSelectedIds);
  };

  const picker = createMultiSelectPicker<BotResourceId, BotResourceSnapshot>(resources, {
    selectedItemIds: options.selectedResourceIds,
    onSelectionChange: (selectedResources) => {
      syncSelectedProbabilities(selectedResources);
      options.onSelectionChange?.(selectedResources);
      options.onProbabilitiesChange?.(getResourceProbabilities());
    },
    toggleLabel: 'Ресурсы',
    menuId: 'dwar-resource-picker-menu',
    formatItemLabel: formatResourceLabel,
    decorateItemOption: (resource, elements) => {
      createProbabilityControls(resource, elements, probabilities, controls, (resourceId, value) => {
        rebalanceProbabilities(resourceId, value);
        options.onProbabilitiesChange?.(getResourceProbabilities());
      });
    }
  });

  selectedResourceIds = new Set(picker.getSelectedItems().map(({ id }) => id));
  previouslySelectedIds = new Set(selectedResourceIds);
  rebalanceProbabilities();

  return {
    root: picker.root,
    toggleButton: picker.toggleButton,
    menu: picker.menu,
    close: picker.close,
    getSelectedResources(): readonly BotResourceSnapshot[] {
      return picker.getSelectedItems();
    },
    getResourceProbabilities
  };

  function getResourceProbabilities(): ResourceProbabilities {
    return Object.fromEntries(probabilities) as ResourceProbabilities;
  }
}

function createProbabilityControls(
  resource: BotResourceSnapshot,
  elements: MultiSelectItemOptionElements,
  probabilities: Map<BotResourceId, number>,
  controls: Map<BotResourceId, ResourceProbabilityControls>,
  onInput: (resourceId: BotResourceId, value: number) => void
): void {
  elements.option.classList.add('dwar-multi-select-option--with-slider');

  const percentage = document.createElement('span');
  percentage.className = 'dwar-resource-probability__percentage';
  percentage.textContent = `${probabilities.get(resource.id) ?? 0}%`;

  elements.content.append(percentage);

  const slider = document.createElement('input');
  slider.type = 'range';
  slider.className = 'dwar-resource-probability__slider';
  slider.min = '0';
  slider.max = '100';
  slider.step = '1';
  slider.value = String(probabilities.get(resource.id) ?? 0);
  slider.setAttribute('aria-label', `Вероятность добычи ${formatResourceLabel(resource)}`);
  slider.addEventListener('input', () => onInput(resource.id, Number(slider.value)));
  slider.addEventListener('click', (event) => event.stopPropagation());
  slider.addEventListener('pointerdown', (event) => event.stopPropagation());

  elements.option.append(slider);
  controls.set(resource.id, { slider, percentage });
}

function clampPercentage(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function distributeRemaining(
  ids: readonly BotResourceId[],
  total: number,
  probabilities: Map<BotResourceId, number>
): void {
  if (ids.length === 0) {
    return;
  }

  const currentValues = ids.map((id) => Math.max(0, probabilities.get(id) ?? 0));
  const currentTotal = currentValues.reduce((sum, value) => sum + value, 0);
  const exactValues = currentValues.map((value) => {
    return currentTotal > 0 ? (value / currentTotal) * total : total / ids.length;
  });
  const roundedValues = exactValues.map((value) => Math.floor(value));
  let remainder = total - roundedValues.reduce((sum, value) => sum + value, 0);
  const order = exactValues
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((left, right) => right.fraction - left.fraction);

  order.forEach(({ index }) => {
    if (remainder > 0) {
      roundedValues[index] = (roundedValues[index] ?? 0) + 1;
      remainder -= 1;
    }
  });

  ids.forEach((id, index) => probabilities.set(id, roundedValues[index] ?? 0));
}
