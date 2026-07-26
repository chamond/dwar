import type { Observable } from 'rxjs';
import type { HuntZoneScan } from '../../domain/entities/hunt-zone-scan';

export interface HuntZoneScanOptions {
  areaId: number;
}

export interface HuntZoneScanner {
  scan(options: HuntZoneScanOptions): Observable<HuntZoneScan>;
}
