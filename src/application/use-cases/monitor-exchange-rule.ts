import {
  concat,
  defer,
  map,
  of,
  repeat,
  take,
  type Observable
} from 'rxjs';
import type { ExchangeMonitoringEvent } from '../events/exchange-monitoring-event';
import type { ExchangeOfferReader } from '../ports/exchange-offer-reader';
import type { Delay } from '../ports/delay';
import type { TaskScheduler } from '../ports/task-scheduler';
import {
  ExchangeMonitoringRule,
  type ExchangeMonitoringRuleSnapshot
} from '../../domain/entities/exchange-monitoring-rule';
import { selectExchangeOffersAtOrAbovePrice } from '../../domain/services/exchange-offer-selection';

const MILLISECONDS_PER_MINUTE = 60_000;

export interface MonitorExchangeRuleInput {
  rule: ExchangeMonitoringRuleSnapshot;
  getIntervalMinutes(): number;
}

export class MonitorExchangeRuleUseCase {
  constructor(
    private readonly offerReader: ExchangeOfferReader,
    private readonly delay: Delay,
    private readonly taskScheduler: TaskScheduler
  ) {}

  execute(input: MonitorExchangeRuleInput): Observable<ExchangeMonitoringEvent> {
    const rule = ExchangeMonitoringRule.create(input.rule);

    return defer(() => this.check(rule)).pipe(
      repeat({
        delay: () => this.delay.wait(getIntervalMilliseconds(input.getIntervalMinutes()))
      })
    );
  }

  private check(rule: ExchangeMonitoringRule): Observable<ExchangeMonitoringEvent> {
    const ruleSnapshot = rule.toSnapshot();

    return concat(
      of<ExchangeMonitoringEvent>({
        type: 'check-started',
        rule: ruleSnapshot
      }),
      this.taskScheduler.schedule(() => this.offerReader.read({
        title: rule.getTitle(),
        quality: rule.getQuality()
      }).pipe(
        take(1),
        map((offers): ExchangeMonitoringEvent => ({
          type: 'check-completed',
          rule: ruleSnapshot,
          offersFound: offers.length,
          matchingOffers: selectExchangeOffersAtOrAbovePrice(
            offers,
            rule.getMinimumPriceCopper()
          ).map((offer) => offer.toSnapshot())
        }))
      ))
    );
  }
}

function getIntervalMilliseconds(intervalMinutes: number): number {
  if (!Number.isSafeInteger(intervalMinutes) || intervalMinutes < 1) {
    throw new Error('Exchange monitoring interval must be a positive integer.');
  }

  const intervalMilliseconds = intervalMinutes * MILLISECONDS_PER_MINUTE;

  if (!Number.isSafeInteger(intervalMilliseconds)) {
    throw new Error('Exchange monitoring interval is too large.');
  }

  return intervalMilliseconds;
}
