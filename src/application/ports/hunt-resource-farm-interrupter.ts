import type { Observable } from 'rxjs';

export interface HuntResourceFarmInterrupter {
  interrupt(): Observable<void>;
}
