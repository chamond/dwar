import type { HuntResourceNode } from '../../domain/entities/hunt-resource-node';

export interface HuntResourceFarmOptions {
  signal?: AbortSignal | undefined;
}

export interface HuntResourceFarmer {
  start(resource: HuntResourceNode, options?: HuntResourceFarmOptions): Promise<void>;
}
