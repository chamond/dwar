interface DwarHuntMinigameTelemetryController {
  reset?(capture: boolean): void;
  toString(additionalInfo: { rtype: 'captcha' }): string;
}

export function resetDwarHuntMinigameTelemetry(): void {
  findTelemetryController()?.reset?.(true);
}

export function createDwarHuntMinigameTelemetry(): string {
  const controller = findTelemetryController();

  if (!controller) {
    throw new Error('Не найден canvas.utils.ABController для отправки мини-игры.');
  }

  return controller.toString({ rtype: 'captcha' });
}

function findTelemetryController(): DwarHuntMinigameTelemetryController | null {
  const pendingWindows: Window[] = [window];
  const visitedWindows = new Set<Window>();

  try {
    if (window.top && window.top !== window) {
      pendingWindows.push(window.top);
    }
  } catch {
    // A cross-origin parent cannot contain the same-origin hunt controller.
  }

  while (pendingWindows.length > 0) {
    const candidateWindow = pendingWindows.shift();

    if (!candidateWindow || visitedWindows.has(candidateWindow)) {
      continue;
    }

    visitedWindows.add(candidateWindow);

    try {
      const controller = readTelemetryController(candidateWindow);

      if (controller) {
        return controller;
      }

      for (let index = 0; index < candidateWindow.frames.length; index += 1) {
        const childWindow = candidateWindow.frames[index];

        if (childWindow && !visitedWindows.has(childWindow)) {
          pendingWindows.push(childWindow);
        }
      }
    } catch {
      // Ignore cross-origin frames and keep searching accessible game frames.
    }
  }

  return null;
}

function readTelemetryController(
  candidateWindow: Window
): DwarHuntMinigameTelemetryController | null {
  const canvasNamespace = (candidateWindow as Window & {
    canvas?: {
      utils?: {
        ABController?: Partial<DwarHuntMinigameTelemetryController>;
      };
    };
  }).canvas;
  const controller = canvasNamespace?.utils?.ABController;

  return typeof controller?.toString === 'function'
    ? controller as DwarHuntMinigameTelemetryController
    : null;
}
