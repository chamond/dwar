import type { HuntMinigameImageDownloader } from '../../application/ports/hunt-minigame-image-downloader';
import type { HuntMinigameRecognizer } from '../../application/ports/hunt-minigame-recognizer';
import type { LauncherPositionStore } from '../../application/ports/launcher-position-store';
import type { ExchangeMonitoringSettingsStore } from '../../application/ports/exchange-monitoring-settings-store';
import type { MainChatHtmlReader } from '../../application/ports/main-chat-html-reader';
import type { PanelPositionStore } from '../../application/ports/panel-position-store';
import type { PanelSizeStore } from '../../application/ports/panel-size-store';
import type { ProfessionRecipeSelectionStore } from '../../application/ports/profession-recipe-selection-store';
import type { ResourceSelectionStore } from '../../application/ports/resource-selection-store';
import type { SoundVolumeStore } from '../../application/ports/sound-volume-store';
import type { CreateBotLogEntryUseCase } from '../../application/use-cases/create-bot-log-entry';
import type { AttackHuntMobUseCase } from '../../application/use-cases/attack-hunt-mob';
import type { ForceStopResourceMiningUseCase } from '../../application/use-cases/force-stop-resource-mining';
import type { ListHuntTargetsUseCase } from '../../application/use-cases/list-hunt-targets';
import type { ListProfessionRecipesUseCase } from '../../application/use-cases/list-profession-recipes';
import type { ListResourcesUseCase } from '../../application/use-cases/list-resources';
import type { MonitorExchangeRuleUseCase } from '../../application/use-cases/monitor-exchange-rule';
import type { RequestSplinterHelpUseCase } from '../../application/use-cases/request-splinter-help';
import type { RunProfessionCraftingUseCase } from '../../application/use-cases/run-profession-crafting';
import type { RunResourceMiningUseCase } from '../../application/use-cases/run-resource-mining';
import type { SolveHuntMinigameUseCase } from '../../application/use-cases/solve-hunt-minigame';
import type { ThankSplinterHealerUseCase } from '../../application/use-cases/thank-splinter-healer';
import { createBotLogAppender, type AddBotLog } from './bot-log-appender';
import { createBotPanel, type BotPanelElements } from './bot-panel';
import { BOT_WIDGET_STYLES } from './bot-widget-styles';
import { DRAG_IGNORE_SELECTOR, ROOT_ID } from './bot-widget-constants';
import { createCraftingProcessController } from './crafting-process-controller';
import { createExchangeMonitoringController } from './exchange-monitoring-controller';
import { createCraftingProcessBarsController } from './crafting-process-bars';
import { createHuntingController } from './hunting-controller';
import { attachDraggableLauncher, restoreLauncherPosition } from './draggable-launcher';
import { attachDraggablePanel, restorePanelPosition } from './draggable-panel';
import { createLauncherButton } from './launcher-button';
import { clearLogList } from './log-list';
import { createMainChatLogController } from './main-chat-log-controller';
import { appendMinigameRecognitionLog } from './minigame-recognition-log';
import { createMiningProcessController } from './mining-process-controller';
import { keepPanelInViewport, positionPanelNearLauncher } from './panel-position';
import { createProcessBarController } from './process-bar';
import { createProcessErrorReporter } from './process-error-reporter';
import { attachResizablePanel, keepPanelSizeInViewport, restorePanelSize } from './resizable-panel';
import { createSplinterAlertSound } from './splinter-alert-sound';
import { createSplinterHelpController } from './splinter-help-controller';
import type { SplinterHelpController } from './splinter-help-controller';

export interface BotWidgetDependencies {
  attackHuntMob: AttackHuntMobUseCase;
  createLogEntry: CreateBotLogEntryUseCase;
  exchangeMonitoringSettingsStore: ExchangeMonitoringSettingsStore;
  forceStopResourceMining: ForceStopResourceMiningUseCase;
  listProfessionRecipes: ListProfessionRecipesUseCase;
  listResources: ListResourcesUseCase;
  listHuntTargets: ListHuntTargetsUseCase;
  huntMinigameImageDownloader: HuntMinigameImageDownloader;
  huntMinigameRecognizer: HuntMinigameRecognizer;
  launcherPositionStore: LauncherPositionStore;
  mainChatHtmlReader: MainChatHtmlReader;
  monitorExchangeRule: MonitorExchangeRuleUseCase;
  panelPositionStore: PanelPositionStore;
  panelSizeStore: PanelSizeStore;
  professionRecipeSelectionStore: ProfessionRecipeSelectionStore;
  resourceSelectionStore: ResourceSelectionStore;
  requestSplinterHelp: RequestSplinterHelpUseCase;
  runProfessionCrafting: RunProfessionCraftingUseCase;
  runResourceMining: RunResourceMiningUseCase;
  solveHuntMinigame: SolveHuntMinigameUseCase;
  soundVolumeStore: SoundVolumeStore;
  thankSplinterHealer: ThankSplinterHealerUseCase;
}

export function mountBotWidget(dependencies: BotWidgetDependencies): void {
  if (document.getElementById(ROOT_ID)) {
    return;
  }

  const host = createHost();
  const shadowRoot = host.attachShadow({ mode: 'open' });
  const launcher = createLauncherButton();
  const splinterAlertSound = createSplinterAlertSound();
  const initialSoundVolume = dependencies.soundVolumeStore.load();

  if (initialSoundVolume !== null) {
    splinterAlertSound.setVolume(initialSoundVolume);
  }

  const botPanel = createPanel(dependencies, initialSoundVolume, (volume) => {
    splinterAlertSound.setVolume(volume);
    dependencies.soundVolumeStore.save(volume);
  });
  const addMiningLog = createBotLogAppender(botPanel.miningLogList, dependencies.createLogEntry);
  const addHuntingLog = createBotLogAppender(botPanel.huntingLogList, dependencies.createLogEntry);
  const addCraftingLog = createBotLogAppender(botPanel.craftingLogList, dependencies.createLogEntry);
  const addActiveTabLog: AddBotLog = (message, options): void => {
    const activeTab = botPanel.tabs.getActiveTab();
    const addLog = activeTab === 'exchange-monitoring'
      ? null
      : activeTab === 'mining'
      ? addMiningLog
      : activeTab === 'hunting'
        ? addHuntingLog
        : addCraftingLog;

    addLog?.(message, options);
  };
  const miningProcessBar = createProcessBarController(botPanel.miningProcessBar);
  const craftingProcessBars = createCraftingProcessBarsController(botPanel.craftingProcessBars);
  const mainChatLogController = createMainChatLogController({
    checkbox: botPanel.mainChatLogCheckbox,
    mainChatHtmlReader: dependencies.mainChatHtmlReader,
    addLog: addMiningLog
  });
  const exchangeMonitoringTabButton = botPanel.tabs.buttons.get('exchange-monitoring');

  if (!exchangeMonitoringTabButton) {
    throw new Error('Exchange monitoring tab button is missing.');
  }

  let hasUnacknowledgedExchangeMatches = false;
  const updateExchangeMonitoringTabAlert = (): void => {
    const shouldShowAlert = hasUnacknowledgedExchangeMatches
      && botPanel.tabs.getActiveTab() !== 'exchange-monitoring';
    exchangeMonitoringTabButton.classList.toggle('has-exchange-alert', shouldShowAlert);

    if (shouldShowAlert) {
      exchangeMonitoringTabButton.setAttribute(
        'aria-label',
        'Мониторинг биржи: найдены непросмотренные совпадения'
      );
      return;
    }

    exchangeMonitoringTabButton.removeAttribute('aria-label');
  };
  const exchangeMonitoringController = createExchangeMonitoringController({
    elements: botPanel.exchangeMonitoring,
    monitorExchangeRule: dependencies.monitorExchangeRule,
    settingsStore: dependencies.exchangeMonitoringSettingsStore,
    onUnacknowledgedMatchesChange: (hasUnacknowledgedMatches) => {
      hasUnacknowledgedExchangeMatches = hasUnacknowledgedMatches;
      updateExchangeMonitoringTabAlert();
    }
  });
  const detachActiveTabListener = botPanel.tabs.onActiveTabChange(() => {
    updateExchangeMonitoringTabAlert();
  });
  let splinterHelpController: SplinterHelpController | null = null;

  const miningController = createMiningProcessController({
    action: botPanel.miningAction,
    resourcePicker: botPanel.resourcePicker,
    processBar: miningProcessBar,
    forceStopResourceMining: dependencies.forceStopResourceMining,
    runResourceMining: dependencies.runResourceMining,
    huntMinigameImageDownloader: dependencies.huntMinigameImageDownloader,
    huntMinigameRecognizer: dependencies.huntMinigameRecognizer,
    solveHuntMinigame: dependencies.solveHuntMinigame,
    splinterAlertSound,
    addLog: addMiningLog,
    onSplinterDetected: () => {
      splinterHelpController?.confirmSplinter();
    },
    presentMinigameRecognition: (recognition) => {
      const entry = dependencies.createLogEntry.execute({
        message: `Распознана мини-игра: ${recognition.targetToSourceSequence.join(',')}`
      }).toSnapshot();
      appendMinigameRecognitionLog(
        botPanel.miningLogList,
        entry,
        recognition
      );
    },
    reportError: createProcessErrorReporter({
      stoppedLabel: 'Добыча остановлена',
      addLog: addMiningLog
    })
  });
  splinterHelpController = createSplinterHelpController({
    button: botPanel.splinterHelpButton,
    autoRequestCheckbox: botPanel.autoSplinterHelpCheckbox,
    requestSplinterHelp: dependencies.requestSplinterHelp,
    thankSplinterHealer: dependencies.thankSplinterHealer,
    addLog: addMiningLog,
    reportError: createProcessErrorReporter({
      stoppedLabel: 'Протокол помощи остановлен',
      addLog: addMiningLog
    }),
    onSplinterRemoved: () => {
      miningController.restartAfterSplinter();
    }
  });
  const craftingController = createCraftingProcessController({
    button: botPanel.startCraftingButton,
    recipePicker: botPanel.recipePicker,
    processBars: craftingProcessBars,
    runProfessionCrafting: dependencies.runProfessionCrafting,
    addLog: addCraftingLog,
    reportError: createProcessErrorReporter({
      stoppedLabel: 'Крафт остановлен',
      addLog: addCraftingLog
    })
  });
  const huntingController = createHuntingController({
    controls: botPanel.huntingControls,
    attackHuntMob: dependencies.attackHuntMob,
    addLog: addHuntingLog,
    reportError: createProcessErrorReporter({
      stoppedLabel: 'Охота остановлена',
      addLog: addHuntingLog
    })
  });
  attachMutuallyExclusivePickers(botPanel);
  shadowRoot.append(createStyleElement(), launcher, botPanel.panel);
  document.documentElement.append(host);
  restoreLauncherPosition(launcher, dependencies.launcherPositionStore);

  const launcherDrag = attachDraggableLauncher({
    launcher,
    positionStore: dependencies.launcherPositionStore
  });

  launcher.addEventListener('click', (event) => {
    if (launcherDrag.consumeDragClick()) {
      event.preventDefault();
      return;
    }

    if (botPanel.panel.hidden) {
      showPanel(
        botPanel.panel,
        launcher,
        dependencies.panelPositionStore,
        dependencies.panelSizeStore
      );
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

  botPanel.huntingClearLogButton.addEventListener('click', () => {
    clearLogList(botPanel.huntingLogList);
  });

  botPanel.miningAction.mainButton.addEventListener('click', () => {
    miningController.toggle();
  });

  botPanel.miningAction.forceStopButton.addEventListener('click', () => {
    miningController.forceStop();
  });

  botPanel.splinterHelpButton.addEventListener('click', () => {
    splinterHelpController?.toggle();
  });

  botPanel.startCraftingButton.addEventListener('click', () => {
    craftingController.toggle();
  });

  botPanel.huntingControls.attackButton.addEventListener('click', () => {
    huntingController.attack();
  });

  attachDraggablePanel({
    panel: botPanel.panel,
    handle: botPanel.header,
    ignoreSelector: DRAG_IGNORE_SELECTOR,
    positionStore: dependencies.panelPositionStore
  });

  attachResizablePanel({
    panel: botPanel.panel,
    handle: botPanel.resizeHandle,
    sizeStore: dependencies.panelSizeStore,
    onResize: () => {
      dependencies.panelPositionStore.save(keepPanelInViewport(botPanel.panel));
    }
  });

  shadowRoot.addEventListener('pointerdown', (event) => {
    if (
      event.target instanceof Element
      && (
        botPanel.resourcePicker.root.contains(event.target)
        || botPanel.recipePicker.root.contains(event.target)
        || botPanel.miningAction.root.contains(event.target)
      )
    ) {
      return;
    }

    closePickers(botPanel);
  });

  window.addEventListener('resize', () => {
    launcherDrag.keepInViewport();

    if (!botPanel.panel.hidden) {
      dependencies.panelSizeStore.save(keepPanelSizeInViewport(botPanel.panel));
      dependencies.panelPositionStore.save(keepPanelInViewport(botPanel.panel));
    }
  });
  window.addEventListener('pagehide', () => {
    detachActiveTabListener();
    exchangeMonitoringController.destroy();
    mainChatLogController.destroy();
    splinterHelpController?.destroy();
  }, { once: true });

  addMiningLog('Скрипт загружен.');
  addHuntingLog('Скрипт загружен.');
  addCraftingLog('Скрипт загружен.');
}

function createPanel(
  dependencies: BotWidgetDependencies,
  initialSoundVolume: number | null,
  onSoundVolumeChange: (volume: number) => void
): BotPanelElements {
  const resources = dependencies.listResources.execute().map((resource) => resource.toSnapshot());
  const recipes = dependencies.listProfessionRecipes.execute().map((recipe) => recipe.toSnapshot());
  const huntTargets = dependencies.listHuntTargets.execute().map((target) => target.toSnapshot());

  return createBotPanel(resources, recipes, huntTargets, {
    initialSoundVolume,
    selectedResourceIds: dependencies.resourceSelectionStore.load(),
    onResourceSelectionChange: (selectedResources) => {
      dependencies.resourceSelectionStore.save(selectedResources.map(({ id }) => id));
    },
    selectedRecipeIds: dependencies.professionRecipeSelectionStore.load(),
    onRecipeSelectionChange: (selectedRecipes) => {
      dependencies.professionRecipeSelectionStore.save(selectedRecipes.map(({ id }) => id));
    },
    onSoundVolumeChange
  });
}

function attachMutuallyExclusivePickers(botPanel: BotPanelElements): void {
  botPanel.resourcePicker.toggleButton.addEventListener('click', () => {
    if (!botPanel.resourcePicker.menu.hidden) {
      botPanel.recipePicker.close();
      botPanel.miningAction.closeMenu();
    }
  });

  botPanel.recipePicker.toggleButton.addEventListener('click', () => {
    if (!botPanel.recipePicker.menu.hidden) {
      botPanel.resourcePicker.close();
      botPanel.miningAction.closeMenu();
    }
  });

  botPanel.miningAction.menuToggleButton.addEventListener('click', () => {
    botPanel.resourcePicker.close();
    botPanel.recipePicker.close();
  });
}

function closePickers(botPanel: BotPanelElements): void {
  botPanel.resourcePicker.close();
  botPanel.recipePicker.close();
  botPanel.miningAction.closeMenu();
}

function showPanel(
  panel: HTMLElement,
  launcher: HTMLElement,
  panelPositionStore: PanelPositionStore,
  panelSizeStore: PanelSizeStore
): void {
  panel.hidden = false;
  launcher.setAttribute('aria-expanded', 'true');
  restorePanelSize(panel, panelSizeStore);

  if (!restorePanelPosition(panel, panelPositionStore)) {
    panelPositionStore.save(positionPanelNearLauncher(panel, launcher));
  }
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
