import type {
  BotHuntTarget,
  BotHuntTargetId
} from '../../domain/entities/bot-hunt-target';

export interface HuntTargetRepository {
  findAll(): readonly BotHuntTarget[];
  findById(id: BotHuntTargetId): BotHuntTarget | null;
}
