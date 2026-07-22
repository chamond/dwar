export const PROFESSION_RECIPE_CRAFT_REQUEST = {
  method: 'POST',
  url: 'https://w1.dwar.ru/service_craft.php?f=1&mode=64&show=favorite&sort_order=asc&page=0&action=craft'
} as const;

export function buildProfessionRecipeCraftUrl(recipeId: number): string {
  return `${PROFESSION_RECIPE_CRAFT_REQUEST.url}&recipe_id=${encodeURIComponent(String(recipeId))}`;
}

export function buildProfessionRecipeCraftBody(amount: number): URLSearchParams {
  return new URLSearchParams({
    amount: String(amount)
  });
}
