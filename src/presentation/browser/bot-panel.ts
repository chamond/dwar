import type { BotResourceId, BotResourceSnapshot } from '../../domain/entities/bot-resource';
import type { HuntLocationId, HuntLocationSnapshot } from '../../domain/entities/hunt-location';
import type { ProfessionRecipeId, ProfessionRecipeSnapshot } from '../../domain/entities/profession-recipe';
import { getAlarmIcon } from './alarm-icon';
import { getClearLogIcon } from './clear-log-icon';
import { getCraftIcon } from './craft-icon';
import { createCraftAmountInput, type CraftAmountInputElements } from './craft-amount-input';
import { getPickaxeIcon } from './pickaxe-icon';
import { createHuntLocationSelect, type HuntLocationSelectElements } from './hunt-location-select';
import { createProcessBar, type ProcessBarElements } from './process-bar';
import {
  createProfessionRecipePicker,
  type ProfessionRecipePickerElements
} from './profession-recipe-picker';
import { createResourcePicker, type ResourcePickerElements } from './resource-picker';

export interface BotPanelElements {
  panel: HTMLElement;
  header: HTMLElement;
  clearLogButton: HTMLButtonElement;
  closeButton: HTMLButtonElement;
  alarmToggleButton: HTMLButtonElement;
  startMiningButton: HTMLButtonElement;
  startCraftingButton: HTMLButtonElement;
  craftAmountInput: CraftAmountInputElements;
  resourcePicker: ResourcePickerElements;
  recipePicker: ProfessionRecipePickerElements;
  locationSelect: HuntLocationSelectElements;
  logList: HTMLElement;
  miningProcessBar: ProcessBarElements;
  craftingProcessBars: HTMLElement;
  resizeHandle: HTMLButtonElement;
}

interface PanelHeaderElements {
  header: HTMLElement;
  closeButton: HTMLButtonElement;
  alarmToggleButton: HTMLButtonElement;
}

interface MiningControlsElements {
  controls: HTMLElement;
  startMiningButton: HTMLButtonElement;
  startCraftingButton: HTMLButtonElement;
  craftAmountInput: CraftAmountInputElements;
  resourcePicker: ResourcePickerElements;
  recipePicker: ProfessionRecipePickerElements;
  locationSelect: HuntLocationSelectElements;
}

interface LogSectionElements {
  root: HTMLElement;
  clearLogButton: HTMLButtonElement;
  logList: HTMLElement;
}

export interface BotPanelOptions {
  selectedResourceIds?: readonly BotResourceId[] | null | undefined;
  onResourceSelectionChange?: ((resources: readonly BotResourceSnapshot[]) => void) | undefined;
  selectedRecipeIds?: readonly ProfessionRecipeId[] | null | undefined;
  onRecipeSelectionChange?: ((recipes: readonly ProfessionRecipeSnapshot[]) => void) | undefined;
  selectedLocationId?: HuntLocationId | null | undefined;
  onLocationSelectionChange?: ((location: HuntLocationSnapshot) => void) | undefined;
}

export function createBotPanel(
  resources: readonly BotResourceSnapshot[],
  recipes: readonly ProfessionRecipeSnapshot[],
  locations: readonly HuntLocationSnapshot[],
  options: BotPanelOptions = {}
): BotPanelElements {
  const panel = document.createElement('section');
  panel.className = 'dwar-panel';
  panel.hidden = true;
  const headerElements = createPanelHeader();
  const controlsElements = createBotControls(resources, recipes, locations, options);
  const logSectionElements = createLogSection();
  const processBars = createProcessBars();
  const resizeHandle = createResizeHandle();
  panel.append(headerElements.header, controlsElements.controls, logSectionElements.root, processBars.root, resizeHandle);

  return {
    panel,
    header: headerElements.header,
    clearLogButton: logSectionElements.clearLogButton,
    closeButton: headerElements.closeButton,
    alarmToggleButton: headerElements.alarmToggleButton,
    startMiningButton: controlsElements.startMiningButton,
    startCraftingButton: controlsElements.startCraftingButton,
    craftAmountInput: controlsElements.craftAmountInput,
    resourcePicker: controlsElements.resourcePicker,
    recipePicker: controlsElements.recipePicker,
    locationSelect: controlsElements.locationSelect,
    logList: logSectionElements.logList,
    miningProcessBar: processBars.miningProcessBar,
    craftingProcessBars: processBars.craftingProcessBars,
    resizeHandle
  };
}

function createPanelHeader(): PanelHeaderElements {
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

  const alarmToggleButton = document.createElement('button');
  alarmToggleButton.type = 'button';
  alarmToggleButton.className = 'dwar-panel__icon-button dwar-panel__alarm-toggle';
  alarmToggleButton.dataset.dwarPanelAction = '';
  alarmToggleButton.setAttribute('aria-label', 'Сирена включена');
  alarmToggleButton.setAttribute('aria-pressed', 'true');
  alarmToggleButton.setAttribute('title', 'Сирена включена');
  alarmToggleButton.innerHTML = getAlarmIcon();

  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.className = 'dwar-panel__icon-button dwar-panel__close';
  closeButton.dataset.dwarPanelAction = '';
  closeButton.setAttribute('aria-label', 'Скрыть интерфейс');
  closeButton.innerHTML = '&times;';

  title.append(status, titleText);
  actions.append(alarmToggleButton, closeButton);
  header.append(title, actions);

  return {
    header,
    closeButton,
    alarmToggleButton
  };
}

function createBotControls(
  resources: readonly BotResourceSnapshot[],
  recipes: readonly ProfessionRecipeSnapshot[],
  locations: readonly HuntLocationSnapshot[],
  options: BotPanelOptions
): MiningControlsElements {
  const controls = document.createElement('div');
  controls.className = 'dwar-panel__controls';

  const startMiningButton = document.createElement('button');
  startMiningButton.type = 'button';
  startMiningButton.className = 'dwar-action-button dwar-mining-button';
  startMiningButton.setAttribute('aria-label', 'Начать добычу');
  startMiningButton.innerHTML = `${getPickaxeIcon()}<span>Добыча</span>`;

  const startCraftingButton = document.createElement('button');
  startCraftingButton.type = 'button';
  startCraftingButton.className = 'dwar-action-button dwar-crafting-button';
  startCraftingButton.setAttribute('aria-label', 'Начать крафт');
  startCraftingButton.innerHTML = `${getCraftIcon()}<span>Крафт</span>`;

  const resourcePicker = createResourcePicker(resources, {
    selectedResourceIds: options.selectedResourceIds,
    onSelectionChange: options.onResourceSelectionChange
  });

  const recipePicker = createProfessionRecipePicker(recipes, {
    selectedRecipeIds: options.selectedRecipeIds,
    onSelectionChange: options.onRecipeSelectionChange
  });
  const craftAmountInput = createCraftAmountInput();

  const locationSelect = createHuntLocationSelect(locations, {
    selectedLocationId: options.selectedLocationId,
    onLocationChange: options.onLocationSelectionChange
  });

  const actionGroup = document.createElement('div');
  actionGroup.className = 'dwar-panel__action-buttons';
  actionGroup.append(startMiningButton, startCraftingButton);

  const selectorGroup = document.createElement('div');
  selectorGroup.className = 'dwar-panel__selectors';
  const recipeRow = document.createElement('div');
  recipeRow.className = 'dwar-panel__recipe-row';
  recipeRow.append(recipePicker.root, craftAmountInput.root);
  selectorGroup.append(resourcePicker.root, recipeRow, locationSelect.root);
  controls.append(actionGroup, selectorGroup);

  return {
    controls,
    startMiningButton,
    startCraftingButton,
    craftAmountInput,
    resourcePicker,
    recipePicker,
    locationSelect
  };
}

function createLogList(): HTMLElement {
  const logList = document.createElement('div');
  logList.className = 'dwar-panel__logs';
  logList.setAttribute('role', 'log');
  logList.setAttribute('aria-live', 'polite');

  return logList;
}

function createLogSection(): LogSectionElements {
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

  const logList = createLogList();
  toolbar.append(clearLogButton);
  root.append(toolbar, logList);

  return {
    root,
    clearLogButton,
    logList
  };
}

function createProcessBars(): {
  root: HTMLElement;
  miningProcessBar: ProcessBarElements;
  craftingProcessBars: HTMLElement;
} {
  const root = document.createElement('div');
  root.className = 'dwar-process-bars';

  const miningProcessBar = createProcessBar('Добыча: ожидание');
  const craftingProcessBars = document.createElement('div');
  craftingProcessBars.className = 'dwar-crafting-process-bars';
  root.append(miningProcessBar.root, craftingProcessBars);

  return {
    root,
    miningProcessBar,
    craftingProcessBars
  };
}

function createResizeHandle(): HTMLButtonElement {
  const resizeHandle = document.createElement('button');
  resizeHandle.type = 'button';
  resizeHandle.className = 'dwar-panel__resize';
  resizeHandle.setAttribute('aria-label', 'Изменить размер панели');
  resizeHandle.setAttribute('title', 'Изменить размер панели');

  return resizeHandle;
}
