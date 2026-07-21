import type { HuntZoneScanner } from '../../application/ports/hunt-zone-scanner';
import type { HuntZoneScan } from '../../domain/entities/hunt-zone-scan';
import { HUNT_ZONE_DIAGNOSTICS_REQUEST } from './hunt-zone-diagnostics-request';
import { DwarHuntZoneXmlParser } from './dwar-hunt-zone-xml-parser';

export class BrowserHuntZoneScanner implements HuntZoneScanner {
  constructor(private readonly parser: DwarHuntZoneXmlParser) {}

  async scan(): Promise<HuntZoneScan> {
    const response = await fetch(HUNT_ZONE_DIAGNOSTICS_REQUEST.url, {
      method: HUNT_ZONE_DIAGNOSTICS_REQUEST.method
    });

    if (!response.ok) {
      throw new Error(`Hunt zone scan failed with HTTP ${response.status}.`);
    }

    return this.parser.parse(await response.text());
  }
}
