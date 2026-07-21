import type { MapPositionSnapshot } from './map-position';
import { MapPosition } from './map-position';

export interface HuntMobProps {
  id: string;
  name: string;
  level: number;
  kind: number;
  picture: string;
  skill: number;
  aggressionLevel: number;
  position: MapPosition;
  fightId: number;
  articleId: number;
  isHidden: boolean;
}

export interface HuntMobSnapshot {
  id: string;
  name: string;
  level: number;
  kind: number;
  picture: string;
  skill: number;
  aggressionLevel: number;
  position: MapPositionSnapshot;
  fightId: number;
  articleId: number;
  isHidden: boolean;
}

export class HuntMob {
  private constructor(private readonly props: HuntMobProps) {}

  static create(props: HuntMobProps): HuntMob {
    const id = props.id.trim();
    const name = props.name.trim();
    const picture = props.picture.trim();

    if (id.length === 0) {
      throw new Error('Hunt mob id is required.');
    }

    if (name.length === 0) {
      throw new Error('Hunt mob name is required.');
    }

    if (picture.length === 0) {
      throw new Error('Hunt mob picture is required.');
    }

    assertNonNegativeInteger(props.level, 'Hunt mob level');
    assertNonNegativeInteger(props.kind, 'Hunt mob kind');
    assertNonNegativeInteger(props.skill, 'Hunt mob skill');
    assertNonNegativeInteger(props.aggressionLevel, 'Hunt mob aggression level');
    assertNonNegativeInteger(props.fightId, 'Hunt mob fight id');
    assertNonNegativeInteger(props.articleId, 'Hunt mob article id');

    return new HuntMob({
      ...props,
      id,
      name,
      picture
    });
  }

  getName(): string {
    return this.props.name;
  }

  getLevel(): number {
    return this.props.level;
  }

  getKind(): number {
    return this.props.kind;
  }

  getAggressionLevel(): number {
    return this.props.aggressionLevel;
  }

  getArticleId(): number {
    return this.props.articleId;
  }

  toSnapshot(): HuntMobSnapshot {
    return {
      ...this.props,
      position: this.props.position.toSnapshot()
    };
  }
}

function assertNonNegativeInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer.`);
  }
}
