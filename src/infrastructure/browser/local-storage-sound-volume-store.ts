import type { SoundVolumeStore } from '../../application/ports/sound-volume-store';
import { loadJsonFromLocalStorage, saveJsonToLocalStorage } from './local-storage-json';

const STORAGE_KEY = 'dwar-bot.sound-volume.v1';
const LEGACY_ALARM_STORAGE_KEY = 'dwar-bot.alarm-volume.v1';

export class LocalStorageSoundVolumeStore implements SoundVolumeStore {
  load(): number | null {
    return loadJsonFromLocalStorage(STORAGE_KEY, isSoundVolume)
      ?? loadJsonFromLocalStorage(LEGACY_ALARM_STORAGE_KEY, isSoundVolume);
  }

  save(volume: number): void {
    if (!isSoundVolume(volume)) {
      return;
    }

    saveJsonToLocalStorage(STORAGE_KEY, volume);
  }
}

function isSoundVolume(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
}
