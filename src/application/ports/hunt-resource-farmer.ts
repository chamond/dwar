import type { HuntResourceNode } from '../../domain/entities/hunt-resource-node';
import type { HuntResourceFarmStart } from '../../domain/entities/hunt-resource-farm-start';

export interface HuntResourceFarmOptions {
  signal?: AbortSignal | undefined;
}

export interface HuntResourceFarmer {
  start(resource: HuntResourceNode, options?: HuntResourceFarmOptions): Promise<HuntResourceFarmStart>;
}
