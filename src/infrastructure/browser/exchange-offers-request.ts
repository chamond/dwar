import type { ExchangeOfferFilter } from '../../application/ports/exchange-offer-reader';

export const EXCHANGE_OFFERS_REQUEST = {
  url: 'https://w1.dwar.ru/area_auction.php?&mode=request',
  method: 'POST'
} as const;

export function buildExchangeOffersRequestBody(
  filter: ExchangeOfferFilter
): URLSearchParams {
  return new URLSearchParams({
    '_filter[ihave]': '0',
    '_filter[only_friends]': '0',
    '_filter[title]': filter.title.trim(),
    '_filter[count_min]': '',
    '_filter[count_max]': '',
    '_filter[level_min]': '',
    '_filter[level_max]': '',
    '_filter[kind]': '',
    '_filter[quality]': String(filter.quality),
    '_filter[sort]': 'cost',
    '_filter[sort_order]': 'desc',
    _filterapply: 'Ок'
  });
}
