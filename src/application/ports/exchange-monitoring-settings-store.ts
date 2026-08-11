import type { ExchangeMonitoringRuleSnapshot } from '../../domain/entities/exchange-monitoring-rule';

export interface ExchangeMonitoringSettings {
  intervalMinutes: number;
  rules: readonly ExchangeMonitoringRuleSnapshot[];
}

export interface ExchangeMonitoringSettingsStore {
  load(): ExchangeMonitoringSettings | null;
  save(settings: ExchangeMonitoringSettings): void;
}
