import type { Observable } from 'rxjs';
import type { LocationPlayer } from '../../domain/entities/location-player';

export interface CurrentLocationPlayerReader {
  read(): Observable<readonly LocationPlayer[]>;
}
