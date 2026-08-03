const FRAGMENT_COUNT = 6;

export function assertMinigameSequence(sequence: readonly number[]): void {
  if (
    sequence.length !== FRAGMENT_COUNT
    || new Set(sequence).size !== FRAGMENT_COUNT
    || sequence.some(
      (sourceIndex) => !Number.isInteger(sourceIndex) || sourceIndex < 0 || sourceIndex >= FRAGMENT_COUNT
    )
  ) {
    throw new TypeError('Последовательность мини-игры должна быть перестановкой 0–5.');
  }
}
