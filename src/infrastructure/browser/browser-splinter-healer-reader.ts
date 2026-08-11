import { filter, map, type Observable } from 'rxjs';
import type { MainChatHtmlReader } from '../../application/ports/main-chat-html-reader';
import type { SplinterHealerReader } from '../../application/ports/splinter-healer-reader';
import { DwarSplinterHealerMessageParser } from './dwar-splinter-healer-message-parser';

export class BrowserSplinterHealerReader implements SplinterHealerReader {
  constructor(
    private readonly mainChatHtmlReader: MainChatHtmlReader,
    private readonly parser: DwarSplinterHealerMessageParser
  ) {}

  observe(): Observable<string> {
    return this.mainChatHtmlReader.observe({ includeCurrent: false }).pipe(
      map((html) => this.parser.parse(html)),
      filter((healerNick): healerNick is string => healerNick !== null)
    );
  }
}
