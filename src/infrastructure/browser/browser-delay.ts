import {
  map,
  take,
  timer,
  type Observable
} from 'rxjs';
import type { Delay } from '../../application/ports/delay';

export class BrowserDelay implements Delay {
  wait(durationMs: number): Observable<void> {
    return timer(Math.max(0, durationMs)).pipe(
      map(() => undefined),
      take(1)
    );
  }
}
