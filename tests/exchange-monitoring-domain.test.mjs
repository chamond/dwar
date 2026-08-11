import assert from 'node:assert/strict';
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

const ruleModule = await loadTypeScriptModule(
  'src/domain/entities/exchange-monitoring-rule.ts'
);
const copperModule = await loadTypeScriptModule(
  'src/domain/services/copper-amount.ts'
);
const selectionModule = await loadTypeScriptModule(
  'src/domain/services/exchange-offer-selection.ts'
);
const requestModule = await loadTypeScriptModule(
  'src/infrastructure/browser/exchange-offers-request.ts'
);

test('правило биржи поддерживает «все» и качества от серого до бирюзового', () => {
  assert.deepEqual(ruleModule.EXCHANGE_ITEM_QUALITIES, [-1, 0, 1, 2, 3, 4, 5]);

  const rule = ruleModule.ExchangeMonitoringRule.create({
    id: ' rule-1 ',
    title: ' пыль ',
    quality: -1,
    minimumPriceCopper: 12345
  });

  assert.deepEqual(rule.toSnapshot(), {
    id: 'rule-1',
    title: 'пыль',
    quality: -1,
    minimumPriceCopper: 12345
  });
});

test('цена в меди раскладывается на золото, серебро и медь', () => {
  assert.deepEqual(copperModule.splitCopperAmount(12345), {
    gold: 1,
    silver: 23,
    copper: 45
  });
  assert.deepEqual(copperModule.splitCopperAmount(21), {
    gold: 0,
    silver: 0,
    copper: 21
  });
});

test('мониторинг оставляет предложения не дешевле заданного порога', () => {
  const offers = [21, 125, 99].map((priceCopper) => ({
    getPriceCopper: () => priceCopper
  }));
  const selected = selectionModule.selectExchangeOffersAtOrAbovePrice(offers, 99);

  assert.deepEqual(selected.map((offer) => offer.getPriceCopper()), [125, 99]);
});

test('запрос биржи всегда сортируется по цене по убыванию и отключает ihave', () => {
  const body = requestModule.buildExchangeOffersRequestBody({
    title: ' пыль ',
    quality: -1
  });

  assert.equal(body.get('_filter[ihave]'), '0');
  assert.equal(body.get('_filter[title]'), 'пыль');
  assert.equal(body.get('_filter[quality]'), '-1');
  assert.equal(body.get('_filter[sort]'), 'cost');
  assert.equal(body.get('_filter[sort_order]'), 'desc');
  assert.equal(body.get('_filterapply'), 'Ок');
  assert.equal(body.toString().includes('sess_'), false);
  assert.equal(body.toString().includes('cookie'), false);
});
