import type { BotResourceId } from '../../domain/entities/bot-resource';

export type ResourceProbabilities = Readonly<Partial<Record<BotResourceId, number>>>;

export interface ResourceProbabilityStore {
  load(): ResourceProbabilities | null;
  save(probabilities: ResourceProbabilities): void;
}
