const GRID_COLUMNS = 3;
const GRID_ROWS = 2;
const FRAGMENT_COUNT = GRID_COLUMNS * GRID_ROWS;
const MATRIX_SIZE = 64;
const DARK_THRESHOLD = 24;
const SEPARATOR_COVERAGE = 0.98;
const MINIMUM_CONTENT_SIZE = 4;

export interface MinigamePixelImage {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

export interface MinigameReference {
  name: string;
  fragments: readonly (readonly number[])[];
}

export interface MinigameImageRecognition {
  referenceName: string;
  similarity: number;
  sourceToTargetSequence: readonly number[];
}

interface IndexRange {
  start: number;
  end: number;
}

interface FragmentBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ReferenceRecognition extends MinigameImageRecognition {}

export function recognizeMinigameImage(
  image: MinigamePixelImage,
  references: readonly MinigameReference[]
): MinigameImageRecognition {
  if (references.length === 0) {
    throw new TypeError('Нужен хотя бы один эталон мини-игры.');
  }

  const sourceFragments = detectFragmentBounds(image).map((bounds) =>
    resizeToGrayscaleMatrix(image, bounds)
  );
  const recognitions = references.map((reference) =>
    recognizeReference(sourceFragments, reference)
  );

  return recognitions.reduce((strongest, recognition) =>
    recognition.similarity > strongest.similarity ? recognition : strongest
  );
}

function recognizeReference(
  sourceFragments: readonly (readonly number[])[],
  reference: MinigameReference
): ReferenceRecognition {
  assertReference(reference);

  const strongestMatches = sourceFragments.map((sourceFragment) => {
    const similarities = reference.fragments.map((referenceFragment) =>
      compareMatrices(sourceFragment, referenceFragment)
    );

    return similarities.reduce(
      (strongest, similarity, referenceIndex) =>
        similarity > strongest.similarity
          ? { referenceIndex, similarity }
          : strongest,
      { referenceIndex: 0, similarity: similarities[0] ?? 0 }
    );
  });
  const similarity = strongestMatches.reduce(
    (sum, match) => sum + match.similarity,
    0
  ) / strongestMatches.length;

  return {
    referenceName: reference.name,
    similarity,
    sourceToTargetSequence: strongestMatches.map(({ referenceIndex }) => referenceIndex)
  };
}

function assertReference(reference: MinigameReference): void {
  if (reference.fragments.length !== FRAGMENT_COUNT) {
    throw new TypeError(
      `Эталон "${reference.name}" должен содержать ${FRAGMENT_COUNT} фрагментов.`
    );
  }

  if (reference.fragments.some((fragment) => fragment.length !== MATRIX_SIZE * MATRIX_SIZE)) {
    throw new TypeError(
      `Фрагменты эталона "${reference.name}" должны иметь размер ${MATRIX_SIZE}x${MATRIX_SIZE}.`
    );
  }
}

function compareMatrices(first: readonly number[], second: readonly number[]): number {
  let absoluteDifference = 0;

  for (let index = 0; index < first.length; index += 1) {
    absoluteDifference += Math.abs((first[index] ?? 0) - (second[index] ?? 0));
  }

  return 1 - absoluteDifference / (first.length * 255);
}

function detectFragmentBounds(image: MinigamePixelImage): FragmentBounds[] {
  const columns = findContentRanges(
    image.width,
    findRuns(findDarkLines(image, 'x'))
  );
  const rows = findContentRanges(
    image.height,
    findRuns(findDarkLines(image, 'y'))
  );

  assertGrid(columns, GRID_COLUMNS, 'X');
  assertGrid(rows, GRID_ROWS, 'Y');

  return rows.flatMap((row) =>
    columns.map((column) => ({
      x: column.start,
      y: row.start,
      width: column.end - column.start,
      height: row.end - row.start
    }))
  );
}

function findDarkLines(image: MinigamePixelImage, axis: 'x' | 'y'): boolean[] {
  const lineCount = axis === 'x' ? image.width : image.height;
  const lineLength = axis === 'x' ? image.height : image.width;
  const darkLines = new Array<boolean>(lineCount).fill(false);

  for (let line = 0; line < lineCount; line += 1) {
    let darkPixels = 0;

    for (let position = 0; position < lineLength; position += 1) {
      const x = axis === 'x' ? line : position;
      const y = axis === 'x' ? position : line;

      if (isDarkPixel(image, x, y)) {
        darkPixels += 1;
      }
    }

    darkLines[line] = darkPixels / lineLength >= SEPARATOR_COVERAGE;
  }

  return darkLines;
}

function isDarkPixel(image: MinigamePixelImage, x: number, y: number): boolean {
  const offset = (y * image.width + x) * 4;
  const alpha = image.data[offset + 3] ?? 0;

  return alpha === 0 || pixelLuminance(image, x, y) <= DARK_THRESHOLD;
}

function findRuns(flags: readonly boolean[]): IndexRange[] {
  const runs: IndexRange[] = [];
  let runStart: number | null = null;

  for (let index = 0; index <= flags.length; index += 1) {
    if (flags[index] === true && runStart === null) {
      runStart = index;
      continue;
    }

    if (flags[index] !== true && runStart !== null) {
      runs.push({ start: runStart, end: index });
      runStart = null;
    }
  }

  return runs;
}

function findContentRanges(length: number, separators: readonly IndexRange[]): IndexRange[] {
  const ranges: IndexRange[] = [];
  let start = 0;

  for (const separator of separators) {
    if (separator.start - start >= MINIMUM_CONTENT_SIZE) {
      ranges.push({ start, end: separator.start });
    }

    start = separator.end;
  }

  if (length - start >= MINIMUM_CONTENT_SIZE) {
    ranges.push({ start, end: length });
  }

  return ranges;
}

function assertGrid(
  ranges: readonly IndexRange[],
  expectedCount: number,
  axis: string
): void {
  if (ranges.length !== expectedCount) {
    throw new Error(
      `Ожидалось ${expectedCount} областей по оси ${axis}, найдено ${ranges.length}.`
    );
  }
}

function resizeToGrayscaleMatrix(
  image: MinigamePixelImage,
  bounds: FragmentBounds
): number[] {
  const values = new Float64Array(MATRIX_SIZE * MATRIX_SIZE);

  for (let targetY = 0; targetY < MATRIX_SIZE; targetY += 1) {
    for (let targetX = 0; targetX < MATRIX_SIZE; targetX += 1) {
      const sourceX = clamp(
        bounds.x + ((targetX + 0.5) * bounds.width) / MATRIX_SIZE - 0.5,
        bounds.x,
        bounds.x + bounds.width - 1
      );
      const sourceY = clamp(
        bounds.y + ((targetY + 0.5) * bounds.height) / MATRIX_SIZE - 0.5,
        bounds.y,
        bounds.y + bounds.height - 1
      );

      values[targetY * MATRIX_SIZE + targetX] = sampleLuminance(image, sourceX, sourceY);
    }
  }

  return normalizeContrast(values);
}

function sampleLuminance(image: MinigamePixelImage, x: number, y: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(x0 + 1, image.width - 1);
  const y1 = Math.min(y0 + 1, image.height - 1);
  const xWeight = x - x0;
  const yWeight = y - y0;
  const top =
    pixelLuminance(image, x0, y0) * (1 - xWeight)
    + pixelLuminance(image, x1, y0) * xWeight;
  const bottom =
    pixelLuminance(image, x0, y1) * (1 - xWeight)
    + pixelLuminance(image, x1, y1) * xWeight;

  return top * (1 - yWeight) + bottom * yWeight;
}

function pixelLuminance(image: MinigamePixelImage, x: number, y: number): number {
  const offset = (y * image.width + x) * 4;
  const red = image.data[offset] ?? 0;
  const green = image.data[offset + 1] ?? 0;
  const blue = image.data[offset + 2] ?? 0;

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function normalizeContrast(values: Float64Array): number[] {
  const sorted = Array.from(values).sort((first, second) => first - second);
  const lastIndex = sorted.length - 1;
  const low = sorted[Math.floor(lastIndex * 0.02)] ?? 0;
  const high = sorted[Math.ceil(lastIndex * 0.98)] ?? 255;

  if (high - low < 1) {
    return Array.from(values, (value) => Math.round(clamp(value, 0, 255)));
  }

  return Array.from(values, (value) =>
    Math.round((clamp(value, low, high) - low) * (255 / (high - low)))
  );
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}
