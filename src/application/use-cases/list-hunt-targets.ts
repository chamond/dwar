import type { BotHuntTarget } from '../../domain/entities/bot-hunt-target';
import type { HuntTargetRepository } from '../ports/hunt-target-repository';

export class ListHuntTargetsUseCase {
  constructor(private readonly huntTargetRepository: HuntTargetRepository) {}

  execute(): readonly BotHuntTarget[] {
    return this.huntTargetRepository.findAll();
  }
}
