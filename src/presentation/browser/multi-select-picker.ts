export interface MultiSelectPickerItem<TId extends string = string> {
  id: TId;
  markerColor: string;
}

interface MultiSelectOptionElements<TItem extends MultiSelectPickerItem> {
  item: TItem;
  option: HTMLElement;
  input: HTMLInputElement;
  percentage: HTMLSpanElement | undefined;
  slider: HTMLInputElement | undefined;
}

export interface MultiSelectPickerElements<TItem extends MultiSelectPickerItem> {
  root: HTMLElement;
  toggleButton: HTMLButtonElement;
  menu: HTMLElement;
  getSelectedItems(): readonly TItem[];
  getItemPercentages(): Readonly<Partial<Record<TItem['id'], number>>>;
  close(): void;
}

export interface MultiSelectPickerOptions<TId extends string, TItem extends MultiSelectPickerItem<TId>> {
  selectedItemIds?: readonly TId[] | null | undefined;
  onSelectionChange?: ((items: readonly TItem[]) => void) | undefined;
  toggleLabel: string;
  menuId: string;
  formatItemLabel(item: TItem): string;
  initialItemPercentages?: Readonly<Partial<Record<TId, number>>> | null | undefined;
  onItemPercentagesChange?: ((percentages: Readonly<Partial<Record<TId, number>>>) => void) | undefined;
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
  const percentages = new Map<TId, number>();
  const itemOptions = items.map((item) => {
    const isSelected = selectedItemIds?.has(item.id) ?? true;
    percentages.set(item.id, options.initialItemPercentages?.[item.id] ?? 0);
    return createItemOption(
      item,
      isSelected,
      options.formatItemLabel,
      options.onItemPercentagesChange ? percentages.get(item.id) ?? 0 : undefined
    );
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

  const getItemPercentages = (): Readonly<Partial<Record<TId, number>>> => {
    return Object.fromEntries(percentages) as Partial<Record<TId, number>>;
  };

  let previouslySelectedIds = new Set(
    itemOptions.filter(({ input }) => input.checked).map(({ item }) => item.id)
  );

  const rebalancePercentages = (changedId?: TId, changedValue?: number): void => {
    const selected = itemOptions.filter(({ input }) => input.checked).map(({ item }) => item.id);
    if (selected.length === 0) {
      return;
    }

    if (changedId !== undefined && changedValue !== undefined && selected.includes(changedId)) {
      percentages.set(changedId, clampPercentage(changedValue));
      const otherIds = selected.filter((id) => id !== changedId);
      distributeRemaining(otherIds, 100 - (percentages.get(changedId) ?? 0), percentages);
    } else {
      distributeRemaining(selected, 100, percentages);
    }

    itemOptions.forEach(({ item, slider, percentage }) => {
      if (!slider || !percentage) {
        return;
      }

      const value = percentages.get(item.id) ?? 0;
      slider.value = String(value);
      percentage.textContent = `${value}%`;
      slider.setAttribute('aria-valuetext', `${value}%`);
    });
  };

  const updateSelectedState = (): void => {
    itemOptions.forEach(({ input, option }) => {
      option.setAttribute('aria-selected', String(input.checked));
    });

    const selectedIds = itemOptions.filter(({ input }) => input.checked).map(({ item }) => item.id);
    const addedIds = selectedIds.filter((id) => !previouslySelectedIds.has(id));
    const existingIds = selectedIds.filter((id) => !addedIds.includes(id));

    selectedCount.textContent = String(selectedIds.length);
    if (addedIds.length > 0) {
      const addedTotal = Math.floor((100 * addedIds.length) / selectedIds.length);
      distributeRemaining(addedIds, addedTotal, percentages);
      distributeRemaining(existingIds, 100 - addedTotal, percentages);
      rebalancePercentages();
    } else {
      rebalancePercentages();
    }
    previouslySelectedIds = new Set(selectedIds);
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
      options.onItemPercentagesChange?.(getItemPercentages());
    });
  });

  itemOptions.forEach(({ item, slider }) => {
    slider?.addEventListener('input', () => {
      rebalancePercentages(item.id, Number(slider.value));
      options.onItemPercentagesChange?.(getItemPercentages());
    });
    slider?.addEventListener('click', (event) => event.stopPropagation());
    slider?.addEventListener('pointerdown', (event) => event.stopPropagation());
  });

  updateSelectedState();

  return {
    root,
    toggleButton,
    menu,
    getSelectedItems,
    getItemPercentages,
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
  formatItemLabel: (item: TItem) => string,
  initialPercentage?: number
): MultiSelectOptionElements<TItem> {
  const option = document.createElement('div');
  option.className = 'dwar-resource-option';
  option.setAttribute('role', 'option');
  option.setAttribute('aria-selected', String(isSelected));

  const row = document.createElement('label');
  row.className = 'dwar-resource-option__row';

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

  const percentage = initialPercentage === undefined ? undefined : document.createElement('span');
  if (percentage) {
    percentage.className = 'dwar-resource-option__percentage';
    percentage.textContent = `${initialPercentage}%`;
  }

  badge.append(swatch, name);
  if (percentage) {
    badge.append(percentage);
  }
  row.append(input, badge);

  const slider = initialPercentage === undefined ? undefined : document.createElement('input');
  if (slider) {
    slider.type = 'range';
    slider.className = 'dwar-resource-option__slider';
    slider.min = '0';
    slider.max = '100';
    slider.step = '1';
    slider.value = String(initialPercentage);
    slider.setAttribute('aria-label', `Вероятность добычи ${formatItemLabel(item)}`);
  }

  option.append(row);
  if (slider) {
    option.append(slider);
  }

  return {
    item,
    option,
    input,
    percentage,
    slider
  };
}

function clampPercentage(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function distributeRemaining<TId extends string>(
  ids: readonly TId[],
  total: number,
  percentages: Map<TId, number>
): void {
  if (ids.length === 0) {
    return;
  }

  const currentValues = ids.map((id) => Math.max(0, percentages.get(id) ?? 0));
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

  ids.forEach((id, index) => percentages.set(id, roundedValues[index] ?? 0));
}
