import type { BotResourceId } from '../../domain/entities/bot-resource';
import type { HuntLocation, HuntLocationId } from '../../domain/entities/hunt-location';
import type { HuntMob } from '../../domain/entities/hunt-mob';
import type { HuntResourceNode } from '../../domain/entities/hunt-resource-node';
import type { HuntZoneScan } from '../../domain/entities/hunt-zone-scan';
import {
  assessResourceMiningSafety,
  selectSafestResourceForMining,
  type ResourceMiningSafety
} from '../../domain/services/resource-mining-safety';
import { getMobAggressionProfile } from '../../domain/services/mob-aggression';
import type { HuntLocationRepository } from '../ports/hunt-location-repository';
import type { HuntResourceFarmer } from '../ports/hunt-resource-farmer';
import type { HuntResourceFarmInterrupter } from '../ports/hunt-resource-farm-interrupter';
import type { HuntZoneScanner } from '../ports/hunt-zone-scanner';
import type { HuntZoneScanStore } from '../ports/hunt-zone-scan-store';
import type { MiningDelay } from '../ports/mining-delay';
import type { ResourceRepository } from '../ports/resource-repository';
import type { Clock } from '../ports/clock';

const DEFAULT_DANGER_RADIUS = 100;
const DEFAULT_LEVEL_ZERO_MINING_DURATION_MS = 20_000;
const DEFAULT_SAFETY_CHECK_INTERVAL_MS = 5_000;
const DEFAULT_NO_SAFE_RESOURCE_DELAY_MS = 20_000;
const DEFAULT_POST_MINING_DELAY_MS = 2_000;
const DEFAULT_MINING_DURATION_BY_RESOURCE_LEVEL_MS = new Map<number, number>([
  [0, DEFAULT_LEVEL_ZERO_MINING_DURATION_MS]
]);

export interface ResourceMiningConfig {
  dangerRadius: number;
  miningDurationByResourceLevelMs: ReadonlyMap<number, number>;
  safetyCheckIntervalMs: number;
  noSafeResourceDelayMs: number;
  postMiningDelayMs: number;
}

export interface RunResourceMiningInput {
  selectedResourceIds: readonly BotResourceId[];
  selectedLocationId: HuntLocationId;
  observer?: ResourceMiningObserver;
  signal?: AbortSignal;
}

export interface ResourceMiningObserver {
  handle(event: ResourceMiningEvent): void;
}

export interface ResourceMiningResourceInfo {
  name: string;
  markerColor: string;
  serverNumber: string;
  articleId: number;
  level: number;
}

export interface ResourceMiningMobInfo {
  name: string;
  level: number;
  aggressionLevel: number;
  aggressionColor: string;
}

export type ResourceMiningEvent =
  | {
      type: 'scan-started';
    }
  | {
      type: 'scan-completed';
      totalMobCount: number;
      aggressiveMobCount: number;
      selectedResourceCount: number;
      safeResourceCount: number;
    }
  | {
      type: 'no-safe-resource';
      selectedResourceCount: number;
      delayMs: number;
    }
  | {
      type: 'farm-started';
      resource: ResourceMiningResourceInfo;
      miningDurationMs: number;
    }
  | {
      type: 'farm-cancelled';
      resource: ResourceMiningResourceInfo;
      reason: 'not-first-farmer';
    }
  | {
      type: 'safety-check-started';
      resource: ResourceMiningResourceInfo;
      elapsedMs: number;
    }
  | {
      type: 'safety-check-completed';
      resource: ResourceMiningResourceInfo;
      isSafe: boolean;
    }
  | {
      type: 'farm-interrupted';
      resource: ResourceMiningResourceInfo;
      dangerousMob: ResourceMiningMobInfo | null;
      dangerRadius: number;
    }
  | {
      type: 'farm-completed';
      resource: ResourceMiningResourceInfo;
    }
  | {
      type: 'next-mining-delayed';
      delayMs: number;
    };

export class RunResourceMiningUseCase {
  private readonly config: ResourceMiningConfig;

  constructor(
    private readonly scanner: HuntZoneScanner,
    private readonly resourceRepository: ResourceRepository,
    private readonly locationRepository: HuntLocationRepository,
    private readonly scanStore: HuntZoneScanStore,
    private readonly farmer: HuntResourceFarmer,
    private readonly farmInterrupter: HuntResourceFarmInterrupter,
    private readonly delay: MiningDelay,
    private readonly clock: Clock,
    config: Partial<ResourceMiningConfig> = {}
  ) {
    this.config = {
      dangerRadius: config.dangerRadius ?? DEFAULT_DANGER_RADIUS,
      miningDurationByResourceLevelMs:
        config.miningDurationByResourceLevelMs ?? DEFAULT_MINING_DURATION_BY_RESOURCE_LEVEL_MS,
      safetyCheckIntervalMs: config.safetyCheckIntervalMs ?? DEFAULT_SAFETY_CHECK_INTERVAL_MS,
      noSafeResourceDelayMs: config.noSafeResourceDelayMs ?? DEFAULT_NO_SAFE_RESOURCE_DELAY_MS,
      postMiningDelayMs: config.postMiningDelayMs ?? DEFAULT_POST_MINING_DELAY_MS
    };
  }

  async execute(input: RunResourceMiningInput): Promise<void> {
    const selectedArticleIds = this.getSelectedArticleIds(input.selectedResourceIds);
    const location = this.getSelectedLocation(input.selectedLocationId);

    while (!input.signal?.aborted) {
      this.emit(input, {
        type: 'scan-started'
      });
      const scan = await this.scanAndStore(location, input.signal);
      const selectedResources = scan.getResourcesByArticleIds(selectedArticleIds);
      const selection = selectSafestResourceForMining(selectedResources, scan.getMobs(), {
        dangerRadius: this.config.dangerRadius
      });

      this.emit(input, {
        type: 'scan-completed',
        totalMobCount: scan.getMobs().length,
        aggressiveMobCount: scan.getMobs().filter((mob) => mob.getAggressionLevel() > 0).length,
        selectedResourceCount: selection.candidateCount,
        safeResourceCount: selection.safeCandidateCount
      });

      if (!selection.selectedSafety) {
        this.emit(input, {
          type: 'no-safe-resource',
          selectedResourceCount: selection.candidateCount,
          delayMs: this.config.noSafeResourceDelayMs
        });
        await this.delay.wait(this.config.noSafeResourceDelayMs, input.signal);
        continue;
      }

      const isCompleted = await this.startMiningResource(selection.selectedSafety, location, input);

      if (isCompleted && this.config.postMiningDelayMs > 0 && !input.signal?.aborted) {
        this.emit(input, {
          type: 'next-mining-delayed',
          delayMs: this.config.postMiningDelayMs
        });
        await this.delay.wait(this.config.postMiningDelayMs, input.signal);
      }
    }
  }

  private async startMiningResource(
    safety: ResourceMiningSafety,
    location: HuntLocation,
    input: RunResourceMiningInput
  ): Promise<boolean> {
    const resource = safety.resource;
    const farmStart = await this.farmer.start(resource, { signal: input.signal });

    if (!farmStart.isFirstFarmer()) {
      await this.farmInterrupter.interrupt(resource, { signal: input.signal });
      this.emit(input, {
        type: 'farm-cancelled',
        resource: createResourceInfo(resource),
        reason: 'not-first-farmer'
      });
      return false;
    }

    const miningDurationMs = this.getMiningDurationMs(resource);
    this.emit(input, {
      type: 'farm-started',
      resource: createResourceInfo(resource),
      miningDurationMs
    });

    const completed = await this.monitorResource(resource, location, miningDurationMs, input);

    if (completed) {
      this.emit(input, {
        type: 'farm-completed',
        resource: createResourceInfo(resource)
      });
    }

    return completed;
  }

  private async monitorResource(
    resource: HuntResourceNode,
    location: HuntLocation,
    miningDurationMs: number,
    input: RunResourceMiningInput
  ): Promise<boolean> {
    const startedAtMs = this.nowMs();
    const deadlineAtMs = startedAtMs + miningDurationMs;
    let nextSafetyCheckAtMs = startedAtMs + this.config.safetyCheckIntervalMs;

    if (this.config.safetyCheckIntervalMs <= 0) {
      await this.delay.wait(miningDurationMs, input.signal);
      return true;
    }

    while (nextSafetyCheckAtMs < deadlineAtMs && !input.signal?.aborted) {
      const waitMs = Math.max(0, nextSafetyCheckAtMs - this.nowMs());

      if (waitMs > 0) {
        await this.delay.wait(waitMs, input.signal);
      }

      if (this.nowMs() >= deadlineAtMs) {
        break;
      }

      const elapsedMs = Math.min(this.nowMs() - startedAtMs, miningDurationMs);
      this.emit(input, {
        type: 'safety-check-started',
        resource: createResourceInfo(resource),
        elapsedMs
      });

      const scan = await this.scanAndStore(location, input.signal);

      if (this.nowMs() >= deadlineAtMs) {
        break;
      }

      const safety = assessResourceMiningSafety(resource, scan.getMobs(), {
        dangerRadius: this.config.dangerRadius
      });

      this.emit(input, {
        type: 'safety-check-completed',
        resource: createResourceInfo(resource),
        isSafe: safety.isSafe
      });

      if (!safety.isSafe) {
        await this.farmInterrupter.interrupt(resource, { signal: input.signal });
        this.emit(input, {
          type: 'farm-interrupted',
          resource: createResourceInfo(resource),
          dangerousMob: createMobInfo(safety.blockingMob ?? safety.nearestDangerousMob),
          dangerRadius: this.config.dangerRadius
        });
        return false;
      }

      nextSafetyCheckAtMs += this.config.safetyCheckIntervalMs;
      nextSafetyCheckAtMs = this.skipMissedSafetyChecks(nextSafetyCheckAtMs, deadlineAtMs);
    }

    const remainingMs = deadlineAtMs - this.nowMs();

    if (remainingMs > 0) {
      await this.delay.wait(remainingMs, input.signal);
    }

    return true;
  }

  private skipMissedSafetyChecks(nextSafetyCheckAtMs: number, deadlineAtMs: number): number {
    let normalizedNextSafetyCheckAtMs = nextSafetyCheckAtMs;
    const nowMs = this.nowMs();

    while (normalizedNextSafetyCheckAtMs <= nowMs && normalizedNextSafetyCheckAtMs < deadlineAtMs) {
      normalizedNextSafetyCheckAtMs += this.config.safetyCheckIntervalMs;
    }

    return normalizedNextSafetyCheckAtMs;
  }

  private nowMs(): number {
    return this.clock.now().getTime();
  }

  private async scanAndStore(location: HuntLocation, signal: AbortSignal | undefined): Promise<HuntZoneScan> {
    const scan = await this.scanner.scan({
      areaId: location.getAreaId(),
      signal
    });
    this.scanStore.save(scan);

    return scan;
  }

  private getMiningDurationMs(resource: HuntResourceNode): number {
    const resourceLevel = resource.getResource().getLevel();
    const durationMs = this.config.miningDurationByResourceLevelMs.get(resourceLevel);

    if (durationMs === undefined) {
      throw new Error(`Mining duration for resource level ${resourceLevel} is not configured.`);
    }

    return durationMs;
  }

  private getSelectedArticleIds(selectedResourceIds: readonly BotResourceId[]): ReadonlySet<number> {
    if (selectedResourceIds.length === 0) {
      throw new Error('At least one resource must be selected before mining.');
    }

    const selectedResourceIdSet = new Set(selectedResourceIds);
    const selectedArticleIds = this.resourceRepository
      .findAll()
      .filter((resource) => selectedResourceIdSet.has(resource.getId()))
      .map((resource) => resource.getArticleId());

    if (selectedArticleIds.length === 0) {
      throw new Error('Selected resources are not known by the bot.');
    }

    return new Set(selectedArticleIds);
  }

  private getSelectedLocation(selectedLocationId: HuntLocationId): HuntLocation {
    const location = this.locationRepository.findById(selectedLocationId);

    if (!location) {
      throw new Error('Selected hunt location is not known by the bot.');
    }

    return location;
  }

  private emit(input: RunResourceMiningInput, event: ResourceMiningEvent): void {
    input.observer?.handle(event);
  }
}

function createResourceInfo(resource: HuntResourceNode): ResourceMiningResourceInfo {
  const botResource = resource.getResource();

  return {
    name: botResource.getName(),
    markerColor: botResource.getMarkerColor(),
    serverNumber: resource.getServerNumber(),
    articleId: resource.getArticleId(),
    level: botResource.getLevel()
  };
}

function createMobInfo(mob: HuntMob | null): ResourceMiningMobInfo | null {
  if (!mob) {
    return null;
  }

  return {
    name: mob.getName(),
    level: mob.getLevel(),
    aggressionLevel: mob.getAggressionLevel(),
    aggressionColor: getMobAggressionProfile(mob.getAggressionLevel()).color
  };
}
