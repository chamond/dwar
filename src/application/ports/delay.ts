import type { Observable } from 'rxjs';

export interface Delay {
  wait(durationMs: number): Observable<void>;
}
