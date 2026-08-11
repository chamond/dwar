import { EXCHANGE_ITEM_QUALITY_OPTIONS } from './exchange-item-quality';
import { renderCopperAmount } from './exchange-money';

export const DEFAULT_EXCHANGE_MONITORING_INTERVAL_MINUTES = 5;

export interface ExchangeMonitoringTabElements {
  root: HTMLElement;
  intervalInput: HTMLInputElement;
  ruleForm: HTMLFormElement;
  titleInput: HTMLInputElement;
  qualitySelect: HTMLSelectElement;
  minimumPriceInput: HTMLInputElement;
  minimumPricePreview: HTMLElement;
  addRuleButton: HTMLButtonElement;
  rulesList: HTMLElement;
  emptyState: HTMLElement;
}

export function createExchangeMonitoringTab(): ExchangeMonitoringTabElements {
  const root = document.createElement('div');
  root.className = 'dwar-exchange-monitoring';

  const settings = document.createElement('div');
  settings.className = 'dwar-exchange-monitoring__settings';

  const intervalField = document.createElement('label');
  intervalField.className = 'dwar-exchange-monitoring__interval';

  const intervalLabel = document.createElement('span');
  intervalLabel.textContent = 'Интервал запросов';

  const intervalControl = document.createElement('span');
  intervalControl.className = 'dwar-exchange-monitoring__interval-control';

  const intervalInput = document.createElement('input');
  intervalInput.type = 'number';
  intervalInput.className = 'dwar-exchange-monitoring__input';
  intervalInput.min = '1';
  intervalInput.step = '1';
  intervalInput.required = true;
  intervalInput.value = String(DEFAULT_EXCHANGE_MONITORING_INTERVAL_MINUTES);
  intervalInput.setAttribute('aria-label', 'Интервал запросов в минутах');

  const intervalUnit = document.createElement('span');
  intervalUnit.textContent = 'мин';
  intervalControl.append(intervalInput, intervalUnit);
  intervalField.append(intervalLabel, intervalControl);

  const ruleForm = document.createElement('form');
  ruleForm.className = 'dwar-exchange-rule-form';

  const formTitle = document.createElement('div');
  formTitle.className = 'dwar-exchange-rule-form__title';
  formTitle.textContent = 'Новое правило';

  const titleInput = document.createElement('input');
  titleInput.type = 'text';
  titleInput.className = 'dwar-exchange-monitoring__input';
  titleInput.maxLength = 60;
  titleInput.placeholder = 'Например, пыль';
  titleInput.setAttribute('aria-label', 'Название предмета');

  const qualitySelect = document.createElement('select');
  qualitySelect.className = 'dwar-exchange-monitoring__input';
  qualitySelect.setAttribute('aria-label', 'Качество предмета');

  EXCHANGE_ITEM_QUALITY_OPTIONS.forEach((quality) => {
    const option = document.createElement('option');
    option.value = String(quality.value);
    option.textContent = quality.label;
    option.style.color = quality.color;
    qualitySelect.append(option);
  });

  const minimumPriceInput = document.createElement('input');
  minimumPriceInput.type = 'number';
  minimumPriceInput.className = 'dwar-exchange-monitoring__input';
  minimumPriceInput.min = '0';
  minimumPriceInput.step = '1';
  minimumPriceInput.required = true;
  minimumPriceInput.value = '0';
  minimumPriceInput.setAttribute('aria-label', 'Минимальная цена в меди');

  const minimumPricePreview = document.createElement('span');
  minimumPricePreview.className = 'dwar-exchange-rule-form__price-preview';
  renderCopperAmount(minimumPricePreview, 0);

  const priceControl = document.createElement('span');
  priceControl.className = 'dwar-exchange-rule-form__price-control';
  priceControl.append(minimumPriceInput, minimumPricePreview);

  const addRuleButton = document.createElement('button');
  addRuleButton.type = 'submit';
  addRuleButton.className = 'dwar-action-button dwar-exchange-rule-form__submit';
  addRuleButton.textContent = 'Добавить';

  ruleForm.append(
    formTitle,
    createField('Название', titleInput),
    createField('Качество', qualitySelect),
    createField('Минимальная цена, медь', priceControl),
    addRuleButton
  );
  settings.append(intervalField, ruleForm);

  const rulesList = document.createElement('div');
  rulesList.className = 'dwar-exchange-rules';
  rulesList.setAttribute('aria-label', 'Правила мониторинга биржи');

  const emptyState = document.createElement('div');
  emptyState.className = 'dwar-exchange-rules__empty';
  emptyState.textContent = 'Правила мониторинга ещё не созданы.';
  rulesList.append(emptyState);
  root.append(settings, rulesList);

  return {
    root,
    intervalInput,
    ruleForm,
    titleInput,
    qualitySelect,
    minimumPriceInput,
    minimumPricePreview,
    addRuleButton,
    rulesList,
    emptyState
  };
}

function createField(
  labelText: string,
  control: HTMLElement
): HTMLLabelElement {
  const field = document.createElement('label');
  field.className = 'dwar-exchange-rule-form__field';

  const label = document.createElement('span');
  label.className = 'dwar-exchange-rule-form__label';
  label.textContent = labelText;
  field.append(label, control);

  return field;
}
