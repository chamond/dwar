export interface MapPositionProps {
  x: number;
  y: number;
}

export interface MapPositionSnapshot {
  x: number;
  y: number;
}

export class MapPosition {
  private constructor(
    private readonly x: number,
    private readonly y: number
  ) {}

  static create(props: MapPositionProps): MapPosition {
    assertNonNegativeInteger(props.x, 'Map position x');
    assertNonNegativeInteger(props.y, 'Map position y');

    return new MapPosition(props.x, props.y);
  }

  getX(): number {
    return this.x;
  }

  getY(): number {
    return this.y;
  }

  distanceTo(position: MapPosition): number {
    return Math.hypot(this.x - position.x, this.y - position.y);
  }

  toSnapshot(): MapPositionSnapshot {
    return {
      x: this.x,
      y: this.y
    };
  }
}

function assertNonNegativeInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer.`);
  }
}
