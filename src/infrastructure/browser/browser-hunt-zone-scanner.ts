import { map, switchMap, take, type Observable } from 'rxjs';
import { fromFetch } from 'rxjs/fetch';
import { UnexpectedServerResponseError } from '../../application/errors/unexpected-server-response-error';
import type { HuntZoneScanner } from '../../application/ports/hunt-zone-scanner';
import type { HuntZoneScan } from '../../domain/entities/hunt-zone-scan';
import { buildHuntZoneDiagnosticsUrl, HUNT_ZONE_DIAGNOSTICS_REQUEST } from './hunt-zone-diagnostics-request';
import { DwarHuntZoneXmlParser } from './dwar-hunt-zone-xml-parser';
import type { HuntZoneScanOptions } from '../../application/ports/hunt-zone-scanner';

export class BrowserHuntZoneScanner implements HuntZoneScanner {
  constructor(private readonly parser: DwarHuntZoneXmlParser) {}

  scan(options: HuntZoneScanOptions): Observable<HuntZoneScan> {
    const requestInit: RequestInit = {
      method: HUNT_ZONE_DIAGNOSTICS_REQUEST.method
    };

    return fromFetch(buildHuntZoneDiagnosticsUrl(options.areaId), requestInit).pipe(
      switchMap((response) => {
        if (!response.ok) {
          throw new UnexpectedServerResponseError(`Hunt zone scan failed with HTTP ${response.status}.`);
        }

        return response.text();
      }),
      map((responseText) => this.parser.parse(responseText)),
      take(1)
    );
  }
}
