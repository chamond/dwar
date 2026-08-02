import { concatMap, defer, take, type Observable } from 'rxjs';
import type { HuntMinigameSolutionSubmitter } from '../ports/hunt-minigame-solution-submitter';
import type { HuntResourceFarmInterrupter } from '../ports/hunt-resource-farm-interrupter';
import { invertMinigameSequence } from '../../domain/services/minigame-sequence';

export class SolveHuntMinigameUseCase {
  constructor(
    private readonly solutionSubmitter: HuntMinigameSolutionSubmitter,
    private readonly farmInterrupter: HuntResourceFarmInterrupter
  ) {}

  execute(sourceToTargetSequence: readonly number[]): Observable<void> {
    return defer(() => {
      const targetToSourceSequence = invertMinigameSequence(sourceToTargetSequence);
      return this.solutionSubmitter.submit(targetToSourceSequence);
    }).pipe(
      concatMap(() => this.farmInterrupter.interrupt()),
      take(1)
    );
  }
}
