import type { BotResourceId, BotResourceSnapshot } from '../../domain/entities/bot-resource';
import type { ProfessionRecipeId, ProfessionRecipeSnapshot } from '../../domain/entities/profession-recipe';
import { getClearLogIcon } from './clear-log-icon';
import { getCraftIcon } from './craft-icon';
import { createMiningActionControl, type MiningActionControl } from './mining-action-control';
import { createProcessBar, type ProcessBarElements } from './process-bar';
import {
  createProfessionRecipePicker,
  type ProfessionRecipePickerElements
} from './profession-recipe-picker';
import { createResourcePicker, type ResourcePickerElements } from './resource-picker';
import { createTabs, type TabsElements } from './tabs';
import { createVolumeControl } from './volume-control';

export type BotPanelTabId = 'mining' | 'crafting';

export interface BotPanelElements {
  panel: HTMLElement;
  header: HTMLElement;
  closeButton: HTMLButtonElement;
  tabs: TabsElements<BotPanelTabId>;
  miningAction: MiningActionControl;
  splinterHelpButton: HTMLButtonElement;
  startCraftingButton: HTMLButtonElement;
  resourcePicker: ResourcePickerElements;
  recipePicker: ProfessionRecipePickerElements;
  miningClearLogButton: HTMLButtonElement;
  miningLogList: HTMLElement;
  miningProcessBar: ProcessBarElements;
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
  onSoundVolumeChange?: ((volume: number) => void) | undefined;
}

export function createBotPanel(
  resources: readonly BotResourceSnapshot[],
  recipes: readonly ProfessionRecipeSnapshot[],
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
  const craftingTab = createCraftingTab(recipes, options);
  const tabs = createTabs<BotPanelTabId>([
    {
      id: 'mining',
      label: 'Добыча',
      panel: miningTab.root
    },
    {
      id: 'crafting',
      label: 'Крафт',
      panel: craftingTab.root
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
    startCraftingButton: craftingTab.startCraftingButton,
    resourcePicker: miningTab.resourcePicker,
    recipePicker: craftingTab.recipePicker,
    miningClearLogButton: miningTab.logSection.clearLogButton,
    miningLogList: miningTab.logSection.logList,
    miningProcessBar: miningTab.processBar,
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

  const resourcePicker = createResourcePicker(resources, {
    selectedResourceIds: options.selectedResourceIds,
    onSelectionChange: options.onResourceSelectionChange
  });

  const actionGroup = document.createElement('div');
  actionGroup.className = 'dwar-panel__action-buttons';
  actionGroup.append(miningAction.root, splinterHelpButton);

  const selectorGroup = document.createElement('div');
  selectorGroup.className = 'dwar-panel__selectors';
  selectorGroup.append(resourcePicker.root);
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
