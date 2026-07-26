import { isUnexpectedServerResponseError } from '../../application/errors/unexpected-server-response-error';
import type { HumanAttentionAlarmStore } from '../../application/ports/human-attention-alarm-store';
import type { LauncherPositionStore } from '../../application/ports/launcher-position-store';
import type { PanelSizeStore } from '../../application/ports/panel-size-store';
import type { ProfessionRecipeSelectionStore } from '../../application/ports/profession-recipe-selection-store';
import type { ResourceSelectionStore } from '../../application/ports/resource-selection-store';
import type { HuntLocationSelectionStore } from '../../application/ports/hunt-location-selection-store';
import type { CreateBotLogEntryUseCase } from '../../application/use-cases/create-bot-log-entry';
import type { ListHuntLocationsUseCase } from '../../application/use-cases/list-hunt-locations';
import type { ListProfessionRecipesUseCase } from '../../application/use-cases/list-profession-recipes';
import type { ListResourcesUseCase } from '../../application/use-cases/list-resources';
import type {
  ProfessionCraftingEvent,
  ProfessionCraftingRecipeInfo,
  RunProfessionCraftingUseCase
} from '../../application/use-cases/run-profession-crafting';
import type {
  ResourceMiningEvent,
  ResourceMiningMobInfo,
  ResourceMiningResourceInfo,
  RunResourceMiningUseCase
} from '../../application/use-cases/run-resource-mining';
import {
  appendLogLine,
  clearLogList,
  type BotLogLineOptions,
  type BotLogLinePart
} from './log-list';
import { createBotPanel } from './bot-panel';
import { createCraftingProcessBarsController, type CraftingProcessBarsController } from './crafting-process-bars';
import { createLauncherButton } from './launcher-button';
import { getCraftIcon } from './craft-icon';
import { getPickaxeIcon } from './pickaxe-icon';
import { createProcessBarController, type ProcessBarController } from './process-bar';
import { formatProfessionRecipeLabel } from './profession-recipe-label';
import { formatResourceLabel } from './resource-label';
import { attachDraggableLauncher, restoreLauncherPosition } from './draggable-launcher';
import { attachDraggablePanel } from './draggable-panel';
import { createHumanAttentionAlarm, type HumanAttentionAlarm } from './human-attention-alarm';
import { BOT_WIDGET_STYLES } from './bot-widget-styles';
import { DRAG_IGNORE_SELECTOR, ROOT_ID } from './bot-widget-constants';
import { keepPanelInViewport, positionPanelNearLauncher } from './panel-position';
import { attachResizablePanel, keepPanelSizeInViewport, restorePanelSize } from './resizable-panel';

export interface BotWidgetDependencies {
  createLogEntry: CreateBotLogEntryUseCase;
  humanAttentionAlarmStore: HumanAttentionAlarmStore;
  listHuntLocations: ListHuntLocationsUseCase;
  listProfessionRecipes: ListProfessionRecipesUseCase;
  listResources: ListResourcesUseCase;
  locationSelectionStore: HuntLocationSelectionStore;
  launcherPositionStore: LauncherPositionStore;
  panelSizeStore: PanelSizeStore;
  professionRecipeSelectionStore: ProfessionRecipeSelectionStore;
  resourceSelectionStore: ResourceSelectionStore;
  runProfessionCrafting: RunProfessionCraftingUseCase;
  runResourceMining: RunResourceMiningUseCase;
}

type ProcessPhase = 'idle' | 'busy' | 'active' | 'waiting' | 'pause' | 'complete';
type AddBotLog = (message: string, options?: BotLogLineOptions) => void;

export function mountBotWidget(dependencies: BotWidgetDependencies): void {
  if (document.getElementById(ROOT_ID)) {
    return;
  }

  const host = createHost();
  const shadowRoot = host.attachShadow({ mode: 'open' });
  const launcher = createLauncherButton();
  const resources = dependencies.listResources.execute().map((resource) => resource.toSnapshot());
  const recipes = dependencies.listProfessionRecipes.execute().map((recipe) => recipe.toSnapshot());
  const locations = dependencies.listHuntLocations.execute().map((location) => location.toSnapshot());
  const botPanel = createBotPanel(resources, recipes, locations, {
    selectedResourceIds: dependencies.resourceSelectionStore.load(),
    onResourceSelectionChange: (selectedResources) => {
      dependencies.resourceSelectionStore.save(selectedResources.map(({ id }) => id));
    },
    selectedRecipeIds: dependencies.professionRecipeSelectionStore.load(),
    onRecipeSelectionChange: (selectedRecipes) => {
      dependencies.professionRecipeSelectionStore.save(selectedRecipes.map(({ id }) => id));
    },
    selectedLocationId: dependencies.locationSelectionStore.load(),
    onLocationSelectionChange: (location) => {
      dependencies.locationSelectionStore.save(location.id);
    }
  });

  const createLogAppender = (logList: HTMLElement): AddBotLog => (message, options = {}): void => {
    const entry = dependencies.createLogEntry.execute({ message }).toSnapshot();
    appendLogLine(logList, entry, options);
  };
  const addMiningLog = createLogAppender(botPanel.miningLogList);
  const addCraftingLog = createLogAppender(botPanel.craftingLogList);
  const addActiveTabLog: AddBotLog = (message, options): void => {
    const addLog = botPanel.tabs.getActiveTab() === 'mining' ? addMiningLog : addCraftingLog;
    addLog(message, options);
  };
  let miningAbortController: AbortController | null = null;
  let craftingAbortController: AbortController | null = null;
  let miningPhase: ProcessPhase = 'idle';
  let miningStopRequested = false;
  let craftingStopRequested = false;
  let craftingRestartRequested = false;
  const miningProcessBar = createProcessBarController(botPanel.miningProcessBar);
  const craftingProcessBars = createCraftingProcessBarsController(botPanel.craftingProcessBars);
  const humanAttentionAlarm = createHumanAttentionAlarm();
  let isHumanAttentionAlarmEnabled = dependencies.humanAttentionAlarmStore.load() ?? false;
  setHumanAttentionAlarmButtonEnabled(botPanel.alarmToggleButton, isHumanAttentionAlarmEnabled);
  attachMutuallyExclusivePickers(botPanel);

  const activateHumanAttentionAlarm = (): void => {
    isHumanAttentionAlarmEnabled = true;
    dependencies.humanAttentionAlarmStore.save(true);
    setHumanAttentionAlarmButtonEnabled(botPanel.alarmToggleButton, true);
    humanAttentionAlarm.prepare();
    humanAttentionAlarm.play();
  };

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
      addActiveTabLog('Интерфейс открыт.');
      return;
    }

    botPanel.resourcePicker.close();
    botPanel.recipePicker.close();
    hidePanel(botPanel.panel, launcher);
  });

  botPanel.closeButton.addEventListener('click', () => {
    botPanel.resourcePicker.close();
    botPanel.recipePicker.close();
    hidePanel(botPanel.panel, launcher);
  });

  botPanel.miningClearLogButton.addEventListener('click', () => {
    clearLogList(botPanel.miningLogList);
  });

  botPanel.craftingClearLogButton.addEventListener('click', () => {
    clearLogList(botPanel.craftingLogList);
  });

  botPanel.alarmToggleButton.addEventListener('click', () => {
    isHumanAttentionAlarmEnabled = !isHumanAttentionAlarmEnabled;
    dependencies.humanAttentionAlarmStore.save(isHumanAttentionAlarmEnabled);
    setHumanAttentionAlarmButtonEnabled(botPanel.alarmToggleButton, isHumanAttentionAlarmEnabled);

    if (isHumanAttentionAlarmEnabled) {
      activateHumanAttentionAlarm();
      addActiveTabLog('Сирена включена.');
      return;
    }

    humanAttentionAlarm.stop();
    addActiveTabLog('Сирена отключена.');
  });

  function startMining(): void {
    const selectedResources = botPanel.resourcePicker.getSelectedResources();
    const selectedLocation = botPanel.locationSelect.getSelectedLocation();

    if (selectedResources.length === 0) {
      addMiningLog('Выберите хотя бы один ресурс для добычи.');
      return;
    }

    if (!selectedLocation) {
      addMiningLog('Выберите локацию для добычи.');
      return;
    }

    humanAttentionAlarm.prepare();

    const controller = new AbortController();
    miningAbortController = controller;
    miningStopRequested = false;
    botPanel.resourcePicker.close();
    setMiningButtonActive(botPanel.startMiningButton, true);
    addMiningLog(
      `Добыча запущена: ${selectedResources.map(formatResourceLabel).join(', ')}. Локация: ${selectedLocation.name}.`
    );

    void dependencies.runResourceMining
      .execute({
        getSelectedResourceIds: () => botPanel.resourcePicker.getSelectedResources().map(({ id }) => id),
        selectedLocationId: selectedLocation.id,
        signal: controller.signal,
        observer: {
          handle: (event) => {
            miningPhase = getMiningPhase(event);
            handleMiningEvent(event, addMiningLog, miningProcessBar);

            if (miningStopRequested && canStopMiningAfter(event)) {
              controller.abort();
            }
          }
        }
      })
      .catch((error) => {
        if (!isAbortError(error)) {
          if (!handleUnexpectedServerResponse(
            'Добыча',
            error,
            addMiningLog,
            activateHumanAttentionAlarm
          )) {
            addMiningLog(`Добыча остановлена из-за ошибки: ${getErrorMessage(error)}.`);
          }
        }
      })
      .finally(() => {
        if (miningAbortController !== controller) {
          return;
        }

        miningAbortController = null;
        setMiningButtonActive(botPanel.startMiningButton, false);
        miningPhase = 'idle';
        miningStopRequested = false;
        miningProcessBar.reset();

        if (controller.signal.aborted) {
          addMiningLog('Добыча остановлена.');
        }
      });
  }

  function stopMining(): void {
    if (!miningAbortController || miningAbortController.signal.aborted) {
      return;
    }

    if (miningStopRequested) {
      return;
    }

    miningStopRequested = true;
    setMiningButtonActive(botPanel.startMiningButton, false);

    if (miningPhase === 'active' || miningPhase === 'waiting') {
      addMiningLog('Добыча остановится после результата текущего сбора.');
      return;
    }

    addMiningLog('Останавливаю добычу.');
    miningAbortController.abort();
  }

  function resumeMining(): void {
    if (!miningAbortController || miningAbortController.signal.aborted || !miningStopRequested) {
      return;
    }

    miningStopRequested = false;
    setMiningButtonActive(botPanel.startMiningButton, true);
    addMiningLog('Добыча продолжена.');
  }

  function startCrafting(): void {
    const selectedRecipes = botPanel.recipePicker.getSelectedRecipes();

    if (selectedRecipes.length === 0) {
      craftingProcessBars.handle({
        type: 'no-recipe-selected',
        delayMs: 3_000
      });
      return;
    }

    humanAttentionAlarm.prepare();

    const controller = new AbortController();
    craftingAbortController = controller;
    craftingStopRequested = false;
    craftingRestartRequested = false;
    craftingProcessBars.reset();
    botPanel.recipePicker.close();
    setCraftingButtonActive(botPanel.startCraftingButton, true);

    void dependencies.runProfessionCrafting
      .execute({
        getSelectedRecipeIds: () => botPanel.recipePicker.getSelectedRecipes().map(({ id }) => id),
        getAmountPerRequest: () => botPanel.craftAmountInput.getAmount(),
        signal: controller.signal,
        observer: {
          handle: (event) => {
            handleCraftingEvent(event, addCraftingLog, craftingProcessBars);
          }
        }
      })
      .catch((error) => {
        if (!isAbortError(error)) {
          if (!handleUnexpectedServerResponse(
            'Крафт',
            error,
            addCraftingLog,
            activateHumanAttentionAlarm
          )) {
            addCraftingLog(`Крафт остановлен из-за ошибки: ${getErrorMessage(error)}.`);
          }
        }
      })
      .finally(() => {
        if (craftingAbortController !== controller) {
          return;
        }

        craftingAbortController = null;
        setCraftingButtonActive(botPanel.startCraftingButton, false);
        const shouldRestart = craftingRestartRequested;
        craftingStopRequested = false;
        craftingRestartRequested = false;
        craftingProcessBars.reset();

        if (shouldRestart) {
          startCrafting();
        }
      });
  }

  function stopCrafting(): void {
    if (!craftingAbortController || craftingAbortController.signal.aborted) {
      return;
    }

    if (craftingStopRequested) {
      return;
    }

    craftingStopRequested = true;
    craftingRestartRequested = false;
    setCraftingButtonActive(botPanel.startCraftingButton, false);
    craftingAbortController.abort();
  }

  function toggleCraftingRestartAfterStop(): void {
    if (!craftingAbortController || !craftingStopRequested) {
      return;
    }

    craftingRestartRequested = !craftingRestartRequested;
    setCraftingButtonActive(botPanel.startCraftingButton, craftingRestartRequested);
    addCraftingLog(craftingRestartRequested
      ? 'Крафт продолжится после текущего отката.'
      : 'Продолжение крафта отменено.'
    );
  }

  botPanel.startMiningButton.addEventListener('click', () => {
    if (miningAbortController && !miningAbortController.signal.aborted) {
      if (miningStopRequested) {
        resumeMining();
        return;
      }

      stopMining();
      return;
    }

    startMining();
  });

  botPanel.startCraftingButton.addEventListener('click', () => {
    if (craftingAbortController) {
      if (craftingStopRequested) {
        toggleCraftingRestartAfterStop();
        return;
      }

      stopCrafting();
      return;
    }

    startCrafting();
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

    if (event.target instanceof Element && botPanel.recipePicker.root.contains(event.target)) {
      return;
    }

    botPanel.resourcePicker.close();
    botPanel.recipePicker.close();
  });

  window.addEventListener('resize', () => {
    launcherDrag.keepInViewport();

    if (!botPanel.panel.hidden) {
      keepPanelSizeInViewport(botPanel.panel);
      keepPanelInViewport(botPanel.panel);
    }
  });

  addMiningLog('Скрипт загружен.');
  addCraftingLog('Скрипт загружен.');
}

function attachMutuallyExclusivePickers(botPanel: ReturnType<typeof createBotPanel>): void {
  botPanel.resourcePicker.toggleButton.addEventListener('click', () => {
    if (!botPanel.resourcePicker.menu.hidden) {
      botPanel.recipePicker.close();
    }
  });

  botPanel.recipePicker.toggleButton.addEventListener('click', () => {
    if (!botPanel.recipePicker.menu.hidden) {
      botPanel.resourcePicker.close();
    }
  });
}

function getMiningPhase(event: ResourceMiningEvent): ProcessPhase {
  switch (event.type) {
    case 'scan-started':
      return 'busy';

    case 'no-safe-resource':
      return 'pause';

    case 'farm-started':
      return 'active';

    case 'monitoring-scan-started':
    case 'monitoring-scan-completed':
      return event.nominalDurationElapsed ? 'waiting' : 'active';

    case 'farm-completed':
    case 'farm-failed':
      return 'complete';

    case 'scan-completed':
      return 'busy';

    case 'farm-cancelled':
    case 'farm-interrupted':
      return 'idle';
  }
}

function canStopMiningAfter(event: ResourceMiningEvent): boolean {
  return event.type === 'farm-completed'
    || event.type === 'farm-failed'
    || event.type === 'farm-cancelled'
    || event.type === 'farm-interrupted';
}

function handleMiningEvent(
  event: ResourceMiningEvent,
  addLog: AddBotLog,
  processBar: ProcessBarController
): void {
  updateMiningProcessBar(event, processBar);
  logMiningEvent(event, addLog);
}

function handleCraftingEvent(
  event: ProfessionCraftingEvent,
  addLog: AddBotLog,
  processBars: CraftingProcessBarsController
): void {
  processBars.handle(event);
  logCraftingEvent(event, addLog);
}

function updateMiningProcessBar(event: ResourceMiningEvent, processBar: ProcessBarController): void {
  switch (event.type) {
    case 'scan-started':
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
        durationMs: event.durationMs,
        accentColor: event.resource.markerColor
      });
      return;

    case 'farm-cancelled':
    case 'farm-interrupted':
      processBar.reset();
      return;

    case 'monitoring-scan-started':
      processBar.setLabel(`Проверка ${formatResourceLabel(event.resource)}`);
      return;

    case 'farm-completed':
    case 'farm-failed':
      processBar.complete();
      return;

    case 'monitoring-scan-completed':
      processBar.setLabel(
        event.nominalDurationElapsed
          ? `Ожидание результата ${formatResourceLabel(event.resource)}`
          : `Добыча ${formatResourceLabel(event.resource)}`
      );
      return;

    case 'scan-completed':
      return;
  }
}

function logMiningEvent(
  event: ResourceMiningEvent,
  addLog: AddBotLog
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
      addLog(
        `Начата добыча ${formatResourceLabel(event.resource)} (num: ${event.resource.serverNumber}).`,
        {
          parts: [
            'Начата добыча ',
            createResourceLogPart(event.resource),
            ` (num: ${event.resource.serverNumber}).`
          ]
        }
      );
      return;

    case 'farm-cancelled':
      addLog(
        `Добыча отменена: ${formatResourceLabel(event.resource)} занят.`,
        {
          parts: [
            'Добыча отменена: ',
            createResourceLogPart(event.resource),
            ' занят.'
          ]
        }
      );
      return;

    case 'monitoring-scan-started':
    case 'monitoring-scan-completed':
      return;

    case 'farm-interrupted':
      addLog(
        'Добыча прервана: рядом опасный моб.',
        {
          parts: createDangerLogParts('Добыча прервана: рядом ', event.dangerousMob)
        }
      );
      return;

    case 'farm-completed':
      addLog(
        `Добыча завершена: ${formatResourceLabel(event.resource)}.`,
        {
          parts: [
            'Добыча завершена: ',
            createResourceLogPart(event.resource),
            '.'
          ],
          tone: 'success'
        }
      );
      return;

    case 'farm-failed':
      addLog(
        `Добыча не удалась: ${formatResourceLabel(event.resource)}.`,
        {
          parts: [
            'Добыча не удалась: ',
            createResourceLogPart(event.resource),
            '.'
          ],
          tone: 'failure'
        }
      );
      return;

  }
}

function logCraftingEvent(
  event: ProfessionCraftingEvent,
  addLog: AddBotLog
): void {
  switch (event.type) {
    case 'craft-started':
      addLog(
        `Крафтим ${event.amount} шт. ${formatProfessionRecipeLabel(event.recipe)}, ресурсов остается: ${event.remainingResourceAmount}.`,
        {
          parts: [
            'Крафтим ',
            `${event.amount} шт. `,
            createRecipeLogPart(event.recipe),
            `, ресурсов остается: ${event.remainingResourceAmount}.`
          ]
        }
      );
      return;

    case 'recipe-stopped':
      addLog(
        `Крафт ${formatProfessionRecipeLabel(event.recipe)} остановлен: ${formatCraftingResourceLabel(event.recipe)} отсутствует в рюкзаке.`,
        {
          parts: [
            'Крафт ',
            createRecipeLogPart(event.recipe),
            ' остановлен: ',
            createCraftingResourceLogPart(event.recipe),
            ' отсутствует в рюкзаке.'
          ]
        }
      );
      return;

    case 'no-recipe-selected':
    case 'backpack-check-started':
    case 'craft-request-started':
    case 'craft-completed':
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

function createRecipeLogPart(recipe: ProfessionCraftingRecipeInfo): BotLogLinePart {
  const label = formatProfessionRecipeLabel(recipe);

  return {
    text: label,
    color: recipe.markerColor,
    title: `Рецепт ${label}`
  };
}

function formatCraftingResourceLabel(recipe: ProfessionCraftingRecipeInfo): string {
  return formatResourceLabel({
    name: recipe.resourceName,
    level: recipe.level
  });
}

function createCraftingResourceLogPart(recipe: ProfessionCraftingRecipeInfo): BotLogLinePart {
  const label = formatCraftingResourceLabel(recipe);

  return {
    text: label,
    color: recipe.markerColor,
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

function handleUnexpectedServerResponse(
  processName: string,
  error: unknown,
  addLog: AddBotLog,
  activateAlarm: () => void
): boolean {
  if (!isUnexpectedServerResponseError(error)) {
    return false;
  }

  triggerHumanAttentionAlarm(
    `${processName} остановлена: неожиданный ответ сервера: ${getErrorMessage(error)}.`,
    addLog,
    activateAlarm
  );

  return true;
}

function triggerHumanAttentionAlarm(
  message: string,
  addLog: AddBotLog,
  activateAlarm: () => void
): void {
  activateAlarm();

  addLog(
    `${message} Требуется участие человека.`,
    {
      parts: [
        message,
        ' ',
        createHumanAttentionLogPart()
      ]
    }
  );
}

function createHumanAttentionLogPart(): BotLogLinePart {
  return {
    text: 'ТРЕБУЕТСЯ УЧАСТИЕ ЧЕЛОВЕКА',
    color: '#ff4f5f',
    title: 'Проверь страницу игры вручную'
  };
}

function setHumanAttentionAlarmButtonEnabled(button: HTMLButtonElement, isEnabled: boolean): void {
  button.classList.toggle('is-muted', !isEnabled);
  button.setAttribute('aria-pressed', String(isEnabled));
  button.setAttribute('aria-label', isEnabled ? 'Сирена включена' : 'Сирена отключена');
  button.setAttribute('title', isEnabled ? 'Сирена включена' : 'Сирена отключена');
}

function setMiningButtonActive(button: HTMLButtonElement, isActive: boolean): void {
  button.classList.toggle('is-active', isActive);
  button.setAttribute('aria-label', isActive ? 'Остановить добычу' : 'Начать добычу');
  button.innerHTML = `${getPickaxeIcon()}<span>${isActive ? 'Стоп' : 'Добыча'}</span>`;
}

function setCraftingButtonActive(button: HTMLButtonElement, isActive: boolean): void {
  button.classList.toggle('is-active', isActive);
  button.setAttribute('aria-label', isActive ? 'Остановить крафт' : 'Начать крафт');
  button.innerHTML = `${getCraftIcon()}<span>${isActive ? 'Стоп' : 'Крафт'}</span>`;
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
