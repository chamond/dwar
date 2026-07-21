import type { BotResourceSnapshot } from '../../domain/entities/bot-resource';
import { getPickaxeIcon } from './pickaxe-icon';
import { createResourcePicker, type ResourcePickerElements } from './resource-picker';

export interface BotPanelElements {
  panel: HTMLElement;
  header: HTMLElement;
  closeButton: HTMLButtonElement;
  startMiningButton: HTMLButtonElement;
  resourcePicker: ResourcePickerElements;
  logList: HTMLElement;
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
}

export function createBotPanel(resources: readonly BotResourceSnapshot[]): BotPanelElements {
  const panel = document.createElement('section');
  panel.className = 'dwar-panel';
  panel.hidden = true;
  const headerElements = createPanelHeader();
  const controlsElements = createMiningControls(resources);
  const logList = createLogList();
  const resizeHandle = createResizeHandle();
  panel.append(headerElements.header, controlsElements.controls, logList, resizeHandle);

  return {
    panel,
    header: headerElements.header,
    closeButton: headerElements.closeButton,
    startMiningButton: controlsElements.startMiningButton,
    resourcePicker: controlsElements.resourcePicker,
    logList,
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

  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.className = 'dwar-panel__close';
  closeButton.dataset.dwarClose = '';
  closeButton.setAttribute('aria-label', 'Скрыть интерфейс');
  closeButton.innerHTML = '&times;';

  title.append(status, titleText);
  header.append(title, closeButton);

  return {
    header,
    closeButton
  };
}

function createMiningControls(resources: readonly BotResourceSnapshot[]): MiningControlsElements {
  const controls = document.createElement('div');
  controls.className = 'dwar-panel__controls';

  const startMiningButton = document.createElement('button');
  startMiningButton.type = 'button';
  startMiningButton.className = 'dwar-mining-button';
  startMiningButton.setAttribute('aria-label', 'Начать добычу');
  startMiningButton.innerHTML = `${getPickaxeIcon()}<span>Добыча</span>`;

  const resourcePicker = createResourcePicker(resources);
  controls.append(startMiningButton, resourcePicker.root);

  return {
    controls,
    startMiningButton,
    resourcePicker
  };
}

function createLogList(): HTMLElement {
  const logList = document.createElement('div');
  logList.className = 'dwar-panel__logs';
  logList.setAttribute('role', 'log');
  logList.setAttribute('aria-live', 'polite');

  return logList;
}

function createResizeHandle(): HTMLButtonElement {
  const resizeHandle = document.createElement('button');
  resizeHandle.type = 'button';
  resizeHandle.className = 'dwar-panel__resize';
  resizeHandle.setAttribute('aria-label', 'Изменить размер панели');
  resizeHandle.setAttribute('title', 'Изменить размер панели');

  return resizeHandle;
}
