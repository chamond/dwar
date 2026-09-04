import type { BotHuntTargetId } from '../entities/bot-hunt-target';

export function updateOrderedSelection<TId extends string>(
  selectedIds: readonly TId[],
  changedId: TId,
  isSelected: boolean
): readonly TId[] {
  if (isSelected) {
    return selectedIds.includes(changedId)
      ? [...selectedIds]
      : [...selectedIds, changedId];
  }

  return selectedIds.filter((selectedId) => selectedId !== changedId);
}

export function normalizeHuntTargetSelection(
  availableTargetIds: readonly BotHuntTargetId[],
  selectedTargetIds?: readonly BotHuntTargetId[] | null
): readonly BotHuntTargetId[] {
  if (selectedTargetIds === null || selectedTargetIds === undefined) {
    return availableTargetIds[0] ? [availableTargetIds[0]] : [];
  }

  const availableIds = new Set(availableTargetIds);

  return Array.from(new Set(selectedTargetIds)).filter((targetId) => {
    return availableIds.has(targetId);
  });
}
