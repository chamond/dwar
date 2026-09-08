import type {
  ResourceProbabilityStore,
  ResourceProbabilities
} from '../../application/ports/resource-probability-store';
import type { BotResourceId } from '../../domain/entities/bot-resource';
import { loadJsonFromLocalStorage, saveJsonToLocalStorage } from './local-storage-json';

const STORAGE_KEY = 'dwar-bot.resource-probabilities.v1';
const KNOWN_RESOURCE_IDS: readonly BotResourceId[] = ['agate', 'aquamarine', 'turquoise'];

export class LocalStorageResourceProbabilityStore implements ResourceProbabilityStore {
  load(): ResourceProbabilities | null {
    return loadJsonFromLocalStorage(STORAGE_KEY, isResourceProbabilities);
  }

  save(probabilities: ResourceProbabilities): void {
    const validEntries = Object.entries(probabilities).filter(([id, value]) => {
      return isBotResourceId(id) && Number.isInteger(value) && value >= 0 && value <= 100;
    });

    saveJsonToLocalStorage(STORAGE_KEY, Object.fromEntries(validEntries));
  }
}

function isResourceProbabilities(value: unknown): value is ResourceProbabilities {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  return Object.entries(value).every(([id, probability]) => {
    return isBotResourceId(id)
      && typeof probability === 'number'
      && Number.isInteger(probability)
      && probability >= 0
      && probability <= 100;
  });
}

function isBotResourceId(value: string): value is BotResourceId {
  return KNOWN_RESOURCE_IDS.includes(value as BotResourceId);
}
