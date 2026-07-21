import type { HuntZoneScan } from '../../domain/entities/hunt-zone-scan';

export interface HuntZoneScanOptions {
  areaId: number;
  signal?: AbortSignal | undefined;
}

export interface HuntZoneScanner {
  scan(options: HuntZoneScanOptions): Promise<HuntZoneScan>;
}
