export type EquipmentItemId = 'ancient-clan-pickaxe';

export interface EquipmentItemProps {
  id: EquipmentItemId;
  name: string;
  artifactId: number;
}

export interface EquipmentItemSnapshot extends EquipmentItemProps {}

export class EquipmentItem {
  private constructor(
    private readonly id: EquipmentItemId,
    private readonly name: string,
    private readonly artifactId: number
  ) {}

  static create(props: EquipmentItemProps): EquipmentItem {
    const name = props.name.trim();

    if (name.length === 0) {
      throw new Error('Equipment item name is required.');
    }

    if (!Number.isSafeInteger(props.artifactId) || props.artifactId <= 0) {
      throw new Error('Equipment item artifact id must be a positive safe integer.');
    }

    return new EquipmentItem(props.id, name, props.artifactId);
  }

  getArtifactId(): number {
    return this.artifactId;
  }

  toSnapshot(): EquipmentItemSnapshot {
    return {
      id: this.id,
      name: this.name,
      artifactId: this.artifactId
    };
  }
}
