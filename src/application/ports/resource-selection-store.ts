import type { BotResourceId } from '../../domain/entities/bot-resource';

export interface ResourceSelectionStore {
  load(): readonly BotResourceId[] | null;
  save(resourceIds: readonly BotResourceId[]): void;
}
