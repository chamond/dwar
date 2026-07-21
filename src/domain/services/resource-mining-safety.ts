import type { HuntMob } from '../entities/hunt-mob';
import type { HuntResourceNode } from '../entities/hunt-resource-node';

const AWARENESS_RADIUS_MULTIPLIER = 10;

export interface ResourceMiningSafetyOptions {
  dangerRadius: number;
}

export interface ResourceMiningSafety {
  resource: HuntResourceNode;
  isSafe: boolean;
  isAvailable: boolean;
  calmnessPercent: number;
  safetyPercent: number;
  nearestDangerousMob: HuntMob | null;
  nearestDangerousMobDistance: number | null;
  blockingMob: HuntMob | null;
  blockingMobDistance: number | null;
}

export interface ResourceMiningSelection {
  selectedSafety: ResourceMiningSafety | null;
  candidateCount: number;
  availableCandidateCount: number;
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
  const candidateSafeties = resources.map((resource) => assessResourceMiningSafety(resource, mobs, options));
  const availableCandidateCount = candidateSafeties.filter((safety) => safety.isAvailable).length;
  const safeCandidates = candidateSafeties.filter((safety) => safety.isSafe);

  return {
    selectedSafety: safeCandidates.reduce<ResourceMiningSafety | null>((best, current) => {
      if (!best) {
        return current;
      }

      return compareResourceSafety(current, best) < 0 ? current : best;
    }, null),
    candidateCount: candidateSafeties.length,
    availableCandidateCount,
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
  const isAvailable = !resource.isBeingFarmed();

  return {
    resource,
    isSafe: isAvailable && blockingMob === null,
    isAvailable,
    calmnessPercent: calculateCalmnessPercent(dangerousDistances, options.dangerRadius),
    safetyPercent: calculateSafetyPercent(nearestDangerousMob?.distance ?? null, options.dangerRadius, isAvailable),
    nearestDangerousMob: nearestDangerousMob?.mob ?? null,
    nearestDangerousMobDistance: nearestDangerousMob?.distance ?? null,
    blockingMob: blockingMob?.mob ?? null,
    blockingMobDistance: blockingMob?.distance ?? null
  };
}

function calculateSafetyPercent(
  nearestDangerousMobDistance: number | null,
  dangerRadius: number,
  isAvailable: boolean
): number {
  if (!isAvailable) {
    return 0;
  }

  if (nearestDangerousMobDistance === null) {
    return 100;
  }

  const awarenessRadius = calculateAwarenessRadius(dangerRadius);

  return clampPercent((nearestDangerousMobDistance / awarenessRadius) * 100);
}

function calculateCalmnessPercent(dangerousDistances: readonly MobDistance[], dangerRadius: number): number {
  if (dangerousDistances.length === 0) {
    return 100;
  }

  const awarenessRadius = calculateAwarenessRadius(dangerRadius);
  const totalThreatPercent = dangerousDistances.reduce((totalThreat, { mob, distance }) => {
    const aggressionThreat = clampPercent(mob.getAggressionLevel()) / 100;
    const proximityThreat = Math.max(0, 1 - distance / awarenessRadius);
    const threatPercent = aggressionThreat * proximityThreat * 100;

    return totalThreat + threatPercent;
  }, 0);

  return clampPercent(100 - totalThreatPercent);
}

function calculateAwarenessRadius(dangerRadius: number): number {
  return Math.max(dangerRadius * AWARENESS_RADIUS_MULTIPLIER, 1);
}

function clampPercent(value: number): number {
  return Math.round(Math.max(0, Math.min(100, value)));
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
