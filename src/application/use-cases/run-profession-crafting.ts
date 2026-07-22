import type { BotResourceId } from '../../domain/entities/bot-resource';
import type { ProfessionRecipe, ProfessionRecipeId } from '../../domain/entities/profession-recipe';
import type { Delay } from '../ports/delay';
import type { ProfessionRecipeCrafter } from '../ports/profession-recipe-crafter';
import type { ProfessionRecipeRepository } from '../ports/profession-recipe-repository';

const DEFAULT_CRAFT_AMOUNT_PER_REQUEST = 10;
const DEFAULT_CRAFT_COOLDOWN_PER_ITEM_MS = 30_000;
const DEFAULT_POST_CRAFT_DELAY_MS = 5_000;
const DEFAULT_NO_SELECTED_RECIPE_DELAY_MS = 5_000;
const DEFAULT_SELECTION_REFRESH_DELAY_MS = 1_000;

export interface ProfessionCraftingConfig {
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
  markerColor: string;
  level: number;
}

export type ProfessionCraftingEvent =
  | {
      type: 'no-recipe-selected';
      delayMs: number;
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
      cooldownMs: number;
    }
  | {
      type: 'craft-completed';
      recipe: ProfessionCraftingRecipeInfo;
    }
  | {
      type: 'next-craft-delayed';
      recipe: ProfessionCraftingRecipeInfo;
      delayMs: number;
    };

export class RunProfessionCraftingUseCase {
  private readonly config: ProfessionCraftingConfig;

  constructor(
    private readonly recipeRepository: ProfessionRecipeRepository,
    private readonly crafter: ProfessionRecipeCrafter,
    private readonly delay: Delay,
    config: Partial<ProfessionCraftingConfig> = {}
  ) {
    this.config = {
      amountPerRequest: config.amountPerRequest ?? DEFAULT_CRAFT_AMOUNT_PER_REQUEST,
      cooldownPerItemMs: config.cooldownPerItemMs ?? DEFAULT_CRAFT_COOLDOWN_PER_ITEM_MS,
      postCraftDelayMs: config.postCraftDelayMs ?? DEFAULT_POST_CRAFT_DELAY_MS,
      noSelectedRecipeDelayMs: config.noSelectedRecipeDelayMs ?? DEFAULT_NO_SELECTED_RECIPE_DELAY_MS,
      selectionRefreshDelayMs: config.selectionRefreshDelayMs ?? DEFAULT_SELECTION_REFRESH_DELAY_MS
    };
  }

  async execute(input: RunProfessionCraftingInput): Promise<void> {
    const abort = createAbortHandle(input.signal);
    const runInput: RunProfessionCraftingInput = {
      ...input,
      signal: abort.signal
    };
    const activeTasks = new Map<ProfessionRecipeId, Promise<void>>();
    let taskError: unknown = null;

    try {
      while (!abort.signal.aborted) {
        const selectedRecipes = this.getSelectedRecipes(input.getSelectedRecipeIds());

        for (const recipe of selectedRecipes) {
          const recipeId = recipe.getId();

          if (activeTasks.has(recipeId)) {
            continue;
          }

          const task = this.runRecipeLoop(recipe, runInput)
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
          this.emit(runInput, {
            type: 'no-recipe-selected',
            delayMs: this.config.noSelectedRecipeDelayMs
          });
          await this.delay.wait(this.config.noSelectedRecipeDelayMs, abort.signal);
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

  private async runRecipeLoop(recipe: ProfessionRecipe, input: RunProfessionCraftingInput): Promise<void> {
    while (!input.signal?.aborted && this.isRecipeSelected(recipe, input)) {
      await this.craftRecipe(recipe, input);

      if (this.config.postCraftDelayMs <= 0 || input.signal?.aborted || !this.isRecipeSelected(recipe, input)) {
        continue;
      }

      this.emit(input, {
        type: 'next-craft-delayed',
        recipe: createRecipeInfo(recipe),
        delayMs: this.config.postCraftDelayMs
      });
      await this.delay.wait(this.config.postCraftDelayMs, input.signal);
    }
  }

  private async craftRecipe(recipe: ProfessionRecipe, input: RunProfessionCraftingInput): Promise<void> {
    const amount = this.getCraftAmount(recipe, input.getAmountPerRequest?.());
    const recipeInfo = createRecipeInfo(recipe);

    this.emit(input, {
      type: 'craft-request-started',
      recipe: recipeInfo,
      amount
    });
    await this.crafter.craft(recipe, amount, { signal: input.signal });

    const cooldownMs = amount * this.config.cooldownPerItemMs;
    this.emit(input, {
      type: 'craft-started',
      recipe: recipeInfo,
      amount,
      cooldownMs
    });
    await this.delay.wait(cooldownMs);
    this.emit(input, {
      type: 'craft-completed',
      recipe: recipeInfo
    });
  }

  private getCraftAmount(recipe: ProfessionRecipe, requestedAmount: number | undefined): number {
    const amount = normalizeCraftAmount(requestedAmount ?? this.config.amountPerRequest, this.config.amountPerRequest);

    return Math.min(amount, this.config.amountPerRequest, recipe.getMaxAmountPerRequest());
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
