import type { LauncherPositionStore } from '../../application/ports/launcher-position-store';
import type { PanelSizeStore } from '../../application/ports/panel-size-store';
import type { ResourceSelectionStore } from '../../application/ports/resource-selection-store';
import type { HuntLocationSelectionStore } from '../../application/ports/hunt-location-selection-store';
import type { CreateBotLogEntryUseCase } from '../../application/use-cases/create-bot-log-entry';
import type { ListHuntLocationsUseCase } from '../../application/use-cases/list-hunt-locations';
import type { ListResourcesUseCase } from '../../application/use-cases/list-resources';
import type {
  ResourceMiningEvent,
  ResourceMiningMobInfo,
  ResourceMiningResourceInfo,
  RunResourceMiningUseCase
} from '../../application/use-cases/run-resource-mining';
import { appendLogLine, clearLogList, type BotLogLinePart } from './log-list';
import { createBotPanel } from './bot-panel';
import { createLauncherButton } from './launcher-button';
import { getPickaxeIcon } from './pickaxe-icon';
import { createProcessBarController, type ProcessBarController } from './process-bar';
import { formatResourceLabel } from './resource-label';
import { attachDraggableLauncher, restoreLauncherPosition } from './draggable-launcher';
import { attachDraggablePanel } from './draggable-panel';
import { BOT_WIDGET_STYLES } from './bot-widget-styles';
import { DRAG_IGNORE_SELECTOR, ROOT_ID } from './bot-widget-constants';
import { keepPanelInViewport, positionPanelNearLauncher } from './panel-position';
import { attachResizablePanel, keepPanelSizeInViewport, restorePanelSize } from './resizable-panel';

export interface BotWidgetDependencies {
  createLogEntry: CreateBotLogEntryUseCase;
  listHuntLocations: ListHuntLocationsUseCase;
  listResources: ListResourcesUseCase;
  locationSelectionStore: HuntLocationSelectionStore;
  launcherPositionStore: LauncherPositionStore;
  panelSizeStore: PanelSizeStore;
  resourceSelectionStore: ResourceSelectionStore;
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
  const locations = dependencies.listHuntLocations.execute().map((location) => location.toSnapshot());
  const botPanel = createBotPanel(resources, locations, {
    selectedResourceIds: dependencies.resourceSelectionStore.load(),
    onResourceSelectionChange: (selectedResources) => {
      dependencies.resourceSelectionStore.save(selectedResources.map(({ id }) => id));
    },
    selectedLocationId: dependencies.locationSelectionStore.load(),
    onLocationSelectionChange: (location) => {
      dependencies.locationSelectionStore.save(location.id);
    }
  });

  const addLog = (message: string, parts?: readonly BotLogLinePart[]): void => {
    const entry = dependencies.createLogEntry.execute({ message }).toSnapshot();
    appendLogLine(botPanel.logList, entry, parts);
  };
  let miningAbortController: AbortController | null = null;
  const processBar = createProcessBarController(botPanel.processBar);

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

  botPanel.clearLogButton.addEventListener('click', () => {
    clearLogList(botPanel.logList);
  });

  function startMining(): void {
    const selectedResources = botPanel.resourcePicker.getSelectedResources();
    const selectedLocation = botPanel.locationSelect.getSelectedLocation();

    if (selectedResources.length === 0) {
      addLog('Выберите хотя бы один ресурс для добычи.');
      return;
    }

    if (!selectedLocation) {
      addLog('Выберите локацию для добычи.');
      return;
    }

    const controller = new AbortController();
    miningAbortController = controller;
    botPanel.resourcePicker.close();
    setMiningButtonActive(botPanel.startMiningButton, true);
    addLog(
      `Добыча запущена: ${selectedResources.map(formatResourceLabel).join(', ')}. Локация: ${selectedLocation.name}.`
    );

    void dependencies.runResourceMining
      .execute({
        selectedResourceIds: selectedResources.map(({ id }) => id),
        selectedLocationId: selectedLocation.id,
        signal: controller.signal,
        observer: {
          handle: (event) => {
            handleMiningEvent(event, addLog, processBar);
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
        processBar.reset();

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

function handleMiningEvent(
  event: ResourceMiningEvent,
  addLog: (message: string, parts?: readonly BotLogLinePart[]) => void,
  processBar: ProcessBarController
): void {
  updateMiningProcessBar(event, processBar);
  logMiningEvent(event, addLog);
}

function updateMiningProcessBar(event: ResourceMiningEvent, processBar: ProcessBarController): void {
  switch (event.type) {
    case 'scan-started':
      processBar.busy({
        label: 'Сканирование зоны'
      });
      return;

    case 'no-safe-resource':
      processBar.start({
        label: 'Пауза поиска',
        durationMs: event.delayMs
      });
      return;

    case 'farm-started':
      processBar.start({
        label: `Добыча ${formatResourceLabel(event.resource)}`,
        durationMs: event.miningDurationMs,
        accentColor: event.resource.markerColor
      });
      return;

    case 'farm-cancelled':
    case 'farm-interrupted':
      processBar.reset();
      return;

    case 'safety-check-started':
      processBar.setLabel(`Проверка ${formatResourceLabel(event.resource)}`);
      return;

    case 'farm-completed':
      processBar.complete();
      return;

    case 'next-mining-delayed':
      processBar.start({
        label: 'Пауза',
        durationMs: event.delayMs
      });
      return;

    case 'safety-check-completed':
      if (event.isSafe) {
        processBar.setLabel(`Добыча ${formatResourceLabel(event.resource)}`);
      }
      return;

    case 'scan-completed':
      return;
  }
}

function logMiningEvent(
  event: ResourceMiningEvent,
  addLog: (message: string, parts?: readonly BotLogLinePart[]) => void
): void {
  switch (event.type) {
    case 'scan-started':
      return;

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
      addLog(`Начата добыча ${formatResourceLabel(event.resource)}.`, [
        'Начата добыча ',
        createResourceLogPart(event.resource),
        '.'
      ]);
      return;

    case 'farm-cancelled':
      addLog(`Добыча отменена: ${formatResourceLabel(event.resource)} уже добывают.`, [
        'Добыча отменена: ',
        createResourceLogPart(event.resource),
        ' уже добывают.'
      ]);
      return;

    case 'safety-check-started':
    case 'safety-check-completed':
      return;

    case 'farm-interrupted':
      addLog(
        'Добыча прервана: рядом опасный моб.',
        createDangerLogParts('Добыча прервана: рядом ', event.dangerousMob)
      );
      return;

    case 'farm-completed':
      addLog(`Добыча завершена: ${formatResourceLabel(event.resource)}.`, [
        'Добыча завершена: ',
        createResourceLogPart(event.resource),
        '.'
      ]);
      return;

    case 'next-mining-delayed':
      addLog(`Пауза перед следующей добычей ${formatSeconds(event.delayMs)}.`);
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
  const label = formatResourceLabel(resource);

  return {
    text: label,
    color: resource.markerColor,
    title: `Ресурс ${label}`
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
