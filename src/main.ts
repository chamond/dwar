import { CreateBotLogEntryUseCase } from './application/use-cases/create-bot-log-entry';
import { ForceStopResourceMiningUseCase } from './application/use-cases/force-stop-resource-mining';
import { ListHuntLocationsUseCase } from './application/use-cases/list-hunt-locations';
import { ListProfessionRecipesUseCase } from './application/use-cases/list-profession-recipes';
import { ListResourcesUseCase } from './application/use-cases/list-resources';
import { RunProfessionCraftingUseCase } from './application/use-cases/run-profession-crafting';
import { RunResourceMiningUseCase } from './application/use-cases/run-resource-mining';
import { SolveHuntMinigameUseCase } from './application/use-cases/solve-hunt-minigame';
import { BrowserBackpackItemQuantityReader } from './infrastructure/browser/browser-backpack-item-quantity-reader';
import { BrowserHuntResourceFarmer } from './infrastructure/browser/browser-hunt-resource-farmer';
import { BrowserHuntMinigameImageDownloader } from './infrastructure/browser/browser-hunt-minigame-image-downloader';
import { BrowserHuntMinigameRecognizer } from './infrastructure/browser/browser-hunt-minigame-recognizer';
import { BrowserHuntMinigameSolutionSubmitter } from './infrastructure/browser/browser-hunt-minigame-solution-submitter';
import { BrowserHuntResourceFarmCancellationSender } from './infrastructure/browser/browser-hunt-resource-farm-cancellation-sender';
import { BrowserHuntResourceFarmInterrupter } from './infrastructure/browser/browser-hunt-resource-farm-interrupter';
import { BrowserHuntZoneScanner } from './infrastructure/browser/browser-hunt-zone-scanner';
import { BrowserDelay } from './infrastructure/browser/browser-delay';
import { BrowserProfessionRecipeCrafter } from './infrastructure/browser/browser-profession-recipe-crafter';
import { detectCurrentPlayerSplinter } from './infrastructure/browser/detect-current-player-splinter';
import { DwarBackpackHtmlParser } from './infrastructure/browser/dwar-backpack-html-parser';
import { DwarHuntZoneXmlParser } from './infrastructure/browser/dwar-hunt-zone-xml-parser';
import { LocalStorageHuntLocationSelectionStore } from './infrastructure/browser/local-storage-hunt-location-selection-store';
import { LocalStorageLauncherPositionStore } from './infrastructure/browser/local-storage-launcher-position-store';
import { LocalStoragePanelSizeStore } from './infrastructure/browser/local-storage-panel-size-store';
import { LocalStorageProfessionRecipeSelectionStore } from './infrastructure/browser/local-storage-profession-recipe-selection-store';
import { LocalStorageResourceSelectionStore } from './infrastructure/browser/local-storage-resource-selection-store';
import { LocalStorageSoundVolumeStore } from './infrastructure/browser/local-storage-sound-volume-store';
import { StaticHuntLocationRepository } from './infrastructure/local-data/static-hunt-location-repository';
import { StaticProfessionRecipeRepository } from './infrastructure/local-data/static-profession-recipe-repository';
import { StaticResourceRepository } from './infrastructure/local-data/static-resource-repository';
import { InMemoryHuntZoneScanStore } from './infrastructure/memory/in-memory-hunt-zone-scan-store';
import { SystemClock } from './infrastructure/system/system-clock';
import { mountBotWidget } from './presentation/browser/bot-widget';

function bootstrap(): void {
  const clock = new SystemClock();
  const createLogEntry = new CreateBotLogEntryUseCase(clock);
  const resourceRepository = new StaticResourceRepository();
  const professionRecipeRepository = new StaticProfessionRecipeRepository(resourceRepository);
  const huntLocationRepository = new StaticHuntLocationRepository();
  const listResources = new ListResourcesUseCase(resourceRepository);
  const listProfessionRecipes = new ListProfessionRecipesUseCase(professionRecipeRepository);
  const listHuntLocations = new ListHuntLocationsUseCase(huntLocationRepository);
  const soundVolumeStore = new LocalStorageSoundVolumeStore();
  const launcherPositionStore = new LocalStorageLauncherPositionStore();
  const panelSizeStore = new LocalStoragePanelSizeStore();
  const resourceSelectionStore = new LocalStorageResourceSelectionStore();
  const professionRecipeSelectionStore = new LocalStorageProfessionRecipeSelectionStore();
  const locationSelectionStore = new LocalStorageHuntLocationSelectionStore();
  const huntZoneXmlParser = new DwarHuntZoneXmlParser(resourceRepository);
  const huntZoneScanner = new BrowserHuntZoneScanner(huntZoneXmlParser);
  const huntZoneScanStore = new InMemoryHuntZoneScanStore();
  const huntResourceFarmer = new BrowserHuntResourceFarmer();
  const huntMinigameImageDownloader = new BrowserHuntMinigameImageDownloader();
  const huntMinigameRecognizer = new BrowserHuntMinigameRecognizer();
  const huntMinigameSolutionSubmitter = new BrowserHuntMinigameSolutionSubmitter();
  const huntResourceFarmCancellationSender = new BrowserHuntResourceFarmCancellationSender();
  const huntResourceFarmInterrupter = new BrowserHuntResourceFarmInterrupter();
  const forceStopResourceMining = new ForceStopResourceMiningUseCase(huntResourceFarmInterrupter);
  const delay = new BrowserDelay();
  const solveHuntMinigame = new SolveHuntMinigameUseCase(
    huntMinigameSolutionSubmitter,
    huntResourceFarmCancellationSender,
    delay
  );
  const backpackItemQuantityReader = new BrowserBackpackItemQuantityReader(new DwarBackpackHtmlParser());
  const professionRecipeCrafter = new BrowserProfessionRecipeCrafter();
  const runResourceMining = new RunResourceMiningUseCase(
    huntZoneScanner,
    resourceRepository,
    huntLocationRepository,
    huntZoneScanStore,
    huntResourceFarmer,
    huntResourceFarmInterrupter,
    delay,
    clock,
    detectCurrentPlayerSplinter
  );
  const runProfessionCrafting = new RunProfessionCraftingUseCase(
    professionRecipeRepository,
    backpackItemQuantityReader,
    professionRecipeCrafter,
    delay
  );
  mountBotWidget({
    createLogEntry,
    forceStopResourceMining,
    huntMinigameImageDownloader,
    huntMinigameRecognizer,
    listHuntLocations,
    listProfessionRecipes,
    listResources,
    locationSelectionStore,
    launcherPositionStore,
    panelSizeStore,
    professionRecipeSelectionStore,
    resourceSelectionStore,
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
