export interface BotLogEntryProps {
  message: string;
  createdAt: Date;
}

export interface BotLogEntrySnapshot {
  message: string;
  createdAt: Date;
}

export class BotLogEntry {
  private constructor(
    private readonly message: string,
    private readonly createdAt: Date
  ) {}

  static create(props: BotLogEntryProps): BotLogEntry {
    const message = props.message.trim();

    if (message.length === 0) {
      throw new Error('Log message is required.');
    }

    return new BotLogEntry(message, new Date(props.createdAt));
  }

  toSnapshot(): BotLogEntrySnapshot {
    return {
      message: this.message,
      createdAt: new Date(this.createdAt)
    };
  }
}

