import type { AlarmVolumeStore } from '../../application/ports/alarm-volume-store';
import { loadJsonFromLocalStorage, saveJsonToLocalStorage } from './local-storage-json';

const STORAGE_KEY = 'dwar-bot.alarm-volume.v1';

export class LocalStorageAlarmVolumeStore implements AlarmVolumeStore {
  load(): number | null {
    return loadJsonFromLocalStorage(STORAGE_KEY, isAlarmVolume);
  }

  save(volume: number): void {
    if (!isAlarmVolume(volume)) {
      return;
    }

    saveJsonToLocalStorage(STORAGE_KEY, volume);
  }
}

function isAlarmVolume(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
}
