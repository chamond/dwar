import { take, type Observable } from 'rxjs';
import type { HuntResourceFarmInterrupter } from '../ports/hunt-resource-farm-interrupter';

export class ForceStopResourceMiningUseCase {
  constructor(private readonly farmInterrupter: HuntResourceFarmInterrupter) {}

  execute(): Observable<void> {
    return this.farmInterrupter.interrupt().pipe(take(1));
  }
}
