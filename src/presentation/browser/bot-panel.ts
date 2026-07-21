import type { BotResourceId, BotResourceSnapshot } from '../../domain/entities/bot-resource';
import type { HuntLocationId, HuntLocationSnapshot } from '../../domain/entities/hunt-location';
import { getClearLogIcon } from './clear-log-icon';
import { getPickaxeIcon } from './pickaxe-icon';
import { createHuntLocationSelect, type HuntLocationSelectElements } from './hunt-location-select';
import { createProcessBar, type ProcessBarElements } from './process-bar';
import { createResourcePicker, type ResourcePickerElements } from './resource-picker';

export interface BotPanelElements {
  panel: HTMLElement;
  header: HTMLElement;
  clearLogButton: HTMLButtonElement;
  closeButton: HTMLButtonElement;
  startMiningButton: HTMLButtonElement;
  resourcePicker: ResourcePickerElements;
  locationSelect: HuntLocationSelectElements;
  logList: HTMLElement;
  processBar: ProcessBarElements;
  resizeHandle: HTMLButtonElement;
}

interface PanelHeaderElements {
  header: HTMLElement;
  closeButton: HTMLButtonElement;
}

interface MiningControlsElements {
  controls: HTMLElement;
  startMiningButton: HTMLButtonElement;
  resourcePicker: ResourcePickerElements;
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
  selectedLocationId?: HuntLocationId | null | undefined;
  onLocationSelectionChange?: ((location: HuntLocationSnapshot) => void) | undefined;
}

export function createBotPanel(
  resources: readonly BotResourceSnapshot[],
  locations: readonly HuntLocationSnapshot[],
  options: BotPanelOptions = {}
): BotPanelElements {
  const panel = document.createElement('section');
  panel.className = 'dwar-panel';
  panel.hidden = true;
  const headerElements = createPanelHeader();
  const controlsElements = createMiningControls(resources, locations, options);
  const logSectionElements = createLogSection();
  const processBar = createProcessBar();
  const resizeHandle = createResizeHandle();
  panel.append(headerElements.header, controlsElements.controls, logSectionElements.root, processBar.root, resizeHandle);

  return {
    panel,
    header: headerElements.header,
    clearLogButton: logSectionElements.clearLogButton,
    closeButton: headerElements.closeButton,
    startMiningButton: controlsElements.startMiningButton,
    resourcePicker: controlsElements.resourcePicker,
    locationSelect: controlsElements.locationSelect,
    logList: logSectionElements.logList,
    processBar,
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

  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.className = 'dwar-panel__icon-button dwar-panel__close';
  closeButton.dataset.dwarPanelAction = '';
  closeButton.setAttribute('aria-label', 'Скрыть интерфейс');
  closeButton.innerHTML = '&times;';

  title.append(status, titleText);
  actions.append(closeButton);
  header.append(title, actions);

  return {
    header,
    closeButton
  };
}

function createMiningControls(
  resources: readonly BotResourceSnapshot[],
  locations: readonly HuntLocationSnapshot[],
  options: BotPanelOptions
): MiningControlsElements {
  const controls = document.createElement('div');
  controls.className = 'dwar-panel__controls';

  const startMiningButton = document.createElement('button');
  startMiningButton.type = 'button';
  startMiningButton.className = 'dwar-mining-button';
  startMiningButton.setAttribute('aria-label', 'Начать добычу');
  startMiningButton.innerHTML = `${getPickaxeIcon()}<span>Добыча</span>`;

  const resourcePicker = createResourcePicker(resources, {
    selectedResourceIds: options.selectedResourceIds,
    onSelectionChange: options.onResourceSelectionChange
  });

  const locationSelect = createHuntLocationSelect(locations, {
    selectedLocationId: options.selectedLocationId,
    onLocationChange: options.onLocationSelectionChange
  });

  const selectorGroup = document.createElement('div');
  selectorGroup.className = 'dwar-panel__selectors';
  selectorGroup.append(resourcePicker.root, locationSelect.root);
  controls.append(startMiningButton, selectorGroup);

  return {
    controls,
    startMiningButton,
    resourcePicker,
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

function createResizeHandle(): HTMLButtonElement {
  const resizeHandle = document.createElement('button');
  resizeHandle.type = 'button';
  resizeHandle.className = 'dwar-panel__resize';
  resizeHandle.setAttribute('aria-label', 'Изменить размер панели');
  resizeHandle.setAttribute('title', 'Изменить размер панели');

  return resizeHandle;
}
