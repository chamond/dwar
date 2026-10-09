import { ProfessionRecipe, type ProfessionRecipeId } from '../../domain/entities/profession-recipe';
import type { BotResourceId } from '../../domain/entities/bot-resource';
import type { ProfessionRecipeRepository } from '../../application/ports/profession-recipe-repository';
import type { ResourceRepository } from '../../application/ports/resource-repository';

interface LocalProfessionRecipeRecord {
  id: ProfessionRecipeId;
  name: string;
  recipeId: number;
  resourceId?: BotResourceId;
  cooldownMs?: number;
  maxAmountPerRequest: number;
}

const LOCAL_PROFESSION_RECIPE_RECORDS = [
  {
    id: 'agate-dust',
    name: 'Пыль агата',
    recipeId: 51536385,
    resourceId: 'agate',
    maxAmountPerRequest: 10
  },
  {
    id: 'aquamarine-dust',
    name: 'Пыль аквамарина',
    recipeId: 51536386,
    resourceId: 'aquamarine',
    maxAmountPerRequest: 10
  },
  {
    id: 'turquoise-dust',
    name: 'Пыль бирюзы',
    recipeId: 51536387,
    resourceId: 'turquoise',
    maxAmountPerRequest: 10
  },
  {
    id: 'geb-destruction-element',
    name: 'Элемент сокрушения Геб',
    recipeId: 61024293,
    maxAmountPerRequest: 10,
    cooldownMs: 15 * 60_000
  }
] satisfies readonly LocalProfessionRecipeRecord[];

export class StaticProfessionRecipeRepository implements ProfessionRecipeRepository {
  private readonly recipes: readonly ProfessionRecipe[];

  constructor(resourceRepository: ResourceRepository) {
    this.recipes = LOCAL_PROFESSION_RECIPE_RECORDS.map((record) => {
      const resource = record.resourceId ? resourceRepository.findById(record.resourceId) : null;

      if (record.resourceId && !resource) {
        throw new Error(`Profession recipe ${record.id} references unknown resource ${record.resourceId}.`);
      }

      return ProfessionRecipe.create({
        id: record.id,
        name: record.name,
        recipeId: record.recipeId,
        ...(resource ? { resource } : {}),
        ...(record.cooldownMs !== undefined ? { cooldownMs: record.cooldownMs } : {}),
        maxAmountPerRequest: record.maxAmountPerRequest
      });
    });
  }

  findAll(): readonly ProfessionRecipe[] {
    return this.recipes;
  }

  findById(id: ProfessionRecipeId): ProfessionRecipe | null {
    return this.recipes.find((recipe) => recipe.getId() === id) ?? null;
  }
}
