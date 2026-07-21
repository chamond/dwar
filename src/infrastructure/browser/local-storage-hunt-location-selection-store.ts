import type { HuntLocationSelectionStore } from '../../application/ports/hunt-location-selection-store';
import type { HuntLocationId } from '../../domain/entities/hunt-location';
import { loadJsonFromLocalStorage, saveJsonToLocalStorage } from './local-storage-json';

const STORAGE_KEY = 'dwar-bot.hunt-location-selection.v1';
const KNOWN_HUNT_LOCATION_IDS: readonly HuntLocationId[] = ['baurville', 'royal-tombs'];

export class LocalStorageHuntLocationSelectionStore implements HuntLocationSelectionStore {
  load(): HuntLocationId | null {
    return loadJsonFromLocalStorage(STORAGE_KEY, isHuntLocationId);
  }

  save(locationId: HuntLocationId): void {
    saveJsonToLocalStorage(STORAGE_KEY, locationId);
  }
}

function isHuntLocationId(value: unknown): value is HuntLocationId {
  return typeof value === 'string' && KNOWN_HUNT_LOCATION_IDS.includes(value as HuntLocationId);
}
