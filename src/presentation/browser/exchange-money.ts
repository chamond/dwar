import { splitCopperAmount } from '../../domain/services/copper-amount';

interface MoneyUnit {
  amount: number;
  image: string;
  label: string;
}

export function renderCopperAmount(target: HTMLElement, amountCopper: number): void {
  const amount = splitCopperAmount(amountCopper);
  const units: readonly MoneyUnit[] = [
    { amount: amount.gold, image: '/images/m_game3.gif', label: 'золото' },
    { amount: amount.silver, image: '/images/m_game2.gif', label: 'серебро' },
    { amount: amount.copper, image: '/images/m_game1.gif', label: 'медь' }
  ];
  const visibleUnits = units.filter((unit) => unit.amount > 0);

  if (visibleUnits.length === 0) {
    visibleUnits.push(units[2]!);
  }

  const fragment = document.createDocumentFragment();

  visibleUnits.forEach((unit) => {
    const root = document.createElement('span');
    root.className = 'dwar-exchange-money__unit';
    root.setAttribute('title', `${unit.amount} ${unit.label}`);

    const icon = document.createElement('img');
    icon.src = unit.image;
    icon.width = 11;
    icon.height = 11;
    icon.alt = '';

    const value = document.createElement('span');
    value.textContent = String(unit.amount);
    root.append(icon, value);
    fragment.append(root);
  });

  target.classList.add('dwar-exchange-money');
  target.replaceChildren(fragment);
  target.setAttribute('aria-label', formatCopperAmountText(amountCopper));
}

function formatCopperAmountText(amountCopper: number): string {
  const amount = splitCopperAmount(amountCopper);
  const parts: string[] = [];

  if (amount.gold > 0) {
    parts.push(`${amount.gold} золота`);
  }

  if (amount.silver > 0) {
    parts.push(`${amount.silver} серебра`);
  }

  if (amount.copper > 0 || parts.length === 0) {
    parts.push(`${amount.copper} меди`);
  }

  return parts.join(', ');
}
