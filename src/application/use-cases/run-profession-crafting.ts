import type { BotResourceId } from '../../domain/entities/bot-resource';
import type { ProfessionRecipe, ProfessionRecipeId } from '../../domain/entities/profession-recipe';
import type {
  BackpackItemQuantityLookup,
  BackpackItemQuantityReader
} from '../ports/backpack-item-quantity-reader';
import type { Delay } from '../ports/delay';
import type { ProfessionRecipeCrafter } from '../ports/profession-recipe-crafter';
import type { ProfessionRecipeRepository } from '../ports/profession-recipe-repository';

const DEFAULT_RESOURCE_BACKPACK_GROUP = 3;
const DEFAULT_CRAFT_AMOUNT_PER_REQUEST = 10;
const DEFAULT_CRAFT_COOLDOWN_PER_ITEM_MS = 30_000;
const DEFAULT_POST_CRAFT_DELAY_MS = 5_000;
const DEFAULT_NO_SELECTED_RECIPE_DELAY_MS = 5_000;
const DEFAULT_SELECTION_REFRESH_DELAY_MS = 1_000;

export interface ProfessionCraftingConfig {
  resourceBackpackGroup: number;
  amountPerRequest: number;
  cooldownPerItemMs: number;
  postCraftDelayMs: number;
  noSelectedRecipeDelayMs: number;
  selectionRefreshDelayMs: number;
}

export interface RunProfessionCraftingInput {
  getAmountPerRequest?: (() => number) | undefined;
  getSelectedRecipeIds(): readonly ProfessionRecipeId[];
  observer?: ProfessionCraftingObserver;
  signal?: AbortSignal;
}

export interface ProfessionCraftingObserver {
  handle(event: ProfessionCraftingEvent): void;
}

export interface ProfessionCraftingRecipeInfo {
  id: ProfessionRecipeId;
  name: string;
  recipeId: number;
  resourceId: BotResourceId;
  resourceName: string;
  markerColor: string;
  level: number;
}

export interface ProfessionCraftingBackpackLookupInfo {
  recipe: ProfessionCraftingRecipeInfo;
  artifactId: number;
  slotSelector: string;
  quantitySelector: string;
  matchedSlotCount: number;
  quantityTexts: readonly string[];
  quantity: number;
}

export type ProfessionCraftingEvent =
  | {
      type: 'no-recipe-selected';
      delayMs: number;
    }
  | {
      type: 'backpack-check-started';
      group: number;
      recipes: readonly ProfessionCraftingRecipeInfo[];
    }
  | {
      type: 'backpack-check-completed';
      group: number;
      requestUrl: string;
      responseUrl: string;
      contentType: string;
      htmlLength: number;
      documentTitle: string;
      artifactSlotCount: number;
      identifiedArtifactSlotCount: number;
      detectedArtifactIds: readonly string[];
      lookups: readonly ProfessionCraftingBackpackLookupInfo[];
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
    };

export class RunProfessionCraftingUseCase {
  private readonly config: ProfessionCraftingConfig;

  constructor(
    private readonly recipeRepository: ProfessionRecipeRepository,
    private readonly backpackItemQuantityReader: BackpackItemQuantityReader,
    private readonly crafter: ProfessionRecipeCrafter,
    private readonly delay: Delay,
    config: Partial<ProfessionCraftingConfig> = {}
  ) {
    this.config = {
      resourceBackpackGroup: config.resourceBackpackGroup ?? DEFAULT_RESOURCE_BACKPACK_GROUP,
      amountPerRequest: config.amountPerRequest ?? DEFAULT_CRAFT_AMOUNT_PER_REQUEST,
      cooldownPerItemMs: config.cooldownPerItemMs ?? DEFAULT_CRAFT_COOLDOWN_PER_ITEM_MS,
      postCraftDelayMs: config.postCraftDelayMs ?? DEFAULT_POST_CRAFT_DELAY_MS,
      noSelectedRecipeDelayMs: config.noSelectedRecipeDelayMs ?? DEFAULT_NO_SELECTED_RECIPE_DELAY_MS,
      selectionRefreshDelayMs: config.selectionRefreshDelayMs ?? DEFAULT_SELECTION_REFRESH_DELAY_MS
    };

    if (!Number.isInteger(this.config.resourceBackpackGroup) || this.config.resourceBackpackGroup < 0) {
      throw new Error('Crafting resource backpack group must be a non-negative integer.');
    }
  }

  async execute(input: RunProfessionCraftingInput): Promise<void> {
    const stoppedRecipeIds = new Set<ProfessionRecipeId>();

    while (!input.signal?.aborted) {
      const selectedRecipes = this.getSelectedRecipes(input.getSelectedRecipeIds());
      this.restoreDeselectedRecipes(selectedRecipes, stoppedRecipeIds);

      if (selectedRecipes.length === 0) {
        this.emit(input, {
          type: 'no-recipe-selected',
          delayMs: this.config.noSelectedRecipeDelayMs
        });
        await this.delay.wait(this.config.noSelectedRecipeDelayMs, input.signal);
        continue;
      }

      const runnableRecipes = selectedRecipes.filter((recipe) => !stoppedRecipeIds.has(recipe.getId()));

      if (runnableRecipes.length === 0) {
        await this.delay.wait(this.config.selectionRefreshDelayMs, input.signal);
        continue;
      }

      const lookups = await this.readBackpackQuantities(runnableRecipes, input);
      const craftTasks: Promise<void>[] = [];

      for (const { recipe, lookup } of lookups) {
        if (lookup.quantity === 0) {
          stoppedRecipeIds.add(recipe.getId());
          this.emit(input, {
            type: 'recipe-stopped',
            recipe: createRecipeInfo(recipe)
          });
          continue;
        }

        craftTasks.push(this.craftRecipe(recipe, lookup.quantity, input));
      }

      await waitForCraftTasks(craftTasks);
    }
  }

  private async readBackpackQuantities(
    recipes: readonly ProfessionRecipe[],
    input: RunProfessionCraftingInput
  ): Promise<readonly RecipeBackpackLookup[]> {
    const recipeInfos = recipes.map(createRecipeInfo);
    this.emit(input, {
      type: 'backpack-check-started',
      group: this.config.resourceBackpackGroup,
      recipes: recipeInfos
    });
    const result = await this.backpackItemQuantityReader.readQuantities(
      recipes.map((recipe) => recipe.getResource().getArtifactId()),
      {
        group: this.config.resourceBackpackGroup,
        signal: input.signal
      }
    );
    const lookups = recipes.map((recipe) => {
      return {
        recipe,
        lookup: getRequiredLookup(result.lookups, recipe.getResource().getArtifactId())
      };
    });

    this.emit(input, {
      type: 'backpack-check-completed',
      group: this.config.resourceBackpackGroup,
      requestUrl: result.requestUrl,
      responseUrl: result.responseUrl,
      contentType: result.contentType,
      htmlLength: result.htmlLength,
      documentTitle: result.documentTitle,
      artifactSlotCount: result.artifactSlotCount,
      identifiedArtifactSlotCount: result.identifiedArtifactSlotCount,
      detectedArtifactIds: result.detectedArtifactIds,
      lookups: lookups.map(({ recipe, lookup }) => createBackpackLookupInfo(recipe, lookup))
    });

    return lookups;
  }

  private async craftRecipe(
    recipe: ProfessionRecipe,
    availableResourceAmount: number,
    input: RunProfessionCraftingInput
  ): Promise<void> {
    const recipeInfo = createRecipeInfo(recipe);
    const amount = this.getCraftAmount(recipe, input.getAmountPerRequest?.(), availableResourceAmount);

    this.emit(input, {
      type: 'craft-request-started',
      recipe: recipeInfo,
      amount
    });
    await this.crafter.craft(recipe, amount, { signal: input.signal });

    const durationMs = amount * this.config.cooldownPerItemMs + this.config.postCraftDelayMs;
    this.emit(input, {
      type: 'craft-started',
      recipe: recipeInfo,
      amount,
      durationMs,
      remainingResourceAmount: availableResourceAmount - amount
    });
    await this.delay.wait(durationMs);
    this.emit(input, {
      type: 'craft-completed',
      recipe: recipeInfo
    });
  }

  private restoreDeselectedRecipes(
    selectedRecipes: readonly ProfessionRecipe[],
    stoppedRecipeIds: Set<ProfessionRecipeId>
  ): void {
    const selectedRecipeIds = new Set(selectedRecipes.map((recipe) => recipe.getId()));

    for (const stoppedRecipeId of stoppedRecipeIds) {
      if (!selectedRecipeIds.has(stoppedRecipeId)) {
        stoppedRecipeIds.delete(stoppedRecipeId);
      }
    }
  }

  private getCraftAmount(
    recipe: ProfessionRecipe,
    requestedAmount: number | undefined,
    availableResourceAmount: number
  ): number {
    const amount = normalizeCraftAmount(requestedAmount ?? this.config.amountPerRequest, this.config.amountPerRequest);

    return Math.min(
      amount,
      this.config.amountPerRequest,
      recipe.getMaxAmountPerRequest(),
      availableResourceAmount
    );
  }

  private getSelectedRecipes(selectedRecipeIds: readonly ProfessionRecipeId[]): readonly ProfessionRecipe[] {
    if (selectedRecipeIds.length === 0) {
      return [];
    }

    const selectedRecipeIdSet = new Set(selectedRecipeIds);
    const selectedRecipes = this.recipeRepository
      .findAll()
      .filter((recipe) => selectedRecipeIdSet.has(recipe.getId()));

    if (selectedRecipes.length === 0) {
      throw new Error('Selected profession recipes are not known by the bot.');
    }

    return selectedRecipes;
  }

  private emit(input: RunProfessionCraftingInput, event: ProfessionCraftingEvent): void {
    input.observer?.handle(event);
  }
}

interface RecipeBackpackLookup {
  recipe: ProfessionRecipe;
  lookup: BackpackItemQuantityLookup;
}

function createRecipeInfo(recipe: ProfessionRecipe): ProfessionCraftingRecipeInfo {
  const resource = recipe.getResource();

  return {
    id: recipe.getId(),
    name: recipe.getName(),
    recipeId: recipe.getRecipeId(),
    resourceId: resource.getId(),
    resourceName: resource.getName(),
    markerColor: resource.getMarkerColor(),
    level: resource.getLevel()
  };
}

function createBackpackLookupInfo(
  recipe: ProfessionRecipe,
  lookup: BackpackItemQuantityLookup
): ProfessionCraftingBackpackLookupInfo {
  return {
    recipe: createRecipeInfo(recipe),
    artifactId: lookup.artifactId,
    slotSelector: lookup.slotSelector,
    quantitySelector: lookup.quantitySelector,
    matchedSlotCount: lookup.matchedSlotCount,
    quantityTexts: lookup.quantityTexts,
    quantity: lookup.quantity
  };
}

function getRequiredLookup(
  lookups: readonly BackpackItemQuantityLookup[],
  artifactId: number
): BackpackItemQuantityLookup {
  const lookup = lookups.find((candidate) => candidate.artifactId === artifactId);

  if (!lookup) {
    throw new Error(`Backpack quantity result is missing artifact ${artifactId}.`);
  }

  return lookup;
}

async function waitForCraftTasks(tasks: readonly Promise<void>[]): Promise<void> {
  const results = await Promise.allSettled(tasks);
  const rejectedResult = results.find((result): result is PromiseRejectedResult => result.status === 'rejected');

  if (rejectedResult) {
    throw rejectedResult.reason;
  }
}

function normalizeCraftAmount(amount: number, fallbackAmount: number): number {
  if (!Number.isFinite(amount)) {
    return fallbackAmount;
  }

  return Math.max(1, Math.trunc(amount));
}
