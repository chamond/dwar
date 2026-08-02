import type { Observable } from 'rxjs';

export interface HuntMinigameRecognition {
  image: Blob;
  referenceName: string;
  similarity: number;
  sourceToTargetSequence: readonly number[];
}

export interface HuntMinigameRecognizer {
  recognize(): Observable<HuntMinigameRecognition>;
}
