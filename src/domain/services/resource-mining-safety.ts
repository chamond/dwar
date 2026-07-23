import type { HuntMob } from '../entities/hunt-mob';
import type { HuntResourceNode } from '../entities/hunt-resource-node';

export interface ResourceMiningSafetyOptions {
  dangerRadius: number;
}

export interface ResourceMiningSafety {
  resource: HuntResourceNode;
  isSafe: boolean;
  isAvailable: boolean;
  nearestDangerousMob: HuntMob | null;
  nearestDangerousMobDistance: number | null;
  blockingMob: HuntMob | null;
  blockingMobDistance: number | null;
}

export interface ResourceMiningSelection {
  selectedSafety: ResourceMiningSafety | null;
  candidateCount: number;
  safeCandidateCount: number;
}

interface MobDistance {
  mob: HuntMob;
  distance: number;
}

export function selectSafestResourceForMining(
  resources: readonly HuntResourceNode[],
  mobs: readonly HuntMob[],
  options: ResourceMiningSafetyOptions
): ResourceMiningSelection {
  const availableResources = resources.filter(isResourceAvailableForMining);
  const candidateSafeties = availableResources.map((resource) => assessResourceMiningSafety(resource, mobs, options));
  const safeCandidates = candidateSafeties.filter((safety) => safety.isSafe);

  return {
    selectedSafety: safeCandidates.reduce<ResourceMiningSafety | null>((best, current) => {
      if (!best) {
        return current;
      }

      return compareResourceSafety(current, best) < 0 ? current : best;
    }, null),
    candidateCount: candidateSafeties.length,
    safeCandidateCount: safeCandidates.length
  };
}

export function assessResourceMiningSafety(
  resource: HuntResourceNode,
  mobs: readonly HuntMob[],
  options: ResourceMiningSafetyOptions
): ResourceMiningSafety {
  const dangerousDistances = mobs
    .filter((mob) => mob.getAggressionLevel() > 0)
    .map((mob): MobDistance => {
      return {
        mob,
        distance: resource.getPosition().distanceTo(mob.getPosition())
      };
    })
    .sort((left, right) => left.distance - right.distance);
  const nearestDangerousMob = dangerousDistances[0] ?? null;
  const blockingMob = dangerousDistances.find(({ distance }) => distance <= options.dangerRadius) ?? null;
  const isAvailable = isResourceAvailableForMining(resource);

  return {
    resource,
    isSafe: isAvailable && blockingMob === null,
    isAvailable,
    nearestDangerousMob: nearestDangerousMob?.mob ?? null,
    nearestDangerousMobDistance: nearestDangerousMob?.distance ?? null,
    blockingMob: blockingMob?.mob ?? null,
    blockingMobDistance: blockingMob?.distance ?? null
  };
}

function isResourceAvailableForMining(resource: HuntResourceNode): boolean {
  return !resource.isBeingFarmed();
}

function compareResourceSafety(left: ResourceMiningSafety, right: ResourceMiningSafety): number {
  const leftDistance = left.nearestDangerousMobDistance ?? Number.POSITIVE_INFINITY;
  const rightDistance = right.nearestDangerousMobDistance ?? Number.POSITIVE_INFINITY;

  if (leftDistance !== rightDistance) {
    return rightDistance - leftDistance;
  }

  return compareServerNumbers(left.resource.getServerNumber(), right.resource.getServerNumber());
}

function compareServerNumbers(left: string, right: string): number {
  const leftNumber = Number(left);
  const rightNumber = Number(right);

  if (Number.isInteger(leftNumber) && Number.isInteger(rightNumber) && leftNumber !== rightNumber) {
    return leftNumber - rightNumber;
  }

  return left.localeCompare(right);
}
