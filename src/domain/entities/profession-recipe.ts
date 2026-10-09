import type { BotResource, BotResourceId, BotResourceSnapshot } from './bot-resource';

export type ProfessionRecipeId = 'agate-dust' | 'aquamarine-dust' | 'turquoise-dust' | 'geb-destruction-element';

export interface ProfessionRecipeProps {
  id: ProfessionRecipeId;
  name: string;
  recipeId: number;
  resource?: BotResource;
  cooldownMs?: number;
  maxAmountPerRequest: number;
}

export interface ProfessionRecipeSnapshot {
  id: ProfessionRecipeId;
  name: string;
  recipeId: number;
  resourceId: BotResourceId | null;
  resource: BotResourceSnapshot | null;
  markerColor: string;
  level: number | null;
  maxAmountPerRequest: number;
}

export class ProfessionRecipe {
  private constructor(
    private readonly id: ProfessionRecipeId,
    private readonly name: string,
    private readonly recipeId: number,
    private readonly resource: BotResource | null,
    private readonly maxAmountPerRequest: number,
    private readonly cooldownMs: number | null
  ) {}

  static create(props: ProfessionRecipeProps): ProfessionRecipe {
    const name = props.name.trim();

    if (name.length === 0) {
      throw new Error('Profession recipe name is required.');
    }

    if (!Number.isInteger(props.recipeId) || props.recipeId <= 0) {
      throw new Error('Profession recipe server id must be a positive integer.');
    }

    if (!Number.isInteger(props.maxAmountPerRequest) || props.maxAmountPerRequest <= 0) {
      throw new Error('Profession recipe max amount must be a positive integer.');
    }

    if (props.cooldownMs !== undefined && (!Number.isInteger(props.cooldownMs) || props.cooldownMs <= 0)) {
      throw new Error('Profession recipe cooldown must be a positive integer.');
    }

    return new ProfessionRecipe(
      props.id, name, props.recipeId, props.resource ?? null,
      props.maxAmountPerRequest, props.cooldownMs ?? null
    );
  }

  getId(): ProfessionRecipeId {
    return this.id;
  }

  getName(): string {
    return this.name;
  }

  getRecipeId(): number {
    return this.recipeId;
  }

  getResource(): BotResource | null {
    return this.resource;
  }

  getMaxAmountPerRequest(): number {
    return this.maxAmountPerRequest;
  }

  getCooldownMs(): number | null {
    return this.cooldownMs;
  }

  toSnapshot(): ProfessionRecipeSnapshot {
    const resource = this.resource?.toSnapshot() ?? null;

    return {
      id: this.id,
      name: this.name,
      recipeId: this.recipeId,
      resourceId: this.resource?.getId() ?? null,
      resource,
      markerColor: resource?.markerColor ?? '#d8d1c1',
      level: resource?.level ?? null,
      maxAmountPerRequest: this.maxAmountPerRequest
    };
  }
}
