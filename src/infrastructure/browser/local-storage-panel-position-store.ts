import type {
  PanelPosition,
  PanelPositionStore
} from '../../application/ports/panel-position-store';
import { loadJsonFromLocalStorage, saveJsonToLocalStorage } from './local-storage-json';

const STORAGE_KEY = 'dwar-bot.panel-position.v1';

export class LocalStoragePanelPositionStore implements PanelPositionStore {
  load(): PanelPosition | null {
    return loadJsonFromLocalStorage(STORAGE_KEY, isPanelPosition);
  }

  save(position: PanelPosition): void {
    if (!isFinitePosition(position)) {
      return;
    }

    saveJsonToLocalStorage(STORAGE_KEY, {
      left: Math.round(position.left),
      top: Math.round(position.top)
    });
  }
}

function isPanelPosition(value: unknown): value is PanelPosition {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const position = value as Record<string, unknown>;

  return (
    typeof position.left === 'number'
    && typeof position.top === 'number'
    && Number.isFinite(position.left)
    && Number.isFinite(position.top)
  );
}

function isFinitePosition(position: PanelPosition): boolean {
  return Number.isFinite(position.left) && Number.isFinite(position.top);
}
