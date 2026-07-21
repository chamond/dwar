import { PANEL_MARGIN } from './bot-widget-constants';

export function positionPanelNearLauncher(panel: HTMLElement, launcher: HTMLElement): void {
  const launcherRect = launcher.getBoundingClientRect();
  const panelRect = panel.getBoundingClientRect();
  const left = launcherRect.right - panelRect.width;
  const top = launcherRect.top - panelRect.height - PANEL_MARGIN;

  if (top >= PANEL_MARGIN) {
    movePanel(panel, left, top);
    return;
  }

  movePanel(panel, left, launcherRect.bottom + PANEL_MARGIN);
}

export function keepPanelInViewport(panel: HTMLElement): void {
  const panelRect = panel.getBoundingClientRect();
  movePanel(panel, panelRect.left, panelRect.top);
}

export function movePanel(panel: HTMLElement, left: number, top: number): void {
  const panelRect = panel.getBoundingClientRect();
  const maxLeft = window.innerWidth - panelRect.width - PANEL_MARGIN;
  const maxTop = window.innerHeight - panelRect.height - PANEL_MARGIN;

  panel.style.left = `${clamp(left, PANEL_MARGIN, maxLeft)}px`;
  panel.style.top = `${clamp(top, PANEL_MARGIN, maxTop)}px`;
}

function clamp(value: number, min: number, max: number): number {
  if (max < min) {
    return min;
  }

  return Math.min(Math.max(value, min), max);
}

