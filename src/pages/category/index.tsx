import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { structureTags, ingredientTags } from '../../data/mock';
import { useRecipesStore } from '../../store/recipes';
import Empty from '../../components/Empty';

export function Category() {
  const [selectedStructure, setSelectedStructure] = useState('s1');
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const navigate = useNavigate();
  const { filterByStructure, filterByIngredient } = useRecipesStore();

  const handleIngredientToggle = (ingredientName: string) => {
    setSelectedIngredients((prev) =>
      prev.includes(ingredientName)
        ? prev.filter((s) => s !== ingredientName)
        : [...prev, ingredientName]
    );
  };

  const structureFiltered = filterByStructure(selectedStructure);
  const filteredRecipes = filterByIngredient(structureFiltered, selectedIngredients);

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-30 bg-background px-4 py-4 border-b border-divider">
        <h1 className="font-display text-xl font-medium text-primary">分类浏览</h1>
      </header>

      <div className="flex">
        <aside className="w-32 bg-card border-r border-divider h-[calc(100vh-180px)] overflow-y-auto">
          {structureTags.map((tag) => (
            <button
              key={tag.id}
              onClick={() => {
                setSelectedStructure(tag.id);
                setSelectedIngredients([]);
              }}
              className={`w-full px-4 py-3 text-left transition-colors ${
                selectedStructure === tag.id
                  ? 'bg-accent/10 font-medium text-accent'
                  : 'text-secondary hover:bg-divider/30'
              }`}
            >
              {tag.name}
            </button>
          ))}
        </aside>

        <main className="flex-1 px-4 py-4">
          <div className="flex flex-wrap gap-2 mb-6">
            {ingredientTags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => handleIngredientToggle(tag.name)}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  selectedIngredients.includes(tag.name)
                    ? 'bg-accent text-white'
                    : 'bg-background text-secondary hover:bg-divider/50'
                }`}
              >
                {tag.name}
              </button>
            ))}
            {selectedIngredients.length > 0 && (
              <button
                onClick={() => setSelectedIngredients([])}
                className="px-3 py-1 rounded-full text-sm bg-divider/50 text-secondary hover:bg-divider transition-colors"
              >
                清除筛选
              </button>
            )}
          </div>

          {filteredRecipes.length === 0 ? (
            <Empty title="暂无菜谱" description="该分类下还没有菜谱" />
          ) : (
            <div className="space-y-4">
              {filteredRecipes.map((recipe) => (
                <div
                  key={recipe.id}
                  onClick={() => navigate(`/recipe/${recipe.id}`)}
                  className="card p-4 flex gap-4 cursor-pointer hover:shadow-md transition-shadow"
                >
                  <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-divider/30 flex-shrink-0">
                    {recipe.image ? (
                      <img
                        src={recipe.image}
                        alt={recipe.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-secondary">{recipe.title[0]}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-display text-lg font-medium text-primary mb-1">
                      {recipe.title}
                    </h3>
                    <p className="text-sm text-secondary mb-2">
                      {recipe.baseServings}人份
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <span
                        className="text-xs px-2 py-0.5 bg-accent/10 text-accent rounded-full"
                      >
                        {recipe.structureTag}
                      </span>
                      {recipe.mainIngredient.map((tag) => (
                        <span
                          key={tag}
                          className="text-xs px-2 py-0.5 bg-background text-secondary rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}