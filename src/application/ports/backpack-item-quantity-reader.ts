export interface BackpackItemQuantityReadOptions {
  group: number;
  signal?: AbortSignal | undefined;
}

export interface BackpackItemQuantityReader {
  readQuantity(artifactId: number, options: BackpackItemQuantityReadOptions): Promise<number>;
}
