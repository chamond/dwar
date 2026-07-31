import type { HuntLocationSelectionStore } from '../../application/ports/hunt-location-selection-store';
import type { HuntMinigameCaptchaDownloader } from '../../application/ports/hunt-minigame-captcha-downloader';
import type { LauncherPositionStore } from '../../application/ports/launcher-position-store';
import type { PanelSizeStore } from '../../application/ports/panel-size-store';
import type { ProfessionRecipeSelectionStore } from '../../application/ports/profession-recipe-selection-store';
import type { ResourceSelectionStore } from '../../application/ports/resource-selection-store';
import type { CreateBotLogEntryUseCase } from '../../application/use-cases/create-bot-log-entry';
import type { ListHuntLocationsUseCase } from '../../application/use-cases/list-hunt-locations';
import type { ListProfessionRecipesUseCase } from '../../application/use-cases/list-profession-recipes';
import type { ListResourcesUseCase } from '../../application/use-cases/list-resources';
import type { RunProfessionCraftingUseCase } from '../../application/use-cases/run-profession-crafting';
import type { RunResourceMiningUseCase } from '../../application/use-cases/run-resource-mining';
import { createBotLogAppender, type AddBotLog } from './bot-log-appender';
import { createBotPanel, type BotPanelElements } from './bot-panel';
import { BOT_WIDGET_STYLES } from './bot-widget-styles';
import { DRAG_IGNORE_SELECTOR, ROOT_ID } from './bot-widget-constants';
import { createCraftingProcessController } from './crafting-process-controller';
import { createCraftingProcessBarsController } from './crafting-process-bars';
import { attachDraggableLauncher, restoreLauncherPosition } from './draggable-launcher';
import { attachDraggablePanel } from './draggable-panel';
import { createHumanAttentionAlarm } from './human-attention-alarm';
import { createLauncherButton } from './launcher-button';
import { clearLogList } from './log-list';
import { createMiningProcessController } from './mining-process-controller';
import { keepPanelInViewport, positionPanelNearLauncher } from './panel-position';
import { createProcessBarController } from './process-bar';
import { createProcessErrorReporter } from './process-error-reporter';
import { attachResizablePanel, keepPanelSizeInViewport, restorePanelSize } from './resizable-panel';

export interface BotWidgetDependencies {
  createLogEntry: CreateBotLogEntryUseCase;
  listHuntLocations: ListHuntLocationsUseCase;
  listProfessionRecipes: ListProfessionRecipesUseCase;
  listResources: ListResourcesUseCase;
  locationSelectionStore: HuntLocationSelectionStore;
  huntMinigameCaptchaDownloader: HuntMinigameCaptchaDownloader;
  launcherPositionStore: LauncherPositionStore;
  panelSizeStore: PanelSizeStore;
  professionRecipeSelectionStore: ProfessionRecipeSelectionStore;
  resourceSelectionStore: ResourceSelectionStore;
  runProfessionCrafting: RunProfessionCraftingUseCase;
  runResourceMining: RunResourceMiningUseCase;
}

export function mountBotWidget(dependencies: BotWidgetDependencies): void {
  if (document.getElementById(ROOT_ID)) {
    return;
  }

  const host = createHost();
  const shadowRoot = host.attachShadow({ mode: 'open' });
  const launcher = createLauncherButton();
  const humanAttentionAlarm = createHumanAttentionAlarm();
  const botPanel = createPanel(dependencies, (volume) => humanAttentionAlarm.setVolume(volume));
  const addMiningLog = createBotLogAppender(botPanel.miningLogList, dependencies.createLogEntry);
  const addCraftingLog = createBotLogAppender(botPanel.craftingLogList, dependencies.createLogEntry);
  const addActiveTabLog: AddBotLog = (message, options): void => {
    const addLog = botPanel.tabs.getActiveTab() === 'mining' ? addMiningLog : addCraftingLog;
    addLog(message, options);
  };
  const miningProcessBar = createProcessBarController(botPanel.miningProcessBar);
  const craftingProcessBars = createCraftingProcessBarsController(botPanel.craftingProcessBars);

  const activateHumanAttentionAlarm = (): void => {
    humanAttentionAlarm.prepare();
    humanAttentionAlarm.play();
    closePickers(botPanel);
    botPanel.humanAttentionAlarmOverlay.root.hidden = false;

    if (botPanel.panel.hidden) {
      showPanel(botPanel.panel, launcher);
    }

    botPanel.humanAttentionAlarmOverlay.stopButton.focus({ preventScroll: true });
  };

  const miningController = createMiningProcessController({
    button: botPanel.startMiningButton,
    resourcePicker: botPanel.resourcePicker,
    locationSelect: botPanel.locationSelect,
    processBar: miningProcessBar,
    runResourceMining: dependencies.runResourceMining,
    huntMinigameCaptchaDownloader: dependencies.huntMinigameCaptchaDownloader,
    addLog: addMiningLog,
    prepareHumanAttentionAlarm: () => humanAttentionAlarm.prepare(),
    reportError: createProcessErrorReporter({
      stoppedLabel: 'Добыча остановлена',
      addLog: addMiningLog,
      activateHumanAttentionAlarm
    })
  });
  const craftingController = createCraftingProcessController({
    button: botPanel.startCraftingButton,
    recipePicker: botPanel.recipePicker,
    craftAmountInput: botPanel.craftAmountInput,
    processBars: craftingProcessBars,
    runProfessionCrafting: dependencies.runProfessionCrafting,
    addLog: addCraftingLog,
    prepareHumanAttentionAlarm: () => humanAttentionAlarm.prepare(),
    reportError: createProcessErrorReporter({
      stoppedLabel: 'Крафт остановлен',
      addLog: addCraftingLog,
      activateHumanAttentionAlarm
    })
  });

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

    if (!botPanel.humanAttentionAlarmOverlay.root.hidden) {
      if (botPanel.panel.hidden) {
        showPanel(botPanel.panel, launcher);
      }

      botPanel.humanAttentionAlarmOverlay.stopButton.focus({ preventScroll: true });
      return;
    }

    if (botPanel.panel.hidden) {
      showPanel(botPanel.panel, launcher);
      addActiveTabLog('Интерфейс открыт.');
      return;
    }

    closePickers(botPanel);
    hidePanel(botPanel.panel, launcher);
  });

  botPanel.closeButton.addEventListener('click', () => {
    closePickers(botPanel);
    hidePanel(botPanel.panel, launcher);
  });

  botPanel.miningClearLogButton.addEventListener('click', () => {
    clearLogList(botPanel.miningLogList);
  });

  botPanel.craftingClearLogButton.addEventListener('click', () => {
    clearLogList(botPanel.craftingLogList);
  });

  botPanel.humanAttentionAlarmOverlay.stopButton.addEventListener('click', () => {
    humanAttentionAlarm.stop();
    botPanel.humanAttentionAlarmOverlay.root.hidden = true;
    addActiveTabLog('Сирена отключена.');
  });

  botPanel.startMiningButton.addEventListener('click', () => {
    miningController.toggle();
  });

  botPanel.startCraftingButton.addEventListener('click', () => {
    craftingController.toggle();
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
    if (
      event.target instanceof Element
      && (
        botPanel.resourcePicker.root.contains(event.target)
        || botPanel.recipePicker.root.contains(event.target)
      )
    ) {
      return;
    }

    closePickers(botPanel);
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

function createPanel(
  dependencies: BotWidgetDependencies,
  onAlarmVolumeChange: (volume: number) => void
): BotPanelElements {
  const resources = dependencies.listResources.execute().map((resource) => resource.toSnapshot());
  const recipes = dependencies.listProfessionRecipes.execute().map((recipe) => recipe.toSnapshot());
  const locations = dependencies.listHuntLocations.execute().map((location) => location.toSnapshot());

  return createBotPanel(resources, recipes, locations, {
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
    },
    onAlarmVolumeChange
  });
}

function attachMutuallyExclusivePickers(botPanel: BotPanelElements): void {
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

function closePickers(botPanel: BotPanelElements): void {
  botPanel.resourcePicker.close();
  botPanel.recipePicker.close();
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
