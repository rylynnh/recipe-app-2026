import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart } from 'lucide-react';
import { useRecipesStore } from '../../store/recipes';
import Empty from '../../components/Empty';

export function Favorites() {
  const navigate = useNavigate();
  const { getFavoritedRecipes, toggleFavorite } = useRecipesStore();
  const favoritedRecipes = getFavoritedRecipes();

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm px-4 py-4 border-b border-divider flex items-center gap-4">
        <button
          onClick={() => navigate('/mine')}
          className="p-2 -ml-2 hover:bg-divider/50 rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-primary" />
        </button>
        <h1 className="font-display text-xl font-medium text-primary flex-1">我的收藏</h1>
        <span className="text-sm text-secondary font-mono-digit">{favoritedRecipes.length}</span>
      </header>

      <main className="px-4 py-4">
        {favoritedRecipes.length === 0 ? (
          <Empty title="暂无收藏" description="在菜谱详情页点击心形图标收藏菜谱" />
        ) : (
          <div className="space-y-3">
            {favoritedRecipes.map((recipe) => (
              <div
                key={recipe.id}
                className="card p-4 flex items-center gap-4"
              >
                <div
                  className="flex-1 flex items-center gap-4 cursor-pointer"
                  onClick={() => navigate(`/recipe/${recipe.id}`)}
                >
                  <div className="w-14 h-14 rounded-lg overflow-hidden bg-divider/30 flex-shrink-0">
                    {recipe.image ? (
                      <img
                        src={recipe.image}
                        alt={recipe.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-center p-1">
                        <span className="text-secondary text-xs break-words">{recipe.title}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="font-display text-base font-medium text-primary truncate">{recipe.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs px-2 py-0.5 bg-accent/10 text-accent rounded-full">
                        {recipe.structureTag}
                      </span>
                      <span className="text-xs text-secondary">{recipe.category}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(recipe.id);
                  }}
                  className="p-2 hover:bg-divider/50 rounded-full transition-colors text-accent flex-shrink-0"
                  title="取消收藏"
                >
                  <Heart className="w-5 h-5 fill-current" />
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
