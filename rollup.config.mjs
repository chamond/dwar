import { Buffer } from 'node:buffer';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { minifySync, transformSync } from '@swc/core';
import { nodeResolve } from '@rollup/plugin-node-resolve';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const swcOptions = JSON.parse(readFileSync(new URL('./.swcrc', import.meta.url), 'utf8'));
delete swcOptions.$schema;
const minigameReferencesModuleId = 'virtual:minigame-references';
const resolvedMinigameReferencesModuleId = `\0${minigameReferencesModuleId}`;
const minigameReferenceNumbers = [1, 2, 3, 4, 5, 6, 7];
const minigameFragmentCount = 6;
const minigameMatrixSize = 64;

function minigameReferencesPlugin() {
  return {
    name: 'minigame-references',
    resolveId(source) {
      return source === minigameReferencesModuleId
        ? resolvedMinigameReferencesModuleId
        : null;
    },
    load(id) {
      if (id !== resolvedMinigameReferencesModuleId) {
        return null;
      }

      const references = minigameReferenceNumbers.map((referenceNumber) => {
        const name = `minigame_${referenceNumber}`;
        const directory = path.join(rootDir, name);
        const fragments = Array.from({ length: minigameFragmentCount }, (_, fragmentIndex) => {
          const filePath = path.join(directory, `fragment-${fragmentIndex}.json`);
          const descriptor = JSON.parse(readFileSync(filePath, 'utf8'));
          const values = descriptor.matrix?.values;

          if (
            descriptor.fragment?.index !== fragmentIndex
            || descriptor.matrix?.width !== minigameMatrixSize
            || descriptor.matrix?.height !== minigameMatrixSize
            || !Array.isArray(values)
            || values.length !== minigameMatrixSize * minigameMatrixSize
            || values.some((value) =>
              !Number.isInteger(value) || value < 0 || value > 255
            )
          ) {
            throw new TypeError(`Некорректный эталон мини-игры: ${filePath}`);
          }

          return values;
        });

        return { name, fragments };
      });
      const packedMatrices = Buffer.from(
        references.flatMap(({ fragments }) => fragments.flat())
      ).toString('base64');
      const referenceNames = references.map(({ name }) => name);

      return `
        function decodeReferences(encodedMatrices, referenceNames) {
          const binary = atob(encodedMatrices);
          const values = new Uint8Array(binary.length);

          for (let index = 0; index < binary.length; index += 1) {
            values[index] = binary.charCodeAt(index);
          }

          return referenceNames.map((name, referenceIndex) => ({
            name,
            fragments: Array.from(
              { length: ${minigameFragmentCount} },
              (_, fragmentIndex) => {
                const start = (
                  referenceIndex * ${minigameFragmentCount} + fragmentIndex
                ) * ${minigameMatrixSize * minigameMatrixSize};

                return values.subarray(
                  start,
                  start + ${minigameMatrixSize * minigameMatrixSize}
                );
              }
            )
          }));
        }

        export default decodeReferences(
          ${JSON.stringify(packedMatrices)},
          ${JSON.stringify(referenceNames)}
        );
      `;
    }
  };
}

function resolveTypeScriptModule(source, importer) {
  if (!importer || !source.startsWith('.')) {
    return null;
  }

  const basePath = path.resolve(path.dirname(importer), source);
  const candidates = [];

  if (source.endsWith('.js')) {
    candidates.push(basePath.slice(0, -3) + '.ts');
  }

  candidates.push(basePath, `${basePath}.ts`, path.join(basePath, 'index.ts'));

  return candidates.find((candidate) => existsSync(candidate) && statSync(candidate).isFile()) ?? null;
}

function swcTypeScriptPlugin() {
  return {
    name: 'swc-typescript',
    resolveId(source, importer) {
      if (!importer && source.endsWith('.ts')) {
        return path.resolve(rootDir, source);
      }

      return resolveTypeScriptModule(source, importer);
    },
    load(id) {
      if (!id.endsWith('.ts')) {
        return null;
      }

      return readFileSync(id, 'utf8');
    },
    transform(code, id) {
      if (!id.endsWith('.ts')) {
        return null;
      }

      const result = transformSync(code, {
        ...swcOptions,
        filename: id
      });

      return {
        code: result.code,
        map: result.map ? JSON.parse(result.map) : null
      };
    }
  };
}

function swcMinifyBundlePlugin() {
  return {
    name: 'swc-minify-bundle',
    renderChunk(code) {
      const result = minifySync(code, {
        compress: {
          defaults: true,
          drop_debugger: true,
          passes: 3,
          unsafe: true,
          unsafe_arrows: true,
          unsafe_comps: true,
          unsafe_methods: true
        },
        ecma: 2022,
        format: {
          asciiOnly: true,
          comments: false
        },
        keep_classnames: false,
        keep_fnames: false,
        mangle: {
          topLevel: true
        },
        module: false,
        sourceMap: false,
        toplevel: true
      });

      return {
        code: result.code,
        map: null
      };
    }
  };
}

export default {
  input: './src/main.ts',
  output: {
    file: './dist/index.js',
    format: 'iife',
    name: 'DwarBot',
    sourcemap: false
  },
  plugins: [
    minigameReferencesPlugin(),
    nodeResolve({
      browser: true
    }),
    swcTypeScriptPlugin(),
    swcMinifyBundlePlugin()
  ]
};
