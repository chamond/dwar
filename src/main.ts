import { AttackHuntMobUseCase } from './application/use-cases/attack-hunt-mob';
import { CreateBotLogEntryUseCase } from './application/use-cases/create-bot-log-entry';
import { EquipAncientClanPickaxeUseCase } from './application/use-cases/equip-ancient-clan-pickaxe';
import { ForceStopResourceMiningUseCase } from './application/use-cases/force-stop-resource-mining';
import { ListCurrentLocationPlayersUseCase } from './application/use-cases/list-current-location-players';
import { ListHuntTargetsUseCase } from './application/use-cases/list-hunt-targets';
import { ListProfessionRecipesUseCase } from './application/use-cases/list-profession-recipes';
import { ListResourcesUseCase } from './application/use-cases/list-resources';
import { RequestSplinterHelpUseCase } from './application/use-cases/request-splinter-help';
import { RunProfessionCraftingUseCase } from './application/use-cases/run-profession-crafting';
import { RunResourceMiningUseCase } from './application/use-cases/run-resource-mining';
import { SolveHuntMinigameUseCase } from './application/use-cases/solve-hunt-minigame';
import { BrowserBackpackItemQuantityReader } from './infrastructure/browser/browser-backpack-item-quantity-reader';
import { BrowserEquipmentItemEquipper } from './infrastructure/browser/browser-equipment-item-equipper';
import { BrowserCurrentLocationPlayerReader } from './infrastructure/browser/browser-current-location-player-reader';
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
import { detectCurrentPlayerSplinter } from './infrastructure/browser/detect-current-player-splinter';
import { DwarBackpackHtmlParser } from './infrastructure/browser/dwar-backpack-html-parser';
import { DwarChatUsersHtmlParser } from './infrastructure/browser/dwar-chat-users-html-parser';
import { DwarHuntZoneXmlParser } from './infrastructure/browser/dwar-hunt-zone-xml-parser';
import { getAreaId } from './infrastructure/browser/get-area-id';
import { LocalStorageLauncherPositionStore } from './infrastructure/browser/local-storage-launcher-position-store';
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
  const equipAncientClanPickaxe = new EquipAncientClanPickaxeUseCase(
    new StaticEquipmentItemRepository(),
    new BrowserEquipmentItemEquipper()
  );
  const requestSplinterHelp = new RequestSplinterHelpUseCase(
    listCurrentLocationPlayers,
    new BrowserPrivateMessageSender(),
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
  const huntZoneXmlParser = new DwarHuntZoneXmlParser(resourceRepository);
  const huntZoneScanner = new BrowserHuntZoneScanner(huntZoneXmlParser);
  const huntZoneScanStore = new InMemoryHuntZoneScanStore();
  const attackHuntMob = new AttackHuntMobUseCase(
    huntZoneScanner,
    huntZoneScanStore,
    huntTargetRepository,
    new BrowserHuntMobAttacker(),
    getAreaId
  );
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
  const gameActionScheduler = new FifoTaskScheduler();
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
    attackHuntMob,
    createLogEntry,
    forceStopResourceMining,
    huntMinigameImageDownloader,
    huntMinigameRecognizer,
    listProfessionRecipes,
    listResources,
    listHuntTargets,
    launcherPositionStore,
    mainChatHtmlReader: new BrowserMainChatHtmlReader(),
    panelPositionStore,
    panelSizeStore,
    professionRecipeSelectionStore,
    resourceSelectionStore,
    requestSplinterHelp,
    runProfessionCrafting,
    runResourceMining,
    solveHuntMinigame,
    soundVolumeStore
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
} else {
  bootstrap();
}
