import type { ReactNode } from 'react';
import type { Recipe } from '../../types';
import { displayRecipeTitle } from '../../utils/recipeTitle';
import { recipeTime } from '../../utils/recipePresentation';
import { resolveRecipeImage } from '../../utils/recipeImage';

interface RecipeListItemProps {
  recipe: Recipe;
  detail?: string;
  onOpen?: () => void;
  children?: ReactNode;
}

export function RecipeListItem({ recipe, detail, onOpen, children }: RecipeListItemProps) {
  const content = <><div className="mise-collection-image">{recipe.image ? <img src={resolveRecipeImage(recipe.image)} alt="" loading="lazy" /> : <span>M</span>}</div><div className="mise-collection-copy"><h2>{displayRecipeTitle(recipe)}</h2><p>{detail ?? [recipe.structureTag, recipeTime(recipe)].filter(Boolean).join(' · ')}</p></div></>;
  return <article className="mise-collection-row">{onOpen ? <button type="button" className="mise-collection-open" onClick={onOpen} aria-label={`打开菜谱：${displayRecipeTitle(recipe)}`}>{content}</button> : <div className="mise-collection-open">{content}</div>}{children && <div className="mise-collection-actions">{children}</div>}</article>;
}
