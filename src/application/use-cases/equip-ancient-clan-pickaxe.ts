import { defer, map, take, type Observable } from 'rxjs';
import type { EquipmentItemSnapshot } from '../../domain/entities/equipment-item';
import type { EquipmentItemEquipper } from '../ports/equipment-item-equipper';
import type { EquipmentItemRepository } from '../ports/equipment-item-repository';

const ANCIENT_CLAN_PICKAXE_ID = 'ancient-clan-pickaxe';

export class EquipAncientClanPickaxeUseCase {
  constructor(
    private readonly equipmentItemRepository: EquipmentItemRepository,
    private readonly equipmentItemEquipper: EquipmentItemEquipper
  ) {}

  execute(): Observable<EquipmentItemSnapshot> {
    return defer(() => {
      const pickaxe = this.equipmentItemRepository.findById(ANCIENT_CLAN_PICKAXE_ID);

      if (!pickaxe) {
        throw new Error('Ancient clan pickaxe is missing from the local equipment database.');
      }

      return this.equipmentItemEquipper.equip(pickaxe).pipe(
        map(() => pickaxe.toSnapshot()),
        take(1)
      );
    });
  }
}
