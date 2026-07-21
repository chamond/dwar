import { CreateBotLogEntryUseCase } from './application/use-cases/create-bot-log-entry';
import { SystemClock } from './infrastructure/system/system-clock';
import { mountBotWidget } from './presentation/browser/bot-widget';

function bootstrap(): void {
  const clock = new SystemClock();
  const createLogEntry = new CreateBotLogEntryUseCase(clock);

  mountBotWidget(createLogEntry);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
} else {
  bootstrap();
}
