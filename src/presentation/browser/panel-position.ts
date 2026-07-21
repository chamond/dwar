import { PANEL_MARGIN } from './bot-widget-constants';
import { keepFixedElementInViewport, moveFixedElement } from './fixed-element-position';

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
  keepFixedElementInViewport(panel);
}

export function movePanel(panel: HTMLElement, left: number, top: number): void {
  moveFixedElement(panel, left, top, PANEL_MARGIN);
}
