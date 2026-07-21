import type { BotResourceId } from '../../domain/entities/bot-resource';
import type { HuntMob } from '../../domain/entities/hunt-mob';
import type { HuntResourceNode } from '../../domain/entities/hunt-resource-node';
import type { HuntZoneScan } from '../../domain/entities/hunt-zone-scan';
import {
  assessResourceMiningSafety,
  selectSafestResourceForMining,
  type ResourceMiningSafety
} from '../../domain/services/resource-mining-safety';
import { getMobAggressionProfile } from '../../domain/services/mob-aggression';
import type { HuntResourceFarmer } from '../ports/hunt-resource-farmer';
import type { HuntResourceFarmInterrupter } from '../ports/hunt-resource-farm-interrupter';
import type { HuntZoneScanner } from '../ports/hunt-zone-scanner';
import type { HuntZoneScanStore } from '../ports/hunt-zone-scan-store';
import type { MiningDelay } from '../ports/mining-delay';
import type { ResourceRepository } from '../ports/resource-repository';

const DEFAULT_DANGER_RADIUS = 100;
const DEFAULT_MINING_DURATION_MS = 20_000;
const DEFAULT_SAFETY_CHECK_INTERVAL_MS = 5_000;
const DEFAULT_NO_SAFE_RESOURCE_DELAY_MS = 20_000;

export interface ResourceMiningConfig {
  dangerRadius: number;
  miningDurationMs: number;
  safetyCheckIntervalMs: number;
  noSafeResourceDelayMs: number;
}

export interface RunResourceMiningInput {
  selectedResourceIds: readonly BotResourceId[];
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
}

export interface ResourceMiningMobInfo {
  name: string;
  level: number;
  aggressionLevel: number;
  aggressionColor: string;
}

export type ResourceMiningEvent =
  | {
      type: 'scan-completed';
      totalMobCount: number;
      aggressiveMobCount: number;
      selectedResourceCount: number;
      availableResourceCount: number;
      safeResourceCount: number;
      dangerRadius: number;
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
      type: 'safety-check-completed';
      resource: ResourceMiningResourceInfo;
      elapsedMs: number;
      isSafe: boolean;
      nearestDangerousMob: ResourceMiningMobInfo | null;
      nearestDangerousMobDistance: number | null;
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
    };

export class RunResourceMiningUseCase {
  private readonly config: ResourceMiningConfig;

  constructor(
    private readonly scanner: HuntZoneScanner,
    private readonly resourceRepository: ResourceRepository,
    private readonly scanStore: HuntZoneScanStore,
    private readonly farmer: HuntResourceFarmer,
    private readonly farmInterrupter: HuntResourceFarmInterrupter,
    private readonly delay: MiningDelay,
    config: Partial<ResourceMiningConfig> = {}
  ) {
    this.config = {
      dangerRadius: config.dangerRadius ?? DEFAULT_DANGER_RADIUS,
      miningDurationMs: config.miningDurationMs ?? DEFAULT_MINING_DURATION_MS,
      safetyCheckIntervalMs: config.safetyCheckIntervalMs ?? DEFAULT_SAFETY_CHECK_INTERVAL_MS,
      noSafeResourceDelayMs: config.noSafeResourceDelayMs ?? DEFAULT_NO_SAFE_RESOURCE_DELAY_MS
    };
  }

  async execute(input: RunResourceMiningInput): Promise<void> {
    const selectedArticleIds = this.getSelectedArticleIds(input.selectedResourceIds);

    while (!input.signal?.aborted) {
      const scan = await this.scanAndStore(input.signal);
      const selectedResources = scan.getResourcesByArticleIds(selectedArticleIds);
      const selection = selectSafestResourceForMining(selectedResources, scan.getMobs(), {
        dangerRadius: this.config.dangerRadius
      });

      this.emit(input, {
        type: 'scan-completed',
        totalMobCount: scan.getMobs().length,
        aggressiveMobCount: scan.getMobs().filter((mob) => mob.getAggressionLevel() > 0).length,
        selectedResourceCount: selection.candidateCount,
        availableResourceCount: selection.availableCandidateCount,
        safeResourceCount: selection.safeCandidateCount,
        dangerRadius: this.config.dangerRadius
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

      await this.startMiningResource(selection.selectedSafety, input);
    }
  }

  private async startMiningResource(safety: ResourceMiningSafety, input: RunResourceMiningInput): Promise<void> {
    const resource = safety.resource;
    const farmStart = await this.farmer.start(resource, { signal: input.signal });

    if (!farmStart.isFirstFarmer()) {
      await this.farmInterrupter.interrupt(resource, { signal: input.signal });
      this.emit(input, {
        type: 'farm-cancelled',
        resource: createResourceInfo(resource),
        reason: 'not-first-farmer'
      });
      return;
    }

    this.emit(input, {
      type: 'farm-started',
      resource: createResourceInfo(resource),
      miningDurationMs: this.config.miningDurationMs
    });

    const completed = await this.monitorResource(resource, input);

    if (completed) {
      this.emit(input, {
        type: 'farm-completed',
        resource: createResourceInfo(resource)
      });
    }
  }

  private async monitorResource(resource: HuntResourceNode, input: RunResourceMiningInput): Promise<boolean> {
    let elapsedMs = 0;

    while (elapsedMs < this.config.miningDurationMs) {
      const waitMs = Math.min(this.config.safetyCheckIntervalMs, this.config.miningDurationMs - elapsedMs);
      await this.delay.wait(waitMs, input.signal);
      elapsedMs += waitMs;

      const scan = await this.scanAndStore(input.signal);
      const safety = assessResourceMiningSafety(resource, scan.getMobs(), {
        dangerRadius: this.config.dangerRadius
      });

      this.emit(input, {
        type: 'safety-check-completed',
        resource: createResourceInfo(resource),
        elapsedMs,
        isSafe: safety.isSafe,
        nearestDangerousMob: createMobInfo(safety.nearestDangerousMob),
        nearestDangerousMobDistance: safety.nearestDangerousMobDistance
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
    }

    return true;
  }

  private async scanAndStore(signal: AbortSignal | undefined): Promise<HuntZoneScan> {
    const scan = await this.scanner.scan({ signal });
    this.scanStore.save(scan);

    return scan;
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
    articleId: resource.getArticleId()
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
