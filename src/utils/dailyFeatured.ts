import type { Recipe } from '../types';

export function featuredDayIndex(now = new Date()): number {
  // Use the same calendar day across devices, including visitors abroad.
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now);
  const value = (type: string) => Number(parts.find(part => part.type === type)?.value);
  return Math.floor(Date.UTC(value('year'), value('month') - 1, value('day')) / 86400000);
}

export function dailyFeaturedRecipe(recipes: Recipe[], day = featuredDayIndex()): Recipe | undefined {
  const eligible = recipes.filter(recipe => recipe.structureTag !== '酱料' && recipe.ingredients.length > 0);
  const withImages = eligible.filter(recipe => Boolean(recipe.image));
  const pool = [...(withImages.length ? withImages : eligible)].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  return pool.length ? pool[((day % pool.length) + pool.length) % pool.length] : undefined;
}
