import type { HuntMinigameRecognition } from '../../application/ports/hunt-minigame-recognizer';
import type { BotLogEntrySnapshot } from '../../domain/entities/bot-log-entry';
import { appendLogContent } from './log-list';

export function appendMinigameRecognitionLog(
  logList: HTMLElement,
  entry: BotLogEntrySnapshot,
  recognition: HuntMinigameRecognition
): void {
  const content = document.createElement('div');
  content.className = 'dwar-minigame-recognition';

  const title = document.createElement('div');
  title.className = 'dwar-minigame-recognition__title';
  title.textContent = `Распознан эталон ${recognition.referenceName}`;

  const image = createRecognitionImage(recognition.image);
  const sequence = document.createElement('div');
  sequence.className = 'dwar-minigame-recognition__sequence';
  sequence.textContent = recognition.targetToSourceSequence.join(',');

  content.append(title, image, sequence);
  appendLogContent(logList, entry, content);
}

function createRecognitionImage(blob: Blob): HTMLImageElement {
  const image = document.createElement('img');
  const objectUrl = URL.createObjectURL(blob);
  let released = false;
  const releaseObjectUrl = (): void => {
    if (released) {
      return;
    }

    released = true;
    image.onload = null;
    image.onerror = null;
    URL.revokeObjectURL(objectUrl);
  };

  image.className = 'dwar-minigame-recognition__image';
  image.alt = 'Мини-игра, полученная с сервера';
  image.onload = releaseObjectUrl;
  image.onerror = releaseObjectUrl;
  image.src = objectUrl;

  return image;
}
