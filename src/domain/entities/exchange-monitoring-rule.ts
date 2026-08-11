export type ExchangeItemQuality = -1 | 0 | 1 | 2 | 3 | 4 | 5;

export const EXCHANGE_ITEM_QUALITIES: readonly ExchangeItemQuality[] = [
  -1,
  0,
  1,
  2,
  3,
  4,
  5
];

export interface ExchangeMonitoringRuleProps {
  id: string;
  title: string;
  quality: ExchangeItemQuality;
  minimumPriceCopper: number;
}

export interface ExchangeMonitoringRuleSnapshot {
  id: string;
  title: string;
  quality: ExchangeItemQuality;
  minimumPriceCopper: number;
}

export class ExchangeMonitoringRule {
  private constructor(
    private readonly id: string,
    private readonly title: string,
    private readonly quality: ExchangeItemQuality,
    private readonly minimumPriceCopper: number
  ) {}

  static create(props: ExchangeMonitoringRuleProps): ExchangeMonitoringRule {
    const id = props.id.trim();
    const title = props.title.trim();

    if (id.length === 0) {
      throw new Error('Exchange monitoring rule id is required.');
    }

    if (title.length > 60) {
      throw new Error('Exchange monitoring title must not exceed 60 characters.');
    }

    if (!isExchangeItemQuality(props.quality)) {
      throw new Error('Exchange monitoring item quality is not supported.');
    }

    if (
      !Number.isSafeInteger(props.minimumPriceCopper)
      || props.minimumPriceCopper < 0
    ) {
      throw new Error('Exchange monitoring minimum price must be a non-negative integer.');
    }

    return new ExchangeMonitoringRule(
      id,
      title,
      props.quality,
      props.minimumPriceCopper
    );
  }

  getId(): string {
    return this.id;
  }

  getTitle(): string {
    return this.title;
  }

  getQuality(): ExchangeItemQuality {
    return this.quality;
  }

  getMinimumPriceCopper(): number {
    return this.minimumPriceCopper;
  }

  toSnapshot(): ExchangeMonitoringRuleSnapshot {
    return {
      id: this.id,
      title: this.title,
      quality: this.quality,
      minimumPriceCopper: this.minimumPriceCopper
    };
  }
}

export function isExchangeItemQuality(value: unknown): value is ExchangeItemQuality {
  return typeof value === 'number'
    && EXCHANGE_ITEM_QUALITIES.includes(value as ExchangeItemQuality);
}
