import type {
  BotHuntTargetId,
  BotHuntTargetSnapshot
} from '../../domain/entities/bot-hunt-target';
import { createCheckboxOption } from './checkbox-option';
import {
  createHuntTargetPicker,
  type HuntTargetPickerElements
} from './hunt-target-picker';

export interface HuntingControlsElements {
  root: HTMLElement;
  actionButton: HTMLButtonElement;
  restartButton: HTMLButtonElement;
  targetPicker: HuntTargetPickerElements;
  preferCrowdedTargetCheckbox: HTMLInputElement;
  aggressiveHuntingCheckbox: HTMLInputElement;
  angerMobCheckbox: HTMLInputElement;
  getSelectedTargetIds(): readonly BotHuntTargetId[];
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

  const crowdingOption = createCheckboxOption({
    text: 'Выбирать кучного моба',
    title: 'Выбирать цель с минимальным расстоянием до ближайшего моба того же вида'
  });
  const aggressiveHuntingOption = createCheckboxOption({
    text: 'Агрессивная охота',
    title: 'Не учитывать расстояние до соседних мобов при проверке безопасности'
  });
  const angerOption = createCheckboxOption({
    text: 'Злить моба',
    title: 'После нападения автоматически злить выбранного моба в текущем бою'
  });
  const updateSelectionDependentControls = (
    selectedTargetIds: readonly BotHuntTargetId[]
  ): void => {
    actionButton.disabled = selectedTargetIds.length === 0;

    if (selectedTargetIds.length > 1) {
      angerOption.checkbox.checked = false;
      angerOption.checkbox.disabled = true;
      angerOption.label.title = 'Злость недоступна при выборе нескольких мобов';
      return;
    }

    angerOption.checkbox.disabled = false;
    angerOption.label.title = 'После нападения автоматически злить выбранного моба в текущем бою';
  };
  const targetPicker = createHuntTargetPicker(targets, {
    onSelectionChange: updateSelectionDependentControls
  });
  const selectorGroup = document.createElement('div');
  selectorGroup.className = 'dwar-panel__selectors dwar-hunting-controls__settings';
  selectorGroup.append(
    targetPicker.root,
    crowdingOption.label,
    aggressiveHuntingOption.label,
    angerOption.label
  );
  root.append(actionGroup, selectorGroup);

  updateSelectionDependentControls(targetPicker.getSelectedTargetIds());

  return {
    root,
    actionButton,
    restartButton,
    targetPicker,
    preferCrowdedTargetCheckbox: crowdingOption.checkbox,
    aggressiveHuntingCheckbox: aggressiveHuntingOption.checkbox,
    angerMobCheckbox: angerOption.checkbox,
    getSelectedTargetIds(): readonly BotHuntTargetId[] {
      return targetPicker.getSelectedTargetIds();
    }
  };
}
