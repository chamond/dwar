import type {
  HuntingSettings,
  HuntingSettingsStore
} from '../../application/ports/hunting-settings-store';
import {
  BOT_HUNT_TARGET_IDS,
  type BotHuntTargetId
} from '../../domain/entities/bot-hunt-target';
import { loadJsonFromLocalStorage, saveJsonToLocalStorage } from './local-storage-json';

const STORAGE_KEY = 'dwar-bot.hunting-settings.v1';

export class LocalStorageHuntingSettingsStore implements HuntingSettingsStore {
  load(): HuntingSettings | null {
    return loadJsonFromLocalStorage(STORAGE_KEY, isHuntingSettings);
  }

  save(settings: HuntingSettings): void {
    if (!isHuntingSettings(settings)) {
      return;
    }

    saveJsonToLocalStorage(STORAGE_KEY, {
      targetIds: [...settings.targetIds],
      preferCrowdedTarget: settings.preferCrowdedTarget,
      aggressiveHunting: settings.aggressiveHunting,
      angerMob: settings.angerMob
    });
  }
}

function isHuntingSettings(value: unknown): value is HuntingSettings {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const settings = value as Record<string, unknown>;

  if (
    !Array.isArray(settings.targetIds)
    || !settings.targetIds.every(isBotHuntTargetId)
    || typeof settings.preferCrowdedTarget !== 'boolean'
    || typeof settings.aggressiveHunting !== 'boolean'
    || typeof settings.angerMob !== 'boolean'
  ) {
    return false;
  }

  return new Set(settings.targetIds).size === settings.targetIds.length;
}

function isBotHuntTargetId(value: unknown): value is BotHuntTargetId {
  return typeof value === 'string'
    && BOT_HUNT_TARGET_IDS.includes(value as BotHuntTargetId);
}
