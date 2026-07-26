import type { Observable } from 'rxjs';
import type { HuntResourceNode } from '../../domain/entities/hunt-resource-node';
import type { HuntResourceFarmStart } from '../../domain/entities/hunt-resource-farm-start';

export interface HuntResourceFarmer {
  start(resource: HuntResourceNode): Observable<HuntResourceFarmStart>;
}
