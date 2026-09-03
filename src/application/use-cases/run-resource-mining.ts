import {
  catchError,
  concat,
  defer,
  ignoreElements,
  map,
  mergeMap,
  of,
  repeat,
  switchMap,
  take,
  takeWhile,
  tap,
  throwError,
  type Observable
} from 'rxjs';
import type {
  ResourceMiningEvent,
  ResourceMiningMobInfo,
  ResourceMiningResourceInfo
} from '../events/resource-mining-event';
import type { BotResourceId } from '../../domain/entities/bot-resource';
import type { HuntMob } from '../../domain/entities/hunt-mob';
import type { HuntResourceFarmStart } from '../../domain/entities/hunt-resource-farm-start';
import type { HuntResourceNode } from '../../domain/entities/hunt-resource-node';
import type { HuntZoneScan } from '../../domain/entities/hunt-zone-scan';
import { getMobAggressionProfile } from '../../domain/services/mob-aggression';
import {
  assessResourceMiningSafety,
  isMobDangerousForMining,
  selectSafestResourceForMining,
  type ResourceMiningSafety
} from '../../domain/services/resource-mining-safety';
import { HuntResourceFailureTracker } from '../../domain/services/hunt-resource-failure-tracker';
import { isHuntMinigameRequiredError } from '../errors/hunt-minigame-required-error';
import { isUnexpectedServerResponseError } from '../errors/unexpected-server-response-error';
import type { Clock } from '../ports/clock';
import type { CurrentPlayerSplinterDetector } from '../ports/current-player-splinter-detector';
import type { Delay } from '../ports/delay';
import type { GetAreaId } from '../ports/get-area-id';
import type { HuntResourceFarmer } from '../ports/hunt-resource-farmer';
import type { HuntResourceFarmInterrupter } from '../ports/hunt-resource-farm-interrupter';
import type { HuntZoneScanner } from '../ports/hunt-zone-scanner';
import type { HuntZoneScanStore } from '../ports/hunt-zone-scan-store';
import type { ResourceRepository } from '../ports/resource-repository';
import type { TaskScheduler } from '../ports/task-scheduler';

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
}

type FarmStartResult =
  | {
      type: 'farm-start';
      farmStart: HuntResourceFarmStart;
    }
  | {
      type: 'splinter';
    };

export class RunResourceMiningUseCase {
  private readonly config: ResourceMiningConfig;
  private readonly resourceFailureTracker = new HuntResourceFailureTracker();

  constructor(
    private readonly scanner: HuntZoneScanner,
    private readonly resourceRepository: ResourceRepository,
    private readonly scanStore: HuntZoneScanStore,
    private readonly farmer: HuntResourceFarmer,
    private readonly farmInterrupter: HuntResourceFarmInterrupter,
    private readonly delay: Delay,
    private readonly clock: Clock,
    private readonly detectCurrentPlayerSplinter: CurrentPlayerSplinterDetector,
    private readonly getAreaId: GetAreaId,
    private readonly taskScheduler: TaskScheduler,
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

  execute(input: RunResourceMiningInput): Observable<ResourceMiningEvent> {
    return defer(() => {
      let areaId: number | null = null;

      return defer(() => this.taskScheduler.schedule(() => {
        const areaIdSource = areaId === null
          ? this.getAreaId().pipe(
              tap((currentAreaId) => {
                areaId = currentAreaId;
              }),
              take(1)
            )
          : of(areaId);

        return areaIdSource.pipe(
          switchMap((currentAreaId) => this.runIteration(currentAreaId, input))
        );
      })).pipe(
        repeat(),
        takeWhile((event) => event.type !== 'splinter-detected', true)
      );
    });
  }

  private runIteration(
    areaId: number,
    input: RunResourceMiningInput
  ): Observable<ResourceMiningEvent> {
    const selectedArticleIds = this.getSelectedArticleIds(input.getSelectedResourceIds());

    if (selectedArticleIds.size === 0) {
      return this.waitForSafeResource(0);
    }

    const scanStartedEvent: ResourceMiningEvent = {
      type: 'scan-started'
    };

    return concat(
      of(scanStartedEvent),
      this.scanAndStore(areaId).pipe(
        switchMap((scan) => {
          const selectedResources = scan.getResourcesByArticleIds(selectedArticleIds);
          const collectableResources = selectedResources.filter((resource) => {
            return !this.resourceFailureTracker.isBlocked(resource);
          });
          const selection = selectSafestResourceForMining(collectableResources, scan.getMobs(), {
            dangerRadius: this.config.dangerRadius
          });
          const scanCompletedEvent: ResourceMiningEvent = {
            type: 'scan-completed',
            totalMobCount: scan.getMobs().length,
            dangerousMobCount: scan.getMobs().filter(isMobDangerousForMining).length,
            selectedResourceCount: selection.candidateCount,
            safeResourceCount: selection.safeCandidateCount
          };

          if (!selection.selectedSafety) {
            return concat(
              of(scanCompletedEvent),
              this.waitForSafeResource(selection.candidateCount)
            );
          }

          return concat(
            of(scanCompletedEvent),
            this.startMiningResource(selection.selectedSafety, areaId)
          );
        })
      )
    );
  }

  private waitForSafeResource(selectedResourceCount: number): Observable<ResourceMiningEvent> {
    const event: ResourceMiningEvent = {
      type: 'no-safe-resource',
      selectedResourceCount,
      delayMs: this.config.noSafeResourceDelayMs
    };

    return concat(
      of(event),
      this.delay.wait(this.config.noSafeResourceDelayMs).pipe(ignoreElements())
    );
  }

  private startMiningResource(
    safety: ResourceMiningSafety,
    areaId: number
  ): Observable<ResourceMiningEvent> {
    const resource = safety.resource;

    return this.requestFarmStart(resource).pipe(
      switchMap((result) => {
        if (result.type === 'splinter') {
          return of<ResourceMiningEvent>({
            type: 'splinter-detected'
          });
        }

        if (!result.farmStart.isFirstFarmer()) {
          const cancelledEvent: ResourceMiningEvent = {
            type: 'farm-cancelled',
            resource: createResourceInfo(resource),
            reason: 'not-first-farmer'
          };

          return concat(
            this.farmInterrupter.interrupt().pipe(ignoreElements()),
            of(cancelledEvent)
          );
        }

        const startedAtMs = this.nowMs();
        const miningDurationMs = resource.getResource().getMiningDurationMs();
        const farmStartedEvent: ResourceMiningEvent = {
          type: 'farm-started',
          resource: createResourceInfo(resource),
          durationMs: miningDurationMs
        };

        return concat(
          of(farmStartedEvent),
          this.monitorResource(resource, areaId, startedAtMs, miningDurationMs)
        );
      })
    );
  }

  private requestFarmStart(resource: HuntResourceNode): Observable<FarmStartResult> {
    return this.farmer.start(resource).pipe(
      map((farmStart): FarmStartResult => ({
        type: 'farm-start',
        farmStart
      })),
      catchError((error: unknown) => {
        if (isHuntMinigameRequiredError(error)) {
          return throwError(() => error);
        }

        if (!isUnexpectedServerResponseError(error)) {
          return throwError(() => error);
        }

        return this.detectCurrentPlayerSplinter().pipe(
          catchError(() => of(false)),
          mergeMap((hasSplinter): Observable<FarmStartResult> => {
            if (!hasSplinter) {
              return throwError(() => error);
            }

            return of({
              type: 'splinter'
            });
          })
        );
      }),
      take(1)
    );
  }

  private monitorResource(
    resource: HuntResourceNode,
    areaId: number,
    startedAtMs: number,
    miningDurationMs: number
  ): Observable<ResourceMiningEvent> {
    return defer(() => {
      const nominalDeadlineAtMs = startedAtMs + miningDurationMs;
      let nextScanAtMs = startedAtMs + this.config.monitoringScanIntervalMs;

      const monitoringStep = defer(() => {
        return concat(
          this.waitUntil(nextScanAtMs).pipe(ignoreElements()),
          defer(() => {
            const scanStartedAtMs = this.nowMs();
            const scanStartedEvent: ResourceMiningEvent = {
              type: 'monitoring-scan-started',
              resource: createResourceInfo(resource),
              elapsedMs: scanStartedAtMs - startedAtMs,
              nominalDurationElapsed: scanStartedAtMs >= nominalDeadlineAtMs
            };

            return concat(
              of(scanStartedEvent),
              this.scanAndStore(areaId).pipe(
                switchMap((scan) => {
                  const currentResource = scan.findResourceByServerNumber(resource.getServerNumber());
                  const nominalDurationElapsed = this.nowMs() >= nominalDeadlineAtMs;

                  if (!currentResource) {
                    const scanCompletedEvent: ResourceMiningEvent = {
                      type: 'monitoring-scan-completed',
                      resource: createResourceInfo(resource),
                      resourceState: 'collected',
                      nominalDurationElapsed
                    };
                    const farmCompletedEvent: ResourceMiningEvent = {
                      type: 'farm-completed',
                      resource: createResourceInfo(resource)
                    };

                    return of(scanCompletedEvent, farmCompletedEvent);
                  }

                  if (!currentResource.isBeingFarmed()) {
                    this.resourceFailureTracker.recordFailure(currentResource);

                    const scanCompletedEvent: ResourceMiningEvent = {
                      type: 'monitoring-scan-completed',
                      resource: createResourceInfo(resource),
                      resourceState: 'available',
                      nominalDurationElapsed
                    };
                    const farmFailedEvent: ResourceMiningEvent = {
                      type: 'farm-failed',
                      resource: createResourceInfo(resource)
                    };

                    return of(scanCompletedEvent, farmFailedEvent);
                  }

                  const miningSafety = assessResourceMiningSafety(resource, scan.getMobs(), {
                    dangerRadius: this.config.dangerRadius
                  });
                  const scanCompletedEvent: ResourceMiningEvent = {
                    type: 'monitoring-scan-completed',
                    resource: createResourceInfo(resource),
                    resourceState: 'being-mined',
                    nominalDurationElapsed
                  };

                  if (!miningSafety.isSafe) {
                    const interruptedEvent: ResourceMiningEvent = {
                      type: 'farm-interrupted',
                      resource: createResourceInfo(resource),
                      dangerousMob: createMobInfo(
                        miningSafety.blockingMob ?? miningSafety.nearestDangerousMob
                      ),
                      dangerRadius: this.config.dangerRadius
                    };

                    return concat(
                      of(scanCompletedEvent),
                      this.farmInterrupter.interrupt().pipe(ignoreElements()),
                      of(interruptedEvent)
                    );
                  }

                  nextScanAtMs += this.config.monitoringScanIntervalMs;
                  nextScanAtMs = this.skipMissedMonitoringScans(nextScanAtMs);

                  return of(scanCompletedEvent);
                })
              )
            );
          })
        );
      });

      return monitoringStep.pipe(
        repeat(),
        takeWhile((event) => !isMonitoringTerminalEvent(event), true)
      );
    });
  }

  private waitUntil(deadlineAtMs: number): Observable<void> {
    return this.delay.wait(Math.max(0, deadlineAtMs - this.nowMs()));
  }

  private skipMissedMonitoringScans(nextScanAtMs: number): number {
    let normalizedNextScanAtMs = nextScanAtMs;
    const nowMs = this.nowMs();

    while (normalizedNextScanAtMs <= nowMs) {
      normalizedNextScanAtMs += this.config.monitoringScanIntervalMs;
    }

    return normalizedNextScanAtMs;
  }

  private scanAndStore(areaId: number): Observable<HuntZoneScan> {
    return this.scanner.scan({
      areaId
    }).pipe(
      tap((scan) => {
        this.scanStore.save(scan);
        this.resourceFailureTracker.synchronizeVisibleResources(scan.getResources());
      }),
      take(1)
    );
  }

  private nowMs(): number {
    return this.clock.now().getTime();
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

}

function isMonitoringTerminalEvent(event: ResourceMiningEvent): boolean {
  return event.type === 'farm-completed'
    || event.type === 'farm-failed'
    || event.type === 'farm-interrupted';
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
