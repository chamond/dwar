import type { Observable } from 'rxjs';

export interface SplinterHealerReader {
  observe(): Observable<string>;
}
