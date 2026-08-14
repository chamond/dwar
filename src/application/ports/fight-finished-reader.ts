import type { Observable } from 'rxjs';

export interface FightFinishedReader {
  observe(): Observable<void>;
}
