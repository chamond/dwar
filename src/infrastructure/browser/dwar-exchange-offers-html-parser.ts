import { UnexpectedServerResponseError } from '../../application/errors/unexpected-server-response-error';
import { ExchangeOffer } from '../../domain/entities/exchange-offer';

const COPPER_PER_SILVER = 100;
const COPPER_PER_GOLD = 10_000;

export class DwarExchangeOffersHtmlParser {
  parse(htmlText: string): readonly ExchangeOffer[] {
    const document = new DOMParser().parseFromString(htmlText, 'text/html');
    const filterTitleInput = document.querySelector('input[name="_filter[title]"]');

    if (!filterTitleInput) {
      throw new UnexpectedServerResponseError('Exchange response does not contain the filter form.');
    }

    const itemList = document.querySelector('#item_list');

    if (!itemList) {
      return [];
    }

    return Array.from(itemList.querySelectorAll('tr'))
      .filter((row) => row.querySelector('[art_id][cnt]') !== null)
      .map((row) => this.parseOffer(row));
  }

  private parseOffer(row: HTMLTableRowElement): ExchangeOffer {
    const itemElement = row.querySelector<HTMLElement>('[art_id][cnt]');
    const titleElement = row.querySelector<HTMLAnchorElement>(
      'a[onclick*="showArtifactInfo"]'
    );
    const priceElement = row.querySelector<HTMLElement>('.bid-container');

    if (!itemElement || !titleElement || !priceElement) {
      throw new UnexpectedServerResponseError('Exchange offer row has an unexpected structure.');
    }

    const articleId = parsePositiveInteger(
      itemElement.getAttribute('art_id'),
      'article id'
    );
    const requestedQuantity = parsePositiveInteger(
      itemElement.getAttribute('cnt'),
      'requested quantity'
    );
    const title = titleElement.textContent?.trim() ?? '';
    const gold = parseDenomination(priceElement, '.mgold', 'gold');
    const silver = parseDenomination(priceElement, '.msilver', 'silver');
    const copper = parseDenomination(priceElement, '.mbronze', 'copper');
    const priceCopper = gold * COPPER_PER_GOLD + silver * COPPER_PER_SILVER + copper;

    if (!Number.isSafeInteger(priceCopper)) {
      throw new UnexpectedServerResponseError('Exchange offer price is too large.');
    }

    try {
      return ExchangeOffer.create({
        articleId,
        title,
        requestedQuantity,
        priceCopper
      });
    } catch (error) {
      throw new UnexpectedServerResponseError(
        error instanceof Error
          ? `Exchange offer is invalid: ${error.message}`
          : 'Exchange offer is invalid.'
      );
    }
  }
}

function parsePositiveInteger(value: string | null, fieldName: string): number {
  const normalizedValue = value?.trim() ?? '';

  if (!/^\d+$/.test(normalizedValue)) {
    throw new UnexpectedServerResponseError(`Exchange offer ${fieldName} is invalid.`);
  }

  const parsedValue = Number(normalizedValue);

  if (!Number.isSafeInteger(parsedValue) || parsedValue <= 0) {
    throw new UnexpectedServerResponseError(`Exchange offer ${fieldName} is invalid.`);
  }

  return parsedValue;
}

function parseDenomination(
  priceElement: HTMLElement,
  selector: string,
  denominationName: string
): number {
  const denominationElement = priceElement.querySelector(selector);

  if (!denominationElement) {
    throw new UnexpectedServerResponseError(
      `Exchange offer ${denominationName} denomination is missing.`
    );
  }

  const normalizedValue = (denominationElement.textContent ?? '').replace(/\s/g, '');

  if (normalizedValue.length === 0) {
    return 0;
  }

  if (!/^\d+$/.test(normalizedValue)) {
    throw new UnexpectedServerResponseError(
      `Exchange offer ${denominationName} denomination is invalid.`
    );
  }

  const parsedValue = Number(normalizedValue);

  if (!Number.isSafeInteger(parsedValue) || parsedValue < 0) {
    throw new UnexpectedServerResponseError(
      `Exchange offer ${denominationName} denomination is invalid.`
    );
  }

  return parsedValue;
}
