import { UnexpectedServerResponseError } from '../../application/errors/unexpected-server-response-error';
import type { BackpackItemQuantity } from '../../application/ports/backpack-item-quantity-reader';

export class DwarBackpackHtmlParser {
  parseItemQuantities(
    htmlText: string,
    artifactIds: readonly number[]
  ): readonly BackpackItemQuantity[] {
    const document = new DOMParser().parseFromString(htmlText, 'text/html');
    const uniqueArtifactIds = [...new Set(artifactIds)];

    return uniqueArtifactIds.map((artifactId) => this.parseItemQuantity(document, artifactId));
  }

  private parseItemQuantity(document: Document, artifactId: number): BackpackItemQuantity {
    assertArtifactId(artifactId);
    const slotSelector = `span.artifact-slot[artifact_id="${String(artifactId)}"]`;
    const quantitySelector = '.artifact-slot-qnt';
    const slots = Array.from(document.querySelectorAll(slotSelector));

    const quantity = slots.reduce((total, slot) => {
      const quantityElement = slot.querySelector(quantitySelector);

      if (!quantityElement) {
        throw new UnexpectedServerResponseError(
          `Backpack item ${artifactId} has no quantity element.`
        );
      }

      const quantityText = quantityElement.textContent?.trim() ?? '';
      const normalizedQuantityText = quantityText.replace(/\s/g, '');

      if (!/^\d+$/.test(normalizedQuantityText)) {
        throw new UnexpectedServerResponseError(
          `Backpack item ${artifactId} has an invalid quantity.`
        );
      }

      const slotQuantity = Number(normalizedQuantityText);

      if (
        !Number.isSafeInteger(slotQuantity)
        || slotQuantity <= 0
        || !Number.isSafeInteger(total + slotQuantity)
      ) {
        throw new UnexpectedServerResponseError(
          `Backpack item ${artifactId} has an invalid positive quantity.`
        );
      }

      return total + slotQuantity;
    }, 0);

    return {
      artifactId,
      quantity
    };
  }
}

function assertArtifactId(artifactId: number): void {
  if (!Number.isSafeInteger(artifactId) || artifactId <= 0) {
    throw new Error('Backpack artifact id must be a positive safe integer.');
  }
}
