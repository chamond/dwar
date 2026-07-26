import type { BotResourceId } from '../../domain/entities/bot-resource';
import type { ProfessionRecipeId } from '../../domain/entities/profession-recipe';

export interface ProfessionCraftingRecipeInfo {
  id: ProfessionRecipeId;
  name: string;
  recipeId: number;
  resourceId: BotResourceId;
  resourceName: string;
  markerColor: string;
  level: number;
}

export type ProfessionCraftingEvent =
  | {
      type: 'no-recipe-selected';
      delayMs: number;
    }
  | {
      type: 'backpack-check-started';
      recipes: readonly ProfessionCraftingRecipeInfo[];
    }
  | {
      type: 'craft-request-started';
      recipe: ProfessionCraftingRecipeInfo;
      amount: number;
    }
  | {
      type: 'craft-started';
      recipe: ProfessionCraftingRecipeInfo;
      amount: number;
      durationMs: number;
      remainingResourceAmount: number;
    }
  | {
      type: 'craft-completed';
      recipe: ProfessionCraftingRecipeInfo;
    }
  | {
      type: 'recipe-stopped';
      recipe: ProfessionCraftingRecipeInfo;
    }
  | {
      type: 'crafting-cycle-completed';
    };
