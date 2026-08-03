import type { Observable } from 'rxjs';

export interface BackpackItemQuantityReadOptions {
  group: number;
}

export interface BackpackItemQuantity {
  articleId: number;
  artifactId: number | null;
  quantity: number;
}

export interface BackpackItemQuantityReader {
  readQuantities(
    articleIds: readonly number[],
    options: BackpackItemQuantityReadOptions
  ): Observable<readonly BackpackItemQuantity[]>;
}
