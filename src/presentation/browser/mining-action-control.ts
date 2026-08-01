import { getPickaxeIcon } from './pickaxe-icon';

export type MiningActionState = 'idle' | 'active' | 'cancelling';

export interface MiningActionControl {
  root: HTMLElement;
  mainButton: HTMLButtonElement;
  menuToggleButton: HTMLButtonElement;
  forceStopButton: HTMLButtonElement;
  closeMenu(): void;
  setState(state: MiningActionState): void;
}

const MENU_ID = 'dwar-mining-action-menu';

export function createMiningActionControl(): MiningActionControl {
  const root = document.createElement('div');
  root.className = 'dwar-mining-action';

  const mainButton = document.createElement('button');
  mainButton.type = 'button';
  mainButton.className = 'dwar-action-button dwar-mining-button';

  const menuToggleButton = document.createElement('button');
  menuToggleButton.type = 'button';
  menuToggleButton.className = 'dwar-mining-action__menu-toggle';
  menuToggleButton.setAttribute('aria-label', 'Открыть меню остановки добычи');
  menuToggleButton.setAttribute('aria-haspopup', 'menu');
  menuToggleButton.setAttribute('aria-expanded', 'false');
  menuToggleButton.setAttribute('aria-controls', MENU_ID);
  menuToggleButton.innerHTML = '<span aria-hidden="true">▾</span>';

  const menu = document.createElement('div');
  menu.id = MENU_ID;
  menu.className = 'dwar-mining-action__menu';
  menu.setAttribute('role', 'menu');
  menu.hidden = true;

  const forceStopButton = document.createElement('button');
  forceStopButton.type = 'button';
  forceStopButton.className = 'dwar-mining-action__force-stop';
  forceStopButton.setAttribute('role', 'menuitem');
  forceStopButton.textContent = 'Остановить принудительно';

  menu.append(forceStopButton);
  root.append(mainButton, menuToggleButton, menu);

  const setMenuOpen = (isOpen: boolean): void => {
    menu.hidden = !isOpen;
    menuToggleButton.setAttribute('aria-expanded', String(isOpen));
  };

  const setState = (state: MiningActionState): void => {
    const isActive = state === 'active';
    const isCancelling = state === 'cancelling';

    root.classList.toggle('is-active', isActive);
    mainButton.classList.toggle('is-active', isActive);
    mainButton.disabled = isCancelling;
    mainButton.setAttribute(
      'aria-label',
      isActive ? 'Остановить добычу' : isCancelling ? 'Отмена добычи' : 'Начать добычу'
    );
    mainButton.innerHTML = `${getPickaxeIcon()}<span>${isActive ? 'Стоп' : isCancelling ? 'Отмена…' : 'Добыча'}</span>`;
    menuToggleButton.hidden = !isActive;
    menuToggleButton.disabled = !isActive;
    forceStopButton.disabled = !isActive;

    if (!isActive) {
      setMenuOpen(false);
    }
  };

  menuToggleButton.addEventListener('click', () => {
    setMenuOpen(menu.hidden);
  });

  root.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !menu.hidden) {
      setMenuOpen(false);
      menuToggleButton.focus();
    }
  });

  setState('idle');

  return {
    root,
    mainButton,
    menuToggleButton,
    forceStopButton,
    closeMenu(): void {
      setMenuOpen(false);
    },
    setState
  };
}
