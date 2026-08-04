import type { Observable } from 'rxjs';

export interface HuntMinigameSolutionResult {
  status: string | null;
  message: string | null;
  isSuccessful: boolean;
}

export interface HuntMinigameSolutionSubmitter {
  submit(targetToSourceSequence: readonly number[]): Observable<HuntMinigameSolutionResult>;
}
