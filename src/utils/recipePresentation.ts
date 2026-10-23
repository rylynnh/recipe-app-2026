import type { Recipe } from '../types';
export function recipeSummary(recipe: Recipe) {
  return recipe.description?.trim() || '';
}
export function recipeDurationSeconds(recipe: Pick<Recipe, 'steps'>): number {
  return recipe.steps.reduce((total, step) => {
    const seconds = step.detectedDurationSeconds;
    return step.hasTimer && typeof seconds === 'number' && Number.isFinite(seconds) && seconds > 0
      ? total + seconds : total;
  }, 0);
}
export function recipeTime(recipe: Pick<Recipe, 'steps'>) {
  const totalMinutes = Math.floor(recipeDurationSeconds(recipe) / 60);
  if (totalMinutes < 1) return '';
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return [hours && `${hours} 小时`, minutes && `${minutes} 分钟`].filter(Boolean).join(' ');
}
