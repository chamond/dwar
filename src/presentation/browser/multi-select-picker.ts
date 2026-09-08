export interface MultiSelectPickerItem<TId extends string = string> {
  id: TId;
  markerColor: string;
}

interface MultiSelectOptionElements<TItem extends MultiSelectPickerItem> {
  item: TItem;
  option: HTMLElement;
  input: HTMLInputElement;
  content: HTMLElement;
}

export interface MultiSelectItemOptionElements {
  option: HTMLElement;
  input: HTMLInputElement;
  content: HTMLElement;
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
  decorateItemOption?: ((item: TItem, elements: MultiSelectItemOptionElements) => void) | undefined;
}

export function createMultiSelectPicker<TId extends string, TItem extends MultiSelectPickerItem<TId>>(
  items: readonly TItem[],
  options: MultiSelectPickerOptions<TId, TItem>
): MultiSelectPickerElements<TItem> {
  const root = document.createElement('div');
  root.className = 'dwar-multi-select';

  const toggleButton = createToggleButton(options.menuId);
  const selectedCount = createSelectedCount();
  const chevron = createChevron();
  toggleButton.append(createToggleLabel(options.toggleLabel), selectedCount, chevron);

  const menu = document.createElement('div');
  menu.id = options.menuId;
  menu.className = 'dwar-multi-select__menu';
  menu.setAttribute('role', 'listbox');
  menu.setAttribute('aria-multiselectable', 'true');
  menu.hidden = true;

  const selectedItemIds = options.selectedItemIds ? new Set(options.selectedItemIds) : null;
  const itemOptions = items.map((item) => {
    const optionElements = createItemOption(
      item,
      selectedItemIds?.has(item.id) ?? true,
      options.formatItemLabel
    );
    options.decorateItemOption?.(item, {
      option: optionElements.option,
      input: optionElements.input,
      content: optionElements.content
    });
    return optionElements;
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

    selectedCount.textContent = String(itemOptions.filter(({ input }) => input.checked).length);
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
  button.className = 'dwar-multi-select__toggle';
  button.setAttribute('aria-haspopup', 'listbox');
  button.setAttribute('aria-expanded', 'false');
  button.setAttribute('aria-controls', menuId);

  return button;
}

function createToggleLabel(text: string): HTMLElement {
  const label = document.createElement('span');
  label.className = 'dwar-multi-select__toggle-label';
  label.textContent = text;

  return label;
}

function createSelectedCount(): HTMLElement {
  const count = document.createElement('span');
  count.className = 'dwar-multi-select__count';

  return count;
}

function createChevron(): HTMLElement {
  const chevron = document.createElement('span');
  chevron.className = 'dwar-multi-select__chevron';
  chevron.textContent = '▾';
  chevron.setAttribute('aria-hidden', 'true');

  return chevron;
}

function createItemOption<TItem extends MultiSelectPickerItem>(
  item: TItem,
  isSelected: boolean,
  formatItemLabel: (item: TItem) => string
): MultiSelectOptionElements<TItem> {
  const option = document.createElement('div');
  option.className = 'dwar-multi-select-option';
  option.setAttribute('role', 'option');
  option.setAttribute('aria-selected', String(isSelected));

  const row = document.createElement('label');
  row.className = 'dwar-multi-select-option__row';

  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = isSelected;
  input.value = item.id;

  const content = document.createElement('span');
  content.className = 'dwar-multi-select-option__content';
  content.style.setProperty('--dwar-resource-color', item.markerColor);

  const swatch = document.createElement('span');
  swatch.className = 'dwar-multi-select-option__swatch';
  swatch.setAttribute('aria-hidden', 'true');

  const name = document.createElement('span');
  name.className = 'dwar-multi-select-option__name';
  name.textContent = formatItemLabel(item);

  content.append(swatch, name);
  row.append(input, content);

  option.append(row);

  return { item, option, input, content };
}
