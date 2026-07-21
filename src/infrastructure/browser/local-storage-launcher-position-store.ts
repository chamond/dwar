import type {
  LauncherPosition,
  LauncherPositionStore
} from '../../application/ports/launcher-position-store';

const STORAGE_KEY = 'dwar-bot.launcher-position.v1';

export class LocalStorageLauncherPositionStore implements LauncherPositionStore {
  load(): LauncherPosition | null {
    const storage = getLocalStorage();

    if (!storage) {
      return null;
    }

    try {
      const rawPosition = storage.getItem(STORAGE_KEY);

      if (!rawPosition) {
        return null;
      }

      const parsedPosition: unknown = JSON.parse(rawPosition);

      if (!isLauncherPosition(parsedPosition)) {
        return null;
      }

      return parsedPosition;
    } catch {
      return null;
    }
  }

  save(position: LauncherPosition): void {
    const storage = getLocalStorage();

    if (!storage || !isFinitePosition(position)) {
      return;
    }

    try {
      storage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          left: Math.round(position.left),
          top: Math.round(position.top)
        })
      );
    } catch {
      // The page can block localStorage. The widget stays usable without persistence.
    }
  }
}

function getLocalStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
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
