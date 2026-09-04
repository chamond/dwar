import type { BotResourceId, BotResourceSnapshot } from '../../domain/entities/bot-resource';
import type { BotHuntTargetSnapshot } from '../../domain/entities/bot-hunt-target';
import type { ProfessionRecipeId, ProfessionRecipeSnapshot } from '../../domain/entities/profession-recipe';
import type { HuntingSettings } from '../../application/ports/hunting-settings-store';
import { createCheckboxOption } from './checkbox-option';
import {
  createExchangeMonitoringTab,
  type ExchangeMonitoringTabElements
} from './exchange-monitoring-tab';
import { getClearLogIcon } from './clear-log-icon';
import { getCraftIcon } from './craft-icon';
import { createMiningActionControl, type MiningActionControl } from './mining-action-control';
import { createHuntingControls, type HuntingControlsElements } from './hunting-controls';
import { createProcessBar, type ProcessBarElements } from './process-bar';
import {
  createProfessionRecipePicker,
  type ProfessionRecipePickerElements
} from './profession-recipe-picker';
import { createResourcePicker, type ResourcePickerElements } from './resource-picker';
import { createTabs, type TabsElements } from './tabs';
import { createVolumeControl } from './volume-control';

export type BotPanelTabId = 'mining' | 'hunting' | 'crafting' | 'exchange-monitoring';

export interface BotPanelElements {
  panel: HTMLElement;
  header: HTMLElement;
  closeButton: HTMLButtonElement;
  tabs: TabsElements<BotPanelTabId>;
  miningAction: MiningActionControl;
  splinterHelpButton: HTMLButtonElement;
  autoSplinterHelpCheckbox: HTMLInputElement;
  huntingControls: HuntingControlsElements;
  exchangeMonitoring: ExchangeMonitoringTabElements;
  startCraftingButton: HTMLButtonElement;
  resourcePicker: ResourcePickerElements;
  recipePicker: ProfessionRecipePickerElements;
  miningClearLogButton: HTMLButtonElement;
  miningLogList: HTMLElement;
  miningProcessBar: ProcessBarElements;
  huntingClearLogButton: HTMLButtonElement;
  huntingLogList: HTMLElement;
  craftingClearLogButton: HTMLButtonElement;
  craftingLogList: HTMLElement;
  craftingProcessBars: HTMLElement;
  resizeHandle: HTMLButtonElement;
}

interface PanelHeaderElements {
  header: HTMLElement;
  closeButton: HTMLButtonElement;
}

interface MiningTabElements {
  root: HTMLElement;
  miningAction: MiningActionControl;
  splinterHelpButton: HTMLButtonElement;
  autoSplinterHelpCheckbox: HTMLInputElement;
  resourcePicker: ResourcePickerElements;
  logSection: LogSectionElements;
  processBar: ProcessBarElements;
}

interface CraftingTabElements {
  root: HTMLElement;
  startCraftingButton: HTMLButtonElement;
  recipePicker: ProfessionRecipePickerElements;
  logSection: LogSectionElements;
  processBars: HTMLElement;
}

interface HuntingTabElements {
  root: HTMLElement;
  controls: HuntingControlsElements;
  logSection: LogSectionElements;
}

interface LogSectionElements {
  root: HTMLElement;
  clearLogButton: HTMLButtonElement;
  logList: HTMLElement;
}

export interface BotPanelOptions {
  initialSoundVolume?: number | null | undefined;
  selectedResourceIds?: readonly BotResourceId[] | null | undefined;
  onResourceSelectionChange?: ((resources: readonly BotResourceSnapshot[]) => void) | undefined;
  selectedRecipeIds?: readonly ProfessionRecipeId[] | null | undefined;
  onRecipeSelectionChange?: ((recipes: readonly ProfessionRecipeSnapshot[]) => void) | undefined;
  huntingSettings?: HuntingSettings | null | undefined;
  onHuntingSettingsChange?: ((settings: HuntingSettings) => void) | undefined;
  onSoundVolumeChange?: ((volume: number) => void) | undefined;
}

export function createBotPanel(
  resources: readonly BotResourceSnapshot[],
  recipes: readonly ProfessionRecipeSnapshot[],
  huntTargets: readonly BotHuntTargetSnapshot[],
  options: BotPanelOptions = {}
): BotPanelElements {
  const panel = document.createElement('section');
  panel.className = 'dwar-panel';
  panel.hidden = true;
  const volumeControl = createVolumeControl({
    initialVolume: options.initialSoundVolume ?? undefined,
    onVolumeChange: options.onSoundVolumeChange
  });
  const headerElements = createPanelHeader(volumeControl.root);
  const miningTab = createMiningTab(resources, options);
  const huntingTab = createHuntingTab(huntTargets, options);
  const craftingTab = createCraftingTab(recipes, options);
  const exchangeMonitoringTab = createExchangeMonitoringTab();
  const tabs = createTabs<BotPanelTabId>([
    {
      id: 'mining',
      label: 'Добыча',
      panel: miningTab.root
    },
    {
      id: 'hunting',
      label: 'Охота',
      panel: huntingTab.root
    },
    {
      id: 'crafting',
      label: 'Крафт',
      panel: craftingTab.root
    },
    {
      id: 'exchange-monitoring',
      label: 'Мониторинг биржи',
      panel: exchangeMonitoringTab.root
    }
  ], 'mining');
  const resizeHandle = createResizeHandle();
  panel.append(
    headerElements.header,
    tabs.root,
    resizeHandle
  );

  return {
    panel,
    header: headerElements.header,
    closeButton: headerElements.closeButton,
    tabs,
    miningAction: miningTab.miningAction,
    splinterHelpButton: miningTab.splinterHelpButton,
    autoSplinterHelpCheckbox: miningTab.autoSplinterHelpCheckbox,
    huntingControls: huntingTab.controls,
    exchangeMonitoring: exchangeMonitoringTab,
    startCraftingButton: craftingTab.startCraftingButton,
    resourcePicker: miningTab.resourcePicker,
    recipePicker: craftingTab.recipePicker,
    miningClearLogButton: miningTab.logSection.clearLogButton,
    miningLogList: miningTab.logSection.logList,
    miningProcessBar: miningTab.processBar,
    huntingClearLogButton: huntingTab.logSection.clearLogButton,
    huntingLogList: huntingTab.logSection.logList,
    craftingClearLogButton: craftingTab.logSection.clearLogButton,
    craftingLogList: craftingTab.logSection.logList,
    craftingProcessBars: craftingTab.processBars,
    resizeHandle
  };
}

function createPanelHeader(volumeControl: HTMLElement): PanelHeaderElements {
  const header = document.createElement('header');
  header.className = 'dwar-panel__header';
  header.dataset.dwarDragHandle = '';

  const title = document.createElement('div');
  title.className = 'dwar-panel__title';

  const status = document.createElement('span');
  status.className = 'dwar-panel__status';
  status.setAttribute('aria-hidden', 'true');

  const titleText = document.createElement('span');
  titleText.textContent = 'DWAR Bot';

  const actions = document.createElement('div');
  actions.className = 'dwar-panel__actions';

  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.className = 'dwar-panel__icon-button dwar-panel__close';
  closeButton.dataset.dwarPanelAction = '';
  closeButton.setAttribute('aria-label', 'Скрыть интерфейс');
  closeButton.innerHTML = '&times;';

  title.append(status, titleText);
  actions.append(volumeControl, closeButton);
  header.append(title, actions);

  return {
    header,
    closeButton
  };
}

function createMiningTab(
  resources: readonly BotResourceSnapshot[],
  options: BotPanelOptions
): MiningTabElements {
  const root = document.createElement('div');
  const controls = document.createElement('div');
  controls.className = 'dwar-panel__controls';

  const miningAction = createMiningActionControl();
  const splinterHelpButton = createSplinterHelpButton();
  const autoSplinterHelpOption = createCheckboxOption({
    text: 'Автоматически просить о помощи',
    title: 'При обнаружении занозы автоматически запускать цикл просьб о помощи',
    initialChecked: true
  });

  const resourcePicker = createResourcePicker(resources, {
    selectedResourceIds: options.selectedResourceIds,
    onSelectionChange: options.onResourceSelectionChange
  });

  const actionGroup = document.createElement('div');
  actionGroup.className = 'dwar-panel__action-buttons';
  actionGroup.append(miningAction.root, splinterHelpButton);

  const selectorGroup = document.createElement('div');
  selectorGroup.className = 'dwar-panel__selectors';
  selectorGroup.append(
    resourcePicker.root,
    autoSplinterHelpOption.label
  );
  controls.append(actionGroup, selectorGroup);

  const logSection = createLogSection('Лог добычи');
  const processBars = createProcessBarsRoot();
  const processBar = createProcessBar('Добыча: ожидание');
  processBars.append(processBar.root);
  root.append(controls, logSection.root, processBars);

  return {
    root,
    miningAction,
    splinterHelpButton,
    autoSplinterHelpCheckbox: autoSplinterHelpOption.checkbox,
    resourcePicker,
    logSection,
    processBar
  };
}

function createSplinterHelpButton(): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'dwar-action-button dwar-splinter-help-button';
  button.disabled = true;
  button.setAttribute('aria-label', 'Попросить игроков снять занозу');
  button.textContent = 'Помощь';

  return button;
}

function createHuntingTab(
  targets: readonly BotHuntTargetSnapshot[],
  options: BotPanelOptions
): HuntingTabElements {
  const root = document.createElement('div');
  const controls = createHuntingControls(targets, {
    initialSettings: options.huntingSettings,
    onSettingsChange: options.onHuntingSettingsChange
  });
  const logSection = createLogSection('Лог охоты');
  root.append(controls.root, logSection.root);

  return {
    root,
    controls,
    logSection
  };
}

function createCraftingTab(
  recipes: readonly ProfessionRecipeSnapshot[],
  options: BotPanelOptions
): CraftingTabElements {
  const root = document.createElement('div');
  const controls = document.createElement('div');
  controls.className = 'dwar-panel__controls';

  const startCraftingButton = document.createElement('button');
  startCraftingButton.type = 'button';
  startCraftingButton.className = 'dwar-action-button dwar-crafting-button';
  startCraftingButton.setAttribute('aria-label', 'Начать крафт');
  startCraftingButton.innerHTML = `${getCraftIcon()}<span>Крафт</span>`;

  const recipePicker = createProfessionRecipePicker(recipes, {
    selectedRecipeIds: options.selectedRecipeIds,
    onSelectionChange: options.onRecipeSelectionChange
  });

  const actionGroup = document.createElement('div');
  actionGroup.className = 'dwar-panel__action-buttons';
  actionGroup.append(startCraftingButton);

  const selectorGroup = document.createElement('div');
  selectorGroup.className = 'dwar-panel__selectors';
  selectorGroup.append(recipePicker.root);
  controls.append(actionGroup, selectorGroup);

  const logSection = createLogSection('Лог крафта');
  const processBarsRoot = createProcessBarsRoot();
  const processBars = document.createElement('div');
  processBars.className = 'dwar-crafting-process-bars';
  processBarsRoot.append(processBars);
  root.append(controls, logSection.root, processBarsRoot);

  return {
    root,
    startCraftingButton,
    recipePicker,
    logSection,
    processBars
  };
}

function createLogList(ariaLabel: string): HTMLElement {
  const logList = document.createElement('div');
  logList.className = 'dwar-panel__logs';
  logList.setAttribute('role', 'log');
  logList.setAttribute('aria-live', 'polite');
  logList.setAttribute('aria-label', ariaLabel);

  return logList;
}

function createLogSection(ariaLabel: string): LogSectionElements {
  const root = document.createElement('div');
  root.className = 'dwar-panel__log-section';

  const toolbar = document.createElement('div');
  toolbar.className = 'dwar-panel__log-toolbar';

  const clearLogButton = document.createElement('button');
  clearLogButton.type = 'button';
  clearLogButton.className = 'dwar-panel__icon-button dwar-panel__clear-log';
  clearLogButton.dataset.dwarPanelAction = '';
  clearLogButton.setAttribute('aria-label', 'Очистить лог');
  clearLogButton.setAttribute('title', 'Очистить лог');
  clearLogButton.innerHTML = getClearLogIcon();

  const logList = createLogList(ariaLabel);
  toolbar.append(clearLogButton);
  root.append(toolbar, logList);

  return {
    root,
    clearLogButton,
    logList
  };
}

function createProcessBarsRoot(): HTMLElement {
  const root = document.createElement('div');
  root.className = 'dwar-process-bars';

  return root;
}

function createResizeHandle(): HTMLButtonElement {
  const resizeHandle = document.createElement('button');
  resizeHandle.type = 'button';
  resizeHandle.className = 'dwar-panel__resize';
  resizeHandle.setAttribute('aria-label', 'Изменить размер панели');
  resizeHandle.setAttribute('title', 'Изменить размер панели');

  return resizeHandle;
}
