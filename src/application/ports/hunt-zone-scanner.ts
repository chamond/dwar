import type { HuntZoneScan } from '../../domain/entities/hunt-zone-scan';

export interface HuntZoneScanner {
  scan(): Promise<HuntZoneScan>;
}
