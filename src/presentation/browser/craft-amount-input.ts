const DEFAULT_CRAFT_AMOUNT = 10;
const MIN_CRAFT_AMOUNT = 1;
const MAX_CRAFT_AMOUNT = 10;

export interface CraftAmountInputElements {
  root: HTMLElement;
  input: HTMLInputElement;
  getAmount(): number;
}

export interface CraftAmountInputOptions {
  defaultAmount?: number | undefined;
  maxAmount?: number | undefined;
  minAmount?: number | undefined;
}

export function createCraftAmountInput(options: CraftAmountInputOptions = {}): CraftAmountInputElements {
  const minAmount = options.minAmount ?? MIN_CRAFT_AMOUNT;
  const maxAmount = options.maxAmount ?? MAX_CRAFT_AMOUNT;
  const defaultAmount = normalizeAmount(options.defaultAmount ?? DEFAULT_CRAFT_AMOUNT, minAmount, maxAmount);

  const root = document.createElement('label');
  root.className = 'dwar-craft-amount';
  root.setAttribute('title', 'Количество за запрос');

  const input = document.createElement('input');
  input.type = 'number';
  input.className = 'dwar-craft-amount__input';
  input.name = 'amount';
  input.min = String(minAmount);
  input.max = String(maxAmount);
  input.step = '1';
  input.value = String(defaultAmount);
  input.inputMode = 'numeric';
  input.setAttribute('aria-label', 'Количество крафта за запрос');

  const unit = document.createElement('span');
  unit.className = 'dwar-craft-amount__unit';
  unit.textContent = 'шт';

  root.append(input, unit);

  const syncInputValue = (): number => {
    const amount = normalizeAmount(Number(input.value), minAmount, maxAmount);
    input.value = String(amount);

    return amount;
  };

  input.addEventListener('change', syncInputValue);
  input.addEventListener('blur', syncInputValue);

  return {
    root,
    input,
    getAmount(): number {
      return syncInputValue();
    }
  };
}

function normalizeAmount(amount: number, minAmount: number, maxAmount: number): number {
  if (!Number.isFinite(amount)) {
    return maxAmount;
  }

  return Math.max(minAmount, Math.min(Math.trunc(amount), maxAmount));
}
