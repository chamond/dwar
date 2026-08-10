import { UnexpectedServerResponseError } from '../../application/errors/unexpected-server-response-error';
import { findHighestAccessibleWindow } from './accessible-window-tree';

const SESSION_CRC_PATTERN = /^[0-9a-f]{32}$/i;

export function readChatSessionCrc(): string {
  const rootWindow = findHighestAccessibleWindow(window);
  const sessionCrc = findSessionCrc(rootWindow, new Set<Window>());

  if (!sessionCrc) {
    throw new UnexpectedServerResponseError(
      'Live chat frame does not contain a valid CHAT.session_crc.'
    );
  }

  return sessionCrc;
}

function findSessionCrc(candidate: Window, visited: Set<Window>): string | null {
  if (visited.has(candidate)) {
    return null;
  }

  visited.add(candidate);

  const ownSessionCrc = readOwnSessionCrc(candidate);

  if (ownSessionCrc) {
    return ownSessionCrc;
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

    const frameSessionCrc = findSessionCrc(frame, visited);

    if (frameSessionCrc) {
      return frameSessionCrc;
    }
  }

  return null;
}

function readOwnSessionCrc(candidate: Window): string | null {
  let chatConfig: unknown;

  try {
    chatConfig = (candidate as unknown as Record<string, unknown>).CHAT;
  } catch {
    return null;
  }

  if (!isRecord(chatConfig)) {
    return null;
  }

  const sessionCrc = chatConfig.session_crc;

  return typeof sessionCrc === 'string' && SESSION_CRC_PATTERN.test(sessionCrc)
    ? sessionCrc
    : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
