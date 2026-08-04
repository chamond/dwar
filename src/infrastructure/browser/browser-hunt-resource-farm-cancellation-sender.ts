import { EMPTY, catchError, take } from 'rxjs';
import { fromFetch } from 'rxjs/fetch';
import type {
  HuntResourceFarmCancellationSender
} from '../../application/ports/hunt-resource-farm-cancellation-sender';
import { HUNT_RESOURCE_FARM_CANCEL_REQUEST } from './hunt-resource-farm-cancel-request';

export class BrowserHuntResourceFarmCancellationSender
  implements HuntResourceFarmCancellationSender {
  send(): void {
    fromFetch(HUNT_RESOURCE_FARM_CANCEL_REQUEST.url, {
      method: HUNT_RESOURCE_FARM_CANCEL_REQUEST.method
    }).pipe(
      catchError(() => EMPTY),
      take(1)
    ).subscribe();
  }
}
