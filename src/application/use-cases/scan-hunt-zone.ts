import type { HuntZoneScanner } from '../ports/hunt-zone-scanner';
import type { HuntZoneScanStore } from '../ports/hunt-zone-scan-store';
import type { ResourceRepository } from '../ports/resource-repository';
import type { BotResourceId } from '../../domain/entities/bot-resource';
import type { HuntZoneDiagnostics } from '../../domain/services/diagnose-hunt-zone';
import { diagnoseHuntZone } from '../../domain/services/diagnose-hunt-zone';

export interface ScanHuntZoneInput {
  selectedResourceIds: readonly BotResourceId[];
}

export interface ScanHuntZoneOutput {
  diagnostics: HuntZoneDiagnostics;
}

export class ScanHuntZoneUseCase {
  constructor(
    private readonly scanner: HuntZoneScanner,
    private readonly resourceRepository: ResourceRepository,
    private readonly scanStore: HuntZoneScanStore
  ) {}

  async execute(input: ScanHuntZoneInput): Promise<ScanHuntZoneOutput> {
    if (input.selectedResourceIds.length === 0) {
      throw new Error('At least one resource must be selected before scanning.');
    }

    const selectedResourceIds = new Set(input.selectedResourceIds);
    const selectedArticleIds = new Set(
      this.resourceRepository
        .findAll()
        .filter((resource) => selectedResourceIds.has(resource.getId()))
        .map((resource) => resource.getArticleId())
    );

    const scan = await this.scanner.scan();
    this.scanStore.save(scan);

    return {
      diagnostics: diagnoseHuntZone(scan, selectedArticleIds)
    };
  }
}
