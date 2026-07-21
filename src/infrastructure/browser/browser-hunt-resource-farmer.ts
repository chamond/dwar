import type { HuntResourceFarmer, HuntResourceFarmOptions } from '../../application/ports/hunt-resource-farmer';
import type { HuntResourceNode } from '../../domain/entities/hunt-resource-node';
import {
  buildHuntResourceFarmBody,
  buildHuntResourceFarmUrl,
  HUNT_RESOURCE_FARM_REQUEST
} from './hunt-resource-farm-request';

export class BrowserHuntResourceFarmer implements HuntResourceFarmer {
  async start(resource: HuntResourceNode, options: HuntResourceFarmOptions = {}): Promise<void> {
    const requestInit: RequestInit = {
      method: HUNT_RESOURCE_FARM_REQUEST.method,
      body: buildHuntResourceFarmBody(resource.getServerNumber())
    };

    if (options.signal) {
      requestInit.signal = options.signal;
    }

    const response = await fetch(buildHuntResourceFarmUrl(resource.getServerNumber()), requestInit);

    if (!response.ok) {
      throw new Error(`Resource mining start failed with HTTP ${response.status}.`);
    }
  }
}
