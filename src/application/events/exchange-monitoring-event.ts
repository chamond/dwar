import type { ExchangeOfferSnapshot } from '../../domain/entities/exchange-offer';
import type { ExchangeMonitoringRuleSnapshot } from '../../domain/entities/exchange-monitoring-rule';

export type ExchangeMonitoringEvent =
  | {
      type: 'check-started';
      rule: ExchangeMonitoringRuleSnapshot;
    }
  | {
      type: 'check-completed';
      rule: ExchangeMonitoringRuleSnapshot;
      offersFound: number;
      matchingOffers: readonly ExchangeOfferSnapshot[];
    };
