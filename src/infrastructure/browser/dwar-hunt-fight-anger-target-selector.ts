const DEAD_STATUS = 2;
const FLEE_FLAG = 65_536;

export function selectDwarHuntFightAngerTarget(canvasValue: unknown): string | null {
  const canvas = asRecord(canvasValue);
  const app = getRecord(canvas, 'app');
  const battle = getRecord(app, 'battle');
  const battleModel = getRecord(battle, 'model');
  const mem = getRecord(app, 'mem');
  const memModel = getRecord(mem, 'model');

  if (!canvas || !battleModel || !memModel) {
    return null;
  }

  const selectedPersId = readPositiveIntegerId(memModel.selectedPers);

  if (selectedPersId) {
    return selectedPersId;
  }

  const targetId = findAngerTargetId(battleModel, memModel);

  if (!targetId || !dispatchPersSelect(canvas, mem, targetId)) {
    return null;
  }

  return targetId;
}

function findAngerTargetId(
  battleModel: Record<string, unknown>,
  memModel: Record<string, unknown>
): string | null {
  const angers = getRecord(battleModel, 'angers');
  const angerBots = getRecord(angers, 'bots');
  const persList = memModel.persList;
  const myTeam = readTeam(memModel.myTeam);

  if (!angerBots || !Array.isArray(persList) || !myTeam) {
    return null;
  }

  const opponentTeam = persList[myTeam === 1 ? 1 : 0];

  if (!Array.isArray(opponentTeam)) {
    return null;
  }

  for (const participantValue of opponentTeam) {
    const participant = asRecord(participantValue);
    const participantId = participant
      ? readPositiveIntegerId(participant.id)
      : null;

    if (
      participantId
      && participant?.isBot === true
      && participant.status !== DEAD_STATUS
      && !hasFlag(participant.flags, FLEE_FLAG)
      && readPositiveNumber(angerBots[participantId]) !== null
    ) {
      return participantId;
    }
  }

  return null;
}

function dispatchPersSelect(
  canvas: Record<string, unknown>,
  mem: Record<string, unknown> | null,
  targetId: string
): boolean {
  const eventManager = getRecord(canvas, 'EventManager');
  const memEvent = getRecord(mem, 'Event');
  const dispatchEvent = eventManager?.dispatchEvent;
  const persSelectEvent = memEvent?.PERS_SELECT;

  if (
    typeof dispatchEvent !== 'function'
    || typeof persSelectEvent !== 'string'
    || persSelectEvent.length === 0
  ) {
    return false;
  }

  Reflect.apply(dispatchEvent, eventManager, [persSelectEvent, null, Number(targetId)]);

  return true;
}

function hasFlag(value: unknown, flag: number): boolean {
  return typeof value === 'number'
    && Number.isSafeInteger(value)
    && (value & flag) === flag;
}

function readTeam(value: unknown): 1 | 2 | null {
  return value === 1 || value === 2 ? value : null;
}

function readPositiveNumber(value: unknown): number | null {
  const normalizedValue = typeof value === 'string' && value.trim().length > 0
    ? Number(value)
    : value;

  return typeof normalizedValue === 'number'
    && Number.isFinite(normalizedValue)
    && normalizedValue > 0
    ? normalizedValue
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
