import { findInAccessibleWindowTree } from './accessible-window-tree';

type DwarFightRedirect = (fightId?: string) => void;

export function openDwarHuntFight(fightId: string | null): void {
  const isOpened = findInAccessibleWindowTree(window, (candidate) => {
    const redirect = readFightRedirect(candidate);

    if (!redirect) {
      return null;
    }

    try {
      Reflect.apply(redirect, candidate, fightId ? [fightId] : []);
      return true;
    } catch {
      return null;
    }
  });

  if (!isOpened) {
    throw new Error('Не удалось вызвать штатное открытие боевого frame.');
  }
}

function readFightRedirect(candidate: Window): DwarFightRedirect | null {
  let value: unknown;

  try {
    value = (candidate as unknown as Record<string, unknown>).fightRedirect;
  } catch {
    return null;
  }

  return typeof value === 'function' ? value as DwarFightRedirect : null;
}
