import type {
  LauncherPosition,
  LauncherPositionStore
} from '../../application/ports/launcher-position-store';
import { loadJsonFromLocalStorage, saveJsonToLocalStorage } from './local-storage-json';

const STORAGE_KEY = 'dwar-bot.launcher-position.v1';

export class LocalStorageLauncherPositionStore implements LauncherPositionStore {
  load(): LauncherPosition | null {
    return loadJsonFromLocalStorage(STORAGE_KEY, isLauncherPosition);
  }

  save(position: LauncherPosition): void {
    if (!isFinitePosition(position)) {
      return;
    }

    saveJsonToLocalStorage(STORAGE_KEY, {
      left: Math.round(position.left),
      top: Math.round(position.top)
    });
  }
}

function isLauncherPosition(value: unknown): value is LauncherPosition {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const position = value as Record<string, unknown>;

  return (
    typeof position.left === 'number' &&
    typeof position.top === 'number' &&
    Number.isFinite(position.left) &&
    Number.isFinite(position.top)
  );
}

function isFinitePosition(position: LauncherPosition): boolean {
  return Number.isFinite(position.left) && Number.isFinite(position.top);
}
