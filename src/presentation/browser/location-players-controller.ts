import { Subscription, take } from 'rxjs';
import type { ListCurrentLocationPlayersUseCase } from '../../application/use-cases/list-current-location-players';
import type { AddBotLog } from './bot-log-appender';
import type { ProcessErrorReporter } from './process-error-reporter';

export interface LocationPlayersControllerOptions {
  button: HTMLButtonElement;
  listCurrentLocationPlayers: ListCurrentLocationPlayersUseCase;
  addLog: AddBotLog;
  reportError: ProcessErrorReporter;
}

export interface LocationPlayersController {
  show(): void;
  destroy(): void;
}

export function createLocationPlayersController(
  options: LocationPlayersControllerOptions
): LocationPlayersController {
  let activeRequest: Subscription | null = null;

  const finishRequest = (request: Subscription): void => {
    if (activeRequest !== request) {
      return;
    }

    activeRequest = null;
    options.button.disabled = false;
    options.button.removeAttribute('aria-busy');
  };

  const show = (): void => {
    if (activeRequest) {
      return;
    }

    const request = new Subscription();
    activeRequest = request;
    options.button.disabled = true;
    options.button.setAttribute('aria-busy', 'true');

    request.add(options.listCurrentLocationPlayers.execute().pipe(
      take(1)
    ).subscribe({
      next: (players) => {
        if (players.length === 0) {
          options.addLog('В локации нет других игроков.');
          return;
        }

        const labels = players.map((player) => `${player.nick}[${String(player.level)}]`);
        options.addLog(`Игроки в локации (${String(players.length)}): ${labels.join(', ')}`);
      },
      error: (error) => {
        finishRequest(request);
        options.reportError(error);
        request.unsubscribe();
      },
      complete: () => {
        finishRequest(request);
        request.unsubscribe();
      }
    }));
  };

  return {
    show,
    destroy: () => {
      const request = activeRequest;

      if (!request) {
        return;
      }

      finishRequest(request);
      request.unsubscribe();
    }
  };
}
