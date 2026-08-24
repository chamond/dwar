import type { HuntMobAngerRequestInput } from './hunt-mob-anger-request';
import { findInAccessibleWindowTree } from './accessible-window-tree';

export function readCurrentHuntFightAngerInput(): HuntMobAngerRequestInput {
  const input = findInAccessibleWindowTree(window, readFightAngerInput);

  if (!input) {
    throw new Error(
      'Не удалось прочитать идентификаторы текущего моба из игрового Canvas боя.'
    );
  }

  return input;
}

function readFightAngerInput(candidate: Window): HuntMobAngerRequestInput | null {
  try {
    const canvas = getRecord(candidate as unknown as Record<string, unknown>, 'canvas');
    const app = getRecord(canvas, 'app');
    const battle = getRecord(app, 'battle');
    const battleModel = getRecord(battle, 'model');
    const mem = getRecord(app, 'mem');
    const memModel = getRecord(mem, 'model');

    if (!battleModel || !memModel) {
      return null;
    }

    const fightId = readPositiveIntegerId(battleModel.fightId);
    const persId = readPositiveIntegerId(memModel.myId);
    const botArtikulId = readPositiveIntegerId(memModel.selectedPers);

    return fightId && persId && botArtikulId
      ? { fightId, persId, botArtikulId }
      : null;
  } catch {
    return null;
  }
}

function getRecord(
  value: Record<string, unknown> | null,
  key: string
): Record<string, unknown> | null {
  if (!value) {
    return null;
  }

  const property = value[key];

  return typeof property === 'object' && property !== null
    ? property as Record<string, unknown>
    : null;
}

function readPositiveIntegerId(value: unknown): string | null {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) && value > 0 ? String(value) : null;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const normalizedValue = value.trim();

  return /^[1-9]\d*$/.test(normalizedValue) ? normalizedValue : null;
}
