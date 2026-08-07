import type { Observable } from 'rxjs';
import type { EquipmentItem } from '../../domain/entities/equipment-item';

export interface EquipmentItemEquipper {
  equip(item: EquipmentItem): Observable<void>;
}
