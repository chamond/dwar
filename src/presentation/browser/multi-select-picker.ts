export interface MultiSelectPickerItem<TId extends string = string> {
  id: TId;
  markerColor: string;
}

interface MultiSelectOptionElements<TItem extends MultiSelectPickerItem> {
  item: TItem;
  option: HTMLLabelElement;
  input: HTMLInputElement;
}

export interface MultiSelectPickerElements<TItem extends MultiSelectPickerItem> {
  root: HTMLElement;
  toggleButton: HTMLButtonElement;
  menu: HTMLElement;
  getSelectedItems(): readonly TItem[];
  close(): void;
}

export interface MultiSelectPickerOptions<TId extends string, TItem extends MultiSelectPickerItem<TId>> {
  selectedItemIds?: readonly TId[] | null | undefined;
  onSelectionChange?: ((items: readonly TItem[]) => void) | undefined;
  toggleLabel: string;
  menuId: string;
  formatItemLabel(item: TItem): string;
}

export function createMultiSelectPicker<TId extends string, TItem extends MultiSelectPickerItem<TId>>(
  items: readonly TItem[],
  options: MultiSelectPickerOptions<TId, TItem>
): MultiSelectPickerElements<TItem> {
  const root = document.createElement('div');
  root.className = 'dwar-resource-picker';

  const toggleButton = createToggleButton(options.menuId);
  const selectedCount = createSelectedCount();
  const chevron = createChevron();
  toggleButton.append(createToggleLabel(options.toggleLabel), selectedCount, chevron);

  const menu = document.createElement('div');
  menu.id = options.menuId;
  menu.className = 'dwar-resource-picker__menu';
  menu.setAttribute('role', 'listbox');
  menu.setAttribute('aria-multiselectable', 'true');
  menu.hidden = true;

  const selectedItemIds = options.selectedItemIds ? new Set(options.selectedItemIds) : null;
  const itemOptions = items.map((item) => {
    return createItemOption(item, selectedItemIds?.has(item.id) ?? true, options.formatItemLabel);
  });
  itemOptions.forEach(({ option }) => menu.append(option));

  root.append(toggleButton, menu);

  const setOpen = (isOpen: boolean): void => {
    root.classList.toggle('is-open', isOpen);
    menu.hidden = !isOpen;
    toggleButton.setAttribute('aria-expanded', String(isOpen));
  };

  const getSelectedItems = (): readonly TItem[] => {
    return itemOptions.filter(({ input }) => input.checked).map(({ item }) => item);
  };

  const updateSelectedState = (): void => {
    itemOptions.forEach(({ input, option }) => {
      option.setAttribute('aria-selected', String(input.checked));
    });

    selectedCount.textContent = String(getSelectedItems().length);
  };

  toggleButton.addEventListener('click', () => {
    setOpen(menu.hidden);
  });

  root.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      setOpen(false);
    }
  });

  itemOptions.forEach(({ input }) => {
    input.addEventListener('change', () => {
      updateSelectedState();
      options.onSelectionChange?.(getSelectedItems());
    });
  });

  updateSelectedState();

  return {
    root,
    toggleButton,
    menu,
    getSelectedItems,
    close(): void {
      setOpen(false);
    }
  };
}

function createToggleButton(menuId: string): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'dwar-resource-picker__toggle';
  button.setAttribute('aria-haspopup', 'listbox');
  button.setAttribute('aria-expanded', 'false');
  button.setAttribute('aria-controls', menuId);

  return button;
}

function createToggleLabel(text: string): HTMLElement {
  const label = document.createElement('span');
  label.className = 'dwar-resource-picker__toggle-label';
  label.textContent = text;

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

function createItemOption<TItem extends MultiSelectPickerItem>(
  item: TItem,
  isSelected: boolean,
  formatItemLabel: (item: TItem) => string
): MultiSelectOptionElements<TItem> {
  const option = document.createElement('label');
  option.className = 'dwar-resource-option';
  option.setAttribute('role', 'option');
  option.setAttribute('aria-selected', String(isSelected));

  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = isSelected;
  input.value = item.id;

  const badge = document.createElement('span');
  badge.className = 'dwar-resource-option__badge';
  badge.style.setProperty('--dwar-resource-color', item.markerColor);

  const swatch = document.createElement('span');
  swatch.className = 'dwar-resource-option__swatch';
  swatch.setAttribute('aria-hidden', 'true');

  const name = document.createElement('span');
  name.className = 'dwar-resource-option__name';
  name.textContent = formatItemLabel(item);

  badge.append(swatch, name);
  option.append(input, badge);

  return {
    item,
    option,
    input
  };
}
