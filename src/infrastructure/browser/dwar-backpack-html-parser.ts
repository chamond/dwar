import { UnexpectedServerResponseError } from '../../application/errors/unexpected-server-response-error';

export class DwarBackpackHtmlParser {
  parseItemQuantity(htmlText: string, artifactId: number): number {
    if (!Number.isSafeInteger(artifactId) || artifactId <= 0) {
      throw new Error('Backpack artifact id must be a positive safe integer.');
    }

    const document = new DOMParser().parseFromString(htmlText, 'text/html');
    const slots = document.querySelectorAll(
      `span.artifact-slot[artifact-id="${String(artifactId)}"]`
    );

    if (slots.length === 0) {
      return 0;
    }

    return Array.from(slots).reduce((total, slot) => {
      const quantityElement = slot.querySelector('.artifact-slot-qnt');

      if (!quantityElement) {
        throw new UnexpectedServerResponseError(
          `Backpack item ${artifactId} has no quantity element.`
        );
      }

      const quantityText = quantityElement.textContent?.replace(/\s/g, '') ?? '';

      if (!/^\d+$/.test(quantityText)) {
        throw new UnexpectedServerResponseError(
          `Backpack item ${artifactId} quantity must be a non-negative integer.`
        );
      }

      const quantity = Number(quantityText);

      if (!Number.isSafeInteger(quantity) || quantity <= 0 || !Number.isSafeInteger(total + quantity)) {
        throw new UnexpectedServerResponseError(
          `Backpack item ${artifactId} quantity must be a positive safe integer.`
        );
      }

      return total + quantity;
    }, 0);
  }
}
