export interface BackpackItemQuantityReadOptions {
  group: number;
}

export interface BackpackItemQuantity {
  artifactId: number;
  quantity: number;
}

export interface BackpackItemQuantityReader {
  readQuantities(
    artifactIds: readonly number[],
    options: BackpackItemQuantityReadOptions
  ): Observable<readonly BackpackItemQuantity[]>;
}
import type { Observable } from 'rxjs';
