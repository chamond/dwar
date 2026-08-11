import type { Observable } from 'rxjs';
import type { ExchangeOffer } from '../../domain/entities/exchange-offer';
import type { ExchangeItemQuality } from '../../domain/entities/exchange-monitoring-rule';

export interface ExchangeOfferFilter {
  title: string;
  quality: ExchangeItemQuality;
}

export interface ExchangeOfferReader {
  read(filter: ExchangeOfferFilter): Observable<readonly ExchangeOffer[]>;
}
