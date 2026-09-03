import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { transformSync } from '@swc/core';

const loadTypeScriptModule = async (relativePath) => {
  const source = readFileSync(path.resolve(relativePath), 'utf8');
  const compiledSource = transformSync(source, {
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
  const moduleUrl = `data:text/javascript;base64,${Buffer.from(compiledSource).toString('base64')}`;

  return import(moduleUrl);
};

const { readDwarHuntCanvasResourceServerNumbers } = await loadTypeScriptModule(
  'src/infrastructure/browser/dwar-hunt-canvas-resources.ts'
);

test('возвращает null, пока модель охоты Canvas недоступна', () => {
  assert.equal(readDwarHuntCanvasResourceServerNumbers({}), null);
});

test('оставляет только созданные и не скрытые визуальные объекты ресурсов', () => {
  const canvasValue = {
    app: {
      hunt: {
        model: {
          Objects: {
            f101: {
              type: 'farm',
              mc: { visible: true }
            },
            f102: {
              type: 'farm'
            },
            f103: {
              type: 'farm',
              mc: { visible: false }
            },
            f104: {
              type: 'farm',
              mc: {}
            },
            b105: {
              type: 'bot',
              mc: { visible: true }
            }
          }
        }
      }
    }
  };

  assert.deepEqual(
    [...readDwarHuntCanvasResourceServerNumbers(canvasValue)],
    ['101', '104']
  );
});
