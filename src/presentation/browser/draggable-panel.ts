import { attachDraggableElement } from './draggable-element';

export interface DraggablePanelOptions {
  panel: HTMLElement;
  handle: HTMLElement;
  ignoreSelector: string;
}

export function attachDraggablePanel(options: DraggablePanelOptions): void {
  attachDraggableElement({
    element: options.panel,
    handle: options.handle,
    ignoreSelector: options.ignoreSelector,
    draggingClassName: 'is-dragging'
  });
}
