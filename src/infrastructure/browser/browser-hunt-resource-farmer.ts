import { UnexpectedServerResponseError } from '../../application/errors/unexpected-server-response-error';
import type { HuntResourceFarmer, HuntResourceFarmOptions } from '../../application/ports/hunt-resource-farmer';
import type { HuntResourceFarmStart } from '../../domain/entities/hunt-resource-farm-start';
import type { HuntResourceNode } from '../../domain/entities/hunt-resource-node';
import { DwarHuntResourceFarmStartXmlParser } from './dwar-hunt-resource-farm-start-xml-parser';
import {
  buildHuntResourceFarmBody,
  buildHuntResourceFarmUrl,
  HUNT_RESOURCE_FARM_REQUEST
} from './hunt-resource-farm-request';

export class BrowserHuntResourceFarmer implements HuntResourceFarmer {
  constructor(private readonly parser: DwarHuntResourceFarmStartXmlParser = new DwarHuntResourceFarmStartXmlParser()) {}

  async start(resource: HuntResourceNode, options: HuntResourceFarmOptions = {}): Promise<HuntResourceFarmStart> {
    const requestInit: RequestInit = {
      method: HUNT_RESOURCE_FARM_REQUEST.method,
      body: buildHuntResourceFarmBody(resource.getServerNumber())
    };

    if (options.signal) {
      requestInit.signal = options.signal;
    }

    const response = await fetch(buildHuntResourceFarmUrl(resource.getServerNumber()), requestInit);

    if (!response.ok) {
      throw new UnexpectedServerResponseError(`Resource mining start failed with HTTP ${response.status}.`);
    }

    return this.parser.parse(await response.text());
  }
}
