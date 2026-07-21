import type { CreateBotLogEntryUseCase } from '../../application/use-cases/create-bot-log-entry';
import { appendLogLine } from './log-list';
import { createBotPanel } from './bot-panel';
import { createLauncherButton } from './launcher-button';
import { attachDraggablePanel } from './draggable-panel';
import { BOT_WIDGET_STYLES } from './bot-widget-styles';
import { DRAG_IGNORE_SELECTOR, ROOT_ID } from './bot-widget-constants';
import { keepPanelInViewport, positionPanelNearLauncher } from './panel-position';

export function mountBotWidget(createLogEntry: CreateBotLogEntryUseCase): void {
  if (document.getElementById(ROOT_ID)) {
    return;
  }

  const host = createHost();
  const shadowRoot = host.attachShadow({ mode: 'open' });
  const launcher = createLauncherButton();
  const botPanel = createBotPanel();

  const addLog = (message: string): void => {
    const entry = createLogEntry.execute({ message }).toSnapshot();
    appendLogLine(botPanel.logList, entry);
  };

  launcher.addEventListener('click', () => {
    if (botPanel.panel.hidden) {
      showPanel(botPanel.panel, launcher);
      addLog('Интерфейс открыт.');
      return;
    }

    hidePanel(botPanel.panel, launcher);
  });

  botPanel.closeButton.addEventListener('click', () => {
    hidePanel(botPanel.panel, launcher);
  });

  attachDraggablePanel({
    panel: botPanel.panel,
    handle: botPanel.header,
    ignoreSelector: DRAG_IGNORE_SELECTOR
  });

  window.addEventListener('resize', () => {
    if (!botPanel.panel.hidden) {
      keepPanelInViewport(botPanel.panel);
    }
  });

  shadowRoot.append(createStyleElement(), launcher, botPanel.panel);
  document.documentElement.append(host);

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

