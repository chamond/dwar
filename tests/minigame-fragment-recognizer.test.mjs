import assert from 'node:assert/strict';
import { copyFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  findStrongestUniqueMatches,
  recognizeMinigameFragments
} from '../scripts/minigame-fragment-recognizer.mjs';

const cases = [
  {
    image: 'minigame-1.png',
    reference: 'minigame_1',
    targetToSourceSequence: [0, 2, 3, 1, 5, 4]
  },
  {
    image: 'minigame-2.png',
    reference: 'minigame_2',
    targetToSourceSequence: [3, 0, 2, 5, 1, 4]
  },
  {
    image: 'minigame-3.png',
    reference: 'minigame_3',
    targetToSourceSequence: [2, 0, 5, 1, 3, 4]
  },
  {
    image: 'minigame-4.png',
    reference: 'minigame_4',
    targetToSourceSequence: [1, 3, 5, 4, 2, 0]
  },
  {
    image: 'minigame-5.png',
    reference: 'minigame_5',
    targetToSourceSequence: [4, 1, 5, 2, 3, 0]
  },
  {
    image: 'minigame-6.png',
    reference: 'minigame_6',
    targetToSourceSequence: [0, 1, 5, 4, 2, 3]
  }
];

test('сопоставляет каждую целевую позицию ровно один раз', () => {
  const comparisons = Array.from({ length: 6 }, (_, sourceIndex) =>
    Array.from({ length: 6 }, (_, referenceIndex) => ({
      sourceIndex,
      referenceIndex,
      similarity: 1 - referenceIndex * 0.01
    }))
  );
  const matches = findStrongestUniqueMatches(comparisons);

  assert.deepEqual(
    matches.map(({ referenceIndex }) => referenceIndex).sort(),
    [0, 1, 2, 3, 4, 5]
  );
});

for (const fixture of cases) {
  test(`распознаёт эталон и порядок для ${fixture.image}`, () => {
    const outputDirectory = mkdtempSync(
      path.join(tmpdir(), 'dwar-minigame-recognizer-')
    );

    try {
      const imagePath = path.join(outputDirectory, fixture.image);
      const generatedMatrices = path.join(
        outputDirectory,
        `${path.parse(fixture.image).name}-fragment-matrices`
      );
      copyFileSync(fixture.image, imagePath);
      const result = recognizeMinigameFragments(imagePath);

      assert.equal(result.fragments.descriptors.length, 6);
      assert.equal(existsSync(generatedMatrices), false);
      assert.equal(result.reference.name, fixture.reference);
      assert.deepEqual(
        result.targetToSourceSequence,
        fixture.targetToSourceSequence
      );
      assert.deepEqual(
        [...result.targetToSourceSequence].sort(),
        [0, 1, 2, 3, 4, 5]
      );
      assert.equal(result.comparisons.length, 6);

      result.comparisons.forEach((comparisons, sourceIndex) => {
        assert.equal(comparisons.length, 6);
        assert.equal(
          result.matches[sourceIndex].similarity,
          Math.max(...comparisons.map(({ similarity }) => similarity))
        );
      });
    } finally {
      rmSync(outputDirectory, { recursive: true, force: true });
    }
  });
}
