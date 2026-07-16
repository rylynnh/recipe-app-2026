import { useNavigate } from 'react-router-dom';
import { Recipe } from '../../types';

interface RecipeCardProps {
  recipe: Recipe;
}

export function RecipeCard({ recipe }: RecipeCardProps) {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(`/recipe/${recipe.id}`)}
      className="cursor-pointer group"
    >
      {/* Image area — 4:3 ratio */}
      <div className="relative w-full overflow-hidden rounded-card" style={{ aspectRatio: '4/3', backgroundColor: '#EAE6DE' }}>
        {recipe.image ? (
          <img
            src={recipe.image}
            alt={recipe.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center p-4">
            <span className="font-display text-secondary text-base text-center leading-snug line-clamp-3">{recipe.title}</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="pt-3 pb-1">
        <h3 className="font-display text-[16px] font-medium text-accent leading-snug mb-2 line-clamp-1 group-hover:text-accent/70 transition-colors duration-200">
          {recipe.title}
        </h3>
        <div className="flex flex-wrap gap-1.5">
          <span className="text-[11px] px-2 py-0.5 border border-divider text-secondary rounded">
            {recipe.structureTag}
          </span>
          {recipe.mainIngredient.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="text-[11px] px-2 py-0.5 border border-divider text-secondary/70 rounded"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
