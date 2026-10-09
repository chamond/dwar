import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import test from 'node:test';
import { transformSync } from '@swc/core';
import { defer, finalize, of, takeUntil, timer } from 'rxjs';
import { TestScheduler } from 'rxjs/testing';

const runtimeRequire = createRequire(import.meta.url);
function loadTypeScriptModule(relativePath) {
  const absolutePath = path.resolve(relativePath);
  const { code } = transformSync(readFileSync(absolutePath, 'utf8'), {
    jsc: { parser: { syntax: 'typescript' }, target: 'es2022' },
    module: { type: 'commonjs' }
  });
  const loadedModule = { exports: {} };
  const localRequire = (specifier) => specifier.startsWith('.')
    ? loadTypeScriptModule(path.resolve(path.dirname(absolutePath), `${specifier}.ts`))
    : runtimeRequire(specifier);
  Function('require', 'module', 'exports', code)(localRequire, loadedModule, loadedModule.exports);
  return loadedModule.exports;
}

const { StaticProfessionRecipeRepository } = loadTypeScriptModule(
  'src/infrastructure/local-data/static-profession-recipe-repository.ts'
);
const { StaticResourceRepository } = loadTypeScriptModule(
  'src/infrastructure/local-data/static-resource-repository.ts'
);
const { RunProfessionCraftingUseCase } = loadTypeScriptModule(
  'src/application/use-cases/run-profession-crafting.ts'
);
const { presentCraftingEvent } = loadTypeScriptModule(
  'src/presentation/browser/crafting-event-presenter.ts'
);

function createScenario(scheduler, selectedIds, quantities = []) {
  const repository = new StaticProfessionRecipeRepository(new StaticResourceRepository());
  const events = [];
  const requests = [];
  const checks = [];
  let scheduledTasks = 0;
  let activeTasks = 0;
  let activeWaits = 0;
  const useCase = new RunProfessionCraftingUseCase(
    repository,
    { readQuantities: (ids, options) => {
      checks.push({ ids, options });
      return of(quantities);
    } },
    { craft: (recipe, amount) => {
      requests.push({ id: recipe.getRecipeId(), amount, time: scheduler.now() });
      return of(undefined);
    } },
    { wait: (durationMs) => defer(() => {
      activeWaits++;
      assert.equal(activeTasks, 0, 'Cooldown must release the shared task queue');
      return timer(durationMs, scheduler).pipe(finalize(() => activeWaits--));
    }) },
    { schedule: (task) => defer(() => {
      scheduledTasks++;
      activeTasks++;
      return task().pipe(finalize(() => activeTasks--));
    }) }
  );
  return {
    repository, events, requests, checks,
    start: (stopAt) => useCase.execute({ getSelectedRecipeIds: () => selectedIds })
      .pipe(takeUntil(timer(stopAt, scheduler)))
      .subscribe((event) => events.push(event)),
    getScheduledTasks: () => scheduledTasks,
    getActiveWaits: () => activeWaits
  };
}

test('Геб создается по 10 без рюкзака и повторяется ровно через 15 минут', () => {
  const scheduler = new TestScheduler(assert.deepEqual);
  scheduler.run(() => {
    const scenario = createScenario(scheduler, ['geb-destruction-element']);
    scenario.start(900_001);
    scheduler.flush();
    assert.deepEqual(scenario.checks, []);
    assert.deepEqual(scenario.requests, [
      { id: 61024293, amount: 10, time: 0 },
      { id: 61024293, amount: 10, time: 900_000 }
    ]);
    const started = scenario.events.filter((event) => event.type === 'craft-started');
    assert.equal(started[0].durationMs, 900_000);
    assert.equal(started[0].remainingResourceAmount, null);
    assert.equal(scenario.events.some((event) => event.type === 'backpack-check-started'), false);
    const logs = [];
    presentCraftingEvent(started[0], (message) => logs.push(message), { handle() {} });
    assert.deepEqual(logs, ['Крафтим 10 шт. Элемент сокрушения Геб.']);
    assert.equal(scenario.getActiveWaits(), 0);
    assert.equal(scenario.getScheduledTasks(), 2);
  });
});

test('в смешанном выборе проверяет только камни; исчерпание камней не останавливает Геб', () => {
  const scheduler = new TestScheduler(assert.deepEqual);
  scheduler.run(() => {
    const scenario = createScenario(scheduler, ['agate-dust', 'geb-destruction-element'], [
      { articleId: 362, quantity: 0 }
    ]);
    scenario.start(900_001);
    scheduler.flush();
    assert.deepEqual(scenario.checks, [{ ids: [362], options: { group: 3 } }]);
    assert.equal(scenario.events.filter((event) => event.type === 'recipe-stopped').length, 1);
    assert.equal(scenario.requests.length, 2);
    assert.equal(scenario.requests.every((request) => request.id === 61024293), true);
    assert.equal(scenario.getActiveWaits(), 0);
  });
});

test('пыль сохраняет проверку количества и прежний откат; отмена завершает ожидание', () => {
  const scheduler = new TestScheduler(assert.deepEqual);
  scheduler.run(() => {
    const scenario = createScenario(scheduler, ['agate-dust', 'geb-destruction-element'], [
      { articleId: 362, quantity: 3 }
    ]);
    scenario.start(1_000);
    scheduler.flush();
    assert.deepEqual(scenario.requests, [
      { id: 51536385, amount: 3, time: 0 },
      { id: 61024293, amount: 10, time: 0 }
    ]);
    const dust = scenario.events.find((event) => event.type === 'craft-started' && event.recipe.id === 'agate-dust');
    assert.equal(dust.durationMs, 95_000);
    assert.equal(dust.remainingResourceAmount, 0);
    assert.equal(scenario.events.some((event) => event.type === 'craft-completed'), false);
    assert.equal(scenario.getActiveWaits(), 0);
  });
});
