import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

const FORMAT = 'dwar-minigame-fragment-matrix';
const FORMAT_VERSION = 1;
const GRID_COLUMNS = 3;
const GRID_ROWS = 2;
const DEFAULT_MATRIX_SIZE = 64;
const DEFAULT_DARK_THRESHOLD = 24;
const DEFAULT_SEPARATOR_COVERAGE = 0.98;
const MINIMUM_CONTENT_SIZE = 4;

function readPng(imagePath) {
  try {
    return PNG.sync.read(readFileSync(imagePath));
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`Не удалось прочитать PNG \"${imagePath}\": ${reason}`);
  }
}

function pixelLuminance(image, x, y) {
  const offset = (y * image.width + x) * 4;
  const red = image.data[offset] ?? 0;
  const green = image.data[offset + 1] ?? 0;
  const blue = image.data[offset + 2] ?? 0;

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function isDarkPixel(image, x, y, threshold) {
  const alpha = image.data[(y * image.width + x) * 4 + 3] ?? 0;
  return alpha === 0 || pixelLuminance(image, x, y) <= threshold;
}

function findDarkLines(image, axis, threshold, minimumCoverage) {
  const lineCount = axis === 'x' ? image.width : image.height;
  const lineLength = axis === 'x' ? image.height : image.width;
  const darkLines = new Array(lineCount).fill(false);

  for (let line = 0; line < lineCount; line += 1) {
    let darkPixels = 0;

    for (let position = 0; position < lineLength; position += 1) {
      const x = axis === 'x' ? line : position;
      const y = axis === 'x' ? position : line;

      if (isDarkPixel(image, x, y, threshold)) {
        darkPixels += 1;
      }
    }

    darkLines[line] = darkPixels / lineLength >= minimumCoverage;
  }

  return darkLines;
}

function findRuns(flags) {
  const runs = [];
  let runStart = null;

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

function findContentRanges(length, separatorRuns) {
  const ranges = [];
  let start = 0;

  for (const separator of separatorRuns) {
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

function assertGrid(ranges, expectedCount, axisName) {
  if (ranges.length === expectedCount) {
    return;
  }

  throw new Error(
    `Ожидалось ${expectedCount} областей по оси ${axisName}, найдено ${ranges.length}. ` +
      'Проверьте, что фрагменты разделены сплошными чёрными полосами.'
  );
}

export function detectMinigameFragmentBounds(
  image,
  {
    darkThreshold = DEFAULT_DARK_THRESHOLD,
    separatorCoverage = DEFAULT_SEPARATOR_COVERAGE
  } = {}
) {
  const columnSeparators = findRuns(
    findDarkLines(image, 'x', darkThreshold, separatorCoverage)
  );
  const rowSeparators = findRuns(
    findDarkLines(image, 'y', darkThreshold, separatorCoverage)
  );
  const columns = findContentRanges(image.width, columnSeparators);
  const rows = findContentRanges(image.height, rowSeparators);

  assertGrid(columns, GRID_COLUMNS, 'X');
  assertGrid(rows, GRID_ROWS, 'Y');

  return rows.flatMap((row, rowIndex) =>
    columns.map((column, columnIndex) => ({
      index: rowIndex * GRID_COLUMNS + columnIndex,
      row: rowIndex,
      column: columnIndex,
      x: column.start,
      y: row.start,
      width: column.end - column.start,
      height: row.end - row.start
    }))
  );
}

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

function sampleLuminance(image, x, y) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(x0 + 1, image.width - 1);
  const y1 = Math.min(y0 + 1, image.height - 1);
  const xWeight = x - x0;
  const yWeight = y - y0;
  const top =
    pixelLuminance(image, x0, y0) * (1 - xWeight) +
    pixelLuminance(image, x1, y0) * xWeight;
  const bottom =
    pixelLuminance(image, x0, y1) * (1 - xWeight) +
    pixelLuminance(image, x1, y1) * xWeight;

  return top * (1 - yWeight) + bottom * yWeight;
}

function resizeToGrayscaleMatrix(image, bounds, size) {
  const values = new Float64Array(size * size);

  for (let targetY = 0; targetY < size; targetY += 1) {
    for (let targetX = 0; targetX < size; targetX += 1) {
      const sourceX = clamp(
        bounds.x + ((targetX + 0.5) * bounds.width) / size - 0.5,
        bounds.x,
        bounds.x + bounds.width - 1
      );
      const sourceY = clamp(
        bounds.y + ((targetY + 0.5) * bounds.height) / size - 0.5,
        bounds.y,
        bounds.y + bounds.height - 1
      );

      values[targetY * size + targetX] = sampleLuminance(image, sourceX, sourceY);
    }
  }

  return normalizeContrast(values);
}

function normalizeContrast(values) {
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

function createDescriptor(imagePath, image, bounds, matrixSize) {
  return {
    format: FORMAT,
    version: FORMAT_VERSION,
    source: {
      image: path.basename(imagePath),
      width: image.width,
      height: image.height
    },
    fragment: {
      index: bounds.index,
      row: bounds.row,
      column: bounds.column,
      bounds: {
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height
      }
    },
    matrix: {
      width: matrixSize,
      height: matrixSize,
      colorSpace: 'normalized-grayscale',
      layout: 'row-major',
      values: resizeToGrayscaleMatrix(image, bounds, matrixSize)
    }
  };
}

function assertMatrixSize(matrixSize) {
  if (!Number.isInteger(matrixSize) || matrixSize <= 0) {
    throw new TypeError('Размер матрицы должен быть положительным целым числом.');
  }
}

function defaultOutputDirectory(imagePath) {
  const parsedPath = path.parse(imagePath);
  return path.join(parsedPath.dir, `${parsedPath.name}-fragment-matrices`);
}

export function createMinigameFragmentMatrices(
  imagePath,
  {
    outputDirectory = defaultOutputDirectory(imagePath),
    matrixSize = DEFAULT_MATRIX_SIZE,
    darkThreshold = DEFAULT_DARK_THRESHOLD,
    separatorCoverage = DEFAULT_SEPARATOR_COVERAGE
  } = {}
) {
  const result = createMinigameFragmentDescriptors(imagePath, {
    matrixSize,
    darkThreshold,
    separatorCoverage
  });
  const resolvedOutputDirectory = path.resolve(outputDirectory);

  mkdirSync(resolvedOutputDirectory, { recursive: true });

  const files = result.descriptors.map((descriptor) => {
    const fileName = `fragment-${descriptor.fragment.index}.json`;
    const filePath = path.join(resolvedOutputDirectory, fileName);
    writeFileSync(filePath, `${JSON.stringify(descriptor)}\n`, 'utf8');
    return filePath;
  });

  return {
    outputDirectory: resolvedOutputDirectory,
    files,
    descriptors: result.descriptors
  };
}

export function createMinigameFragmentDescriptors(
  imagePath,
  {
    matrixSize = DEFAULT_MATRIX_SIZE,
    darkThreshold = DEFAULT_DARK_THRESHOLD,
    separatorCoverage = DEFAULT_SEPARATOR_COVERAGE
  } = {}
) {
  assertMatrixSize(matrixSize);

  const resolvedImagePath = path.resolve(imagePath);
  const image = readPng(resolvedImagePath);
  const bounds = detectMinigameFragmentBounds(image, {
    darkThreshold,
    separatorCoverage
  });
  const descriptors = bounds.map((fragmentBounds) =>
    createDescriptor(resolvedImagePath, image, fragmentBounds, matrixSize)
  );

  return {
    imagePath: resolvedImagePath,
    descriptors
  };
}

function assertFragmentMatrix(descriptor) {
  if (
    descriptor?.format !== FORMAT ||
    descriptor.version !== FORMAT_VERSION ||
    !Number.isInteger(descriptor.matrix?.width) ||
    !Number.isInteger(descriptor.matrix?.height) ||
    !Array.isArray(descriptor.matrix?.values) ||
    descriptor.matrix.values.length !== descriptor.matrix.width * descriptor.matrix.height
  ) {
    throw new TypeError('Файл не является поддерживаемой матрицей фрагмента мини-игры.');
  }
}

export function readMinigameFragmentMatrix(matrixPath) {
  const descriptor = JSON.parse(readFileSync(matrixPath, 'utf8'));
  assertFragmentMatrix(descriptor);
  return descriptor;
}

export function compareMinigameFragmentMatrices(first, second) {
  assertFragmentMatrix(first);
  assertFragmentMatrix(second);

  if (
    first.matrix.width !== second.matrix.width ||
    first.matrix.height !== second.matrix.height
  ) {
    throw new RangeError('Для сравнения размеры матриц должны совпадать.');
  }

  let absoluteDifference = 0;

  for (let index = 0; index < first.matrix.values.length; index += 1) {
    absoluteDifference += Math.abs(
      first.matrix.values[index] - second.matrix.values[index]
    );
  }

  const difference = absoluteDifference / (first.matrix.values.length * 255);

  return {
    difference,
    similarity: 1 - difference
  };
}

export function compareMinigameFragmentMatrixFiles(firstPath, secondPath) {
  return compareMinigameFragmentMatrices(
    readMinigameFragmentMatrix(firstPath),
    readMinigameFragmentMatrix(secondPath)
  );
}

function printUsage() {
  console.error(
    'Использование: npm run minigame:matrices -- <путь-к-png> [каталог-результата]'
  );
}

const currentFilePath = fileURLToPath(import.meta.url);
const invokedFilePath = process.argv[1] ? path.resolve(process.argv[1]) : null;

if (invokedFilePath === currentFilePath) {
  const imagePath = process.argv[2];
  const outputDirectory = process.argv[3];

  if (!imagePath) {
    printUsage();
    process.exitCode = 1;
  } else {
    try {
      const options = outputDirectory ? { outputDirectory } : undefined;
      const result = createMinigameFragmentMatrices(imagePath, options);
      console.log(`Создано ${result.files.length} матриц: ${result.outputDirectory}`);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      console.error(reason);
      process.exitCode = 1;
    }
  }
}
