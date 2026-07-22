import type { HumanAttentionAlarmStore } from '../../application/ports/human-attention-alarm-store';
import { loadJsonFromLocalStorage, saveJsonToLocalStorage } from './local-storage-json';

const STORAGE_KEY = 'dwar-bot.human-attention-alarm.v1';

export class LocalStorageHumanAttentionAlarmStore implements HumanAttentionAlarmStore {
  load(): boolean | null {
    return loadJsonFromLocalStorage(STORAGE_KEY, isBoolean);
  }

  save(isEnabled: boolean): void {
    saveJsonToLocalStorage(STORAGE_KEY, isEnabled);
  }
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}
