import { PANEL_MARGIN } from './bot-widget-constants';
import {
  keepFixedElementInViewport,
  moveFixedElement,
  type FixedElementPosition
} from './fixed-element-position';

export function positionPanelNearLauncher(
  panel: HTMLElement,
  launcher: HTMLElement
): FixedElementPosition {
  const launcherRect = launcher.getBoundingClientRect();
  const panelRect = panel.getBoundingClientRect();
  const left = launcherRect.right - panelRect.width;
  const top = launcherRect.top - panelRect.height - PANEL_MARGIN;

  if (top >= PANEL_MARGIN) {
    return movePanel(panel, left, top);
  }

  return movePanel(panel, left, launcherRect.bottom + PANEL_MARGIN);
}

export function keepPanelInViewport(panel: HTMLElement): FixedElementPosition {
  return keepFixedElementInViewport(panel);
}

export function movePanel(
  panel: HTMLElement,
  left: number,
  top: number
): FixedElementPosition {
  return moveFixedElement(panel, left, top, PANEL_MARGIN);
}
