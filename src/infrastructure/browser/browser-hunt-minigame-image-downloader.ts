import type { HuntMinigameImageDownloader } from '../../application/ports/hunt-minigame-image-downloader';

export class BrowserHuntMinigameImageDownloader implements HuntMinigameImageDownloader {
  download(image: Blob): void {
    const objectUrl = URL.createObjectURL(image);
    const link = document.createElement('a');
    const timestamp = new Date().toISOString().replaceAll(':', '-');

    link.href = objectUrl;
    link.download = `minigame-${timestamp}.png`;
    link.hidden = true;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
  }
}
