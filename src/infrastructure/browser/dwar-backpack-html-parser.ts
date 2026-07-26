import { UnexpectedServerResponseError } from '../../application/errors/unexpected-server-response-error';
import type {
  BackpackItemQuantitiesReadResult,
  BackpackItemQuantityLookup
} from '../../application/ports/backpack-item-quantity-reader';

export class DwarBackpackHtmlParser {
  parseItemQuantities(
    htmlText: string,
    artifactIds: readonly number[]
  ): Omit<BackpackItemQuantitiesReadResult, 'requestUrl' | 'responseUrl' | 'contentType'> {
    const document = new DOMParser().parseFromString(htmlText, 'text/html');
    const uniqueArtifactIds = [...new Set(artifactIds)];
    const identifiedSlots = Array.from(document.querySelectorAll('span.artifact-slot[artifact-id]'));

    return {
      htmlLength: htmlText.length,
      documentTitle: document.title.trim(),
      artifactSlotCount: document.querySelectorAll('span.artifact-slot').length,
      identifiedArtifactSlotCount: identifiedSlots.length,
      detectedArtifactIds: getDetectedArtifactIds(identifiedSlots),
      lookups: uniqueArtifactIds.map((artifactId) => this.parseItemQuantity(document, artifactId))
    };
  }

  private parseItemQuantity(document: Document, artifactId: number): BackpackItemQuantityLookup {
    assertArtifactId(artifactId);
    const slotSelector = `span.artifact-slot[artifact-id="${String(artifactId)}"]`;
    const quantitySelector = '.artifact-slot-qnt';
    const slots = Array.from(document.querySelectorAll(slotSelector));
    const quantityTexts: string[] = [];

    const quantity = slots.reduce((total, slot) => {
      const quantityElement = slot.querySelector('.artifact-slot-qnt');

      if (!quantityElement) {
        throw new UnexpectedServerResponseError(
          `Backpack selector "${slotSelector}" matched a slot without "${quantitySelector}".`
        );
      }

      const quantityText = quantityElement.textContent?.trim() ?? '';
      const normalizedQuantityText = quantityText.replace(/\s/g, '');
      quantityTexts.push(quantityText);

      if (!/^\d+$/.test(normalizedQuantityText)) {
        throw new UnexpectedServerResponseError(
          `Backpack selector "${slotSelector} ${quantitySelector}" returned invalid quantity "${quantityText}".`
        );
      }

      const slotQuantity = Number(normalizedQuantityText);

      if (
        !Number.isSafeInteger(slotQuantity)
        || slotQuantity <= 0
        || !Number.isSafeInteger(total + slotQuantity)
      ) {
        throw new UnexpectedServerResponseError(
          `Backpack selector "${slotSelector} ${quantitySelector}" returned an invalid positive quantity.`
        );
      }

      return total + slotQuantity;
    }, 0);

    return {
      artifactId,
      slotSelector,
      quantitySelector,
      matchedSlotCount: slots.length,
      quantityTexts,
      quantity
    };
  }
}

function getDetectedArtifactIds(slots: readonly Element[]): readonly string[] {
  return [...new Set(slots.flatMap((slot) => {
    const artifactId = slot.getAttribute('artifact-id');

    return artifactId === null ? [] : [artifactId];
  }))];
}

function assertArtifactId(artifactId: number): void {
  if (!Number.isSafeInteger(artifactId) || artifactId <= 0) {
    throw new Error('Backpack artifact id must be a positive safe integer.');
  }
}
