import type { PrivateMessageSendInput } from '../../application/ports/private-message-sender';

export const PRIVATE_MESSAGE_REQUEST = {
  method: 'POST',
  url: 'https://w1.dwar.ru/entry_point.php?object=chat&action=send&json_mode_on=1'
} as const;

export function buildPrivateMessageRequestBody(
  input: PrivateMessageSendInput,
  sessionCrc: string
): URLSearchParams {
  if (input.recipientNicks.length === 0 || input.recipientNicks.length > 3) {
    throw new Error('Private message must have from one to three recipients.');
  }

  if (!Number.isSafeInteger(input.areaId) || input.areaId <= 0) {
    throw new Error('Private message area id must be a positive safe integer.');
  }

  if (!/^[0-9a-f]{32}$/i.test(sessionCrc)) {
    throw new Error('Private message session crc must be a 32-character hex string.');
  }

  const recipientNicks = input.recipientNicks.map(normalizeRecipientNick);
  const message = input.message.trim();

  if (message.length === 0) {
    throw new Error('Private message text is required.');
  }

  const privateTags = recipientNicks.map((nick) => `prv[${nick}]`).join(' ');

  return new URLSearchParams({
    json_mode_on: '1',
    object: 'chat',
    action: 'send',
    msg_text: `${privateTags} ${message}`,
    channel_talk: '1',
    loc_id: String(input.areaId),
    private: '0',
    complain: '',
    complain_nick: '',
    crc: sessionCrc,
    stime: '0',
    'report[id]': '0',
    'report[action]': '0',
    'report[crc]': '0'
  });
}

function normalizeRecipientNick(nick: string): string {
  const normalizedNick = nick.trim();

  if (normalizedNick.length === 0 || normalizedNick.includes(']')) {
    throw new Error('Private message recipient nick is invalid.');
  }

  return normalizedNick;
}
