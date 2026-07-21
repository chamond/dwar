import type { LauncherPositionStore } from '../../application/ports/launcher-position-store';
import type { CreateBotLogEntryUseCase } from '../../application/use-cases/create-bot-log-entry';
import type { ListResourcesUseCase } from '../../application/use-cases/list-resources';
import { appendLogLine } from './log-list';
import { createBotPanel } from './bot-panel';
import { createLauncherButton } from './launcher-button';
import { attachDraggableLauncher, restoreLauncherPosition } from './draggable-launcher';
import { attachDraggablePanel } from './draggable-panel';
import { BOT_WIDGET_STYLES } from './bot-widget-styles';
import { DRAG_IGNORE_SELECTOR, ROOT_ID } from './bot-widget-constants';
import { keepPanelInViewport, positionPanelNearLauncher } from './panel-position';

export interface BotWidgetDependencies {
  createLogEntry: CreateBotLogEntryUseCase;
  listResources: ListResourcesUseCase;
  launcherPositionStore: LauncherPositionStore;
}

export function mountBotWidget(dependencies: BotWidgetDependencies): void {
  if (document.getElementById(ROOT_ID)) {
    return;
  }

  const host = createHost();
  const shadowRoot = host.attachShadow({ mode: 'open' });
  const launcher = createLauncherButton();
  const resources = dependencies.listResources.execute().map((resource) => resource.toSnapshot());
  const botPanel = createBotPanel(resources);

  const addLog = (message: string): void => {
    const entry = dependencies.createLogEntry.execute({ message }).toSnapshot();
    appendLogLine(botPanel.logList, entry);
  };

  shadowRoot.append(createStyleElement(), launcher, botPanel.panel);
  document.documentElement.append(host);
  restoreLauncherPosition(launcher, dependencies.launcherPositionStore);

  const launcherDrag = attachDraggableLauncher({
    launcher,
    positionStore: dependencies.launcherPositionStore,
    onMoved: () => {
      if (!botPanel.panel.hidden) {
        positionPanelNearLauncher(botPanel.panel, launcher);
      }
    }
  });

  launcher.addEventListener('click', (event) => {
    if (launcherDrag.consumeDragClick()) {
      event.preventDefault();
      return;
    }

    if (botPanel.panel.hidden) {
      showPanel(botPanel.panel, launcher);
      addLog('Интерфейс открыт.');
      return;
    }

    hidePanel(botPanel.panel, launcher);
  });

  botPanel.closeButton.addEventListener('click', () => {
    botPanel.resourcePicker.close();
    hidePanel(botPanel.panel, launcher);
  });

  botPanel.startMiningButton.addEventListener('click', () => {
    const selectedResources = botPanel.resourcePicker.getSelectedResources();

    if (selectedResources.length === 0) {
      addLog('Выберите хотя бы один ресурс для добычи.');
      return;
    }

    addLog(`Добыча запущена: ${selectedResources.map(({ name }) => name).join(', ')}.`);
  });

  attachDraggablePanel({
    panel: botPanel.panel,
    handle: botPanel.header,
    ignoreSelector: DRAG_IGNORE_SELECTOR
  });

  shadowRoot.addEventListener('pointerdown', (event) => {
    if (event.target instanceof Element && botPanel.resourcePicker.root.contains(event.target)) {
      return;
    }

    botPanel.resourcePicker.close();
  });

  window.addEventListener('resize', () => {
    launcherDrag.keepInViewport();

    if (!botPanel.panel.hidden) {
      keepPanelInViewport(botPanel.panel);
    }
  });

  addLog('Скрипт загружен.');
}

function showPanel(panel: HTMLElement, launcher: HTMLElement): void {
  panel.hidden = false;
  launcher.setAttribute('aria-expanded', 'true');
  positionPanelNearLauncher(panel, launcher);
}

function hidePanel(panel: HTMLElement, launcher: HTMLElement): void {
  panel.hidden = true;
  launcher.setAttribute('aria-expanded', 'false');
}

function createHost(): HTMLElement {
  const host = document.createElement('div');
  host.id = ROOT_ID;

  return host;
}

function createStyleElement(): HTMLStyleElement {
  const style = document.createElement('style');
  style.textContent = BOT_WIDGET_STYLES;

  return style;
}
