import { useState } from 'react';
import { SearchBar } from '../../components/SearchBar';
import { RecipeCard } from '../../components/RecipeCard';
import Empty from '../../components/Empty';
import { useRecipesStore } from '../../store/recipes';

export function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const { searchRecipes, searchHistory } = useRecipesStore();

  const recipes = searchRecipes(searchQuery);

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm px-5 pt-5 pb-4" style={{ borderBottom: '0.5px solid var(--color-divider)' }}>
        <h1 className="font-display text-[22px] font-medium text-primary mb-4">我的菜谱</h1>
        <SearchBar
          onSearch={setSearchQuery}
          currentQuery={searchQuery}
          searchHistory={searchHistory}
        />
      </header>

      <main className="px-5 py-5">
        {recipes.length === 0 ? (
          <Empty title="暂无菜谱" description="快去添加你的第一个菜谱吧" />
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-6">
            {recipes.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
