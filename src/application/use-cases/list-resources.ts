import type { BotResource } from '../../domain/entities/bot-resource';
import type { ResourceRepository } from '../ports/resource-repository';

export class ListResourcesUseCase {
  constructor(private readonly resourceRepository: ResourceRepository) {}

  execute(): readonly BotResource[] {
    return this.resourceRepository.findAll();
  }
}
