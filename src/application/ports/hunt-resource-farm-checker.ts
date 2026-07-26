import type { HuntResourceFarmStatus } from '../../domain/entities/hunt-resource-farm-status';

export interface HuntResourceFarmCheckOptions {
  signal?: AbortSignal | undefined;
}

export interface HuntResourceFarmChecker {
  check(
    resourceServerNumber: string,
    options?: HuntResourceFarmCheckOptions
  ): Promise<HuntResourceFarmStatus>;
}
