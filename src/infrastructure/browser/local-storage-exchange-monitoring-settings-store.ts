import type {
  ExchangeMonitoringSettings,
  ExchangeMonitoringSettingsStore
} from '../../application/ports/exchange-monitoring-settings-store';
import {
  isExchangeItemQuality,
  type ExchangeMonitoringRuleSnapshot
} from '../../domain/entities/exchange-monitoring-rule';
import { loadJsonFromLocalStorage, saveJsonToLocalStorage } from './local-storage-json';

const STORAGE_KEY = 'dwar-bot.exchange-monitoring-settings.v1';

export class LocalStorageExchangeMonitoringSettingsStore
implements ExchangeMonitoringSettingsStore {
  load(): ExchangeMonitoringSettings | null {
    return loadJsonFromLocalStorage(STORAGE_KEY, isExchangeMonitoringSettings);
  }

  save(settings: ExchangeMonitoringSettings): void {
    if (!isExchangeMonitoringSettings(settings)) {
      return;
    }

    saveJsonToLocalStorage(STORAGE_KEY, {
      intervalMinutes: settings.intervalMinutes,
      rules: settings.rules.map((rule) => ({ ...rule }))
    });
  }
}

function isExchangeMonitoringSettings(
  value: unknown
): value is ExchangeMonitoringSettings {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const settings = value as Record<string, unknown>;

  if (
    !Number.isSafeInteger(settings.intervalMinutes)
    || (settings.intervalMinutes as number) < 1
    || !Array.isArray(settings.rules)
    || !settings.rules.every(isExchangeMonitoringRuleSnapshot)
  ) {
    return false;
  }

  const ruleIds = settings.rules.map((rule) => rule.id);
  return new Set(ruleIds).size === ruleIds.length;
}

function isExchangeMonitoringRuleSnapshot(
  value: unknown
): value is ExchangeMonitoringRuleSnapshot {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const rule = value as Record<string, unknown>;

  return (
    typeof rule.id === 'string'
    && rule.id.trim().length > 0
    && typeof rule.title === 'string'
    && rule.title.trim().length <= 60
    && isExchangeItemQuality(rule.quality)
    && Number.isSafeInteger(rule.minimumPriceCopper)
    && (rule.minimumPriceCopper as number) >= 0
  );
}
