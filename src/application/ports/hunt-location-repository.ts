import type { HuntLocation, HuntLocationId } from '../../domain/entities/hunt-location';

export interface HuntLocationRepository {
  findAll(): readonly HuntLocation[];
  findById(id: HuntLocationId): HuntLocation | null;
}
