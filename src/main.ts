import { CreateBotLogEntryUseCase } from './application/use-cases/create-bot-log-entry';
import { ListResourcesUseCase } from './application/use-cases/list-resources';
import { ScanHuntZoneUseCase } from './application/use-cases/scan-hunt-zone';
import { BrowserHuntZoneScanner } from './infrastructure/browser/browser-hunt-zone-scanner';
import { DwarHuntZoneXmlParser } from './infrastructure/browser/dwar-hunt-zone-xml-parser';
import { LocalStorageLauncherPositionStore } from './infrastructure/browser/local-storage-launcher-position-store';
import { LocalStoragePanelSizeStore } from './infrastructure/browser/local-storage-panel-size-store';
import { StaticResourceRepository } from './infrastructure/local-data/static-resource-repository';
import { InMemoryHuntZoneScanStore } from './infrastructure/memory/in-memory-hunt-zone-scan-store';
import { SystemClock } from './infrastructure/system/system-clock';
import { mountBotWidget } from './presentation/browser/bot-widget';

function bootstrap(): void {
  const clock = new SystemClock();
  const createLogEntry = new CreateBotLogEntryUseCase(clock);
  const resourceRepository = new StaticResourceRepository();
  const listResources = new ListResourcesUseCase(resourceRepository);
  const launcherPositionStore = new LocalStorageLauncherPositionStore();
  const panelSizeStore = new LocalStoragePanelSizeStore();
  const huntZoneXmlParser = new DwarHuntZoneXmlParser(resourceRepository);
  const huntZoneScanner = new BrowserHuntZoneScanner(huntZoneXmlParser);
  const huntZoneScanStore = new InMemoryHuntZoneScanStore();
  const scanHuntZone = new ScanHuntZoneUseCase(huntZoneScanner, resourceRepository, huntZoneScanStore);

  mountBotWidget({
    createLogEntry,
    listResources,
    launcherPositionStore,
    panelSizeStore,
    scanHuntZone
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
} else {
  bootstrap();
}
