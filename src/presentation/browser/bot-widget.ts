import type { LauncherPositionStore } from '../../application/ports/launcher-position-store';
import type { PanelSizeStore } from '../../application/ports/panel-size-store';
import type { CreateBotLogEntryUseCase } from '../../application/use-cases/create-bot-log-entry';
import type { ListResourcesUseCase } from '../../application/use-cases/list-resources';
import type {
  ResourceMiningEvent,
  ResourceMiningMobInfo,
  ResourceMiningResourceInfo,
  RunResourceMiningUseCase
} from '../../application/use-cases/run-resource-mining';
import { appendLogLine, type BotLogLinePart } from './log-list';
import { createBotPanel } from './bot-panel';
import { createLauncherButton } from './launcher-button';
import { getPickaxeIcon } from './pickaxe-icon';
import { attachDraggableLauncher, restoreLauncherPosition } from './draggable-launcher';
import { attachDraggablePanel } from './draggable-panel';
import { BOT_WIDGET_STYLES } from './bot-widget-styles';
import { DRAG_IGNORE_SELECTOR, ROOT_ID } from './bot-widget-constants';
import { keepPanelInViewport, positionPanelNearLauncher } from './panel-position';
import { attachResizablePanel, keepPanelSizeInViewport, restorePanelSize } from './resizable-panel';

export interface BotWidgetDependencies {
  createLogEntry: CreateBotLogEntryUseCase;
  listResources: ListResourcesUseCase;
  launcherPositionStore: LauncherPositionStore;
  panelSizeStore: PanelSizeStore;
  runResourceMining: RunResourceMiningUseCase;
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

  const addLog = (message: string, parts?: readonly BotLogLinePart[]): void => {
    const entry = dependencies.createLogEntry.execute({ message }).toSnapshot();
    appendLogLine(botPanel.logList, entry, parts);
  };
  let miningAbortController: AbortController | null = null;

  shadowRoot.append(createStyleElement(), launcher, botPanel.panel);
  document.documentElement.append(host);
  restoreLauncherPosition(launcher, dependencies.launcherPositionStore);
  restorePanelSize(botPanel.panel, dependencies.panelSizeStore);

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

  function startMining(): void {
    const selectedResources = botPanel.resourcePicker.getSelectedResources();

    if (selectedResources.length === 0) {
      addLog('Выберите хотя бы один ресурс для добычи.');
      return;
    }

    const controller = new AbortController();
    miningAbortController = controller;
    botPanel.resourcePicker.close();
    setMiningButtonActive(botPanel.startMiningButton, true);
    addLog(`Добыча запущена: ${selectedResources.map(({ name }) => name).join(', ')}.`);

    void dependencies.runResourceMining
      .execute({
        selectedResourceIds: selectedResources.map(({ id }) => id),
        signal: controller.signal,
        observer: {
          handle: (event) => {
            logMiningEvent(event, addLog);
          }
        }
      })
      .catch((error) => {
        if (!isAbortError(error)) {
          addLog(`Добыча остановлена из-за ошибки: ${getErrorMessage(error)}.`);
        }
      })
      .finally(() => {
        if (miningAbortController !== controller) {
          return;
        }

        miningAbortController = null;
        setMiningButtonActive(botPanel.startMiningButton, false);

        if (controller.signal.aborted) {
          addLog('Добыча остановлена.');
        }
      });
  }

  function stopMining(): void {
    if (!miningAbortController || miningAbortController.signal.aborted) {
      return;
    }

    addLog('Останавливаю добычу.');
    miningAbortController.abort();
  }

  botPanel.startMiningButton.addEventListener('click', () => {
    if (miningAbortController) {
      stopMining();
      return;
    }

    startMining();
  });

  attachDraggablePanel({
    panel: botPanel.panel,
    handle: botPanel.header,
    ignoreSelector: DRAG_IGNORE_SELECTOR
  });

  attachResizablePanel({
    panel: botPanel.panel,
    handle: botPanel.resizeHandle,
    sizeStore: dependencies.panelSizeStore,
    onResize: () => {
      keepPanelInViewport(botPanel.panel);
    }
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
      keepPanelSizeInViewport(botPanel.panel);
      keepPanelInViewport(botPanel.panel);
    }
  });

  addLog('Скрипт загружен.');
}

function logMiningEvent(
  event: ResourceMiningEvent,
  addLog: (message: string, parts?: readonly BotLogLinePart[]) => void
): void {
  switch (event.type) {
    case 'scan-completed':
      addLog(
        `Скан: мобов ${event.totalMobCount}, агрессивных ${event.aggressiveMobCount}, ресурсов ${event.selectedResourceCount}, безопасных ${event.safeResourceCount}.`
      );
      return;

    case 'no-safe-resource':
      addLog(
        event.selectedResourceCount === 0
          ? `Выбранные ресурсы не найдены, пауза ${formatSeconds(event.delayMs)}.`
          : `Безопасных ресурсов нет, пауза ${formatSeconds(event.delayMs)}.`
      );
      return;

    case 'farm-started':
      addLog(`Начата добыча ${event.resource.name}.`, [
        'Начата добыча ',
        createResourceLogPart(event.resource),
        '.'
      ]);
      return;

    case 'safety-check-completed':
      if (event.isSafe) {
        addLog(`Контроль безопасности: спокойно, прошло ${formatSeconds(event.elapsedMs)}.`);
        return;
      }

      addLog('Контроль безопасности: опасность рядом.', createDangerLogParts('Контроль безопасности: ', event.nearestDangerousMob));
      return;

    case 'farm-interrupted':
      addLog(
        'Добыча прервана: рядом опасный моб.',
        createDangerLogParts('Добыча прервана: рядом ', event.dangerousMob)
      );
      return;

    case 'farm-completed':
      addLog(`Добыча завершена: ${event.resource.name}.`, [
        'Добыча завершена: ',
        createResourceLogPart(event.resource),
        '.'
      ]);
      return;
  }
}

function createDangerLogParts(prefix: string, mob: ResourceMiningMobInfo | null): readonly BotLogLinePart[] {
  if (!mob) {
    return [`${prefix}опасность рядом.`];
  }

  return [
    prefix,
    createMobLogPart(mob),
    '.'
  ];
}

function createResourceLogPart(resource: ResourceMiningResourceInfo): BotLogLinePart {
  return {
    text: resource.name,
    color: resource.markerColor,
    title: `Ресурс ${resource.name}`
  };
}

function createMobLogPart(mob: ResourceMiningMobInfo): BotLogLinePart {
  return {
    text: `${mob.name}, ур. ${mob.level}`,
    color: mob.aggressionColor,
    title: `Агрессия ${mob.aggressionLevel}`
  };
}

function setMiningButtonActive(button: HTMLButtonElement, isActive: boolean): void {
  button.classList.toggle('is-active', isActive);
  button.setAttribute('aria-label', isActive ? 'Остановить добычу' : 'Начать добычу');
  button.innerHTML = `${getPickaxeIcon()}<span>${isActive ? 'Стоп' : 'Добыча'}</span>`;
}

function formatSeconds(durationMs: number): string {
  return `${Math.round(durationMs / 1000)} сек`;
}

function isAbortError(error: unknown): boolean {
  if (error instanceof DOMException) {
    return error.name === 'AbortError';
  }

  if (error instanceof Error) {
    return error.name === 'AbortError';
  }

  return false;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return 'неизвестная ошибка';
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
