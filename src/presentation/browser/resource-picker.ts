import type { BotResourceId, BotResourceSnapshot } from '../../domain/entities/bot-resource';
import { formatResourceLabel } from './resource-label';

interface ResourceOptionElements {
  resource: BotResourceSnapshot;
  option: HTMLLabelElement;
  input: HTMLInputElement;
}

export interface ResourcePickerElements {
  root: HTMLElement;
  toggleButton: HTMLButtonElement;
  menu: HTMLElement;
  getSelectedResources(): readonly BotResourceSnapshot[];
  close(): void;
}

export interface ResourcePickerOptions {
  selectedResourceIds?: readonly BotResourceId[] | null | undefined;
  onSelectionChange?: ((resources: readonly BotResourceSnapshot[]) => void) | undefined;
}

export function createResourcePicker(
  resources: readonly BotResourceSnapshot[],
  options: ResourcePickerOptions = {}
): ResourcePickerElements {
  const root = document.createElement('div');
  root.className = 'dwar-resource-picker';

  const toggleButton = createToggleButton();
  const selectedCount = createSelectedCount();
  const chevron = createChevron();
  toggleButton.append(createToggleLabel(), selectedCount, chevron);

  const menu = document.createElement('div');
  menu.id = 'dwar-resource-picker-menu';
  menu.className = 'dwar-resource-picker__menu';
  menu.setAttribute('role', 'listbox');
  menu.setAttribute('aria-multiselectable', 'true');
  menu.hidden = true;

  const selectedResourceIds = options.selectedResourceIds ? new Set(options.selectedResourceIds) : null;
  const resourceOptions = resources.map((resource) => {
    return createResourceOption(resource, selectedResourceIds?.has(resource.id) ?? true);
  });
  resourceOptions.forEach(({ option }) => menu.append(option));

  root.append(toggleButton, menu);

  const setOpen = (isOpen: boolean): void => {
    root.classList.toggle('is-open', isOpen);
    menu.hidden = !isOpen;
    toggleButton.setAttribute('aria-expanded', String(isOpen));
  };

  const getSelectedResources = (): readonly BotResourceSnapshot[] => {
    return resourceOptions.filter(({ input }) => input.checked).map(({ resource }) => resource);
  };

  const updateSelectedState = (): void => {
    resourceOptions.forEach(({ input, option }) => {
      option.setAttribute('aria-selected', String(input.checked));
    });

    selectedCount.textContent = String(getSelectedResources().length);
  };

  toggleButton.addEventListener('click', () => {
    setOpen(menu.hidden);
  });

  root.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      setOpen(false);
    }
  });

  resourceOptions.forEach(({ input }) => {
    input.addEventListener('change', () => {
      updateSelectedState();
      options.onSelectionChange?.(getSelectedResources());
    });
  });

  updateSelectedState();

  return {
    root,
    toggleButton,
    menu,
    getSelectedResources,
    close(): void {
      setOpen(false);
    }
  };
}

function createToggleButton(): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'dwar-resource-picker__toggle';
  button.setAttribute('aria-haspopup', 'listbox');
  button.setAttribute('aria-expanded', 'false');
  button.setAttribute('aria-controls', 'dwar-resource-picker-menu');

  return button;
}

function createToggleLabel(): HTMLElement {
  const label = document.createElement('span');
  label.className = 'dwar-resource-picker__toggle-label';
  label.textContent = 'Ресурсы';

  return label;
}

function createSelectedCount(): HTMLElement {
  const count = document.createElement('span');
  count.className = 'dwar-resource-picker__count';

  return count;
}

function createChevron(): HTMLElement {
  const chevron = document.createElement('span');
  chevron.className = 'dwar-resource-picker__chevron';
  chevron.textContent = '▾';
  chevron.setAttribute('aria-hidden', 'true');

  return chevron;
}

function createResourceOption(resource: BotResourceSnapshot, isSelected: boolean): ResourceOptionElements {
  const option = document.createElement('label');
  option.className = 'dwar-resource-option';
  option.setAttribute('role', 'option');
  option.setAttribute('aria-selected', 'true');

  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = isSelected;
  input.value = resource.id;

  const badge = document.createElement('span');
  badge.className = 'dwar-resource-option__badge';
  badge.style.setProperty('--dwar-resource-color', resource.markerColor);

  const swatch = document.createElement('span');
  swatch.className = 'dwar-resource-option__swatch';
  swatch.setAttribute('aria-hidden', 'true');

  const name = document.createElement('span');
  name.className = 'dwar-resource-option__name';
  name.textContent = formatResourceLabel(resource);

  badge.append(swatch, name);
  option.append(input, badge);

  return {
    resource,
    option,
    input
  };
}
