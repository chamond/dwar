import { map, switchMap, take, type Observable } from 'rxjs';
import { fromFetch } from 'rxjs/fetch';
import { UnexpectedServerResponseError } from '../../application/errors/unexpected-server-response-error';
import type {
  BackpackItemQuantity,
  BackpackItemQuantityReadOptions,
  BackpackItemQuantityReader
} from '../../application/ports/backpack-item-quantity-reader';
import { buildBackpackContentUrl, BACKPACK_CONTENT_REQUEST } from './backpack-content-request';
import { DwarBackpackHtmlParser } from './dwar-backpack-html-parser';

export class BrowserBackpackItemQuantityReader implements BackpackItemQuantityReader {
  constructor(private readonly parser: DwarBackpackHtmlParser) {}

  readQuantities(
    artifactIds: readonly number[],
    options: BackpackItemQuantityReadOptions
  ): Observable<readonly BackpackItemQuantity[]> {
    if (artifactIds.length === 0) {
      throw new Error('At least one backpack artifact id is required.');
    }

    const requestInit: RequestInit = {
      method: BACKPACK_CONTENT_REQUEST.method
    };

    const requestUrl = buildBackpackContentUrl(options.group);
    return fromFetch(requestUrl, requestInit).pipe(
      switchMap((response) => {
        if (!response.ok) {
          throw new UnexpectedServerResponseError(`Backpack content request failed with HTTP ${response.status}.`);
        }

        return response.text();
      }),
      map((responseText) => this.parser.parseItemQuantities(responseText, artifactIds)),
      take(1)
    );
  }
}
