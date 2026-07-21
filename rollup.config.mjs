import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { transform } from '@swc/core';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const swcOptions = JSON.parse(readFileSync(new URL('./.swcrc', import.meta.url), 'utf8'));
delete swcOptions.$schema;

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
    async transform(code, id) {
      if (!id.endsWith('.ts')) {
        return null;
      }

      const result = await transform(code, {
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

export default {
  input: './src/main.ts',
  output: {
    file: './dist/index.js',
    format: 'es',
    sourcemap: false,
    banner: '#!/usr/bin/env node'
  },
  plugins: [swcTypeScriptPlugin()]
};
