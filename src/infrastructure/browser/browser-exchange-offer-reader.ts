import { map, switchMap, take, type Observable } from 'rxjs';
import { fromFetch } from 'rxjs/fetch';
import { UnexpectedServerResponseError } from '../../application/errors/unexpected-server-response-error';
import type {
  ExchangeOfferFilter,
  ExchangeOfferReader
} from '../../application/ports/exchange-offer-reader';
import type { ExchangeOffer } from '../../domain/entities/exchange-offer';
import { DwarExchangeOffersHtmlParser } from './dwar-exchange-offers-html-parser';
import {
  buildExchangeOffersRequestBody,
  EXCHANGE_OFFERS_REQUEST
} from './exchange-offers-request';

export class BrowserExchangeOfferReader implements ExchangeOfferReader {
  constructor(private readonly parser: DwarExchangeOffersHtmlParser) {}

  read(filter: ExchangeOfferFilter): Observable<readonly ExchangeOffer[]> {
    return fromFetch(EXCHANGE_OFFERS_REQUEST.url, {
      method: EXCHANGE_OFFERS_REQUEST.method,
      body: buildExchangeOffersRequestBody(filter),
      credentials: 'same-origin'
    }).pipe(
      switchMap((response) => {
        if (!response.ok) {
          throw new UnexpectedServerResponseError(
            `Exchange offers request failed with HTTP ${response.status}.`
          );
        }

        const responseUrl = new URL(response.url, window.location.href);

        if (responseUrl.pathname !== '/area_auction.php') {
          throw new UnexpectedServerResponseError('Exchange offers request was redirected.');
        }

        return response.text();
      }),
      map((htmlText) => this.parser.parse(htmlText)),
      take(1)
    );
  }
}
