import type {
  BotHuntTargetId,
  BotHuntTargetSnapshot
} from '../../domain/entities/bot-hunt-target';
import type { HuntingSettings } from '../../application/ports/hunting-settings-store';
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
  getSettings(): HuntingSettings;
}

export interface HuntingControlsOptions {
  initialSettings?: HuntingSettings | null | undefined;
  onSettingsChange?: ((settings: HuntingSettings) => void) | undefined;
}

export function createHuntingControls(
  targets: readonly BotHuntTargetSnapshot[],
  options: HuntingControlsOptions = {}
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
    title: 'Выбирать цель с минимальным расстоянием до ближайшего моба того же вида',
    initialChecked: options.initialSettings?.preferCrowdedTarget
  });
  const aggressiveHuntingOption = createCheckboxOption({
    text: 'Агрессивная охота',
    title: 'Не учитывать расстояние до соседних мобов при проверке безопасности',
    initialChecked: options.initialSettings?.aggressiveHunting
  });
  const angerOption = createCheckboxOption({
    text: 'Злить моба',
    title: 'После нападения автоматически злить моба, если это доступно для его разновидности',
    initialChecked: options.initialSettings?.angerMob
  });
  const updateTargetSelectionState = (
    selectedTargetIds: readonly BotHuntTargetId[]
  ): void => {
    actionButton.disabled = selectedTargetIds.length === 0;
  };
  const notifySettingsChange = (targetIds: readonly BotHuntTargetId[]): void => {
    options.onSettingsChange?.({
      targetIds,
      preferCrowdedTarget: crowdingOption.checkbox.checked,
      aggressiveHunting: aggressiveHuntingOption.checkbox.checked,
      angerMob: angerOption.checkbox.checked
    });
  };
  const targetPicker = createHuntTargetPicker(targets, {
    selectedTargetIds: options.initialSettings?.targetIds,
    onSelectionChange: (targetIds) => {
      updateTargetSelectionState(targetIds);
      notifySettingsChange(targetIds);
    }
  });
  const notifyCurrentSettingsChange = (): void => {
    notifySettingsChange(targetPicker.getSelectedTargetIds());
  };
  crowdingOption.checkbox.addEventListener('change', notifyCurrentSettingsChange);
  aggressiveHuntingOption.checkbox.addEventListener('change', notifyCurrentSettingsChange);
  angerOption.checkbox.addEventListener('change', notifyCurrentSettingsChange);
  const selectorGroup = document.createElement('div');
  selectorGroup.className = 'dwar-panel__selectors dwar-hunting-controls__settings';
  selectorGroup.append(
    targetPicker.root,
    crowdingOption.label,
    aggressiveHuntingOption.label,
    angerOption.label
  );
  root.append(actionGroup, selectorGroup);

  updateTargetSelectionState(targetPicker.getSelectedTargetIds());

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
    },
    getSettings(): HuntingSettings {
      return {
        targetIds: targetPicker.getSelectedTargetIds(),
        preferCrowdedTarget: crowdingOption.checkbox.checked,
        aggressiveHunting: aggressiveHuntingOption.checkbox.checked,
        angerMob: angerOption.checkbox.checked
      };
    }
  };
}
