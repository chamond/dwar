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
import type { Delay } from '../ports/delay';
import type { ResourceRepository } from '../ports/resource-repository';
import type { Clock } from '../ports/clock';

const DEFAULT_DANGER_RADIUS = 100;
const DEFAULT_MONITORING_SCAN_INTERVAL_MS = 4_000;
const DEFAULT_NO_SAFE_RESOURCE_DELAY_MS = 20_000;

export interface ResourceMiningConfig {
  dangerRadius: number;
  monitoringScanIntervalMs: number;
  noSafeResourceDelayMs: number;
}

export interface RunResourceMiningInput {
  getSelectedResourceIds(): readonly BotResourceId[];
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
      durationMs: number;
    }
  | {
      type: 'farm-cancelled';
      resource: ResourceMiningResourceInfo;
      reason: 'not-first-farmer';
    }
  | {
      type: 'monitoring-scan-started';
      resource: ResourceMiningResourceInfo;
      elapsedMs: number;
      nominalDurationElapsed: boolean;
    }
  | {
      type: 'monitoring-scan-completed';
      resource: ResourceMiningResourceInfo;
      resourceState: 'being-mined' | 'available' | 'collected';
      nominalDurationElapsed: boolean;
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
      type: 'farm-failed';
      resource: ResourceMiningResourceInfo;
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
    private readonly delay: Delay,
    private readonly clock: Clock,
    config: Partial<ResourceMiningConfig> = {}
  ) {
    this.config = {
      dangerRadius: config.dangerRadius ?? DEFAULT_DANGER_RADIUS,
      monitoringScanIntervalMs: config.monitoringScanIntervalMs ?? DEFAULT_MONITORING_SCAN_INTERVAL_MS,
      noSafeResourceDelayMs: config.noSafeResourceDelayMs ?? DEFAULT_NO_SAFE_RESOURCE_DELAY_MS
    };

    if (this.config.monitoringScanIntervalMs <= 0) {
      throw new Error('Mining monitoring scan interval must be greater than zero.');
    }
  }

  async execute(input: RunResourceMiningInput): Promise<void> {
    const location = this.getSelectedLocation(input.selectedLocationId);

    while (!input.signal?.aborted) {
      const selectedArticleIds = this.getSelectedArticleIds(input.getSelectedResourceIds());

      if (selectedArticleIds.size === 0) {
        this.emit(input, {
          type: 'no-safe-resource',
          selectedResourceCount: 0,
          delayMs: this.config.noSafeResourceDelayMs
        });
        await this.delay.wait(this.config.noSafeResourceDelayMs, input.signal);
        continue;
      }

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

      await this.startMiningResource(selection.selectedSafety, location, input);
    }
  }

  private async startMiningResource(
    safety: ResourceMiningSafety,
    location: HuntLocation,
    input: RunResourceMiningInput
  ): Promise<void> {
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

    const startedAtMs = this.nowMs();
    const miningDurationMs = this.getMiningDurationMs(resource);
    this.emit(input, {
      type: 'farm-started',
      resource: createResourceInfo(resource),
      durationMs: miningDurationMs
    });

    const outcome = await this.monitorResource(resource, location, startedAtMs, miningDurationMs, input);

    if (outcome === 'interrupted') {
      return;
    }

    this.emit(input, {
      type: outcome === 'collected' ? 'farm-completed' : 'farm-failed',
      resource: createResourceInfo(resource)
    });
  }

  private async monitorResource(
    resource: HuntResourceNode,
    location: HuntLocation,
    startedAtMs: number,
    miningDurationMs: number,
    input: RunResourceMiningInput
  ): Promise<'collected' | 'failed' | 'interrupted'> {
    const nominalDeadlineAtMs = startedAtMs + miningDurationMs;
    let nextScanAtMs = startedAtMs + this.config.monitoringScanIntervalMs;

    while (!input.signal?.aborted) {
      await this.waitUntil(nextScanAtMs, input.signal);

      const scanStartedAtMs = this.nowMs();
      this.emit(input, {
        type: 'monitoring-scan-started',
        resource: createResourceInfo(resource),
        elapsedMs: scanStartedAtMs - startedAtMs,
        nominalDurationElapsed: scanStartedAtMs >= nominalDeadlineAtMs
      });

      const scan = await this.scanAndStore(location, input.signal);
      const currentResource = scan.findResourceByServerNumber(resource.getServerNumber());
      const nominalDurationElapsed = this.nowMs() >= nominalDeadlineAtMs;

      if (!currentResource) {
        this.emit(input, {
          type: 'monitoring-scan-completed',
          resource: createResourceInfo(resource),
          resourceState: 'collected',
          nominalDurationElapsed
        });
        return 'collected';
      }

      if (!currentResource.isBeingFarmed()) {
        this.emit(input, {
          type: 'monitoring-scan-completed',
          resource: createResourceInfo(resource),
          resourceState: 'available',
          nominalDurationElapsed
        });
        return 'failed';
      }

      const safety = assessResourceMiningSafety(resource, scan.getMobs(), {
        dangerRadius: this.config.dangerRadius
      });

      this.emit(input, {
        type: 'monitoring-scan-completed',
        resource: createResourceInfo(resource),
        resourceState: 'being-mined',
        nominalDurationElapsed
      });

      if (!safety.isSafe) {
        await this.farmInterrupter.interrupt(resource, { signal: input.signal });
        this.emit(input, {
          type: 'farm-interrupted',
          resource: createResourceInfo(resource),
          dangerousMob: createMobInfo(safety.blockingMob ?? safety.nearestDangerousMob),
          dangerRadius: this.config.dangerRadius
        });
        return 'interrupted';
      }

      nextScanAtMs += this.config.monitoringScanIntervalMs;
      nextScanAtMs = this.skipMissedMonitoringScans(nextScanAtMs);
    }

    throw createAbortError();
  }

  private skipMissedMonitoringScans(nextScanAtMs: number): number {
    let normalizedNextScanAtMs = nextScanAtMs;
    const nowMs = this.nowMs();

    while (normalizedNextScanAtMs <= nowMs) {
      normalizedNextScanAtMs += this.config.monitoringScanIntervalMs;
    }

    return normalizedNextScanAtMs;
  }

  private nowMs(): number {
    return this.clock.now().getTime();
  }

  private async waitUntil(deadlineAtMs: number, signal: AbortSignal | undefined): Promise<void> {
    const remainingMs = deadlineAtMs - this.nowMs();

    if (remainingMs > 0) {
      await this.delay.wait(remainingMs, signal);
    }
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
    return resource.getResource().getMiningDurationMs();
  }

  private getSelectedArticleIds(selectedResourceIds: readonly BotResourceId[]): ReadonlySet<number> {
    if (selectedResourceIds.length === 0) {
      return new Set();
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

function createAbortError(): Error {
  const error = new Error('Resource mining was stopped.');
  error.name = 'AbortError';

  return error;
}
