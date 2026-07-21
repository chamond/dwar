import type { HuntMob, HuntMobSnapshot } from './hunt-mob';
import type { HuntResourceNode, HuntResourceNodeSnapshot } from './hunt-resource-node';

export interface HuntZoneScanProps {
  mobs: readonly HuntMob[];
  resources: readonly HuntResourceNode[];
}

export interface HuntZoneScanSnapshot {
  mobs: readonly HuntMobSnapshot[];
  resources: readonly HuntResourceNodeSnapshot[];
}

export class HuntZoneScan {
  private constructor(
    private readonly mobs: readonly HuntMob[],
    private readonly resources: readonly HuntResourceNode[]
  ) {}

  static create(props: HuntZoneScanProps): HuntZoneScan {
    return new HuntZoneScan([...props.mobs], [...props.resources]);
  }

  getMobs(): readonly HuntMob[] {
    return this.mobs;
  }

  getResources(): readonly HuntResourceNode[] {
    return this.resources;
  }

  getResourcesByArticleIds(articleIds: ReadonlySet<number>): readonly HuntResourceNode[] {
    return this.resources.filter((resource) => articleIds.has(resource.getArticleId()));
  }

  toSnapshot(): HuntZoneScanSnapshot {
    return {
      mobs: this.mobs.map((mob) => mob.toSnapshot()),
      resources: this.resources.map((resource) => resource.toSnapshot())
    };
  }
}
