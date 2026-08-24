import type { Observable } from 'rxjs';

export interface HuntMobAngerSender {
  send(): Observable<void>;
}
