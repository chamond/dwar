import { getVolumeIcon } from './volume-icon';

const MAX_VOLUME = 1;
const DEFAULT_VOLUME = MAX_VOLUME;
const MIN_AUDIBLE_VOLUME = 0.01;

export interface VolumeControlElements {
  root: HTMLElement;
  toggleButton: HTMLButtonElement;
  slider: HTMLInputElement;
}

export interface VolumeControlOptions {
  initialVolume?: number | undefined;
  onVolumeChange?: ((volume: number) => void) | undefined;
}

export function createVolumeControl(options: VolumeControlOptions = {}): VolumeControlElements {
  const root = document.createElement('div');
  root.className = 'dwar-volume-control';
  root.dataset.dwarPanelAction = '';

  const toggleButton = document.createElement('button');
  toggleButton.type = 'button';
  toggleButton.className = 'dwar-panel__icon-button dwar-volume-control__toggle';
  toggleButton.innerHTML = getVolumeIcon();

  const sliderPopover = document.createElement('div');
  sliderPopover.className = 'dwar-volume-control__popover';

  const slider = document.createElement('input');
  slider.className = 'dwar-volume-control__slider';
  slider.type = 'range';
  slider.min = '0';
  slider.max = '1';
  slider.step = '0.01';
  slider.setAttribute('orient', 'vertical');
  slider.setAttribute('aria-label', 'Громкость звуков');

  let volume = clampVolume(options.initialVolume ?? DEFAULT_VOLUME);
  let lastAudibleVolume = volume >= MIN_AUDIBLE_VOLUME ? volume : DEFAULT_VOLUME;

  const applyVolume = (nextVolume: number): void => {
    volume = clampVolume(nextVolume);

    if (volume >= MIN_AUDIBLE_VOLUME) {
      lastAudibleVolume = volume;
    }

    updateVolumeControl(root, toggleButton, slider, volume);
    options.onVolumeChange?.(volume);
  };

  toggleButton.addEventListener('click', () => {
    applyVolume(volume >= MIN_AUDIBLE_VOLUME ? 0 : lastAudibleVolume);
  });

  slider.addEventListener('input', () => {
    applyVolume(Number(slider.value));
  });

  sliderPopover.append(slider);
  root.append(toggleButton, sliderPopover);
  updateVolumeControl(root, toggleButton, slider, volume);

  return {
    root,
    toggleButton,
    slider
  };
}

function updateVolumeControl(
  root: HTMLElement,
  toggleButton: HTMLButtonElement,
  slider: HTMLInputElement,
  volume: number
): void {
  const percentage = Math.round(volume * 100);
  const isMuted = volume < MIN_AUDIBLE_VOLUME;
  const level = isMuted ? 'muted' : volume < 0.5 ? 'low' : 'high';

  root.dataset.volumeLevel = level;
  toggleButton.setAttribute('aria-label', isMuted ? 'Включить звуки' : 'Выключить звуки');
  toggleButton.setAttribute('aria-pressed', String(isMuted));
  toggleButton.setAttribute(
    'title',
    isMuted ? 'Включить звук' : `Выключить звук (громкость ${percentage}%)`
  );
  slider.value = String(volume);
  slider.setAttribute('aria-valuetext', `${percentage}%`);
  slider.style.setProperty('--dwar-volume-progress', `${percentage}%`);
}

function clampVolume(volume: number): number {
  if (!Number.isFinite(volume)) {
    return DEFAULT_VOLUME;
  }

  return Math.min(MAX_VOLUME, Math.max(0, volume));
}
