import type { PanelPositionStore } from '../../application/ports/panel-position-store';
import { attachDraggableElement } from './draggable-element';
import { moveFixedElement } from './fixed-element-position';

export interface DraggablePanelOptions {
  panel: HTMLElement;
  handle: HTMLElement;
  ignoreSelector: string;
  positionStore: PanelPositionStore;
}

export function restorePanelPosition(
  panel: HTMLElement,
  positionStore: PanelPositionStore
): boolean {
  const savedPosition = positionStore.load();

  if (!savedPosition) {
    return false;
  }

  positionStore.save(moveFixedElement(panel, savedPosition.left, savedPosition.top));

  return true;
}

export function attachDraggablePanel(options: DraggablePanelOptions): void {
  attachDraggableElement({
    element: options.panel,
    handle: options.handle,
    ignoreSelector: options.ignoreSelector,
    draggingClassName: 'is-dragging',
    onDragEnd: ({ didMove, position }) => {
      if (didMove) {
        options.positionStore.save(position);
      }
    }
  });
}
