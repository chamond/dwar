import assert from 'node:assert/strict';
import { copyFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { recognizeMinigameFragments } from '../scripts/minigame-fragment-recognizer.mjs';

const cases = [
  {
    image: 'minigame-1.png',
    reference: 'minigame_1',
    sequence: [0, 3, 1, 2, 5, 4]
  },
  {
    image: 'minigame-2.png',
    reference: 'minigame_2',
    sequence: [1, 4, 2, 0, 5, 3]
  },
  {
    image: 'minigame-3.png',
    reference: 'minigame_3',
    sequence: [1, 3, 0, 4, 5, 2]
  }
];

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
      assert.deepEqual(result.sequence, fixture.sequence);
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
