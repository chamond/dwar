import type { HuntZoneScanner } from '../../application/ports/hunt-zone-scanner';
import type { HuntZoneScan } from '../../domain/entities/hunt-zone-scan';
import { buildHuntZoneDiagnosticsUrl, HUNT_ZONE_DIAGNOSTICS_REQUEST } from './hunt-zone-diagnostics-request';
import { DwarHuntZoneXmlParser } from './dwar-hunt-zone-xml-parser';
import type { HuntZoneScanOptions } from '../../application/ports/hunt-zone-scanner';

export class BrowserHuntZoneScanner implements HuntZoneScanner {
  constructor(private readonly parser: DwarHuntZoneXmlParser) {}

  async scan(options: HuntZoneScanOptions): Promise<HuntZoneScan> {
    const requestInit: RequestInit = {
      method: HUNT_ZONE_DIAGNOSTICS_REQUEST.method
    };

    if (options.signal) {
      requestInit.signal = options.signal;
    }

    const response = await fetch(buildHuntZoneDiagnosticsUrl(options.areaId), requestInit);

    if (!response.ok) {
      throw new Error(`Hunt zone scan failed with HTTP ${response.status}.`);
    }

    return this.parser.parse(await response.text());
  }
}
