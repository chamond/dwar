import type { ExchangeOffer } from '../entities/exchange-offer';

export function selectExchangeOffersAtOrAbovePrice(
  offers: readonly ExchangeOffer[],
  minimumPriceCopper: number
): readonly ExchangeOffer[] {
  if (!Number.isSafeInteger(minimumPriceCopper) || minimumPriceCopper < 0) {
    throw new Error('Exchange offer minimum price must be a non-negative integer.');
  }

  return offers
    .filter((offer) => offer.getPriceCopper() >= minimumPriceCopper)
    .sort((left, right) => right.getPriceCopper() - left.getPriceCopper());
}
