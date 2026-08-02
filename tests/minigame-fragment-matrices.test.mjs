import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { PNG } from 'pngjs';
import {
  compareMinigameFragmentMatrices,
  createMinigameFragmentMatrices,
  readMinigameFragmentMatrix
} from '../scripts/minigame-fragment-matrices.mjs';

function fillRectangle(image, x, y, width, height, color, pattern) {
  for (let offsetY = 0; offsetY < height; offsetY += 1) {
    for (let offsetX = 0; offsetX < width; offsetX += 1) {
      const pixelOffset = ((y + offsetY) * image.width + x + offsetX) * 4;
      const variation =
        (offsetX * (pattern + 3) + offsetY * (pattern * 2 + 1) + offsetX * offsetY) % 31;
      image.data[pixelOffset] = Math.min(color[0] + variation, 255);
      image.data[pixelOffset + 1] = Math.min(color[1] + variation, 255);
      image.data[pixelOffset + 2] = Math.min(color[2] + variation, 255);
      image.data[pixelOffset + 3] = 255;
    }
  }
}

function createFixture(filePath) {
  const image = new PNG({ width: 40, height: 27 });
  image.data.fill(0);

  const colors = [
    [40, 70, 90],
    [80, 45, 100],
    [110, 70, 35],
    [30, 120, 75],
    [150, 95, 40],
    [75, 80, 160]
  ];
  const columns = [
    { x: 1, width: 11 },
    { x: 14, width: 11 },
    { x: 27, width: 12 }
  ];
  const rows = [
    { y: 1, height: 11 },
    { y: 15, height: 11 }
  ];

  rows.forEach((row, rowIndex) => {
    columns.forEach((column, columnIndex) => {
      fillRectangle(
        image,
        column.x,
        row.y,
        column.width,
        row.height,
        colors[rowIndex * columns.length + columnIndex],
        rowIndex * columns.length + columnIndex + 1
      );
    });
  });

  writeFileSync(filePath, PNG.sync.write(image));
}

test('создаёт шесть нормализованных матриц без чёрных разделителей', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'dwar-minigame-matrices-'));

  try {
    const imagePath = path.join(directory, 'captcha.png');
    const outputDirectory = path.join(directory, 'matrices');
    createFixture(imagePath);

    const result = createMinigameFragmentMatrices(imagePath, {
      outputDirectory,
      matrixSize: 8
    });

    assert.equal(result.files.length, 6);
    assert.deepEqual(result.descriptors[0].fragment.bounds, {
      x: 1,
      y: 1,
      width: 11,
      height: 11
    });

    for (const filePath of result.files) {
      const descriptor = JSON.parse(readFileSync(filePath, 'utf8'));
      assert.equal(descriptor.matrix.width, 8);
      assert.equal(descriptor.matrix.height, 8);
      assert.equal(descriptor.matrix.values.length, 64);
    }

    const first = readMinigameFragmentMatrix(result.files[0]);
    const second = readMinigameFragmentMatrix(result.files[1]);
    assert.deepEqual(compareMinigameFragmentMatrices(first, first), {
      difference: 0,
      similarity: 1
    });
    assert.ok(compareMinigameFragmentMatrices(first, second).similarity < 1);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
