import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { structureTags, ingredientTags } from '../../data/mock';
import { useRecipesStore } from '../../store/recipes';
import Empty from '../../components/Empty';

export function Category() {
  const [selectedStructure, setSelectedStructure] = useState('s1');
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const navigate = useNavigate();
  const { filterByStructure, filterByIngredient, recipes } = useRecipesStore();

  const handleStructureSelect = (tagId: string) => {
    setSelectedStructure(tagId);
    setSelectedIngredients([]);
  };

  const handleIngredientToggle = (ingredientName: string) => {
    setSelectedIngredients((prev) =>
      prev.includes(ingredientName)
        ? prev.filter((s) => s !== ingredientName)
        : [...prev, ingredientName]
    );
  };

  const structureFiltered = filterByStructure(selectedStructure);
  const filteredRecipes = filterByIngredient(structureFiltered, selectedIngredients);

  const relevantIngredientTags = useMemo(() => {
    const categoryRecipes = filterByStructure(selectedStructure);
    const usedIngredients = new Set(
      categoryRecipes.flatMap((r) => r.mainIngredient)
    );
    if (usedIngredients.size === 0) return [];
    return ingredientTags.filter((tag) => usedIngredients.has(tag.name));
  }, [selectedStructure, recipes]);

  const structureCounts = useMemo(() => {
    const counts: Record<string, number> = { s1: recipes.length };
    for (const tag of structureTags) {
      if (tag.id === 's1') continue;
      counts[tag.id] = recipes.filter((r) => r.categoryId === tag.id).length;
    }
    return counts;
  }, [recipes]);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-background px-5 pt-5 pb-4" style={{ borderBottom: '0.5px solid var(--color-divider)' }}>
        <h1 className="font-display text-[22px] font-medium text-primary">分类浏览</h1>
      </header>

      <div className="flex h-[calc(100vh-61px)]">
        {/* Left sidebar */}
        <aside
          className="flex-shrink-0 overflow-y-auto"
          style={{ width: '88px', borderRight: '0.5px solid var(--color-divider)' }}
        >
          {structureTags.map((tag) => {
            const isActive = selectedStructure === tag.id;
            const count = structureCounts[tag.id] ?? 0;
            return (
              <button
                key={tag.id}
                onClick={() => handleStructureSelect(tag.id)}
                className="w-full px-2 py-4 text-center transition-all duration-200"
                style={{
                  backgroundColor: isActive ? 'var(--color-accent-tint)' : 'transparent',
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                  fontSize: '14px',
                }}
              >
                <span>{tag.name}</span>
                {count > 0 && (
                  <span
                    className="block mt-1 font-mono-digit"
                    style={{
                      fontSize: '11px',
                      color: isActive ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                      opacity: isActive ? 0.5 : 0.4,
                    }}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </aside>

        {/* Right main area */}
        <main className="flex-1 overflow-y-auto">
          {/* Ingredient chips row */}
          <div className="px-5 pt-4 pb-3" style={{ borderBottom: '0.5px solid var(--color-divider)' }}>
            <div className="flex flex-wrap items-center gap-2">
              {relevantIngredientTags.map((tag) => {
                const isSelected = selectedIngredients.includes(tag.name);
                return (
                  <button
                    key={tag.id}
                    onClick={() => handleIngredientToggle(tag.name)}
                    className="px-3 py-1 rounded-full text-[12px] transition-colors"
                    style={{
                      backgroundColor: isSelected ? 'var(--color-accent-tint)' : 'transparent',
                      color: isSelected ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                      fontWeight: isSelected ? 500 : 400,
                      border: isSelected ? 'none' : '1px solid var(--color-divider)',
                    }}
                  >
                    {tag.name}
                  </button>
                );
              })}
              {selectedIngredients.length > 0 && (
                <button
                  onClick={() => setSelectedIngredients([])}
                  className="px-2 py-1 text-[12px] transition-colors"
                  style={{ color: 'var(--color-text-secondary)', opacity: 0.5 }}
                >
                  清除
                </button>
              )}
            </div>
          </div>

          {/* Recipe list */}
          <div className="px-5 py-4">
            {filteredRecipes.length === 0 ? (
              <Empty title="暂无菜谱" description="该分类下还没有菜谱" />
            ) : (
              <div className="space-y-4">
                {filteredRecipes.map((recipe) => (
                  <div
                    key={recipe.id}
                    onClick={() => navigate(`/recipe/${recipe.id}`)}
                    className="flex gap-4 cursor-pointer group"
                  >
                    <div
                      className="relative rounded-card overflow-hidden flex-shrink-0"
                      style={{
                        width: '80px',
                        height: '60px',
                        backgroundColor: '#EAE6DE',
                      }}
                    >
                      {recipe.image ? (
                        <img
                          src={recipe.image}
                          alt={recipe.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center p-1">
                          <span className="font-display text-secondary text-xs text-center leading-snug line-clamp-3">
                            {recipe.title}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 py-0.5">
                      <h3
                        className="font-display text-[16px] font-medium leading-snug mb-1.5 truncate transition-colors duration-200"
                        style={{ color: 'var(--color-accent)' }}
                      >
                        {recipe.title}
                      </h3>
                      <div className="flex flex-wrap gap-1.5">
                        <span
                          className="text-[11px] px-2 py-0.5 rounded"
                          style={{
                            border: '1px solid var(--color-divider)',
                            color: 'var(--color-text-secondary)',
                          }}
                        >
                          {recipe.structureTag}
                        </span>
                        {recipe.mainIngredient.slice(0, 2).map((tag) => (
                          <span
                            key={tag}
                            className="text-[11px] px-2 py-0.5 rounded"
                            style={{
                              border: '1px solid var(--color-divider)',
                              color: 'var(--color-text-secondary)',
                              opacity: 0.7,
                            }}
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
          </div>
        </main>
      </div>
    </div>
  );
}
