export interface ExchangeOfferProps {
  articleId: number;
  title: string;
  requestedQuantity: number;
  priceCopper: number;
}

export interface ExchangeOfferSnapshot {
  articleId: number;
  title: string;
  requestedQuantity: number;
  priceCopper: number;
}

export class ExchangeOffer {
  private constructor(
    private readonly articleId: number,
    private readonly title: string,
    private readonly requestedQuantity: number,
    private readonly priceCopper: number
  ) {}

  static create(props: ExchangeOfferProps): ExchangeOffer {
    const title = props.title.trim();

    if (!Number.isSafeInteger(props.articleId) || props.articleId <= 0) {
      throw new Error('Exchange offer article id must be a positive integer.');
    }

    if (title.length === 0) {
      throw new Error('Exchange offer title is required.');
    }

    if (!Number.isSafeInteger(props.requestedQuantity) || props.requestedQuantity <= 0) {
      throw new Error('Exchange offer quantity must be a positive integer.');
    }

    if (!Number.isSafeInteger(props.priceCopper) || props.priceCopper < 0) {
      throw new Error('Exchange offer price must be a non-negative integer.');
    }

    return new ExchangeOffer(
      props.articleId,
      title,
      props.requestedQuantity,
      props.priceCopper
    );
  }

  getPriceCopper(): number {
    return this.priceCopper;
  }

  toSnapshot(): ExchangeOfferSnapshot {
    return {
      articleId: this.articleId,
      title: this.title,
      requestedQuantity: this.requestedQuantity,
      priceCopper: this.priceCopper
    };
  }
}
