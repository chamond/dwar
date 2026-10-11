export interface BotStore {
  enabled(chat: number): boolean;
  setEnabled(chat: number, enabled: boolean): void;
  claim(chat: number, message: number, now: number): boolean;
}
export type Logger = (
  event: string,
  fields?: Record<string, string | number | boolean>,
) => void;
