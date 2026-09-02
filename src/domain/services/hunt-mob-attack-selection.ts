import type { HuntMob } from '../entities/hunt-mob';

export interface HuntMobAttackSelectionOptions {
  dangerRadius: number;
  preferCrowdedTarget: boolean;
  aggressiveHunting: boolean;
  excludedMobIds: ReadonlySet<string>;
}

export interface HuntMobAttackSelection {
  selectedMob: HuntMob | null;
  targetCandidateCount: number;
}

interface SafeHuntMobCandidate {
  mob: HuntMob;
  targetSelectionIndex: number;
  nearestSameTypeMobDistance: number;
}

export function selectHuntMobForAttack(
  mobs: readonly HuntMob[],
  targetArticleIds: readonly number[],
  options: HuntMobAttackSelectionOptions
): HuntMobAttackSelection {
  if (
    targetArticleIds.length === 0
    || targetArticleIds.some((articleId) => !Number.isInteger(articleId) || articleId <= 0)
    || new Set(targetArticleIds).size !== targetArticleIds.length
  ) {
    throw new Error('Hunt target article ids must be unique positive integers.');
  }

  if (!Number.isFinite(options.dangerRadius) || options.dangerRadius <= 0) {
    throw new Error('Hunt danger radius must be greater than zero.');
  }

  const targetSelectionIndexes = new Map(
    targetArticleIds.map((articleId, index) => [articleId, index])
  );
  const targetCandidates = mobs.flatMap((mob): readonly SafeHuntMobCandidate[] => {
    const targetSelectionIndex = targetSelectionIndexes.get(mob.getArticleId());

    return targetSelectionIndex !== undefined
      && mob.isAvailableForAttack()
      && !options.excludedMobIds.has(mob.getId())
      ? [{
          mob,
          targetSelectionIndex,
          nearestSameTypeMobDistance: Number.POSITIVE_INFINITY
        }]
      : [];
  });
  const safeCandidates = targetCandidates.flatMap((candidate): readonly SafeHuntMobCandidate[] => {
    const targetArticleId = candidate.mob.getArticleId();

    if (
      !options.aggressiveHunting
      && hasBlockingMob(candidate.mob, mobs, targetArticleId, options.dangerRadius)
    ) {
      return [];
    }

    return [{
      ...candidate,
      nearestSameTypeMobDistance: getNearestSameTypeMobDistance(
        candidate.mob,
        mobs,
        targetArticleId,
        options.excludedMobIds
      )
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
  targetArticleId: number,
  excludedMobIds: ReadonlySet<string>
): number {
  return mobs.reduce((nearestDistance, mob) => {
    if (
      mob.getArticleId() !== targetArticleId
      || mob.getId() === target.getId()
      || excludedMobIds.has(mob.getId())
    ) {
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
  if (left.mob.getLevel() !== right.mob.getLevel()) {
    return right.mob.getLevel() - left.mob.getLevel();
  }

  if (left.targetSelectionIndex !== right.targetSelectionIndex) {
    return left.targetSelectionIndex - right.targetSelectionIndex;
  }

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
