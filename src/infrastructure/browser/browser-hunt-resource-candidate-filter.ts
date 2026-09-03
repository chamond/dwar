import type { HuntResourceCandidateFilter } from '../../application/ports/hunt-resource-candidate-filter';
import type { HuntResourceNode } from '../../domain/entities/hunt-resource-node';
import { findInAccessibleWindowTree } from './accessible-window-tree';
import { readDwarHuntCanvasResourceServerNumbers } from './dwar-hunt-canvas-resources';

export class BrowserHuntResourceCandidateFilter implements HuntResourceCandidateFilter {
  filter(resources: readonly HuntResourceNode[]): readonly HuntResourceNode[] {
    const canvasResourceServerNumbers = findInAccessibleWindowTree(window, (candidate) => {
      let canvasValue: unknown;

      try {
        canvasValue = (candidate as unknown as Record<string, unknown>).canvas;
      } catch {
        return null;
      }

      return readDwarHuntCanvasResourceServerNumbers(canvasValue);
    });

    if (canvasResourceServerNumbers === null) {
      return resources;
    }

    return resources.filter((resource) => {
      return canvasResourceServerNumbers.has(resource.getServerNumber());
    });
  }
}
