import { defer, map, switchMap, take, type Observable } from 'rxjs';
import { fromFetch } from 'rxjs/fetch';
import { UnexpectedServerResponseError } from '../../application/errors/unexpected-server-response-error';
import type {
  PrivateMessageSendInput,
  PrivateMessageSender
} from '../../application/ports/private-message-sender';
import {
  buildPrivateMessageRequestBody,
  PRIVATE_MESSAGE_REQUEST
} from './private-message-request';
import { readChatSessionCrc } from './read-chat-session-crc';

const SUCCESS_STATUS = 100;
const CHAT_SEND_RESPONSE_KEY = 'chat|send';

export class BrowserPrivateMessageSender implements PrivateMessageSender {
  send(input: PrivateMessageSendInput): Observable<void> {
    return defer(() => {
      const sessionCrc = readChatSessionCrc();

      return fromFetch(PRIVATE_MESSAGE_REQUEST.url, {
        method: PRIVATE_MESSAGE_REQUEST.method,
        credentials: 'same-origin',
        body: buildPrivateMessageRequestBody(input, sessionCrc)
      });
    }).pipe(
      switchMap((response) => {
        if (!response.ok) {
          throw new UnexpectedServerResponseError(
            `Private message request failed with HTTP ${response.status}.`
          );
        }

        return response.text();
      }),
      map(parsePrivateMessageResponse),
      take(1)
    );
  }
}

function parsePrivateMessageResponse(responseText: string): void {
  let response: unknown;

  try {
    response = JSON.parse(responseText);
  } catch {
    throw new UnexpectedServerResponseError(
      'Private message response is not valid JSON.'
    );
  }

  if (!isRecord(response)) {
    throw new UnexpectedServerResponseError(
      'Private message response is not an object.'
    );
  }

  const chatSendResponse = response[CHAT_SEND_RESPONSE_KEY];

  if (!isRecord(chatSendResponse)) {
    throw new UnexpectedServerResponseError(
      'Private message response does not contain a chat send result.'
    );
  }

  const status = typeof chatSendResponse.status === 'number'
    ? chatSendResponse.status
    : typeof chatSendResponse.status === 'string'
      ? Number(chatSendResponse.status)
      : Number.NaN;

  if (status === SUCCESS_STATUS) {
    return;
  }

  const serverError = typeof chatSendResponse.error === 'string'
    && chatSendResponse.error.trim().length > 0
    ? ` ${chatSendResponse.error.trim()}`
    : '';

  throw new UnexpectedServerResponseError(
    `Private message response has unsuccessful status.${serverError}`
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
