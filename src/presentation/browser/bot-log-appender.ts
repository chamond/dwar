import type { CreateBotLogEntryUseCase } from '../../application/use-cases/create-bot-log-entry';
import { appendLogLine, type BotLogLineOptions } from './log-list';

export type AddBotLog = (message: string, options?: BotLogLineOptions) => void;

export function createBotLogAppender(
  logList: HTMLElement,
  createLogEntry: CreateBotLogEntryUseCase
): AddBotLog {
  return (message, options = {}): void => {
    const entry = createLogEntry.execute({ message }).toSnapshot();
    appendLogLine(logList, entry, options);
  };
}
