import { movePanel } from './panel-position';

interface DragState {
  pointerId: number;
  offsetX: number;
  offsetY: number;
}

export interface DraggablePanelOptions {
  panel: HTMLElement;
  handle: HTMLElement;
  ignoreSelector: string;
}

export function attachDraggablePanel(options: DraggablePanelOptions): void {
  let dragState: DragState | null = null;

  options.handle.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || shouldIgnoreDrag(event, options.ignoreSelector)) {
      return;
    }

    const panelRect = options.panel.getBoundingClientRect();
    dragState = {
      pointerId: event.pointerId,
      offsetX: event.clientX - panelRect.left,
      offsetY: event.clientY - panelRect.top
    };

    options.panel.classList.add('is-dragging');
    options.handle.setPointerCapture(event.pointerId);
    event.preventDefault();
  });

  options.handle.addEventListener('pointermove', (event) => {
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    movePanel(options.panel, event.clientX - dragState.offsetX, event.clientY - dragState.offsetY);
  });

  const stopDragging = (event: PointerEvent): void => {
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    dragState = null;
    options.panel.classList.remove('is-dragging');

    if (options.handle.hasPointerCapture(event.pointerId)) {
      options.handle.releasePointerCapture(event.pointerId);
    }
  };

  options.handle.addEventListener('pointerup', stopDragging);
  options.handle.addEventListener('pointercancel', stopDragging);
}

function shouldIgnoreDrag(event: PointerEvent, selector: string): boolean {
  return event.target instanceof Element && event.target.closest(selector) !== null;
}

