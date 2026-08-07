import type { EquipmentItemRepository } from '../../application/ports/equipment-item-repository';
import {
  EquipmentItem,
  type EquipmentItemId,
  type EquipmentItemProps
} from '../../domain/entities/equipment-item';

const LOCAL_EQUIPMENT_ITEM_RECORDS = [
  {
    id: 'ancient-clan-pickaxe',
    name: 'Кирка древнего клана',
    artifactId: 4_603_356_734
  }
] as const satisfies readonly EquipmentItemProps[];

export class StaticEquipmentItemRepository implements EquipmentItemRepository {
  private readonly items = LOCAL_EQUIPMENT_ITEM_RECORDS.map((record) =>
    EquipmentItem.create(record)
  );

  findById(id: EquipmentItemId): EquipmentItem | null {
    return this.items.find((item) => item.toSnapshot().id === id) ?? null;
  }
}
