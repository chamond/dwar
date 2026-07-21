import type { HuntZoneScan } from '../entities/hunt-zone-scan';
import { getMobAggressionProfile } from './mob-aggression';

export interface HuntMobGroupDiagnostics {
  name: string;
  level: number;
  kind: number;
  articleId: number;
  aggressionLevel: number;
  aggressionColor: string;
  isAggressive: boolean;
  count: number;
}

export interface HuntZoneDiagnostics {
  totalMobCount: number;
  aggressiveMobCount: number;
  selectedResourceCount: number;
  mobGroups: readonly HuntMobGroupDiagnostics[];
}

interface MutableMobGroupDiagnostics {
  name: string;
  level: number;
  kind: number;
  articleId: number;
  aggressionLevel: number;
  aggressionColor: string;
  isAggressive: boolean;
  count: number;
}

export function diagnoseHuntZone(
  scan: HuntZoneScan,
  selectedResourceArticleIds: ReadonlySet<number>
): HuntZoneDiagnostics {
  const mobGroups = groupMobs(scan);

  return {
    totalMobCount: scan.getMobs().length,
    aggressiveMobCount: scan.getMobs().filter((mob) => mob.getAggressionLevel() > 0).length,
    selectedResourceCount: scan.getResourcesByArticleIds(selectedResourceArticleIds).length,
    mobGroups
  };
}

function groupMobs(scan: HuntZoneScan): readonly HuntMobGroupDiagnostics[] {
  const groups = new Map<string, MutableMobGroupDiagnostics>();

  scan.getMobs().forEach((mob) => {
    const aggressionProfile = getMobAggressionProfile(mob.getAggressionLevel());
    const key = [
      mob.getName(),
      String(mob.getLevel()),
      String(mob.getKind()),
      String(mob.getArticleId()),
      String(mob.getAggressionLevel())
    ].join('\u0000');
    const currentGroup = groups.get(key);

    if (currentGroup) {
      currentGroup.count += 1;
      return;
    }

    groups.set(key, {
      name: mob.getName(),
      level: mob.getLevel(),
      kind: mob.getKind(),
      articleId: mob.getArticleId(),
      aggressionLevel: mob.getAggressionLevel(),
      aggressionColor: aggressionProfile.color,
      isAggressive: aggressionProfile.isAggressive,
      count: 1
    });
  });

  return Array.from(groups.values()).sort(compareMobGroups);
}

function compareMobGroups(left: HuntMobGroupDiagnostics, right: HuntMobGroupDiagnostics): number {
  if (left.isAggressive !== right.isAggressive) {
    return left.isAggressive ? -1 : 1;
  }

  if (left.aggressionLevel !== right.aggressionLevel) {
    return right.aggressionLevel - left.aggressionLevel;
  }

  if (left.level !== right.level) {
    return right.level - left.level;
  }

  return left.name.localeCompare(right.name, 'ru');
}
