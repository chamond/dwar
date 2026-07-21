import { CreateBotLogEntryUseCase } from './application/use-cases/create-bot-log-entry';
import { ListResourcesUseCase } from './application/use-cases/list-resources';
import { LocalStorageLauncherPositionStore } from './infrastructure/browser/local-storage-launcher-position-store';
import { StaticResourceRepository } from './infrastructure/local-data/static-resource-repository';
import { SystemClock } from './infrastructure/system/system-clock';
import { mountBotWidget } from './presentation/browser/bot-widget';

function bootstrap(): void {
  const clock = new SystemClock();
  const createLogEntry = new CreateBotLogEntryUseCase(clock);
  const resourceRepository = new StaticResourceRepository();
  const listResources = new ListResourcesUseCase(resourceRepository);
  const launcherPositionStore = new LocalStorageLauncherPositionStore();

  mountBotWidget({
    createLogEntry,
    listResources,
    launcherPositionStore
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
} else {
  bootstrap();
}
