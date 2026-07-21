import { BotResource, type BotResourceProps } from '../../domain/entities/bot-resource';
import type { ResourceRepository } from '../../application/ports/resource-repository';

const LOCAL_RESOURCE_RECORDS = [
  {
    id: 'agate',
    name: 'Агат',
    markerColor: '#2f6dff',
    articleId: 362,
    level: 0
  },
  {
    id: 'aquamarine',
    name: 'Аквамарин',
    markerColor: '#63d7ff',
    articleId: 363,
    level: 0
  },
  {
    id: 'turquoise',
    name: 'Бирюза',
    markerColor: '#28d8be',
    articleId: 364,
    level: 0
  }
] as const satisfies readonly BotResourceProps[];

export class StaticResourceRepository implements ResourceRepository {
  private readonly resources = LOCAL_RESOURCE_RECORDS.map((record) => BotResource.create(record));

  findAll(): readonly BotResource[] {
    return this.resources;
  }

  findByArticleId(articleId: number): BotResource | null {
    return this.resources.find((resource) => resource.getArticleId() === articleId) ?? null;
  }
}
