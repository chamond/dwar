import {
  ignoreElements,
  share,
  take,
  takeUntil,
  type Observable
} from 'rxjs';

export interface HuntFightLifecycle {
  fightFinished: Observable<void>;
  cancelAngerWhenFightFinishes(anger: Observable<void>): Observable<never>;
}

export function createHuntFightLifecycle(
  fightFinishedSource: Observable<void>
): HuntFightLifecycle {
  const fightFinished = fightFinishedSource.pipe(
    take(1),
    share()
  );

  return {
    fightFinished,
    cancelAngerWhenFightFinishes(anger: Observable<void>): Observable<never> {
      return anger.pipe(
        take(1),
        takeUntil(fightFinished),
        ignoreElements()
      );
    }
  };
}
