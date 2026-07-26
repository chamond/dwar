import type { HuntResourceNode } from '../../domain/entities/hunt-resource-node';
import type { HuntResourceFarmStatus } from '../../domain/entities/hunt-resource-farm-status';

export interface HuntResourceFarmOptions {
  signal?: AbortSignal | undefined;
}

export interface HuntResourceFarmer {
  start(resource: HuntResourceNode, options?: HuntResourceFarmOptions): Promise<HuntResourceFarmStatus>;
}
