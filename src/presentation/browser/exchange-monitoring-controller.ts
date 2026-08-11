import {
  EMPTY,
  catchError,
  finalize,
  type Subscription
} from 'rxjs';
import type { ExchangeMonitoringEvent } from '../../application/events/exchange-monitoring-event';
import type { ExchangeMonitoringSettingsStore } from '../../application/ports/exchange-monitoring-settings-store';
import type { MonitorExchangeRuleUseCase } from '../../application/use-cases/monitor-exchange-rule';
import {
  ExchangeMonitoringRule,
  isExchangeItemQuality,
  type ExchangeMonitoringRuleSnapshot
} from '../../domain/entities/exchange-monitoring-rule';
import { renderCopperAmount } from './exchange-money';
import type { ExchangeMonitoringTabElements } from './exchange-monitoring-tab';
import { DEFAULT_EXCHANGE_MONITORING_INTERVAL_MINUTES } from './exchange-monitoring-tab';
import {
  clearExchangeMonitoringRuleMatches,
  createExchangeMonitoringRuleView,
  presentExchangeMonitoringRuleChecking,
  presentExchangeMonitoringRuleCompleted,
  presentExchangeMonitoringRuleError,
  presentExchangeMonitoringRuleStopped,
  setExchangeMonitoringRuleActive,
  type ExchangeMonitoringRuleView
} from './exchange-monitoring-rule-view';

interface RuleRuntime {
  rule: ExchangeMonitoringRule;
  view: ExchangeMonitoringRuleView;
  subscription: Subscription | null;
  acknowledgeHandler: () => void;
  toggleHandler: () => void;
  removeHandler: () => void;
}

export interface ExchangeMonitoringController {
  destroy(): void;
}

export interface ExchangeMonitoringControllerOptions {
  elements: ExchangeMonitoringTabElements;
  monitorExchangeRule: MonitorExchangeRuleUseCase;
  settingsStore: ExchangeMonitoringSettingsStore;
  onMatchingOffersFound(): void;
}

export function createExchangeMonitoringController(
  options: ExchangeMonitoringControllerOptions
): ExchangeMonitoringController {
  const runtimes = new Map<string, RuleRuntime>();
  const storedSettings = options.settingsStore.load();
  let intervalMinutes = storedSettings?.intervalMinutes
    ?? DEFAULT_EXCHANGE_MONITORING_INTERVAL_MINUTES;

  options.elements.intervalInput.value = String(intervalMinutes);

  const saveSettings = (): void => {
    options.settingsStore.save({
      intervalMinutes,
      rules: Array.from(runtimes.values(), ({ rule }) => rule.toSnapshot())
    });
  };

  const updateEmptyState = (): void => {
    options.elements.emptyState.hidden = runtimes.size > 0;
  };

  const stopRuntime = (runtime: RuleRuntime): void => {
    if (!runtime.subscription || runtime.subscription.closed) {
      return;
    }

    runtime.subscription.unsubscribe();
    runtime.subscription = null;
    setExchangeMonitoringRuleActive(runtime.view, false);
    presentExchangeMonitoringRuleStopped(runtime.view);
  };

  const presentEvent = (
    runtime: RuleRuntime,
    event: ExchangeMonitoringEvent
  ): void => {
    if (event.type === 'check-started') {
      presentExchangeMonitoringRuleChecking(runtime.view);
      return;
    }

    presentExchangeMonitoringRuleCompleted(runtime.view, event, intervalMinutes);

    if (event.matchingOffers.length > 0) {
      options.onMatchingOffersFound();
    }
  };

  const startRuntime = (runtime: RuleRuntime): void => {
    if (runtime.subscription && !runtime.subscription.closed) {
      return;
    }

    setExchangeMonitoringRuleActive(runtime.view, true);

    const subscription = options.monitorExchangeRule.execute({
      rule: runtime.rule.toSnapshot(),
      getIntervalMinutes: () => intervalMinutes
    }).pipe(
      catchError(() => {
        presentExchangeMonitoringRuleError(runtime.view);
        return EMPTY;
      }),
      finalize(() => {
        runtime.subscription = null;
        setExchangeMonitoringRuleActive(runtime.view, false);
      })
    ).subscribe({
      next: (event) => {
        presentEvent(runtime, event);
      }
    });

    runtime.subscription = subscription.closed ? null : subscription;
  };

  const removeRuntime = (runtime: RuleRuntime): void => {
    stopRuntime(runtime);
    runtime.view.toggleButton.removeEventListener('click', runtime.toggleHandler);
    runtime.view.removeButton.removeEventListener('click', runtime.removeHandler);
    runtime.view.root.removeEventListener('click', runtime.acknowledgeHandler, true);
    runtime.view.root.remove();
    runtimes.delete(runtime.rule.getId());
    updateEmptyState();
    saveSettings();
  };

  const addRule = (ruleSnapshot: ExchangeMonitoringRuleSnapshot): void => {
    const rule = ExchangeMonitoringRule.create(ruleSnapshot);

    if (runtimes.has(rule.getId())) {
      throw new Error(`Duplicate exchange monitoring rule id: ${rule.getId()}.`);
    }

    const view = createExchangeMonitoringRuleView(rule.toSnapshot());
    let runtime: RuleRuntime;
    const toggleHandler = (): void => {
      if (runtime.subscription && !runtime.subscription.closed) {
        stopRuntime(runtime);
        return;
      }

      startRuntime(runtime);
    };
    const removeHandler = (): void => {
      removeRuntime(runtime);
    };
    const acknowledgeHandler = (): void => {
      clearExchangeMonitoringRuleMatches(view);
    };
    runtime = {
      rule,
      view,
      subscription: null,
      acknowledgeHandler,
      toggleHandler,
      removeHandler
    };

    view.root.addEventListener('click', runtime.acknowledgeHandler, { capture: true });
    view.toggleButton.addEventListener('click', runtime.toggleHandler);
    view.removeButton.addEventListener('click', runtime.removeHandler);
    runtimes.set(rule.getId(), runtime);
    options.elements.rulesList.append(view.root);
    updateEmptyState();
  };

  storedSettings?.rules.forEach(addRule);
  updateEmptyState();

  const intervalInputHandler = (): boolean => {
    const value = parsePositiveIntegerInput(options.elements.intervalInput);

    if (value === null) {
      options.elements.intervalInput.setCustomValidity(
        'Интервал должен быть целым числом не меньше одной минуты.'
      );
      return false;
    }

    options.elements.intervalInput.setCustomValidity('');
    intervalMinutes = value;
    saveSettings();
    return true;
  };

  const minimumPriceInputHandler = (): void => {
    const value = parseNonNegativeIntegerInput(options.elements.minimumPriceInput);
    options.elements.minimumPricePreview.hidden = value === null;

    if (value !== null) {
      renderCopperAmount(options.elements.minimumPricePreview, value);
    }
  };

  const ruleFormHandler = (event: SubmitEvent): void => {
    event.preventDefault();
    const hasValidInterval = intervalInputHandler();

    const minimumPriceCopper = parseNonNegativeIntegerInput(
      options.elements.minimumPriceInput
    );
    const qualityValue = Number(options.elements.qualitySelect.value);

    if (
      !hasValidInterval
      || !options.elements.ruleForm.reportValidity()
      || minimumPriceCopper === null
      || !isExchangeItemQuality(qualityValue)
    ) {
      return;
    }

    addRule({
      id: createRuleId(runtimes),
      title: options.elements.titleInput.value,
      quality: qualityValue,
      minimumPriceCopper
    });
    saveSettings();
    options.elements.titleInput.value = '';
    options.elements.qualitySelect.value = '-1';
    options.elements.minimumPriceInput.value = '0';
    options.elements.minimumPricePreview.hidden = false;
    renderCopperAmount(options.elements.minimumPricePreview, 0);
    options.elements.titleInput.focus();
  };

  options.elements.intervalInput.addEventListener('input', intervalInputHandler);
  options.elements.minimumPriceInput.addEventListener('input', minimumPriceInputHandler);
  options.elements.ruleForm.addEventListener('submit', ruleFormHandler);

  return {
    destroy(): void {
      options.elements.intervalInput.removeEventListener('input', intervalInputHandler);
      options.elements.minimumPriceInput.removeEventListener('input', minimumPriceInputHandler);
      options.elements.ruleForm.removeEventListener('submit', ruleFormHandler);

      runtimes.forEach((runtime) => {
        runtime.subscription?.unsubscribe();
        runtime.subscription = null;
        runtime.view.root.removeEventListener('click', runtime.acknowledgeHandler, true);
        runtime.view.toggleButton.removeEventListener('click', runtime.toggleHandler);
        runtime.view.removeButton.removeEventListener('click', runtime.removeHandler);
      });
      runtimes.clear();
    }
  };
}

function parsePositiveIntegerInput(input: HTMLInputElement): number | null {
  if (input.value.trim().length === 0) {
    return null;
  }

  const value = Number(input.value);
  return Number.isSafeInteger(value) && value >= 1 ? value : null;
}

function parseNonNegativeIntegerInput(input: HTMLInputElement): number | null {
  if (input.value.trim().length === 0) {
    return null;
  }

  const value = Number(input.value);
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function createRuleId(runtimes: ReadonlyMap<string, RuleRuntime>): string {
  let ruleId: string;

  do {
    ruleId = typeof globalThis.crypto?.randomUUID === 'function'
      ? globalThis.crypto.randomUUID()
      : `exchange-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  } while (runtimes.has(ruleId));

  return ruleId;
}
