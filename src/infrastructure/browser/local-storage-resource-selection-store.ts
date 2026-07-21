import type { ResourceSelectionStore } from '../../application/ports/resource-selection-store';
import type { BotResourceId } from '../../domain/entities/bot-resource';
import { loadJsonFromLocalStorage, saveJsonToLocalStorage } from './local-storage-json';

const STORAGE_KEY = 'dwar-bot.resource-selection.v1';
const KNOWN_RESOURCE_IDS: readonly BotResourceId[] = ['agate', 'aquamarine', 'turquoise'];

export class LocalStorageResourceSelectionStore implements ResourceSelectionStore {
  load(): readonly BotResourceId[] | null {
    return loadJsonFromLocalStorage(STORAGE_KEY, isResourceSelection);
  }

  save(resourceIds: readonly BotResourceId[]): void {
    saveJsonToLocalStorage(STORAGE_KEY, Array.from(new Set(resourceIds)).filter(isBotResourceId));
  }
}

function isResourceSelection(value: unknown): value is readonly BotResourceId[] {
  return Array.isArray(value) && value.every(isBotResourceId);
}

function isBotResourceId(value: unknown): value is BotResourceId {
  return typeof value === 'string' && KNOWN_RESOURCE_IDS.includes(value as BotResourceId);
}
