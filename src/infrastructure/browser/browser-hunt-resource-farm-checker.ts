import { UnexpectedServerResponseError } from '../../application/errors/unexpected-server-response-error';
import type {
  HuntResourceFarmChecker,
  HuntResourceFarmCheckOptions
} from '../../application/ports/hunt-resource-farm-checker';
import type { HuntResourceFarmStatus } from '../../domain/entities/hunt-resource-farm-status';
import { DwarHuntResourceFarmStatusXmlParser } from './dwar-hunt-resource-farm-status-xml-parser';
import {
  buildHuntResourceFarmUrl,
  HUNT_RESOURCE_FARM_REQUEST
} from './hunt-resource-farm-request';

export class BrowserHuntResourceFarmChecker implements HuntResourceFarmChecker {
  constructor(private readonly parser: DwarHuntResourceFarmStatusXmlParser = new DwarHuntResourceFarmStatusXmlParser()) {}

  async check(
    resourceServerNumber: string,
    options: HuntResourceFarmCheckOptions = {}
  ): Promise<HuntResourceFarmStatus> {
    const requestInit: RequestInit = {
      method: HUNT_RESOURCE_FARM_REQUEST.method
    };

    if (options.signal) {
      requestInit.signal = options.signal;
    }

    const response = await fetch(buildHuntResourceFarmUrl(resourceServerNumber), requestInit);

    if (!response.ok) {
      throw new UnexpectedServerResponseError(`Resource mining check failed with HTTP ${response.status}.`);
    }

    return this.parser.parse(await response.text());
  }
}
