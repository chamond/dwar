import { UnexpectedServerResponseError } from '../../application/errors/unexpected-server-response-error';
import type {
  BackpackItemQuantityReadOptions,
  BackpackItemQuantityReader
} from '../../application/ports/backpack-item-quantity-reader';
import { buildBackpackContentUrl, BACKPACK_CONTENT_REQUEST } from './backpack-content-request';
import { DwarBackpackHtmlParser } from './dwar-backpack-html-parser';

export class BrowserBackpackItemQuantityReader implements BackpackItemQuantityReader {
  constructor(private readonly parser: DwarBackpackHtmlParser) {}

  async readQuantity(artifactId: number, options: BackpackItemQuantityReadOptions): Promise<number> {
    const requestInit: RequestInit = {
      method: BACKPACK_CONTENT_REQUEST.method
    };

    if (options.signal) {
      requestInit.signal = options.signal;
    }

    const response = await fetch(buildBackpackContentUrl(options.group), requestInit);

    if (!response.ok) {
      throw new UnexpectedServerResponseError(`Backpack content request failed with HTTP ${response.status}.`);
    }

    return this.parser.parseItemQuantity(await response.text(), artifactId);
  }
}
