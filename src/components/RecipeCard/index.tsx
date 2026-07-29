import { useNavigate } from 'react-router-dom';
import { Recipe } from '../../types';

interface RecipeCardProps {
  recipe: Recipe;
  variant?: 'portrait' | 'landscape' | 'compact';
}

export function RecipeCard({ recipe, variant = 'portrait' }: RecipeCardProps) {
  const navigate = useNavigate();
  const details = [
    recipe.totalTimeMinutes ? `${recipe.totalTimeMinutes} 分钟` : null,
    ...recipe.mainIngredient.slice(0, 2),
  ].filter(Boolean).join(' · ');
  const aspectRatio = variant === 'landscape' ? '16 / 10' : variant === 'compact' ? '1 / 1' : '4 / 5';

  return (
    <button
      type="button"
      onClick={() => navigate(`/recipe/${recipe.id}`)}
      className={`group text-left ${variant === 'compact' ? 'w-[146px] flex-none' : 'w-full'}`}
    >
      <div className="relative w-full overflow-hidden rounded-card bg-[#E7E0D5]" style={{ aspectRatio }}>
        {recipe.image ? (
          <img
            src={recipe.image}
            alt={recipe.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center p-4">
            <span className="font-display text-center text-base leading-snug text-secondary line-clamp-3">{recipe.title}</span>
          </div>
        )}
      </div>
      <div className="pb-1 pt-3">
        <h3 className="font-display mb-1 line-clamp-2 text-[17px] font-medium leading-snug text-primary transition-colors duration-200 group-hover:text-accent">
          {recipe.title}
        </h3>
        {details && <p className="font-mono-digit line-clamp-1 text-[11px] leading-5 text-secondary">{details}</p>}
      </div>
    </button>
  );
}
