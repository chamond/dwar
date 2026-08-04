import { concat, defer, ignoreElements, map, of, tap, type Observable } from 'rxjs';
import type { Delay } from '../ports/delay';
import type {
  HuntMinigameSolutionResult,
  HuntMinigameSolutionSubmitter
} from '../ports/hunt-minigame-solution-submitter';
import type { HuntResourceFarmCancellationSender } from '../ports/hunt-resource-farm-cancellation-sender';
import { assertMinigameSequence } from '../../domain/services/minigame-sequence';

const DEFAULT_MIN_SOLUTION_DELAY_MS = 5_000;
const DEFAULT_MAX_SOLUTION_DELAY_MS = 10_000;

export type SolveHuntMinigameEvent =
  | {
      type: 'solution-delay-started';
      delayMs: number;
    }
  | {
      type: 'solution-submitted';
      result: HuntMinigameSolutionResult;
    };

export interface SolveHuntMinigameConfig {
  minSolutionDelayMs: number;
  maxSolutionDelayMs: number;
}

export class SolveHuntMinigameUseCase {
  private readonly config: SolveHuntMinigameConfig;

  constructor(
    private readonly solutionSubmitter: HuntMinigameSolutionSubmitter,
    private readonly farmCancellationSender: HuntResourceFarmCancellationSender,
    private readonly delay: Delay,
    config: Partial<SolveHuntMinigameConfig> = {},
    private readonly random: () => number = Math.random
  ) {
    this.config = {
      minSolutionDelayMs: config.minSolutionDelayMs ?? DEFAULT_MIN_SOLUTION_DELAY_MS,
      maxSolutionDelayMs: config.maxSolutionDelayMs ?? DEFAULT_MAX_SOLUTION_DELAY_MS
    };

    if (
      this.config.minSolutionDelayMs < 0
      || this.config.maxSolutionDelayMs < this.config.minSolutionDelayMs
    ) {
      throw new Error('Hunt minigame solution delay range is invalid.');
    }
  }

  execute(targetToSourceSequence: readonly number[]): Observable<SolveHuntMinigameEvent> {
    return defer(() => {
      assertMinigameSequence(targetToSourceSequence);
      const delayMs = this.createSolutionDelayMs();

      return concat(
        of<SolveHuntMinigameEvent>({
          type: 'solution-delay-started',
          delayMs
        }),
        this.delay.wait(delayMs).pipe(ignoreElements()),
        this.solutionSubmitter.submit(targetToSourceSequence).pipe(
          tap(() => this.farmCancellationSender.send()),
          map((result): SolveHuntMinigameEvent => ({
            type: 'solution-submitted',
            result
          }))
        )
      );
    });
  }

  private createSolutionDelayMs(): number {
    const random = Math.min(1, Math.max(0, this.random()));
    const range = this.config.maxSolutionDelayMs - this.config.minSolutionDelayMs;

    return this.config.minSolutionDelayMs + Math.round(range * random);
  }
}
