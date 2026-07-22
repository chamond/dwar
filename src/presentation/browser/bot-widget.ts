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
import { appendLogLine, clearLogList, type BotLogLinePart } from './log-list';
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

type ProcessPhase = 'idle' | 'busy' | 'active' | 'pause' | 'complete';

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

  const addLog = (message: string, parts?: readonly BotLogLinePart[]): void => {
    const entry = dependencies.createLogEntry.execute({ message }).toSnapshot();
    appendLogLine(botPanel.logList, entry, parts);
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
  let isHumanAttentionAlarmEnabled = dependencies.humanAttentionAlarmStore.load() ?? true;
  setHumanAttentionAlarmButtonEnabled(botPanel.alarmToggleButton, isHumanAttentionAlarmEnabled);
  attachMutuallyExclusivePickers(botPanel);

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

    botPanel.resourcePicker.close();
    botPanel.recipePicker.close();
    hidePanel(botPanel.panel, launcher);
  });

  botPanel.closeButton.addEventListener('click', () => {
    botPanel.resourcePicker.close();
    botPanel.recipePicker.close();
    hidePanel(botPanel.panel, launcher);
  });

  botPanel.clearLogButton.addEventListener('click', () => {
    clearLogList(botPanel.logList);
  });

  botPanel.alarmToggleButton.addEventListener('click', () => {
    isHumanAttentionAlarmEnabled = !isHumanAttentionAlarmEnabled;
    dependencies.humanAttentionAlarmStore.save(isHumanAttentionAlarmEnabled);
    setHumanAttentionAlarmButtonEnabled(botPanel.alarmToggleButton, isHumanAttentionAlarmEnabled);

    addLog(isHumanAttentionAlarmEnabled ? 'Сирена включена.' : 'Сирена отключена.');
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
    miningStopRequested = false;
    botPanel.resourcePicker.close();
    setMiningButtonActive(botPanel.startMiningButton, true);
    addLog(
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
            handleMiningEvent(event, addLog, miningProcessBar);

            if (miningStopRequested && isMiningAttemptFinished(event)) {
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
            addLog,
            humanAttentionAlarm,
            isHumanAttentionAlarmEnabled
          )) {
            addLog(`Добыча остановлена из-за ошибки: ${getErrorMessage(error)}.`);
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
          addLog('Добыча остановлена.');
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

    if (miningPhase === 'active') {
      addLog('Добыча остановится после текущего сбора.');
      return;
    }

    addLog('Останавливаю добычу.');
    miningAbortController.abort();
  }

  function resumeMining(): void {
    if (!miningAbortController || miningAbortController.signal.aborted || !miningStopRequested) {
      return;
    }

    miningStopRequested = false;
    setMiningButtonActive(botPanel.startMiningButton, true);
    addLog('Добыча продолжена.');
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
            handleCraftingEvent(event, addLog, craftingProcessBars);
          }
        }
      })
      .catch((error) => {
        if (!isAbortError(error)) {
          if (!handleUnexpectedServerResponse(
            'Крафт',
            error,
            addLog,
            humanAttentionAlarm,
            isHumanAttentionAlarmEnabled
          )) {
            addLog(`Крафт остановлен из-за ошибки: ${getErrorMessage(error)}.`);
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
    addLog(craftingRestartRequested
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

  addLog('Скрипт загружен.');
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
    case 'next-mining-delayed':
      return 'pause';

    case 'farm-started':
    case 'safety-check-started':
    case 'safety-check-completed':
      return 'active';

    case 'farm-completed':
      return 'complete';

    case 'scan-completed':
      return 'busy';

    case 'farm-cancelled':
    case 'farm-interrupted':
      return 'idle';
  }
}

function isMiningAttemptFinished(event: ResourceMiningEvent): boolean {
  return event.type === 'farm-completed' || event.type === 'farm-cancelled' || event.type === 'farm-interrupted';
}

function handleMiningEvent(
  event: ResourceMiningEvent,
  addLog: (message: string, parts?: readonly BotLogLinePart[]) => void,
  processBar: ProcessBarController
): void {
  updateMiningProcessBar(event, processBar);
  logMiningEvent(event, addLog);
}

function handleCraftingEvent(
  event: ProfessionCraftingEvent,
  addLog: (message: string, parts?: readonly BotLogLinePart[]) => void,
  processBars: CraftingProcessBarsController
): void {
  processBars.handle(event);
  logCraftingEvent(event, addLog);
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

function logCraftingEvent(
  event: ProfessionCraftingEvent,
  addLog: (message: string, parts?: readonly BotLogLinePart[]) => void
): void {
  switch (event.type) {
    case 'craft-started':
      addLog(`Начат крафт ${event.amount} шт. ${formatProfessionRecipeLabel(event.recipe)}.`, [
        'Начат крафт ',
        `${event.amount} шт. `,
        createRecipeLogPart(event.recipe),
        '.'
      ]);
      return;

    case 'no-recipe-selected':
    case 'craft-request-started':
    case 'craft-completed':
    case 'next-craft-delayed':
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
  addLog: (message: string, parts?: readonly BotLogLinePart[]) => void,
  alarm: HumanAttentionAlarm,
  isAlarmEnabled: boolean
): boolean {
  if (!isUnexpectedServerResponseError(error)) {
    return false;
  }

  triggerHumanAttentionAlarm(
    `${processName} остановлена: неожиданный ответ сервера: ${getErrorMessage(error)}.`,
    addLog,
    alarm,
    isAlarmEnabled
  );

  return true;
}

function triggerHumanAttentionAlarm(
  message: string,
  addLog: (message: string, parts?: readonly BotLogLinePart[]) => void,
  alarm: HumanAttentionAlarm,
  isAlarmEnabled: boolean
): void {
  if (isAlarmEnabled) {
    alarm.play();
  }

  addLog(`${message} Требуется участие человека.`, [
    message,
    ' ',
    createHumanAttentionLogPart()
  ]);
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
