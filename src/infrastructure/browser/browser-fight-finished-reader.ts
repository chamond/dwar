import { Observable, timer } from 'rxjs';
import type { FightFinishedReader } from '../../application/ports/fight-finished-reader';
import { listAccessibleWindows } from './accessible-window-tree';

const FIGHT_FINISHED_FUNCTION_NAME = 'fightFinished';
const FUNCTION_SEARCH_INTERVAL_MS = 250;

type FightFinishedFunction = (this: unknown, ...args: unknown[]) => unknown;

interface FightFinishedHook {
  target: Record<string, unknown>;
  original: FightFinishedFunction;
  wrapper: FightFinishedFunction;
}

export class BrowserFightFinishedReader implements FightFinishedReader {
  observe(): Observable<void> {
    return new Observable<void>((subscriber) => {
      const hooks = new Map<Window, FightFinishedHook>();
      const searchSubscription = timer(0, FUNCTION_SEARCH_INTERVAL_MS).subscribe(() => {
        for (const candidate of listAccessibleWindows(window)) {
          installHook(candidate, hooks, () => {
            subscriber.next();
          });
        }
      });

      return () => {
        searchSubscription.unsubscribe();

        for (const hook of hooks.values()) {
          restoreHook(hook);
        }

        hooks.clear();
      };
    });
  }
}

function installHook(
  candidate: Window,
  hooks: Map<Window, FightFinishedHook>,
  onFightFinished: () => void
): void {
  const target = candidate as unknown as Record<string, unknown>;
  const currentFunction = readFightFinishedFunction(target);
  const currentHook = hooks.get(candidate);

  if (currentHook && currentFunction === currentHook.wrapper) {
    return;
  }

  if (currentHook) {
    hooks.delete(candidate);
  }

  if (!currentFunction) {
    return;
  }

  const wrapper: FightFinishedFunction = function (...args: unknown[]): unknown {
    try {
      onFightFinished();
    } finally {
      return Reflect.apply(currentFunction, this, args);
    }
  };
  const hook = {
    target,
    original: currentFunction,
    wrapper
  };

  try {
    target[FIGHT_FINISHED_FUNCTION_NAME] = wrapper;
  } catch {
    return;
  }

  if (readFightFinishedFunction(target) === wrapper) {
    hooks.set(candidate, hook);
  }
}

function restoreHook(hook: FightFinishedHook): void {
  if (readFightFinishedFunction(hook.target) !== hook.wrapper) {
    return;
  }

  try {
    hook.target[FIGHT_FINISHED_FUNCTION_NAME] = hook.original;
  } catch {
    // The owning game frame may already have been unloaded.
  }
}

function readFightFinishedFunction(
  target: Record<string, unknown>
): FightFinishedFunction | null {
  let value: unknown;

  try {
    value = target[FIGHT_FINISHED_FUNCTION_NAME];
  } catch {
    return null;
  }

  return typeof value === 'function'
    ? value as FightFinishedFunction
    : null;
}
