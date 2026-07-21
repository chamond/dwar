import {
  moveFixedElement,
  readFixedElementPosition,
  type FixedElementPosition
} from './fixed-element-position';

const DRAG_MOVE_THRESHOLD_PX = 3;

interface DragState {
  pointerId: number;
  offsetX: number;
  offsetY: number;
  startClientX: number;
  startClientY: number;
  didMove: boolean;
}

export interface DragEndDetails {
  didMove: boolean;
  position: FixedElementPosition;
}

export interface DraggableElementOptions {
  element: HTMLElement;
  handle: HTMLElement;
  ignoreSelector?: string;
  draggingClassName?: string;
  preventDefaultOnPointerDown?: boolean;
  onDragEnd?: (details: DragEndDetails) => void;
}

export function attachDraggableElement(options: DraggableElementOptions): void {
  let dragState: DragState | null = null;

  options.handle.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || shouldIgnoreDrag(event, options.ignoreSelector)) {
      return;
    }

    const elementRect = options.element.getBoundingClientRect();
    dragState = {
      pointerId: event.pointerId,
      offsetX: event.clientX - elementRect.left,
      offsetY: event.clientY - elementRect.top,
      startClientX: event.clientX,
      startClientY: event.clientY,
      didMove: false
    };

    options.element.classList.add(options.draggingClassName ?? 'is-dragging');
    options.handle.setPointerCapture(event.pointerId);

    if (options.preventDefaultOnPointerDown ?? true) {
      event.preventDefault();
    }
  });

  options.handle.addEventListener('pointermove', (event) => {
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    if (!dragState.didMove && !hasMovedEnough(event, dragState)) {
      return;
    }

    dragState.didMove = true;
    moveFixedElement(options.element, event.clientX - dragState.offsetX, event.clientY - dragState.offsetY);
    event.preventDefault();
  });

  const stopDragging = (event: PointerEvent): void => {
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    const didMove = dragState.didMove;
    const position = readFixedElementPosition(options.element);
    dragState = null;
    options.element.classList.remove(options.draggingClassName ?? 'is-dragging');

    if (options.handle.hasPointerCapture(event.pointerId)) {
      options.handle.releasePointerCapture(event.pointerId);
    }

    options.onDragEnd?.({
      didMove,
      position
    });
  };

  options.handle.addEventListener('pointerup', stopDragging);
  options.handle.addEventListener('pointercancel', stopDragging);
}

function shouldIgnoreDrag(event: PointerEvent, selector: string | undefined): boolean {
  if (!selector || !(event.target instanceof Element)) {
    return false;
  }

  return event.target.closest(selector) !== null;
}

function hasMovedEnough(event: PointerEvent, dragState: DragState): boolean {
  return (
    Math.abs(event.clientX - dragState.startClientX) >= DRAG_MOVE_THRESHOLD_PX ||
    Math.abs(event.clientY - dragState.startClientY) >= DRAG_MOVE_THRESHOLD_PX
  );
}
