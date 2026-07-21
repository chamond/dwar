import type { HuntLocationId } from '../../domain/entities/hunt-location';

export interface HuntLocationSelectionStore {
  load(): HuntLocationId | null;
  save(locationId: HuntLocationId): void;
}
