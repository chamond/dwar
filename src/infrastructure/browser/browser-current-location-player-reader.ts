import { map, switchMap, take, type Observable } from 'rxjs';
import { fromFetch } from 'rxjs/fetch';
import { UnexpectedServerResponseError } from '../../application/errors/unexpected-server-response-error';
import type { CurrentLocationPlayerReader } from '../../application/ports/current-location-player-reader';
import type { LocationPlayer } from '../../domain/entities/location-player';
import { buildChatUsersRequestBody, CHAT_USERS_REQUEST } from './chat-users-request';
import { DwarChatUsersHtmlParser } from './dwar-chat-users-html-parser';

export class BrowserCurrentLocationPlayerReader implements CurrentLocationPlayerReader {
  constructor(private readonly parser: DwarChatUsersHtmlParser) {}

  read(): Observable<readonly LocationPlayer[]> {
    return fromFetch(CHAT_USERS_REQUEST.url, {
      method: CHAT_USERS_REQUEST.method,
      credentials: 'same-origin',
      body: buildChatUsersRequestBody()
    }).pipe(
      switchMap((response) => {
        if (!response.ok) {
          throw new UnexpectedServerResponseError(
            `Chat users request failed with HTTP ${response.status}.`
          );
        }

        return response.text();
      }),
      map((responseText) => this.parser.parse(responseText)),
      take(1)
    );
  }
}
