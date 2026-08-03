import { concatMap, defer, take, type Observable } from 'rxjs';
import type { HuntMinigameSolutionSubmitter } from '../ports/hunt-minigame-solution-submitter';
import type { HuntResourceFarmInterrupter } from '../ports/hunt-resource-farm-interrupter';
import { assertMinigameSequence } from '../../domain/services/minigame-sequence';

export class SolveHuntMinigameUseCase {
  constructor(
    private readonly solutionSubmitter: HuntMinigameSolutionSubmitter,
    private readonly farmInterrupter: HuntResourceFarmInterrupter
  ) {}

  execute(targetToSourceSequence: readonly number[]): Observable<void> {
    return defer(() => {
      assertMinigameSequence(targetToSourceSequence);
      return this.solutionSubmitter.submit(targetToSourceSequence);
    }).pipe(
      concatMap(() => this.farmInterrupter.interrupt()),
      take(1)
    );
  }
}
