import { PANEL_MARGIN } from './bot-widget-constants';

export interface FixedElementPosition {
  left: number;
  top: number;
}

export function moveFixedElement(
  element: HTMLElement,
  left: number,
  top: number,
  margin = PANEL_MARGIN
): FixedElementPosition {
  const elementRect = element.getBoundingClientRect();
  const maxLeft = window.innerWidth - elementRect.width - margin;
  const maxTop = window.innerHeight - elementRect.height - margin;
  const position = {
    left: clamp(left, margin, maxLeft),
    top: clamp(top, margin, maxTop)
  };

  element.style.left = `${position.left}px`;
  element.style.top = `${position.top}px`;
  element.style.right = 'auto';
  element.style.bottom = 'auto';

  return position;
}

export function keepFixedElementInViewport(element: HTMLElement, margin = PANEL_MARGIN): FixedElementPosition {
  const elementRect = element.getBoundingClientRect();

  return moveFixedElement(element, elementRect.left, elementRect.top, margin);
}

export function readFixedElementPosition(element: HTMLElement): FixedElementPosition {
  const elementRect = element.getBoundingClientRect();

  return {
    left: elementRect.left,
    top: elementRect.top
  };
}

function clamp(value: number, min: number, max: number): number {
  if (max < min) {
    return min;
  }

  return Math.min(Math.max(value, min), max);
}
