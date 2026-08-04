export interface MinigameDownloadOptionElements {
  root: HTMLLabelElement;
  checkbox: HTMLInputElement;
  isEnabled(): boolean;
}

export function createMinigameDownloadOption(): MinigameDownloadOptionElements {
  const root = document.createElement('label');
  root.className = 'dwar-minigame-download-option';
  root.dataset.dwarPanelAction = '';

  const checkbox = document.createElement('input');
  checkbox.className = 'dwar-minigame-download-option__checkbox';
  checkbox.type = 'checkbox';

  const label = document.createElement('span');
  label.textContent = 'Скачивать PNG';

  root.append(checkbox, label);

  return {
    root,
    checkbox,
    isEnabled: () => checkbox.checked
  };
}
