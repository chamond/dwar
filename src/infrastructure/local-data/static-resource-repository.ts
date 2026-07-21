import { BotResource, type BotResourceProps } from '../../domain/entities/bot-resource';
import type { ResourceRepository } from '../../application/ports/resource-repository';

const LOCAL_RESOURCE_RECORDS = [
  {
    id: 'agate',
    name: 'Агат',
    markerColor: '#2f6dff'
  },
  {
    id: 'aquamarine',
    name: 'Аквамарин',
    markerColor: '#63d7ff'
  },
  {
    id: 'turquoise',
    name: 'Бирюза',
    markerColor: '#28d8be'
  }
] as const satisfies readonly BotResourceProps[];

export class StaticResourceRepository implements ResourceRepository {
  private readonly resources = LOCAL_RESOURCE_RECORDS.map((record) => BotResource.create(record));

  findAll(): readonly BotResource[] {
    return this.resources;
  }
}
