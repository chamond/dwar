import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  compareMinigameFragmentMatrices,
  createMinigameFragmentDescriptors,
  readMinigameFragmentMatrix
} from './minigame-fragment-matrices.mjs';

const FRAGMENT_COUNT = 6;
const SCRIPT_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_DIRECTORY = path.dirname(SCRIPT_DIRECTORY);

function defaultReferenceDirectories() {
  return [1, 2, 3, 4, 5].map((number) =>
    path.join(PROJECT_DIRECTORY, `minigame_${number}`)
  );
}

function readReference(referenceDirectory) {
  const directory = path.resolve(referenceDirectory);
  const fragments = Array.from({ length: FRAGMENT_COUNT }, (_, index) => {
    const fragment = readMinigameFragmentMatrix(
      path.join(directory, `fragment-${index}.json`)
    );

    if (fragment.fragment?.index !== index) {
      throw new TypeError(
        `В эталоне "${directory}" fragment-${index}.json содержит индекс ` +
          `${String(fragment.fragment?.index)} вместо ${index}.`
      );
    }

    return fragment;
  });

  return {
    name: path.basename(directory),
    directory,
    fragments
  };
}

function findStrongestComparison(comparisons) {
  return comparisons.reduce((strongest, comparison) =>
    comparison.similarity > strongest.similarity ? comparison : strongest
  );
}

function compareWithReference(sourceFragments, reference) {
  const comparisons = sourceFragments.map((sourceFragment, sourceIndex) =>
    reference.fragments.map((referenceFragment) => ({
      sourceIndex,
      referenceIndex: referenceFragment.fragment.index,
      ...compareMinigameFragmentMatrices(sourceFragment, referenceFragment)
    }))
  );
  const matches = comparisons.map(findStrongestComparison);
  const similarity =
    matches.reduce((sum, match) => sum + match.similarity, 0) / matches.length;

  return {
    name: reference.name,
    directory: reference.directory,
    similarity,
    matches,
    comparisons
  };
}

function findStrongestReference(references) {
  return references.reduce((strongest, reference) =>
    reference.similarity > strongest.similarity ? reference : strongest
  );
}

export function recognizeMinigameFragments(
  imagePath,
  {
    referenceDirectories = defaultReferenceDirectories()
  } = {}
) {
  if (!Array.isArray(referenceDirectories) || referenceDirectories.length === 0) {
    throw new TypeError('Нужен хотя бы один каталог с эталонными фрагментами.');
  }

  const fragments = createMinigameFragmentDescriptors(imagePath);
  const sourceFragments = fragments.descriptors;
  const references = referenceDirectories
    .map(readReference)
    .map((reference) => compareWithReference(sourceFragments, reference));
  const reference = findStrongestReference(references);

  return {
    imagePath: path.resolve(imagePath),
    fragments,
    reference: {
      name: reference.name,
      directory: reference.directory,
      similarity: reference.similarity
    },
    sequence: reference.matches.map((match) => match.referenceIndex),
    matches: reference.matches,
    comparisons: reference.comparisons,
    referenceScores: references.map(({ name, directory, similarity }) => ({
      name,
      directory,
      similarity
    }))
  };
}

function printUsage() {
  console.error(
    'Использование: npm run minigame:recognize -- <путь-к-png>'
  );
}

const currentFilePath = fileURLToPath(import.meta.url);
const invokedFilePath = process.argv[1] ? path.resolve(process.argv[1]) : null;

if (invokedFilePath === currentFilePath) {
  const imagePath = process.argv[2];

  if (!imagePath) {
    printUsage();
    process.exitCode = 1;
  } else {
    try {
      const result = recognizeMinigameFragments(imagePath);
      console.log(
        `Эталон: ${result.reference.name} ` +
          `(схожесть ${result.reference.similarity.toFixed(6)})`
      );
      console.log(`Порядок: ${result.sequence.join(',')}`);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      console.error(reason);
      process.exitCode = 1;
    }
  }
}
