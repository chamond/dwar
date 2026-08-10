export function findHighestAccessibleWindow(startWindow: Window): Window {
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

export function findAccessibleWindow(
  startWindow: Window,
  predicate: (candidate: Window) => boolean
): Window | null {
  return findInAccessibleWindowTree(
    findHighestAccessibleWindow(startWindow),
    predicate,
    new Set<Window>()
  );
}

function findInAccessibleWindowTree(
  candidate: Window,
  predicate: (candidate: Window) => boolean,
  visited: Set<Window>
): Window | null {
  if (visited.has(candidate)) {
    return null;
  }

  visited.add(candidate);

  try {
    if (predicate(candidate)) {
      return candidate;
    }
  } catch {
    return null;
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

    const match = findInAccessibleWindowTree(frame, predicate, visited);

    if (match) {
      return match;
    }
  }

  return null;
}
