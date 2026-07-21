import type { HuntZoneScan } from '../../domain/entities/hunt-zone-scan';

export interface HuntZoneScanOptions {
  signal?: AbortSignal | undefined;
}

export interface HuntZoneScanner {
  scan(options?: HuntZoneScanOptions): Promise<HuntZoneScan>;
}
