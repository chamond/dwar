import type { PanelSize, PanelSizeStore } from '../../application/ports/panel-size-store';
import { PANEL_MARGIN } from './bot-widget-constants';

const MIN_PANEL_WIDTH_PX = 296;
const MIN_PANEL_HEIGHT_PX = 240;
const KEYBOARD_RESIZE_STEP_PX = 16;

interface ResizeState {
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startWidth: number;
  startHeight: number;
  didResize: boolean;
}

export interface ResizablePanelOptions {
  panel: HTMLElement;
  handle: HTMLElement;
  sizeStore: PanelSizeStore;
  onResize?: (size: PanelSize) => void;
}

interface ResizeDelta {
  width: number;
  height: number;
}

export function restorePanelSize(panel: HTMLElement, sizeStore: PanelSizeStore): void {
  const savedSize = sizeStore.load();

  if (!savedSize) {
    return;
  }

  applyPanelSize(panel, savedSize.width, savedSize.height);
}

export function keepPanelSizeInViewport(panel: HTMLElement): PanelSize {
  const size = readPanelSize(panel);

  return applyPanelSize(panel, size.width, size.height);
}

export function attachResizablePanel(options: ResizablePanelOptions): void {
  let resizeState: ResizeState | null = null;

  options.handle.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) {
      return;
    }

    const panelRect = options.panel.getBoundingClientRect();
    resizeState = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startWidth: panelRect.width,
      startHeight: panelRect.height,
      didResize: false
    };

    options.panel.classList.add('is-resizing');
    options.handle.setPointerCapture(event.pointerId);
    event.preventDefault();
  });

  options.handle.addEventListener('pointermove', (event) => {
    if (!resizeState || resizeState.pointerId !== event.pointerId) {
      return;
    }

    const nextSize = applyPanelSize(
      options.panel,
      resizeState.startWidth + event.clientX - resizeState.startClientX,
      resizeState.startHeight + event.clientY - resizeState.startClientY
    );

    resizeState.didResize = true;
    options.onResize?.(nextSize);
    event.preventDefault();
  });

  const stopResizing = (event: PointerEvent): void => {
    if (!resizeState || resizeState.pointerId !== event.pointerId) {
      return;
    }

    const didResize = resizeState.didResize;
    resizeState = null;
    options.panel.classList.remove('is-resizing');

    if (options.handle.hasPointerCapture(event.pointerId)) {
      options.handle.releasePointerCapture(event.pointerId);
    }

    if (didResize) {
      options.sizeStore.save(readPanelSize(options.panel));
    }
  };

  options.handle.addEventListener('pointerup', stopResizing);
  options.handle.addEventListener('pointercancel', stopResizing);
  options.handle.addEventListener('keydown', (event) => {
    const delta = getKeyboardResizeDelta(event);

    if (!delta) {
      return;
    }

    const step = event.shiftKey ? KEYBOARD_RESIZE_STEP_PX * 3 : KEYBOARD_RESIZE_STEP_PX;
    const currentSize = readPanelSize(options.panel);
    const nextSize = applyPanelSize(
      options.panel,
      currentSize.width + delta.width * step,
      currentSize.height + delta.height * step
    );

    options.onResize?.(nextSize);
    options.sizeStore.save(nextSize);
    event.preventDefault();
  });
}

function applyPanelSize(panel: HTMLElement, width: number, height: number): PanelSize {
  const nextSize = clampPanelSize(panel, {
    width,
    height
  });

  panel.style.width = `${Math.round(nextSize.width)}px`;
  panel.style.height = `${Math.round(nextSize.height)}px`;

  return nextSize;
}

function readPanelSize(panel: HTMLElement): PanelSize {
  const panelRect = panel.getBoundingClientRect();

  return {
    width: panelRect.width,
    height: panelRect.height
  };
}

function clampPanelSize(panel: HTMLElement, size: PanelSize): PanelSize {
  const panelRect = panel.getBoundingClientRect();
  const left = panelRect.width > 0 ? panelRect.left : PANEL_MARGIN;
  const top = panelRect.height > 0 ? panelRect.top : PANEL_MARGIN;
  const maxWidth = Math.max(MIN_PANEL_WIDTH_PX, window.innerWidth - left - PANEL_MARGIN);
  const maxHeight = Math.max(MIN_PANEL_HEIGHT_PX, window.innerHeight - top - PANEL_MARGIN);

  return {
    width: clamp(size.width, MIN_PANEL_WIDTH_PX, maxWidth),
    height: clamp(size.height, MIN_PANEL_HEIGHT_PX, maxHeight)
  };
}

function getKeyboardResizeDelta(event: KeyboardEvent): ResizeDelta | null {
  switch (event.key) {
    case 'ArrowRight':
      return { width: 1, height: 0 };
    case 'ArrowLeft':
      return { width: -1, height: 0 };
    case 'ArrowDown':
      return { width: 0, height: 1 };
    case 'ArrowUp':
      return { width: 0, height: -1 };
    default:
      return null;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
