export interface HumanAttentionAlarmStore {
  load(): boolean | null;
  save(isEnabled: boolean): void;
}
