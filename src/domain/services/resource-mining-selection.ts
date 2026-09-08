import type { BotResourceId } from '../entities/bot-resource';
import type { HuntMob } from '../entities/hunt-mob';
import type { HuntResourceNode } from '../entities/hunt-resource-node';
import { assessResourceMiningSafety, type ResourceMiningSafety } from './resource-mining-safety';

export interface WeightedResourceSelectionOptions {
  dangerRadius: number;
  probabilities?: Readonly<Partial<Record<BotResourceId, number>>>;
  random?: () => number;
}

export interface WeightedResourceSelection {
  selectedSafety: ResourceMiningSafety | null;
  candidateCount: number;
  safeCandidateCount: number;
}

export function selectResourceForMining(
  resources: readonly HuntResourceNode[],
  mobs: readonly HuntMob[],
  options: WeightedResourceSelectionOptions
): WeightedResourceSelection {
  const availableResources = resources.filter((resource) => !resource.isBeingFarmed());
  const candidateSafeties = availableResources.map((resource) => {
    return assessResourceMiningSafety(resource, mobs, options);
  });
  const safeCandidates = candidateSafeties.filter((safety) => safety.isSafe);
  const safeByResource = groupByResource(safeCandidates);
  const resourceGroups = Array.from(safeByResource.entries());
  const selectedGroup = selectWeightedGroup(resourceGroups, options.probabilities, options.random);

  return {
    selectedSafety: selectedGroup ? selectSafestInGroup(selectedGroup) : null,
    candidateCount: candidateSafeties.length,
    safeCandidateCount: safeCandidates.length
  };
}

function groupByResource(
  safeties: readonly ResourceMiningSafety[]
): Map<BotResourceId, ResourceMiningSafety[]> {
  const groups = new Map<BotResourceId, ResourceMiningSafety[]>();

  safeties.forEach((safety) => {
    const resourceId = safety.resource.getResource().getId();
    const group = groups.get(resourceId) ?? [];
    group.push(safety);
    groups.set(resourceId, group);
  });

  return groups;
}

function selectWeightedGroup(
  groups: readonly (readonly [BotResourceId, ResourceMiningSafety[]])[],
  probabilities: Readonly<Partial<Record<BotResourceId, number>>> | undefined,
  random: (() => number) | undefined
): ResourceMiningSafety[] | null {
  if (groups.length === 0) {
    return null;
  }

  const weights = groups.map(([resourceId]) => {
    const probability = probabilities?.[resourceId];
    return typeof probability === 'number' && probability >= 0 ? probability : 1;
  });
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  const normalizedRandom = Math.min(0.999999999, Math.max(0, random?.() ?? Math.random()));
  const target = normalizedRandom * totalWeight;
  let accumulated = 0;

  for (let index = 0; index < groups.length; index += 1) {
    accumulated += weights[index] ?? 0;
    if (target < accumulated || index === groups.length - 1) {
      return groups[index]?.[1] ?? null;
    }
  }

  return groups[groups.length - 1]?.[1] ?? null;
}

function selectSafestInGroup(safeties: readonly ResourceMiningSafety[]): ResourceMiningSafety {
  return safeties.reduce((best, current) => {
    const bestDistance = best.nearestDangerousMobDistance ?? Number.POSITIVE_INFINITY;
    const currentDistance = current.nearestDangerousMobDistance ?? Number.POSITIVE_INFINITY;

    if (currentDistance !== bestDistance) {
      return currentDistance > bestDistance ? current : best;
    }

    return compareServerNumbers(
      current.resource.getServerNumber(),
      best.resource.getServerNumber()
    ) < 0
      ? current
      : best;
  });
}

function compareServerNumbers(left: string, right: string): number {
  const leftNumber = Number(left);
  const rightNumber = Number(right);

  if (Number.isInteger(leftNumber) && Number.isInteger(rightNumber) && leftNumber !== rightNumber) {
    return leftNumber - rightNumber;
  }

  return left.localeCompare(right);
}
