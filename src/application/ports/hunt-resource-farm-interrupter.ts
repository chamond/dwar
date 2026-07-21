import type { HuntResourceNode } from '../../domain/entities/hunt-resource-node';

export interface HuntResourceFarmInterruptOptions {
  signal?: AbortSignal | undefined;
}

export interface HuntResourceFarmInterrupter {
  interrupt(resource: HuntResourceNode, options?: HuntResourceFarmInterruptOptions): Promise<void>;
}
