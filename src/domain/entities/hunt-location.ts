export type HuntLocationId = 'baurville' | 'royal-tombs';

export interface HuntLocationProps {
  id: HuntLocationId;
  name: string;
  areaId: number;
}

export interface HuntLocationSnapshot {
  id: HuntLocationId;
  name: string;
  areaId: number;
}

export class HuntLocation {
  private constructor(
    private readonly id: HuntLocationId,
    private readonly name: string,
    private readonly areaId: number
  ) {}

  static create(props: HuntLocationProps): HuntLocation {
    const name = props.name.trim();

    if (name.length === 0) {
      throw new Error('Hunt location name is required.');
    }

    if (!Number.isInteger(props.areaId) || props.areaId <= 0) {
      throw new Error('Hunt location area id must be a positive integer.');
    }

    return new HuntLocation(props.id, name, props.areaId);
  }

  getId(): HuntLocationId {
    return this.id;
  }

  getName(): string {
    return this.name;
  }

  getAreaId(): number {
    return this.areaId;
  }

  toSnapshot(): HuntLocationSnapshot {
    return {
      id: this.id,
      name: this.name,
      areaId: this.areaId
    };
  }
}
