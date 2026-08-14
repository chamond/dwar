import { AttackHuntMobUseCase } from './application/use-cases/attack-hunt-mob';
import { CreateBotLogEntryUseCase } from './application/use-cases/create-bot-log-entry';
import { EquipAncientClanPickaxeUseCase } from './application/use-cases/equip-ancient-clan-pickaxe';
import { ForceStopResourceMiningUseCase } from './application/use-cases/force-stop-resource-mining';
import { ListCurrentLocationPlayersUseCase } from './application/use-cases/list-current-location-players';
import { ListHuntTargetsUseCase } from './application/use-cases/list-hunt-targets';
import { ListProfessionRecipesUseCase } from './application/use-cases/list-profession-recipes';
import { ListResourcesUseCase } from './application/use-cases/list-resources';
import { MonitorExchangeRuleUseCase } from './application/use-cases/monitor-exchange-rule';
import { RequestSplinterHelpUseCase } from './application/use-cases/request-splinter-help';
import { RunProfessionCraftingUseCase } from './application/use-cases/run-profession-crafting';
import { RunHuntMobAttacksUseCase } from './application/use-cases/run-hunt-mob-attacks';
import { RunResourceMiningUseCase } from './application/use-cases/run-resource-mining';
import { SolveHuntMinigameUseCase } from './application/use-cases/solve-hunt-minigame';
import { ThankSplinterHealerUseCase } from './application/use-cases/thank-splinter-healer';
import { BrowserBackpackItemQuantityReader } from './infrastructure/browser/browser-backpack-item-quantity-reader';
import { BrowserExchangeOfferReader } from './infrastructure/browser/browser-exchange-offer-reader';
import { BrowserEquipmentItemEquipper } from './infrastructure/browser/browser-equipment-item-equipper';
import { BrowserCurrentLocationPlayerReader } from './infrastructure/browser/browser-current-location-player-reader';
import { BrowserFightFinishedReader } from './infrastructure/browser/browser-fight-finished-reader';
import { BrowserHuntResourceFarmer } from './infrastructure/browser/browser-hunt-resource-farmer';
import { BrowserHuntMinigameImageDownloader } from './infrastructure/browser/browser-hunt-minigame-image-downloader';
import { BrowserHuntMinigameRecognizer } from './infrastructure/browser/browser-hunt-minigame-recognizer';
import { BrowserHuntMinigameSolutionSubmitter } from './infrastructure/browser/browser-hunt-minigame-solution-submitter';
import { BrowserHuntMobAttacker } from './infrastructure/browser/browser-hunt-mob-attacker';
import { BrowserHuntResourceFarmCancellationSender } from './infrastructure/browser/browser-hunt-resource-farm-cancellation-sender';
import { BrowserHuntResourceFarmInterrupter } from './infrastructure/browser/browser-hunt-resource-farm-interrupter';
import { BrowserHuntZoneScanner } from './infrastructure/browser/browser-hunt-zone-scanner';
import { BrowserMainChatHtmlReader } from './infrastructure/browser/browser-main-chat-html-reader';
import { BrowserDelay } from './infrastructure/browser/browser-delay';
import { BrowserProfessionRecipeCrafter } from './infrastructure/browser/browser-profession-recipe-crafter';
import { BrowserPrivateMessageSender } from './infrastructure/browser/browser-private-message-sender';
import { BrowserSplinterHealerReader } from './infrastructure/browser/browser-splinter-healer-reader';
import { detectCurrentPlayerSplinter } from './infrastructure/browser/detect-current-player-splinter';
import { DwarBackpackHtmlParser } from './infrastructure/browser/dwar-backpack-html-parser';
import { DwarChatUsersHtmlParser } from './infrastructure/browser/dwar-chat-users-html-parser';
import { DwarExchangeOffersHtmlParser } from './infrastructure/browser/dwar-exchange-offers-html-parser';
import { DwarHuntZoneXmlParser } from './infrastructure/browser/dwar-hunt-zone-xml-parser';
import { DwarSplinterHealerMessageParser } from './infrastructure/browser/dwar-splinter-healer-message-parser';
import { getAreaId } from './infrastructure/browser/get-area-id';
import { LocalStorageLauncherPositionStore } from './infrastructure/browser/local-storage-launcher-position-store';
import { LocalStorageExchangeMonitoringSettingsStore } from './infrastructure/browser/local-storage-exchange-monitoring-settings-store';
import { LocalStoragePanelPositionStore } from './infrastructure/browser/local-storage-panel-position-store';
import { LocalStoragePanelSizeStore } from './infrastructure/browser/local-storage-panel-size-store';
import { LocalStorageProfessionRecipeSelectionStore } from './infrastructure/browser/local-storage-profession-recipe-selection-store';
import { LocalStorageResourceSelectionStore } from './infrastructure/browser/local-storage-resource-selection-store';
import { LocalStorageSoundVolumeStore } from './infrastructure/browser/local-storage-sound-volume-store';
import { StaticProfessionRecipeRepository } from './infrastructure/local-data/static-profession-recipe-repository';
import { StaticHuntTargetRepository } from './infrastructure/local-data/static-hunt-target-repository';
import { StaticEquipmentItemRepository } from './infrastructure/local-data/static-equipment-item-repository';
import { StaticResourceRepository } from './infrastructure/local-data/static-resource-repository';
import { FifoTaskScheduler } from './infrastructure/memory/fifo-task-scheduler';
import { InMemoryHuntZoneScanStore } from './infrastructure/memory/in-memory-hunt-zone-scan-store';
import { SystemClock } from './infrastructure/system/system-clock';
import { mountBotWidget } from './presentation/browser/bot-widget';

function bootstrap(): void {
  const clock = new SystemClock();
  const createLogEntry = new CreateBotLogEntryUseCase(clock);
  const resourceRepository = new StaticResourceRepository();
  const huntTargetRepository = new StaticHuntTargetRepository();
  const professionRecipeRepository = new StaticProfessionRecipeRepository(resourceRepository);
  const listResources = new ListResourcesUseCase(resourceRepository);
  const listProfessionRecipes = new ListProfessionRecipesUseCase(professionRecipeRepository);
  const listHuntTargets = new ListHuntTargetsUseCase(huntTargetRepository);
  const currentLocationPlayerReader = new BrowserCurrentLocationPlayerReader(
    new DwarChatUsersHtmlParser()
  );
  const listCurrentLocationPlayers = new ListCurrentLocationPlayersUseCase(
    currentLocationPlayerReader
  );
  const delay = new BrowserDelay();
  const gameActionScheduler = new FifoTaskScheduler();
  const privateMessageSender = new BrowserPrivateMessageSender();
  const equipAncientClanPickaxe = new EquipAncientClanPickaxeUseCase(
    new StaticEquipmentItemRepository(),
    new BrowserEquipmentItemEquipper()
  );
  const requestSplinterHelp = new RequestSplinterHelpUseCase(
    listCurrentLocationPlayers,
    privateMessageSender,
    detectCurrentPlayerSplinter,
    getAreaId,
    delay,
    equipAncientClanPickaxe
  );
  const soundVolumeStore = new LocalStorageSoundVolumeStore();
  const launcherPositionStore = new LocalStorageLauncherPositionStore();
  const panelPositionStore = new LocalStoragePanelPositionStore();
  const panelSizeStore = new LocalStoragePanelSizeStore();
  const resourceSelectionStore = new LocalStorageResourceSelectionStore();
  const professionRecipeSelectionStore = new LocalStorageProfessionRecipeSelectionStore();
  const exchangeMonitoringSettingsStore = new LocalStorageExchangeMonitoringSettingsStore();
  const mainChatHtmlReader = new BrowserMainChatHtmlReader();
  const thankSplinterHealer = new ThankSplinterHealerUseCase(
    new BrowserSplinterHealerReader(
      mainChatHtmlReader,
      new DwarSplinterHealerMessageParser()
    ),
    delay,
    getAreaId,
    privateMessageSender
  );
  const huntZoneXmlParser = new DwarHuntZoneXmlParser(resourceRepository);
  const huntZoneScanner = new BrowserHuntZoneScanner(huntZoneXmlParser);
  const huntZoneScanStore = new InMemoryHuntZoneScanStore();
  const attackHuntMob = new AttackHuntMobUseCase(
    huntZoneScanner,
    huntZoneScanStore,
    huntTargetRepository,
    new BrowserHuntMobAttacker(),
    new BrowserFightFinishedReader(),
    getAreaId,
    gameActionScheduler
  );
  const runHuntMobAttacks = new RunHuntMobAttacksUseCase(attackHuntMob, delay);
  const huntResourceFarmer = new BrowserHuntResourceFarmer();
  const huntMinigameImageDownloader = new BrowserHuntMinigameImageDownloader();
  const huntMinigameRecognizer = new BrowserHuntMinigameRecognizer();
  const huntMinigameSolutionSubmitter = new BrowserHuntMinigameSolutionSubmitter();
  const huntResourceFarmCancellationSender = new BrowserHuntResourceFarmCancellationSender();
  const huntResourceFarmInterrupter = new BrowserHuntResourceFarmInterrupter();
  const forceStopResourceMining = new ForceStopResourceMiningUseCase(huntResourceFarmInterrupter);
  const solveHuntMinigame = new SolveHuntMinigameUseCase(
    huntMinigameSolutionSubmitter,
    huntResourceFarmCancellationSender,
    delay
  );
  const backpackItemQuantityReader = new BrowserBackpackItemQuantityReader(new DwarBackpackHtmlParser());
  const professionRecipeCrafter = new BrowserProfessionRecipeCrafter();
  const monitorExchangeRule = new MonitorExchangeRuleUseCase(
    new BrowserExchangeOfferReader(new DwarExchangeOffersHtmlParser()),
    delay,
    gameActionScheduler
  );
  const runResourceMining = new RunResourceMiningUseCase(
    huntZoneScanner,
    resourceRepository,
    huntZoneScanStore,
    huntResourceFarmer,
    huntResourceFarmInterrupter,
    delay,
    clock,
    detectCurrentPlayerSplinter,
    getAreaId,
    gameActionScheduler
  );
  const runProfessionCrafting = new RunProfessionCraftingUseCase(
    professionRecipeRepository,
    backpackItemQuantityReader,
    professionRecipeCrafter,
    delay,
    gameActionScheduler
  );
  mountBotWidget({
    createLogEntry,
    exchangeMonitoringSettingsStore,
    forceStopResourceMining,
    huntMinigameImageDownloader,
    huntMinigameRecognizer,
    listProfessionRecipes,
    listResources,
    listHuntTargets,
    launcherPositionStore,
    monitorExchangeRule,
    panelPositionStore,
    panelSizeStore,
    professionRecipeSelectionStore,
    resourceSelectionStore,
    requestSplinterHelp,
    runHuntMobAttacks,
    runProfessionCrafting,
    runResourceMining,
    solveHuntMinigame,
    soundVolumeStore,
    thankSplinterHealer
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
} else {
  bootstrap();
}
