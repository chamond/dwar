import type {
  BotHuntTargetId,
  BotHuntTargetSnapshot
} from '../../domain/entities/bot-hunt-target';
import { createCheckboxOption } from './checkbox-option';

export interface HuntingControlsElements {
  root: HTMLElement;
  actionButton: HTMLButtonElement;
  restartButton: HTMLButtonElement;
  targetSelect: HTMLSelectElement;
  preferCrowdedTargetCheckbox: HTMLInputElement;
  getSelectedTargetId(): BotHuntTargetId | null;
}

export function createHuntingControls(
  targets: readonly BotHuntTargetSnapshot[]
): HuntingControlsElements {
  const root = document.createElement('div');
  root.className = 'dwar-panel__controls dwar-hunting-controls';

  const actionButton = document.createElement('button');
  actionButton.type = 'button';
  actionButton.className = 'dwar-action-button dwar-hunting-button';
  actionButton.setAttribute('aria-label', 'Начать автоматическую охоту');
  actionButton.textContent = 'Начать';

  const restartButton = document.createElement('button');
  restartButton.type = 'button';
  restartButton.className = 'dwar-action-button dwar-hunting-button dwar-hunting-restart-button';
  restartButton.disabled = true;
  restartButton.setAttribute(
    'aria-label',
    'Полностью перезапустить автоматическую охоту'
  );
  restartButton.title = 'Сбросить текущий цикл и запустить охоту заново';
  restartButton.textContent = 'Перезапустить';

  const actionGroup = document.createElement('div');
  actionGroup.className = 'dwar-panel__action-buttons';
  actionGroup.append(actionButton, restartButton);

  const targetSelect = createTargetSelect(targets);
  const crowdingOption = createCheckboxOption({
    text: 'Выбирать кучного моба',
    title: 'Выбирать цель с минимальным расстоянием до ближайшего моба того же вида'
  });
  const selectorGroup = document.createElement('div');
  selectorGroup.className = 'dwar-panel__selectors dwar-hunting-controls__settings';
  selectorGroup.append(targetSelect, crowdingOption.label);
  root.append(actionGroup, selectorGroup);

  actionButton.disabled = targets.length === 0;

  return {
    root,
    actionButton,
    restartButton,
    targetSelect,
    preferCrowdedTargetCheckbox: crowdingOption.checkbox,
    getSelectedTargetId(): BotHuntTargetId | null {
      return targets.some((target) => target.id === targetSelect.value)
        ? targetSelect.value as BotHuntTargetId
        : null;
    }
  };
}

function createTargetSelect(
  targets: readonly BotHuntTargetSnapshot[]
): HTMLSelectElement {
  const select = document.createElement('select');
  select.className = 'dwar-hunt-target-select';
  select.setAttribute('aria-label', 'Целевой моб');

  if (targets.length === 0) {
    const emptyOption = document.createElement('option');
    emptyOption.textContent = 'Нет доступных целей';
    emptyOption.value = '';
    select.append(emptyOption);
    select.disabled = true;

    return select;
  }

  for (const target of targets) {
    const option = document.createElement('option');
    option.value = target.id;
    option.textContent = `${target.name}[${target.level}]`;
    select.append(option);
  }

  return select;
}
