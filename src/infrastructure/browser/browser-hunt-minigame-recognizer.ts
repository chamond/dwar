import { defer, from, map, switchMap, take, type Observable } from 'rxjs';
import { fromFetch } from 'rxjs/fetch';
import minigameReferences from 'virtual:minigame-references';
import { UnexpectedServerResponseError } from '../../application/errors/unexpected-server-response-error';
import type {
  HuntMinigameRecognition,
  HuntMinigameRecognizer
} from '../../application/ports/hunt-minigame-recognizer';
import { recognizeMinigameImage } from '../../domain/services/minigame-image-recognition';
import { resetDwarHuntMinigameTelemetry } from './dwar-hunt-minigame-telemetry';
import { HUNT_MINIGAME_CAPTCHA_REQUEST } from './hunt-minigame-captcha-request';

export class BrowserHuntMinigameRecognizer implements HuntMinigameRecognizer {
  recognize(): Observable<HuntMinigameRecognition> {
    return fromFetch(HUNT_MINIGAME_CAPTCHA_REQUEST.url, {
      method: HUNT_MINIGAME_CAPTCHA_REQUEST.method
    }).pipe(
      switchMap((response) => {
        if (!response.ok) {
          throw new UnexpectedServerResponseError(
            `Hunt minigame image request failed with HTTP ${response.status}.`
          );
        }

        return from(response.blob());
      }),
      switchMap((image) => decodeImage(image).pipe(
        map((pixelImage) => ({
          image,
          ...recognizeMinigameImage(pixelImage, minigameReferences)
        }))
      )),
      map((recognition) => {
        resetDwarHuntMinigameTelemetry();
        return recognition;
      }),
      take(1)
    );
  }
}

function decodeImage(image: Blob): Observable<ImageData> {
  return defer(() => from(createImageBitmap(image))).pipe(
    map((bitmap) => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const context = canvas.getContext('2d', { willReadFrequently: true });

        if (!context) {
          throw new Error('Браузер не предоставил Canvas 2D для распознавания мини-игры.');
        }

        context.drawImage(bitmap, 0, 0);
        return context.getImageData(0, 0, bitmap.width, bitmap.height);
      } finally {
        bitmap.close();
      }
    }),
    take(1)
  );
}
