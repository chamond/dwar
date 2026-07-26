export interface BackpackItemQuantityReadOptions {
  group: number;
  signal?: AbortSignal | undefined;
}

export interface BackpackItemQuantityLookup {
  artifactId: number;
  slotSelector: string;
  quantitySelector: string;
  matchedSlotCount: number;
  quantityTexts: readonly string[];
  quantity: number;
}

export interface BackpackItemQuantitiesReadResult {
  requestUrl: string;
  responseUrl: string;
  contentType: string;
  htmlLength: number;
  documentTitle: string;
  artifactSlotCount: number;
  identifiedArtifactSlotCount: number;
  detectedArtifactIds: readonly string[];
  lookups: readonly BackpackItemQuantityLookup[];
}

export interface BackpackItemQuantityReader {
  readQuantities(
    artifactIds: readonly number[],
    options: BackpackItemQuantityReadOptions
  ): Promise<BackpackItemQuantitiesReadResult>;
}
