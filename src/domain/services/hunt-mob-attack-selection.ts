import type { HuntMob } from '../entities/hunt-mob';

export interface HuntMobAttackSelectionOptions {
  dangerRadius: number;
  preferCrowdedTarget: boolean;
}

export interface HuntMobAttackSelection {
  selectedMob: HuntMob | null;
  targetCandidateCount: number;
}

interface SafeHuntMobCandidate {
  mob: HuntMob;
  nearestSameTypeMobDistance: number;
}

export function selectHuntMobForAttack(
  mobs: readonly HuntMob[],
  targetArticleId: number,
  options: HuntMobAttackSelectionOptions
): HuntMobAttackSelection {
  if (!Number.isInteger(targetArticleId) || targetArticleId <= 0) {
    throw new Error('Hunt target article id must be a positive integer.');
  }

  if (!Number.isFinite(options.dangerRadius) || options.dangerRadius <= 0) {
    throw new Error('Hunt danger radius must be greater than zero.');
  }

  const targetCandidates = mobs.filter((mob) => {
    return mob.getArticleId() === targetArticleId && mob.isAvailableForAttack();
  });
  const safeCandidates = targetCandidates.flatMap((mob): readonly SafeHuntMobCandidate[] => {
    if (hasBlockingMob(mob, mobs, targetArticleId, options.dangerRadius)) {
      return [];
    }

    return [{
      mob,
      nearestSameTypeMobDistance: getNearestSameTypeMobDistance(mob, mobs, targetArticleId)
    }];
  });
  const selectedCandidate = safeCandidates.reduce<SafeHuntMobCandidate | null>((best, current) => {
    if (!best) {
      return current;
    }

    return compareCandidates(current, best, options.preferCrowdedTarget) < 0
      ? current
      : best;
  }, null);

  return {
    selectedMob: selectedCandidate?.mob ?? null,
    targetCandidateCount: targetCandidates.length
  };
}

function hasBlockingMob(
  target: HuntMob,
  mobs: readonly HuntMob[],
  targetArticleId: number,
  dangerRadius: number
): boolean {
  return mobs.some((mob) => {
    return mob.getArticleId() !== targetArticleId
      && !mob.isFriendly()
      && target.getPosition().distanceTo(mob.getPosition()) <= dangerRadius;
  });
}

function getNearestSameTypeMobDistance(
  target: HuntMob,
  mobs: readonly HuntMob[],
  targetArticleId: number
): number {
  return mobs.reduce((nearestDistance, mob) => {
    if (mob.getArticleId() !== targetArticleId || mob.getId() === target.getId()) {
      return nearestDistance;
    }

    return Math.min(nearestDistance, target.getPosition().distanceTo(mob.getPosition()));
  }, Number.POSITIVE_INFINITY);
}

function compareCandidates(
  left: SafeHuntMobCandidate,
  right: SafeHuntMobCandidate,
  preferCrowdedTarget: boolean
): number {
  if (left.nearestSameTypeMobDistance !== right.nearestSameTypeMobDistance) {
    return preferCrowdedTarget
      ? left.nearestSameTypeMobDistance - right.nearestSameTypeMobDistance
      : right.nearestSameTypeMobDistance - left.nearestSameTypeMobDistance;
  }

  return compareMobIds(left.mob.getId(), right.mob.getId());
}

function compareMobIds(left: string, right: string): number {
  const leftNumber = Number(left);
  const rightNumber = Number(right);

  if (Number.isInteger(leftNumber) && Number.isInteger(rightNumber) && leftNumber !== rightNumber) {
    return leftNumber - rightNumber;
  }

  return left.localeCompare(right);
}
