import { UnexpectedServerResponseError } from '../../application/errors/unexpected-server-response-error';
import { findInAccessibleWindowTree } from './accessible-window-tree';

const SESSION_CRC_PATTERN = /^[0-9a-f]{32}$/i;

export function readChatSessionCrc(): string {
  const sessionCrc = findInAccessibleWindowTree(window, readOwnSessionCrc);

  if (!sessionCrc) {
    throw new UnexpectedServerResponseError(
      'Live chat frame does not contain a valid CHAT.session_crc.'
    );
  }

  return sessionCrc;
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
