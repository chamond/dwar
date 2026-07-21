import type { HuntZoneScan } from '../../domain/entities/hunt-zone-scan';

export interface HuntZoneScanStore {
  save(scan: HuntZoneScan): void;
  getLastScan(): HuntZoneScan | null;
}
