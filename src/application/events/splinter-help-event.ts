import type { LocationPlayerSnapshot } from '../../domain/entities/location-player';

export type SplinterHelpEvent =
  | {
      type: 'recipients-selected';
      recipients: readonly LocationPlayerSnapshot[];
      message: string;
    }
  | {
      type: 'message-sent';
      recipients: readonly LocationPlayerSnapshot[];
    }
  | {
      type: 'waiting-for-help';
      delayMs: number;
    }
  | {
      type: 'splinter-still-present';
    }
  | {
      type: 'splinter-removed';
    }
  | {
      type: 'no-eligible-players';
      retryDelayMs: number;
    };
