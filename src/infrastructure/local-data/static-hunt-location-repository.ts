import type { HuntLocationRepository } from '../../application/ports/hunt-location-repository';
import { HuntLocation, type HuntLocationId, type HuntLocationProps } from '../../domain/entities/hunt-location';

const LOCAL_HUNT_LOCATION_RECORDS = [
  {
    id: 'baurville',
    name: 'Селение Баурвилл',
    areaId: 6
  },
  {
    id: 'kingala-village',
    name: 'Деревня Кингала',
    areaId: 18
  },
  {
    id: 'mass-grave',
    name: 'Братское захоронение',
    areaId: 156
  },
  {
    id: 'royal-tombs',
    name: 'Королевские усыпальницы',
    areaId: 157
  },
  {
    id: 'hills-of-peace',
    name: 'Холмы умиротворения',
    areaId: 278
  }
] as const satisfies readonly HuntLocationProps[];

export class StaticHuntLocationRepository implements HuntLocationRepository {
  private readonly locations = LOCAL_HUNT_LOCATION_RECORDS.map((record) => HuntLocation.create(record));

  findAll(): readonly HuntLocation[] {
    return this.locations;
  }

  findById(id: HuntLocationId): HuntLocation | null {
    return this.locations.find((location) => location.getId() === id) ?? null;
  }
}
