/** Editorial display titles; original titles remain available to recipe search. */
export function displayRecipeTitle(recipe: { title: string }): string {
  return recipe.title === '酱牛肉·卤牛肉·牛腱子' ? '酱牛肉' : recipe.title;
}
