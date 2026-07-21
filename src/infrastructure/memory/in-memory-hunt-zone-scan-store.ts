import type { HuntZoneScanStore } from '../../application/ports/hunt-zone-scan-store';
import type { HuntZoneScan } from '../../domain/entities/hunt-zone-scan';

export class InMemoryHuntZoneScanStore implements HuntZoneScanStore {
  private lastScan: HuntZoneScan | null = null;

  save(scan: HuntZoneScan): void {
    this.lastScan = scan;
  }

  getLastScan(): HuntZoneScan | null {
    return this.lastScan;
  }
}
