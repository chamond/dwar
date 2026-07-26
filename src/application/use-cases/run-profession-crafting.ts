import type { BotResourceId } from '../../domain/entities/bot-resource';
import type { ProfessionRecipe, ProfessionRecipeId } from '../../domain/entities/profession-recipe';
import type { BackpackItemQuantityReader } from '../ports/backpack-item-quantity-reader';
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

export type ProfessionCraftingEvent =
  | {
      type: 'no-recipe-selected';
      delayMs: number;
    }
  | {
      type: 'resource-check-started';
      recipe: ProfessionCraftingRecipeInfo;
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
    const abort = createAbortHandle(input.signal);
    const runInput: RunProfessionCraftingInput = {
      ...input,
      signal: abort.signal
    };
    const activeTasks = new Map<ProfessionRecipeId, Promise<void>>();
    const stoppedRecipeIds = new Set<ProfessionRecipeId>();
    let taskError: unknown = null;

    try {
      while (!abort.signal.aborted) {
        const selectedRecipes = this.getSelectedRecipes(input.getSelectedRecipeIds());
        const selectedRecipeIds = new Set(selectedRecipes.map((recipe) => recipe.getId()));

        for (const stoppedRecipeId of stoppedRecipeIds) {
          if (!selectedRecipeIds.has(stoppedRecipeId)) {
            stoppedRecipeIds.delete(stoppedRecipeId);
          }
        }

        for (const recipe of selectedRecipes) {
          const recipeId = recipe.getId();

          if (activeTasks.has(recipeId) || stoppedRecipeIds.has(recipeId)) {
            continue;
          }

          const task = this.runRecipeLoop(recipe, runInput)
            .then((outcome) => {
              if (outcome === 'resource-unavailable') {
                stoppedRecipeIds.add(recipeId);
              }
            })
            .catch((error) => {
              if (!isAbortError(error)) {
                taskError = error;
                abort.abort();
              }
            })
            .finally(() => {
              activeTasks.delete(recipeId);
            });
          activeTasks.set(recipeId, task);
        }

        if (taskError) {
          break;
        }

        if (activeTasks.size === 0) {
          if (selectedRecipes.length === 0) {
            this.emit(runInput, {
              type: 'no-recipe-selected',
              delayMs: this.config.noSelectedRecipeDelayMs
            });
            await this.delay.wait(this.config.noSelectedRecipeDelayMs, abort.signal);
            continue;
          }

          await this.delay.wait(this.config.selectionRefreshDelayMs, abort.signal);
          continue;
        }

        await this.delay.wait(this.config.selectionRefreshDelayMs, abort.signal);
      }
    } catch (error) {
      if (!isAbortError(error)) {
        taskError = error;
      }
    } finally {
      abort.dispose();
      abort.abort();
      await Promise.allSettled(activeTasks.values());
    }

    if (taskError) {
      throw taskError;
    }
  }

  private async runRecipeLoop(
    recipe: ProfessionRecipe,
    input: RunProfessionCraftingInput
  ): Promise<'selection-ended' | 'resource-unavailable'> {
    while (!input.signal?.aborted && this.isRecipeSelected(recipe, input)) {
      const wasCrafted = await this.craftRecipe(recipe, input);

      if (!wasCrafted) {
        return 'resource-unavailable';
      }
    }

    return 'selection-ended';
  }

  private async craftRecipe(recipe: ProfessionRecipe, input: RunProfessionCraftingInput): Promise<boolean> {
    const recipeInfo = createRecipeInfo(recipe);

    this.emit(input, {
      type: 'resource-check-started',
      recipe: recipeInfo
    });
    const availableResourceAmount = await this.backpackItemQuantityReader.readQuantity(
      recipe.getResource().getArtifactId(),
      {
        group: this.config.resourceBackpackGroup,
        signal: input.signal
      }
    );

    if (availableResourceAmount === 0) {
      this.emit(input, {
        type: 'recipe-stopped',
        recipe: recipeInfo
      });

      return false;
    }

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

    return true;
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

  private isRecipeSelected(recipe: ProfessionRecipe, input: RunProfessionCraftingInput): boolean {
    return input.getSelectedRecipeIds().includes(recipe.getId());
  }

  private emit(input: RunProfessionCraftingInput, event: ProfessionCraftingEvent): void {
    input.observer?.handle(event);
  }
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

function normalizeCraftAmount(amount: number, fallbackAmount: number): number {
  if (!Number.isFinite(amount)) {
    return fallbackAmount;
  }

  return Math.max(1, Math.trunc(amount));
}

interface AbortHandle {
  signal: AbortSignal;
  abort(): void;
  dispose(): void;
}

function createAbortHandle(sourceSignal: AbortSignal | undefined): AbortHandle {
  const controller = new AbortController();

  if (!sourceSignal) {
    return {
      signal: controller.signal,
      abort(): void {
        controller.abort();
      },
      dispose(): void {
        return undefined;
      }
    };
  }

  const abort = (): void => {
    controller.abort();
  };

  if (sourceSignal.aborted) {
    controller.abort();
  } else {
    sourceSignal.addEventListener('abort', abort, { once: true });
  }

  return {
    signal: controller.signal,
    abort(): void {
      controller.abort();
    },
    dispose(): void {
      sourceSignal.removeEventListener('abort', abort);
    }
  };
}

function isAbortError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.name === 'AbortError';
  }

  return typeof error === 'object' && error !== null && 'name' in error && error.name === 'AbortError';
}
