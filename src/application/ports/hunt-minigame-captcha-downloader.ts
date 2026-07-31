import type { Observable } from 'rxjs';

export interface HuntMinigameCaptchaDownloader {
  download(): Observable<string>;
}
