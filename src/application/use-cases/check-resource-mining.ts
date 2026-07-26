import type { HuntResourceFarmChecker } from '../ports/hunt-resource-farm-checker';
import type { HuntResourceFarmStatus } from '../../domain/entities/hunt-resource-farm-status';

export interface CheckResourceMiningInput {
  resourceServerNumber: string;
  signal?: AbortSignal | undefined;
}

export class CheckResourceMiningUseCase {
  constructor(private readonly checker: HuntResourceFarmChecker) {}

  execute(input: CheckResourceMiningInput): Promise<HuntResourceFarmStatus> {
    const resourceServerNumber = input.resourceServerNumber.trim();

    if (resourceServerNumber.length === 0) {
      throw new Error('Current mining resource server number is required.');
    }

    return this.checker.check(resourceServerNumber, {
      signal: input.signal
    });
  }
}
