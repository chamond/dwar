import type { BotResource, BotResourceId, BotResourceSnapshot } from './bot-resource';

export type ProfessionRecipeId = 'agate-dust' | 'aquamarine-dust' | 'turquoise-dust';

export interface ProfessionRecipeProps {
  id: ProfessionRecipeId;
  name: string;
  recipeId: number;
  resource: BotResource;
  maxAmountPerRequest: number;
}

export interface ProfessionRecipeSnapshot {
  id: ProfessionRecipeId;
  name: string;
  recipeId: number;
  resourceId: BotResourceId;
  resource: BotResourceSnapshot;
  markerColor: string;
  level: number;
  maxAmountPerRequest: number;
}

export class ProfessionRecipe {
  private constructor(
    private readonly id: ProfessionRecipeId,
    private readonly name: string,
    private readonly recipeId: number,
    private readonly resource: BotResource,
    private readonly maxAmountPerRequest: number
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

    return new ProfessionRecipe(props.id, name, props.recipeId, props.resource, props.maxAmountPerRequest);
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

  getResource(): BotResource {
    return this.resource;
  }

  getMaxAmountPerRequest(): number {
    return this.maxAmountPerRequest;
  }

  toSnapshot(): ProfessionRecipeSnapshot {
    const resource = this.resource.toSnapshot();

    return {
      id: this.id,
      name: this.name,
      recipeId: this.recipeId,
      resourceId: this.resource.getId(),
      resource,
      markerColor: resource.markerColor,
      level: resource.level,
      maxAmountPerRequest: this.maxAmountPerRequest
    };
  }
}
