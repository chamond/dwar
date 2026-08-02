const FRAGMENT_COUNT = 6;

export function invertMinigameSequence(
  sourceToTargetSequence: readonly number[]
): number[] {
  if (
    sourceToTargetSequence.length !== FRAGMENT_COUNT
    || new Set(sourceToTargetSequence).size !== FRAGMENT_COUNT
    || sourceToTargetSequence.some(
      (targetIndex) => !Number.isInteger(targetIndex) || targetIndex < 0 || targetIndex >= FRAGMENT_COUNT
    )
  ) {
    throw new TypeError('Распознанная последовательность мини-игры должна быть перестановкой 0–5.');
  }

  const targetToSourceSequence = new Array<number>(FRAGMENT_COUNT);

  sourceToTargetSequence.forEach((targetIndex, sourceIndex) => {
    targetToSourceSequence[targetIndex] = sourceIndex;
  });

  return targetToSourceSequence;
}
