import type { PanelSize, PanelSizeStore } from '../../application/ports/panel-size-store';
import { loadJsonFromLocalStorage, saveJsonToLocalStorage } from './local-storage-json';

const STORAGE_KEY = 'dwar-bot.panel-size.v1';

export class LocalStoragePanelSizeStore implements PanelSizeStore {
  load(): PanelSize | null {
    return loadJsonFromLocalStorage(STORAGE_KEY, isPanelSize);
  }

  save(size: PanelSize): void {
    if (!isFiniteSize(size)) {
      return;
    }

    saveJsonToLocalStorage(STORAGE_KEY, {
      width: Math.round(size.width),
      height: Math.round(size.height)
    });
  }
}

function isPanelSize(value: unknown): value is PanelSize {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const size = value as Record<string, unknown>;

  return (
    typeof size.width === 'number' &&
    typeof size.height === 'number' &&
    Number.isFinite(size.width) &&
    Number.isFinite(size.height)
  );
}

function isFiniteSize(size: PanelSize): boolean {
  return Number.isFinite(size.width) && Number.isFinite(size.height);
}
