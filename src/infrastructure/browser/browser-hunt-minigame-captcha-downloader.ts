import { defer, finalize, from, map, switchMap, take, timer, type Observable } from 'rxjs';
import { fromFetch } from 'rxjs/fetch';
import { UnexpectedServerResponseError } from '../../application/errors/unexpected-server-response-error';
import type { HuntMinigameCaptchaDownloader } from '../../application/ports/hunt-minigame-captcha-downloader';
import { HUNT_MINIGAME_CAPTCHA_REQUEST } from './hunt-minigame-captcha-request';

const DOWNLOAD_PREFIX = 'dwar-minigame-captcha';

export class BrowserHuntMinigameCaptchaDownloader implements HuntMinigameCaptchaDownloader {
  download(): Observable<string> {
    return fromFetch(HUNT_MINIGAME_CAPTCHA_REQUEST.url, {
      method: HUNT_MINIGAME_CAPTCHA_REQUEST.method
    }).pipe(
      switchMap((response) => {
        if (!response.ok) {
          throw new UnexpectedServerResponseError(
            `Hunt minigame captcha download failed with HTTP ${response.status}.`
          );
        }

        return from(response.blob()).pipe(
          map((captchaBlob) => ({
            captchaBlob,
            contentType: response.headers.get('content-type') ?? captchaBlob.type
          }))
        );
      }),
      switchMap(({ captchaBlob, contentType }) => {
        return detectFileExtension(captchaBlob, contentType).pipe(
          switchMap((fileExtension) => {
            return downloadBlob(captchaBlob, createFileName(fileExtension));
          })
        );
      }),
      take(1)
    );
  }
}

function downloadBlob(blob: Blob, fileName: string): Observable<string> {
  return defer(() => {
    const objectUrl = URL.createObjectURL(blob);
    const downloadLink = document.createElement('a');
    downloadLink.href = objectUrl;
    downloadLink.download = fileName;
    downloadLink.hidden = true;
    document.body.append(downloadLink);

    try {
      downloadLink.click();
    } catch (error: unknown) {
      downloadLink.remove();
      URL.revokeObjectURL(objectUrl);
      throw error;
    }

    return timer(0).pipe(
      map(() => fileName),
      take(1),
      finalize(() => {
        downloadLink.remove();
        URL.revokeObjectURL(objectUrl);
      })
    );
  });
}

function detectFileExtension(blob: Blob, contentType: string): Observable<string> {
  const contentTypeExtension = getContentTypeExtension(contentType);

  if (contentTypeExtension) {
    return from([contentTypeExtension]);
  }

  return from(blob.slice(0, 16).arrayBuffer()).pipe(
    map((buffer) => getSignatureExtension(new Uint8Array(buffer)) ?? 'bin'),
    take(1)
  );
}

function getContentTypeExtension(contentType: string): string | null {
  const normalizedContentType = contentType.split(';', 1)[0]?.trim().toLowerCase();

  switch (normalizedContentType) {
    case 'image/png':
      return 'png';
    case 'image/jpeg':
    case 'image/jpg':
      return 'jpg';
    case 'image/webp':
      return 'webp';
    case 'image/gif':
      return 'gif';
    case 'image/bmp':
      return 'bmp';
    case 'image/svg+xml':
      return 'svg';
    default:
      return null;
  }
}

function getSignatureExtension(bytes: Uint8Array): string | null {
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return 'png';
  }

  if (startsWith(bytes, [0xff, 0xd8, 0xff])) {
    return 'jpg';
  }

  if (startsWith(bytes, [0x47, 0x49, 0x46, 0x38])) {
    return 'gif';
  }

  if (
    startsWith(bytes, [0x52, 0x49, 0x46, 0x46])
    && startsWith(bytes.slice(8), [0x57, 0x45, 0x42, 0x50])
  ) {
    return 'webp';
  }

  if (startsWith(bytes, [0x42, 0x4d])) {
    return 'bmp';
  }

  return null;
}

function startsWith(bytes: Uint8Array, signature: readonly number[]): boolean {
  return signature.every((value, index) => bytes[index] === value);
}

function createFileName(fileExtension: string): string {
  const timestamp = new Date().toISOString().replaceAll(':', '-');
  return `${DOWNLOAD_PREFIX}-${timestamp}.${fileExtension}`;
}
