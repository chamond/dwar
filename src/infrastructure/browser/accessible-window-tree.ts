export function findInAccessibleWindowTree<T>(
  startWindow: Window,
  readValue: (candidate: Window) => T | null
): T | null {
  const rootWindow = findHighestAccessibleWindow(startWindow);

  return findValue(rootWindow, readValue, new Set<Window>());
}

export function listAccessibleWindows(startWindow: Window): readonly Window[] {
  const windows: Window[] = [];

  collectAccessibleWindows(
    findHighestAccessibleWindow(startWindow),
    new Set<Window>(),
    windows
  );

  return windows;
}

function findHighestAccessibleWindow(startWindow: Window): Window {
  let currentWindow = startWindow;

  while (true) {
    try {
      const parentWindow = currentWindow.parent;

      if (parentWindow === currentWindow) {
        return currentWindow;
      }

      void parentWindow.document;
      currentWindow = parentWindow;
    } catch {
      return currentWindow;
    }
  }
}

function findValue<T>(
  candidate: Window,
  readValue: (candidate: Window) => T | null,
  visited: Set<Window>
): T | null {
  if (visited.has(candidate)) {
    return null;
  }

  visited.add(candidate);

  const ownValue = readValue(candidate);

  if (ownValue !== null) {
    return ownValue;
  }

  let frameCount = 0;

  try {
    frameCount = candidate.frames.length;
  } catch {
    return null;
  }

  for (let index = 0; index < frameCount; index += 1) {
    let frame: Window;

    try {
      const candidateFrame = candidate.frames[index];

      if (!candidateFrame) {
        continue;
      }

      void candidateFrame.document;
      frame = candidateFrame;
    } catch {
      continue;
    }

    const frameValue = findValue(frame, readValue, visited);

    if (frameValue !== null) {
      return frameValue;
    }
  }

  return null;
}

function collectAccessibleWindows(
  candidate: Window,
  visited: Set<Window>,
  result: Window[]
): void {
  if (visited.has(candidate)) {
    return;
  }

  visited.add(candidate);
  result.push(candidate);

  let frameCount = 0;

  try {
    frameCount = candidate.frames.length;
  } catch {
    return;
  }

  for (let index = 0; index < frameCount; index += 1) {
    try {
      const candidateFrame = candidate.frames[index];

      if (!candidateFrame) {
        continue;
      }

      void candidateFrame.document;
      collectAccessibleWindows(candidateFrame, visited, result);
    } catch {
      continue;
    }
  }
}
