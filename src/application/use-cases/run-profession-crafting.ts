import {
  EMPTY,
  catchError,
  concat,
  defer,
  ignoreElements,
  map,
  merge,
  of,
  repeat,
  switchMap,
  take,
  throwError,
  type Observable
} from 'rxjs';
import type {
  ProfessionCraftingEvent,
  ProfessionCraftingRecipeInfo
} from '../events/profession-crafting-event';
import type { ProfessionRecipe, ProfessionRecipeId } from '../../domain/entities/profession-recipe';
import type {
  BackpackItemQuantity,
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
}

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

  execute(input: RunProfessionCraftingInput): Observable<ProfessionCraftingEvent> {
    return defer(() => {
      const stoppedRecipeIds = new Set<ProfessionRecipeId>();

      return defer(() => this.runIteration(input, stoppedRecipeIds)).pipe(repeat());
    });
  }

  private runIteration(
    input: RunProfessionCraftingInput,
    stoppedRecipeIds: Set<ProfessionRecipeId>
  ): Observable<ProfessionCraftingEvent> {
    const selectedRecipes = this.getSelectedRecipes(input.getSelectedRecipeIds());
    this.restoreDeselectedRecipes(selectedRecipes, stoppedRecipeIds);

    if (selectedRecipes.length === 0) {
      const noRecipeEvent: ProfessionCraftingEvent = {
        type: 'no-recipe-selected',
        delayMs: this.config.noSelectedRecipeDelayMs
      };

      return concat(
        of(noRecipeEvent),
        this.delay.wait(this.config.noSelectedRecipeDelayMs).pipe(ignoreElements()),
        of<ProfessionCraftingEvent>({ type: 'crafting-cycle-completed' })
      );
    }

    const runnableRecipes = selectedRecipes.filter((recipe) => !stoppedRecipeIds.has(recipe.getId()));

    if (runnableRecipes.length === 0) {
      return concat(
        this.delay.wait(this.config.selectionRefreshDelayMs).pipe(ignoreElements()),
        of<ProfessionCraftingEvent>({ type: 'crafting-cycle-completed' })
      );
    }

    const backpackCheckEvent: ProfessionCraftingEvent = {
      type: 'backpack-check-started',
      recipes: runnableRecipes.map(createRecipeInfo)
    };

    return concat(
      of(backpackCheckEvent),
      this.readBackpackQuantities(runnableRecipes).pipe(
        switchMap((lookups) => this.runCraftTasks(lookups, stoppedRecipeIds, input))
      )
    );
  }

  private readBackpackQuantities(
    recipes: readonly ProfessionRecipe[]
  ): Observable<readonly RecipeBackpackLookup[]> {
    return this.backpackItemQuantityReader.readQuantities(
      recipes.map((recipe) => recipe.getResource().getArticleId()),
      {
        group: this.config.resourceBackpackGroup
      }
    ).pipe(
      map((quantities) => {
        return recipes.map((recipe) => ({
          recipe,
          availableAmount: getRequiredQuantity(
            quantities,
            recipe.getResource().getArticleId()
          ).quantity
        }));
      }),
      take(1)
    );
  }

  private runCraftTasks(
    lookups: readonly RecipeBackpackLookup[],
    stoppedRecipeIds: Set<ProfessionRecipeId>,
    input: RunProfessionCraftingInput
  ): Observable<ProfessionCraftingEvent> {
    const taskErrors: unknown[] = [];
    const tasks = lookups.map(({ recipe, availableAmount }) => {
      const task = availableAmount <= 0
        ? defer(() => {
            stoppedRecipeIds.add(recipe.getId());

            return of<ProfessionCraftingEvent>({
              type: 'recipe-stopped',
              recipe: createRecipeInfo(recipe)
            });
          })
        : this.craftRecipe(recipe, availableAmount, input);

      return task.pipe(
        catchError((error: unknown) => {
          taskErrors.push(error);
          return EMPTY;
        })
      );
    });

    return concat(
      merge(...tasks),
      defer(() => {
        if (taskErrors.length > 0) {
          return throwError(() => taskErrors[0]);
        }

        return of<ProfessionCraftingEvent>({
          type: 'crafting-cycle-completed'
        });
      })
    );
  }

  private craftRecipe(
    recipe: ProfessionRecipe,
    availableResourceAmount: number,
    input: RunProfessionCraftingInput
  ): Observable<ProfessionCraftingEvent> {
    return defer(() => {
      const recipeInfo = createRecipeInfo(recipe);
      const amount = this.getCraftAmount(
        recipe,
        input.getAmountPerRequest?.(),
        availableResourceAmount
      );
      const requestStartedEvent: ProfessionCraftingEvent = {
        type: 'craft-request-started',
        recipe: recipeInfo,
        amount
      };

      return concat(
        of(requestStartedEvent),
        this.crafter.craft(recipe, amount).pipe(
          switchMap(() => {
            const durationMs = amount * this.config.cooldownPerItemMs + this.config.postCraftDelayMs;
            const craftStartedEvent: ProfessionCraftingEvent = {
              type: 'craft-started',
              recipe: recipeInfo,
              amount,
              durationMs,
              remainingResourceAmount: availableResourceAmount - amount
            };
            const craftCompletedEvent: ProfessionCraftingEvent = {
              type: 'craft-completed',
              recipe: recipeInfo
            };

            return concat(
              of(craftStartedEvent),
              this.delay.wait(durationMs).pipe(ignoreElements()),
              of(craftCompletedEvent)
            );
          })
        )
      );
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
    const amount = normalizeCraftAmount(
      requestedAmount ?? this.config.amountPerRequest,
      this.config.amountPerRequest
    );

    return Math.min(
      amount,
      this.config.amountPerRequest,
      recipe.getMaxAmountPerRequest(),
      availableResourceAmount
    );
  }

  private getSelectedRecipes(
    selectedRecipeIds: readonly ProfessionRecipeId[]
  ): readonly ProfessionRecipe[] {
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
}

interface RecipeBackpackLookup {
  recipe: ProfessionRecipe;
  availableAmount: number;
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

function getRequiredQuantity(
  quantities: readonly BackpackItemQuantity[],
  articleId: number
): BackpackItemQuantity {
  const quantity = quantities.find((candidate) => candidate.articleId === articleId);

  if (!quantity) {
    throw new Error(`Backpack quantity result is missing resource article ${articleId}.`);
  }

  return quantity;
}

function normalizeCraftAmount(amount: number, fallbackAmount: number): number {
  if (!Number.isFinite(amount)) {
    return fallbackAmount;
  }

  return Math.max(1, Math.trunc(amount));
}
