import { isUnexpectedServerResponseError } from '../../application/errors/unexpected-server-response-error';
import type { BotLogLinePart } from './log-list';
import type { AddBotLog } from './bot-log-appender';

export interface ProcessErrorReporterOptions {
  stoppedLabel: string;
  addLog: AddBotLog;
}

export type ProcessErrorReporter = (error: unknown) => void;

export function createProcessErrorReporter(
  options: ProcessErrorReporterOptions
): ProcessErrorReporter {
  return (error): void => {
    if (isAbortError(error)) {
      return;
    }

    const errorMessage = getErrorMessage(error);

    if (!isUnexpectedServerResponseError(error)) {
      options.addLog(`${options.stoppedLabel} из-за ошибки: ${errorMessage}.`);
      return;
    }

    const message = `${options.stoppedLabel}: неожиданный ответ сервера: ${errorMessage}.`;
    options.addLog(
      `${message} Требуется участие человека.`,
      {
        parts: [
          message,
          ' ',
          createAttentionRequiredLogPart()
        ],
        tone: 'failure'
      }
    );
  };
}

function createAttentionRequiredLogPart(): BotLogLinePart {
  return {
    text: 'ТРЕБУЕТСЯ УЧАСТИЕ ЧЕЛОВЕКА',
    color: '#ff4f5f',
    title: 'Проверь страницу игры вручную'
  };
}

function isAbortError(error: unknown): boolean {
  if (error instanceof DOMException) {
    return error.name === 'AbortError';
  }

  if (error instanceof Error) {
    return error.name === 'AbortError';
  }

  return false;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return 'неизвестная ошибка';
}
