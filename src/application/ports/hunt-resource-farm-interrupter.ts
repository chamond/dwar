import type { Observable } from 'rxjs';
import type { HuntResourceNode } from '../../domain/entities/hunt-resource-node';

export interface HuntResourceFarmInterrupter {
  interrupt(resource: HuntResourceNode): Observable<void>;
}
