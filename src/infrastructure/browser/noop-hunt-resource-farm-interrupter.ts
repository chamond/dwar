import type {
  HuntResourceFarmInterrupter,
  HuntResourceFarmInterruptOptions
} from '../../application/ports/hunt-resource-farm-interrupter';
import type { HuntResourceNode } from '../../domain/entities/hunt-resource-node';

export class NoopHuntResourceFarmInterrupter implements HuntResourceFarmInterrupter {
  async interrupt(_resource: HuntResourceNode, _options: HuntResourceFarmInterruptOptions = {}): Promise<void> {
    return Promise.resolve();
  }
}
