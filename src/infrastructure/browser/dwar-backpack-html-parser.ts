import { UnexpectedServerResponseError } from '../../application/errors/unexpected-server-response-error';
import type { BackpackItemQuantity } from '../../application/ports/backpack-item-quantity-reader';

export class DwarBackpackHtmlParser {
  parseItemQuantities(
    htmlText: string,
    articleIds: readonly number[]
  ): readonly BackpackItemQuantity[] {
    const document = new DOMParser().parseFromString(htmlText, 'text/html');
    const uniqueArticleIds = [...new Set(articleIds)];

    return uniqueArticleIds.map((articleId) => this.parseItemQuantity(document, articleId));
  }

  private parseItemQuantity(document: Document, articleId: number): BackpackItemQuantity {
    assertArticleId(articleId);
    const slotSelector = `li[div_id="AA_${String(articleId)}"]`;
    const quantitySelector = '.artifact-slot-qnt';
    const slot = document.querySelector(slotSelector);

    if (!slot) {
      return {
        articleId,
        artifactId: null,
        quantity: 0
      };
    }

    const artifactId = parseArtifactId(slot, articleId);
    const quantityElement = slot.querySelector(quantitySelector);

    if (!quantityElement) {
      return {
        articleId,
        artifactId,
        quantity: 1
      };
    }

    const quantityText = quantityElement.textContent?.trim() ?? '';
    const normalizedQuantityText = quantityText.replace(/\s/g, '');

    if (!/^\d+$/.test(normalizedQuantityText)) {
      throw new UnexpectedServerResponseError(
        `Backpack item ${articleId} has an invalid quantity.`
      );
    }

    const quantity = Number(normalizedQuantityText);

    if (!Number.isSafeInteger(quantity) || quantity <= 0) {
      throw new UnexpectedServerResponseError(
        `Backpack item ${articleId} has an invalid positive quantity.`
      );
    }

    return {
      articleId,
      artifactId,
      quantity
    };
  }
}

function parseArtifactId(slot: Element, articleId: number): number {
  const artifactIdText = slot.getAttribute('data-id')?.trim() ?? '';

  if (!/^\d+$/.test(artifactIdText)) {
    throw new UnexpectedServerResponseError(
      `Backpack item ${articleId} has an invalid data-id.`
    );
  }

  const artifactId = Number(artifactIdText);

  if (!Number.isSafeInteger(artifactId) || artifactId <= 0) {
    throw new UnexpectedServerResponseError(
      `Backpack item ${articleId} has an invalid positive data-id.`
    );
  }

  return artifactId;
}

function assertArticleId(articleId: number): void {
  if (!Number.isSafeInteger(articleId) || articleId <= 0) {
    throw new Error('Resource article id must be a positive safe integer.');
  }
}
