import type { HuntMobAngerRequestInput } from './hunt-mob-anger-request';

export interface DwarHuntFightAngerInputExpectation {
  expectedFightId: string | null;
  expectedBotArtikulId: string;
}

export function readDwarHuntFightAngerInput(
  canvasValue: unknown,
  expectation?: DwarHuntFightAngerInputExpectation
): HuntMobAngerRequestInput | null {
  const canvas = asRecord(canvasValue);
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

  if (
    (expectation?.expectedFightId && fightId !== expectation.expectedFightId)
    || (expectation && botArtikulId !== expectation.expectedBotArtikulId)
  ) {
    return null;
  }

  return fightId && persId && botArtikulId
    ? { fightId, persId, botArtikulId }
    : null;
}

export function readDwarHuntFightId(canvasValue: unknown): string | null {
  const canvas = asRecord(canvasValue);
  const app = getRecord(canvas, 'app');
  const battle = getRecord(app, 'battle');
  const battleModel = getRecord(battle, 'model');

  return battleModel
    ? readPositiveIntegerId(battleModel.fightId)
    : null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null
    ? value as Record<string, unknown>
    : null;
}

function getRecord(
  value: Record<string, unknown> | null,
  key: string
): Record<string, unknown> | null {
  return value ? asRecord(value[key]) : null;
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
