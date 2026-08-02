import type { Observable } from 'rxjs';

export interface HuntMinigameSolutionSubmitter {
  submit(targetToSourceSequence: readonly number[]): Observable<void>;
}
