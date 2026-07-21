import type { BotResource } from '../../domain/entities/bot-resource';

export interface ResourceRepository {
  findAll(): readonly BotResource[];
}
