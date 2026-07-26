import { getAlarmIcon } from './alarm-icon';

export interface HumanAttentionAlarmOverlayElements {
  root: HTMLElement;
  stopButton: HTMLButtonElement;
}

export function createHumanAttentionAlarmOverlay(): HumanAttentionAlarmOverlayElements {
  const root = document.createElement('div');
  root.className = 'dwar-human-attention-alarm';
  root.hidden = true;
  root.setAttribute('role', 'alertdialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-label', 'Требуется участие человека');

  const stopButton = document.createElement('button');
  stopButton.type = 'button';
  stopButton.className = 'dwar-human-attention-alarm__button';
  stopButton.dataset.dwarPanelAction = '';
  stopButton.setAttribute('aria-label', 'Отключить сирену');
  stopButton.innerHTML = `
    <span class="dwar-human-attention-alarm__icon">${getAlarmIcon()}</span>
    <strong class="dwar-human-attention-alarm__title">ТРЕВОГА</strong>
    <span class="dwar-human-attention-alarm__hint">Нажмите, чтобы отключить</span>
  `;

  root.append(stopButton);

  return {
    root,
    stopButton
  };
}
