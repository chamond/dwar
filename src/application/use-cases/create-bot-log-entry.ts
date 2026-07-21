import { BotLogEntry } from '../../domain/entities/bot-log-entry';
import type { Clock } from '../ports/clock';

export interface CreateBotLogEntryInput {
  message: string;
}

export class CreateBotLogEntryUseCase {
  constructor(private readonly clock: Clock) {}

  execute(input: CreateBotLogEntryInput): BotLogEntry {
    return BotLogEntry.create({
      message: input.message,
      createdAt: this.clock.now()
    });
  }
}

