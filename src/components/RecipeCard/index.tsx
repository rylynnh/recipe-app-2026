import { recipeTime } from '../../utils/recipePresentation';
import { displayRecipeTitle } from '../../utils/recipeTitle';
import { useNavigate } from 'react-router-dom';
import { Recipe } from '../../types';
import { resolveRecipeImage } from '../../utils/recipeImage';

interface RecipeCardProps {
  recipe: Recipe;
  variant?: 'portrait' | 'landscape' | 'compact';
}

export function RecipeCard({ recipe, variant = 'landscape' }: RecipeCardProps) {
  const navigate = useNavigate();
  const details = [
    recipeTime(recipe),
    recipe.mainIngredient.slice(0, 2).join(' / '),
  ].filter(Boolean).join(' · ');
  const aspectRatio = variant === 'landscape' ? '4 / 3' : variant === 'compact' ? '1 / 1' : '4 / 5';

  return (
    <button
      type="button"
      onClick={() => navigate(`/recipe/${recipe.id}`)}
      className={`group text-left ${variant === 'compact' ? 'w-[146px] flex-none' : 'w-full'}`}
    >
      <div className="relative w-full overflow-hidden rounded-card bg-[#E7E0D5]" style={{ aspectRatio }}>
        {recipe.image ? (
          <img
            src={resolveRecipeImage(recipe.image)}
            alt={displayRecipeTitle(recipe)}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center p-4">
            <span className="font-display text-center text-base leading-snug text-secondary line-clamp-3">{displayRecipeTitle(recipe)}</span>
          </div>
        )}
      </div>
      <div className="pb-1 pt-3">
        <h3 className="font-display mb-1 line-clamp-2 text-[17px] font-medium leading-snug text-primary transition-colors duration-200 group-hover:text-accent">
          {displayRecipeTitle(recipe)}
        </h3>
        {details && <p className="line-clamp-1 text-[12px] leading-5 text-secondary">{details}</p>}
      </div>
    </button>
  );
}
