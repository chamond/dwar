import type { LauncherPositionStore } from '../../application/ports/launcher-position-store';
import { attachDraggableElement } from './draggable-element';
import { keepFixedElementInViewport, moveFixedElement } from './fixed-element-position';

export interface DraggableLauncherOptions {
  launcher: HTMLElement;
  positionStore: LauncherPositionStore;
  onMoved: () => void;
}

export interface DraggableLauncherController {
  consumeDragClick(): boolean;
  keepInViewport(): void;
}

export function restoreLauncherPosition(launcher: HTMLElement, positionStore: LauncherPositionStore): void {
  const savedPosition = positionStore.load();

  if (!savedPosition) {
    return;
  }

  positionStore.save(moveFixedElement(launcher, savedPosition.left, savedPosition.top));
}

export function attachDraggableLauncher(options: DraggableLauncherOptions): DraggableLauncherController {
  let suppressNextClick = false;

  attachDraggableElement({
    element: options.launcher,
    handle: options.launcher,
    draggingClassName: 'is-dragging',
    preventDefaultOnPointerDown: false,
    onDragEnd: ({ didMove, position }) => {
      if (!didMove) {
        return;
      }

      suppressNextClick = true;
      options.positionStore.save(position);
      options.onMoved();

      window.setTimeout(() => {
        suppressNextClick = false;
      }, 0);
    }
  });

  return {
    consumeDragClick(): boolean {
      if (!suppressNextClick) {
        return false;
      }

      suppressNextClick = false;

      return true;
    },
    keepInViewport(): void {
      options.positionStore.save(keepFixedElementInViewport(options.launcher));
    }
  };
}
