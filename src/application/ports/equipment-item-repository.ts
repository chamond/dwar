import type {
  EquipmentItem,
  EquipmentItemId
} from '../../domain/entities/equipment-item';

export interface EquipmentItemRepository {
  findById(id: EquipmentItemId): EquipmentItem | null;
}
