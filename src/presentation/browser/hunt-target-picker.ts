import type {
  BotHuntTargetId,
  BotHuntTargetSnapshot
} from '../../domain/entities/bot-hunt-target';

interface HuntTargetOptionElements {
  option: HTMLLabelElement;
  input: HTMLInputElement;
  order: HTMLElement;
}

export interface HuntTargetPickerElements {
  root: HTMLElement;
  toggleButton: HTMLButtonElement;
  menu: HTMLElement;
  getSelectedTargetIds(): readonly BotHuntTargetId[];
  setDisabled(isDisabled: boolean): void;
  close(): void;
}

export interface HuntTargetPickerOptions {
  onSelectionChange?: ((targetIds: readonly BotHuntTargetId[]) => void) | undefined;
}

const MENU_ID = 'dwar-hunt-target-picker-menu';

export function createHuntTargetPicker(
  targets: readonly BotHuntTargetSnapshot[],
  options: HuntTargetPickerOptions = {}
): HuntTargetPickerElements {
  const root = document.createElement('div');
  root.className = 'dwar-resource-picker dwar-hunt-target-picker';

  const toggleButton = createToggleButton();
  toggleButton.disabled = targets.length === 0;
  const selectedCount = document.createElement('span');
  selectedCount.className = 'dwar-resource-picker__count';
  const chevron = document.createElement('span');
  chevron.className = 'dwar-resource-picker__chevron';
  chevron.textContent = '▾';
  chevron.setAttribute('aria-hidden', 'true');
  toggleButton.append(createToggleLabel(), selectedCount, chevron);

  const menu = document.createElement('div');
  menu.id = MENU_ID;
  menu.className = 'dwar-resource-picker__menu dwar-hunt-target-picker__menu';
  menu.setAttribute('role', 'listbox');
  menu.setAttribute('aria-multiselectable', 'true');
  menu.hidden = true;

  let selectedTargetIds: readonly BotHuntTargetId[] = targets[0]
    ? [targets[0].id]
    : [];
  const targetOptions = new Map<BotHuntTargetId, HuntTargetOptionElements>();

  for (const [level, levelTargets] of groupTargetsByLevel(targets)) {
    const group = document.createElement('div');
    group.className = 'dwar-hunt-target-picker__group';
    group.setAttribute('role', 'group');
    group.setAttribute('aria-label', `Уровень ${level}`);

    const heading = document.createElement('div');
    heading.className = 'dwar-hunt-target-picker__group-title';
    heading.textContent = `Уровень ${level}`;
    group.append(heading);

    for (const target of levelTargets) {
      const optionElements = createTargetOption(target);
      targetOptions.set(target.id, optionElements);
      group.append(optionElements.option);
    }

    menu.append(group);
  }

  if (targets.length === 0) {
    const emptyState = document.createElement('div');
    emptyState.className = 'dwar-hunt-target-picker__empty';
    emptyState.textContent = 'Нет доступных целей';
    menu.append(emptyState);
  }

  root.append(toggleButton, menu);

  const setOpen = (isOpen: boolean): void => {
    root.classList.toggle('is-open', isOpen);
    menu.hidden = !isOpen;
    toggleButton.setAttribute('aria-expanded', String(isOpen));
  };

  const updateSelectedState = (): void => {
    for (const [targetId, elements] of targetOptions) {
      const selectionIndex = selectedTargetIds.indexOf(targetId);
      const isSelected = selectionIndex >= 0;
      elements.input.checked = isSelected;
      elements.option.setAttribute('aria-selected', String(isSelected));
      elements.order.hidden = !isSelected;
      elements.order.textContent = isSelected ? String(selectionIndex + 1) : '';
    }

    selectedCount.textContent = String(selectedTargetIds.length);
  };

  toggleButton.addEventListener('click', () => {
    setOpen(menu.hidden);
  });

  root.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      setOpen(false);
    }
  });

  for (const [targetId, elements] of targetOptions) {
    elements.input.addEventListener('change', () => {
      selectedTargetIds = updateOrderedSelection(
        selectedTargetIds,
        targetId,
        elements.input.checked
      );
      updateSelectedState();
      options.onSelectionChange?.(selectedTargetIds);
    });
  }

  updateSelectedState();

  return {
    root,
    toggleButton,
    menu,
    getSelectedTargetIds(): readonly BotHuntTargetId[] {
      return [...selectedTargetIds];
    },
    setDisabled(isDisabled: boolean): void {
      toggleButton.disabled = isDisabled || targets.length === 0;
      targetOptions.forEach(({ input }) => {
        input.disabled = isDisabled;
      });

      if (isDisabled) {
        setOpen(false);
      }
    },
    close(): void {
      setOpen(false);
    }
  };
}

export function updateOrderedSelection<TId extends string>(
  selectedIds: readonly TId[],
  changedId: TId,
  isSelected: boolean
): readonly TId[] {
  if (isSelected) {
    return selectedIds.includes(changedId)
      ? [...selectedIds]
      : [...selectedIds, changedId];
  }

  return selectedIds.filter((selectedId) => selectedId !== changedId);
}

function createToggleButton(): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'dwar-resource-picker__toggle';
  button.setAttribute('aria-label', 'Выбрать мобов для охоты');
  button.setAttribute('aria-haspopup', 'listbox');
  button.setAttribute('aria-expanded', 'false');
  button.setAttribute('aria-controls', MENU_ID);

  return button;
}

function createToggleLabel(): HTMLElement {
  const label = document.createElement('span');
  label.className = 'dwar-resource-picker__toggle-label';
  label.textContent = 'Мобы для охоты';

  return label;
}

function createTargetOption(target: BotHuntTargetSnapshot): HuntTargetOptionElements {
  const option = document.createElement('label');
  option.className = 'dwar-resource-option dwar-hunt-target-option';
  option.setAttribute('role', 'option');

  const input = document.createElement('input');
  input.type = 'checkbox';
  input.value = target.id;

  const order = document.createElement('span');
  order.className = 'dwar-hunt-target-option__order';
  order.title = 'Приоритет среди мобов того же уровня';

  const name = document.createElement('span');
  name.className = 'dwar-hunt-target-option__name';
  name.textContent = `${target.name}[${target.level}]`;

  option.append(input, order, name);

  return {
    option,
    input,
    order
  };
}

function groupTargetsByLevel(
  targets: readonly BotHuntTargetSnapshot[]
): readonly [number, readonly BotHuntTargetSnapshot[]][] {
  const targetsByLevel = new Map<number, BotHuntTargetSnapshot[]>();

  for (const target of targets) {
    const levelTargets = targetsByLevel.get(target.level) ?? [];
    levelTargets.push(target);
    targetsByLevel.set(target.level, levelTargets);
  }

  return [...targetsByLevel.entries()].sort(([leftLevel], [rightLevel]) => {
    return leftLevel - rightLevel;
  });
}
