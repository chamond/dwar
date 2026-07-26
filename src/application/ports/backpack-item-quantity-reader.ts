export interface BackpackItemQuantityReadOptions {
  group: number;
  signal?: AbortSignal | undefined;
}

export interface BackpackItemQuantity {
  artifactId: number;
  quantity: number;
}

export interface BackpackItemQuantityReader {
  readQuantities(
    artifactIds: readonly number[],
    options: BackpackItemQuantityReadOptions
  ): Promise<readonly BackpackItemQuantity[]>;
}
