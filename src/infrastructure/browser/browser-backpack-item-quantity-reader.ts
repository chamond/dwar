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

  async readQuantities(
    artifactIds: readonly number[],
    options: BackpackItemQuantityReadOptions
  ): Promise<readonly BackpackItemQuantity[]> {
    if (artifactIds.length === 0) {
      throw new Error('At least one backpack artifact id is required.');
    }

    const requestInit: RequestInit = {
      method: BACKPACK_CONTENT_REQUEST.method
    };

    if (options.signal) {
      requestInit.signal = options.signal;
    }

    const requestUrl = buildBackpackContentUrl(options.group);
    const response = await fetch(requestUrl, requestInit);

    if (!response.ok) {
      throw new UnexpectedServerResponseError(`Backpack content request failed with HTTP ${response.status}.`);
    }

    return this.parser.parseItemQuantities(await response.text(), artifactIds);
  }
}
