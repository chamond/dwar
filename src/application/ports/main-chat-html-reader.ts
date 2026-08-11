import type { Observable } from 'rxjs';

export interface MainChatHtmlReader {
  observe(): Observable<string>;
}
