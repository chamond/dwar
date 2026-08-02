import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { transformSync } from '@swc/core';
import { PNG } from 'pngjs';

const servicePath = path.resolve(
  'src/domain/services/minigame-image-recognition.ts'
);
const compiledService = transformSync(readFileSync(servicePath, 'utf8'), {
  jsc: {
    parser: {
      syntax: 'typescript'
    },
    target: 'es2022'
  },
  module: {
    type: 'es6'
  }
}).code;
const serviceModuleUrl = `data:text/javascript;base64,${Buffer.from(compiledService).toString('base64')}`;
const { recognizeMinigameImage } = await import(serviceModuleUrl);
const sequenceServicePath = path.resolve(
  'src/domain/services/minigame-sequence.ts'
);
const compiledSequenceService = transformSync(
  readFileSync(sequenceServicePath, 'utf8'),
  {
    jsc: {
      parser: {
        syntax: 'typescript'
      },
      target: 'es2022'
    },
    module: {
      type: 'es6'
    }
  }
).code;
const sequenceServiceModuleUrl = `data:text/javascript;base64,${Buffer.from(compiledSequenceService).toString('base64')}`;
const { invertMinigameSequence } = await import(sequenceServiceModuleUrl);

const references = [1, 2, 3].map((referenceNumber) => ({
  name: `minigame_${referenceNumber}`,
  fragments: Array.from({ length: 6 }, (_, fragmentIndex) => {
    const descriptor = JSON.parse(readFileSync(
      path.join(`minigame_${referenceNumber}`, `fragment-${fragmentIndex}.json`),
      'utf8'
    ));
    return descriptor.matrix.values;
  })
}));

const cases = [
  ['minigame-1.png', 'minigame_1', [0, 3, 1, 2, 5, 4]],
  ['minigame-2.png', 'minigame_2', [1, 4, 2, 0, 5, 3]],
  ['minigame-3.png', 'minigame_3', [1, 3, 0, 4, 5, 2]]
];

for (const [imagePath, referenceName, sourceToTargetSequence] of cases) {
  test(`browser-ядро распознаёт ${imagePath}`, () => {
    const image = PNG.sync.read(readFileSync(imagePath));
    const recognition = recognizeMinigameImage(image, references);

    assert.equal(recognition.referenceName, referenceName);
    assert.deepEqual(recognition.sourceToTargetSequence, sourceToTargetSequence);
    assert.equal(recognition.similarity, 1);
  });
}

test('инвертирует распознанный порядок в серверную последовательность', () => {
  assert.deepEqual(
    invertMinigameSequence([1, 3, 0, 4, 5, 2]),
    [2, 0, 5, 1, 3, 4]
  );
});
