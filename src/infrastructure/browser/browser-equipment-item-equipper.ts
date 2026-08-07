import { map, take, type Observable } from 'rxjs';
import { fromFetch } from 'rxjs/fetch';
import { UnexpectedServerResponseError } from '../../application/errors/unexpected-server-response-error';
import type { EquipmentItemEquipper } from '../../application/ports/equipment-item-equipper';
import type { EquipmentItem } from '../../domain/entities/equipment-item';
import {
  buildEquipmentItemPutOnUrl,
  EQUIPMENT_ITEM_PUT_ON_REQUEST
} from './equipment-item-put-on-request';

export class BrowserEquipmentItemEquipper implements EquipmentItemEquipper {
  equip(item: EquipmentItem): Observable<void> {
    return fromFetch(buildEquipmentItemPutOnUrl(item.getArtifactId()), {
      method: EQUIPMENT_ITEM_PUT_ON_REQUEST.method,
      credentials: 'same-origin'
    }).pipe(
      map((response) => {
        if (!response.ok) {
          throw new UnexpectedServerResponseError(
            `Equipment request failed with HTTP ${response.status}.`
          );
        }
      }),
      take(1)
    );
  }
}
