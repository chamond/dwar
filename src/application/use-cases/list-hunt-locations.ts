import type { HuntLocation } from '../../domain/entities/hunt-location';
import type { HuntLocationRepository } from '../ports/hunt-location-repository';

export class ListHuntLocationsUseCase {
  constructor(private readonly locationRepository: HuntLocationRepository) {}

  execute(): readonly HuntLocation[] {
    return this.locationRepository.findAll();
  }
}
