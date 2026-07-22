import type { BotResource, BotResourceId } from '../../domain/entities/bot-resource';

export interface ResourceRepository {
  findAll(): readonly BotResource[];
  findById(id: BotResourceId): BotResource | null;
  findByArticleId(articleId: number): BotResource | null;
}
