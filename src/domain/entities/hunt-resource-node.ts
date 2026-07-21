import type { BotResource, BotResourceSnapshot } from './bot-resource';
import type { MapPositionSnapshot } from './map-position';
import { MapPosition } from './map-position';

export interface HuntResourceNodeProps {
  serverNumber: string;
  resource: BotResource;
  professionId: number;
  quality: number;
  requiredSkill: number;
  position: MapPosition;
  isBeingFarmed: boolean;
  actionTitle: string;
}

export interface HuntResourceNodeSnapshot {
  serverNumber: string;
  resource: BotResourceSnapshot;
  professionId: number;
  quality: number;
  requiredSkill: number;
  position: MapPositionSnapshot;
  isBeingFarmed: boolean;
  actionTitle: string;
}

export class HuntResourceNode {
  private constructor(private readonly props: HuntResourceNodeProps) {}

  static create(props: HuntResourceNodeProps): HuntResourceNode {
    const serverNumber = props.serverNumber.trim();
    const actionTitle = props.actionTitle.trim();

    if (serverNumber.length === 0) {
      throw new Error('Hunt resource server number is required.');
    }

    assertNonNegativeInteger(props.professionId, 'Hunt resource profession id');
    assertNonNegativeInteger(props.quality, 'Hunt resource quality');
    assertNonNegativeInteger(props.requiredSkill, 'Hunt resource required skill');

    return new HuntResourceNode({
      ...props,
      serverNumber,
      actionTitle
    });
  }

  getResource(): BotResource {
    return this.props.resource;
  }

  getServerNumber(): string {
    return this.props.serverNumber;
  }

  getArticleId(): number {
    return this.props.resource.getArticleId();
  }

  getPosition(): MapPosition {
    return this.props.position;
  }

  isBeingFarmed(): boolean {
    return this.props.isBeingFarmed;
  }

  toSnapshot(): HuntResourceNodeSnapshot {
    return {
      ...this.props,
      resource: this.props.resource.toSnapshot(),
      position: this.props.position.toSnapshot()
    };
  }
}

function assertNonNegativeInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer.`);
  }
}
