import type { Observable } from 'rxjs';

export interface HuntMobAngerInput {
  expectedFightId: string | null;
}

export interface HuntMobAngerSender {
  send(input: HuntMobAngerInput): Observable<void>;
}
