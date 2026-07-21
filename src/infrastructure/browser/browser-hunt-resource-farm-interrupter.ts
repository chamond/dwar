import type {
  HuntResourceFarmInterrupter,
  HuntResourceFarmInterruptOptions
} from '../../application/ports/hunt-resource-farm-interrupter';
import type { HuntResourceNode } from '../../domain/entities/hunt-resource-node';
import { HUNT_RESOURCE_FARM_CANCEL_REQUEST } from './hunt-resource-farm-cancel-request';

export class BrowserHuntResourceFarmInterrupter implements HuntResourceFarmInterrupter {
  async interrupt(_resource: HuntResourceNode, options: HuntResourceFarmInterruptOptions = {}): Promise<void> {
    const requestInit: RequestInit = {
      method: HUNT_RESOURCE_FARM_CANCEL_REQUEST.method
    };

    if (options.signal) {
      requestInit.signal = options.signal;
    }

    const response = await fetch(HUNT_RESOURCE_FARM_CANCEL_REQUEST.url, requestInit);

    if (!response.ok) {
      throw new Error(`Resource mining cancellation failed with HTTP ${response.status}.`);
    }
  }
}
