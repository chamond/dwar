import { EMPTY, catchError, finalize, tap, type Subscription } from 'rxjs';
import type { MainChatHtmlReader } from '../../application/ports/main-chat-html-reader';
import type { AddBotLog } from './bot-log-appender';

export interface MainChatLogControllerOptions {
  checkbox: HTMLInputElement;
  mainChatHtmlReader: MainChatHtmlReader;
  addLog: AddBotLog;
}

export interface MainChatLogController {
  destroy(): void;
}

export function createMainChatLogController(
  options: MainChatLogControllerOptions
): MainChatLogController {
  let chatSubscription: Subscription | null = null;

  const stop = (): void => {
    chatSubscription?.unsubscribe();
    chatSubscription = null;
  };

  const start = (): void => {
    if (chatSubscription && !chatSubscription.closed) {
      return;
    }

    options.addLog('Дублирование чата «Основной» включено.');

    const subscription = options.mainChatHtmlReader.observe().pipe(
      tap((html) => {
        options.addLog(html);
      }),
      catchError(() => {
        options.checkbox.checked = false;
        options.addLog('Не удалось продолжить дублирование чата «Основной».', {
          tone: 'failure'
        });
        return EMPTY;
      }),
      finalize(() => {
        chatSubscription = null;
      })
    ).subscribe();

    chatSubscription = subscription.closed ? null : subscription;
  };

  const handleChange = (): void => {
    if (options.checkbox.checked) {
      start();
      return;
    }

    stop();
    options.addLog('Дублирование чата «Основной» выключено.');
  };

  options.checkbox.addEventListener('change', handleChange);

  return {
    destroy(): void {
      options.checkbox.removeEventListener('change', handleChange);
      stop();
    }
  };
}
