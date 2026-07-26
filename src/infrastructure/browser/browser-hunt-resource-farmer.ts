import { map, switchMap, take, type Observable } from 'rxjs';
import { fromFetch } from 'rxjs/fetch';
import { UnexpectedServerResponseError } from '../../application/errors/unexpected-server-response-error';
import type { HuntResourceFarmer } from '../../application/ports/hunt-resource-farmer';
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

  start(resource: HuntResourceNode): Observable<HuntResourceFarmStart> {
    const requestInit: RequestInit = {
      method: HUNT_RESOURCE_FARM_REQUEST.method,
      body: buildHuntResourceFarmBody(resource.getServerNumber())
    };

    return fromFetch(buildHuntResourceFarmUrl(resource.getServerNumber()), requestInit).pipe(
      switchMap((response) => {
        if (!response.ok) {
          throw new UnexpectedServerResponseError(`Resource mining start failed with HTTP ${response.status}.`);
        }

        return response.text();
      }),
      map((responseText) => this.parser.parse(responseText)),
      take(1)
    );
  }
}
