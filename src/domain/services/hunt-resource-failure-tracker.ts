import type { HuntResourceNode } from '../entities/hunt-resource-node';

const FAILURE_LIMIT = 2;

export class HuntResourceFailureTracker {
  private readonly failureCounts = new Map<string, number>();

  synchronizeVisibleResources(resources: readonly HuntResourceNode[]): void {
    const visibleResourceKeys = new Set(resources.map(createResourceKey));

    for (const resourceKey of this.failureCounts.keys()) {
      if (!visibleResourceKeys.has(resourceKey)) {
        this.failureCounts.delete(resourceKey);
      }
    }
  }

  recordFailure(resource: HuntResourceNode): void {
    const resourceKey = createResourceKey(resource);
    const failureCount = this.failureCounts.get(resourceKey) ?? 0;

    this.failureCounts.set(resourceKey, Math.min(failureCount + 1, FAILURE_LIMIT));
  }

  isBlocked(resource: HuntResourceNode): boolean {
    return (this.failureCounts.get(createResourceKey(resource)) ?? 0) >= FAILURE_LIMIT;
  }
}

function createResourceKey(resource: HuntResourceNode): string {
  const position = resource.getPosition();

  return `${resource.getServerNumber()}:${position.getX()}:${position.getY()}`;
}
