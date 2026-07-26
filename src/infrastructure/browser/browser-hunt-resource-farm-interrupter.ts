import { map, take, type Observable } from 'rxjs';
import { fromFetch } from 'rxjs/fetch';
import { UnexpectedServerResponseError } from '../../application/errors/unexpected-server-response-error';
import type { HuntResourceFarmInterrupter } from '../../application/ports/hunt-resource-farm-interrupter';
import type { HuntResourceNode } from '../../domain/entities/hunt-resource-node';
import { HUNT_RESOURCE_FARM_CANCEL_REQUEST } from './hunt-resource-farm-cancel-request';

export class BrowserHuntResourceFarmInterrupter implements HuntResourceFarmInterrupter {
  interrupt(_resource: HuntResourceNode): Observable<void> {
    const requestInit: RequestInit = {
      method: HUNT_RESOURCE_FARM_CANCEL_REQUEST.method
    };

    return fromFetch(HUNT_RESOURCE_FARM_CANCEL_REQUEST.url, requestInit).pipe(
      map((response) => {
        if (!response.ok) {
          throw new UnexpectedServerResponseError(`Resource mining cancellation failed with HTTP ${response.status}.`);
        }
      }),
      take(1)
    );
  }
}
