import type { Observable } from 'rxjs';

export interface MainChatHtmlObserveOptions {
  includeCurrent?: boolean | undefined;
}

export interface MainChatHtmlReader {
  observe(options?: MainChatHtmlObserveOptions): Observable<string>;
}
