import { getPickaxeIcon } from './pickaxe-icon';

export function createLauncherButton(): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'dwar-launcher';
  button.setAttribute('aria-label', 'Открыть интерфейс DWAR Bot');
  button.setAttribute('aria-expanded', 'false');
  button.innerHTML = getPickaxeIcon();

  return button;
}

