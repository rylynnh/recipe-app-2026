import { useNavigate } from 'react-router-dom';
import { Recipe } from '../../types';

interface RecipeCardProps {
  recipe: Recipe;
}

const sourceLabels: Record<Recipe['sourceType'], string> = {
  manual: '手动添加',
  pasted_text: '文字导入',
  screenshot: '截图导入',
  link_xiaohongshu: '来自小红书',
  link_xiachufang: '来自下厨房',
  link_wechat: '来自公众号',
};

export function RecipeCard({ recipe }: RecipeCardProps) {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(`/recipe/${recipe.id}`)}
      className="card cursor-pointer transition-all duration-300 hover:shadow-md hover:-translate-y-1"
    >
      <div className="relative aspect-square overflow-hidden bg-background">
        {recipe.image ? (
          <img
            src={recipe.image}
            alt={recipe.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-divider/30 p-4">
            <span className="text-secondary font-medium text-base text-center break-words">{recipe.title}</span>
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-display text-lg font-medium text-primary mb-2 line-clamp-1">
          {recipe.title}
        </h3>
        <div className="flex flex-wrap gap-2 mb-3">
          <span
            className="text-xs px-2 py-1 bg-accent/10 text-accent rounded-full"
          >
            {recipe.structureTag}
          </span>
          {recipe.mainIngredient.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="text-xs px-2 py-1 bg-background text-secondary rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
        <div className="text-xs text-secondary flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-accent/50"></span>
          {sourceLabels[recipe.sourceType]}
        </div>
      </div>
    </div>
  );
}