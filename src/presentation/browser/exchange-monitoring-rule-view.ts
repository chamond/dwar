import type { ExchangeMonitoringEvent } from '../../application/events/exchange-monitoring-event';
import type { ExchangeOfferSnapshot } from '../../domain/entities/exchange-offer';
import type { ExchangeMonitoringRuleSnapshot } from '../../domain/entities/exchange-monitoring-rule';
import { getExchangeItemQualityPresentation } from './exchange-item-quality';
import { renderCopperAmount } from './exchange-money';

export interface ExchangeMonitoringRuleView {
  root: HTMLElement;
  removeButton: HTMLButtonElement;
  toggleButton: HTMLButtonElement;
  status: HTMLElement;
  results: HTMLElement;
}

export function createExchangeMonitoringRuleView(
  rule: ExchangeMonitoringRuleSnapshot
): ExchangeMonitoringRuleView {
  const root = document.createElement('article');
  root.className = 'dwar-exchange-rule';
  root.dataset.ruleId = rule.id;

  const header = document.createElement('div');
  header.className = 'dwar-exchange-rule__header';

  const title = document.createElement('strong');
  title.className = 'dwar-exchange-rule__title';
  title.textContent = rule.title.length > 0 ? rule.title : 'Любое название';

  const removeButton = document.createElement('button');
  removeButton.type = 'button';
  removeButton.className = 'dwar-exchange-rule__remove';
  removeButton.innerHTML = '&times;';
  removeButton.setAttribute('aria-label', `Удалить правило «${title.textContent}»`);
  removeButton.setAttribute('title', 'Удалить правило');
  header.append(title, removeButton);

  const settings = document.createElement('div');
  settings.className = 'dwar-exchange-rule__settings';

  const qualityPresentation = getExchangeItemQualityPresentation(rule.quality);
  const quality = document.createElement('span');
  quality.className = 'dwar-exchange-rule__quality';
  quality.style.setProperty('--dwar-exchange-quality-color', qualityPresentation.color);
  quality.textContent = `Качество: ${qualityPresentation.label}`;

  const minimumPrice = document.createElement('span');
  minimumPrice.className = 'dwar-exchange-rule__minimum';

  const minimumPriceLabel = document.createElement('span');
  minimumPriceLabel.textContent = 'Цена от';

  const minimumPriceValue = document.createElement('span');
  renderCopperAmount(minimumPriceValue, rule.minimumPriceCopper);
  minimumPrice.append(minimumPriceLabel, minimumPriceValue);
  settings.append(quality, minimumPrice);

  const toggleButton = document.createElement('button');
  toggleButton.type = 'button';
  toggleButton.className = 'dwar-action-button dwar-exchange-rule__toggle';
  toggleButton.textContent = 'Начать мониторинг';

  const status = document.createElement('div');
  status.className = 'dwar-exchange-rule__status';
  status.textContent = 'Мониторинг остановлен.';

  const results = document.createElement('div');
  results.className = 'dwar-exchange-rule__results';
  results.hidden = true;
  root.append(header, settings, toggleButton, status, results);

  return {
    root,
    removeButton,
    toggleButton,
    status,
    results
  };
}

export function setExchangeMonitoringRuleActive(
  view: ExchangeMonitoringRuleView,
  isActive: boolean
): void {
  view.toggleButton.classList.toggle('is-active', isActive);
  view.toggleButton.textContent = isActive
    ? 'Остановить мониторинг'
    : 'Начать мониторинг';
  view.toggleButton.setAttribute('aria-pressed', String(isActive));
}

export function presentExchangeMonitoringRuleChecking(
  view: ExchangeMonitoringRuleView
): void {
  view.status.classList.remove('is-error');
  view.status.textContent = 'Проверка поставлена в общую очередь…';
}

export function presentExchangeMonitoringRuleCompleted(
  view: ExchangeMonitoringRuleView,
  event: Extract<ExchangeMonitoringEvent, { type: 'check-completed' }>,
  intervalMinutes: number
): void {
  const hasMatches = event.matchingOffers.length > 0;
  view.root.classList.toggle('has-matches', hasMatches);
  view.status.classList.remove('is-error');
  view.status.textContent = hasMatches
    ? `Совпадений: ${event.matchingOffers.length} из ${event.offersFound}. Повтор через ${intervalMinutes} мин.`
    : `Совпадений нет (${event.offersFound} в выдаче). Повтор через ${intervalMinutes} мин.`;
  renderMatchingOffers(view.results, event.matchingOffers);
}

export function presentExchangeMonitoringRuleStopped(
  view: ExchangeMonitoringRuleView
): void {
  view.status.classList.remove('is-error');
  view.status.textContent = 'Мониторинг остановлен.';
}

export function presentExchangeMonitoringRuleError(
  view: ExchangeMonitoringRuleView
): void {
  view.status.classList.add('is-error');
  view.status.textContent = 'ТРЕБУЕТСЯ УЧАСТИЕ ЧЕЛОВЕКА';
}

function renderMatchingOffers(
  root: HTMLElement,
  offers: readonly ExchangeOfferSnapshot[]
): void {
  if (offers.length === 0) {
    root.hidden = true;
    root.replaceChildren();
    return;
  }

  const fragment = document.createDocumentFragment();

  offers.forEach((offer) => {
    const row = document.createElement('div');
    row.className = 'dwar-exchange-rule__result';

    const item = document.createElement('span');
    item.className = 'dwar-exchange-rule__result-item';
    item.textContent = `${offer.title} × ${offer.requestedQuantity}`;

    const price = document.createElement('span');
    price.className = 'dwar-exchange-rule__result-price';
    renderCopperAmount(price, offer.priceCopper);
    row.append(item, price);
    fragment.append(row);
  });

  root.replaceChildren(fragment);
  root.hidden = false;
}
