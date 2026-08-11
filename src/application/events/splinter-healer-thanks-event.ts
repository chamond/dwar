export type SplinterHealerThanksEvent =
  | {
      type: 'healer-detected';
      healerNick: string;
      delayMs: number;
      message: string;
    }
  | {
      type: 'thanks-sent';
      healerNick: string;
      message: string;
    };
