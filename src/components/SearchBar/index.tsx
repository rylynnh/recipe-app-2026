import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Trash2 } from 'lucide-react';
import { useRecipesStore } from '../../store/recipes';
import { useFoodItemsStore } from '../../store/foodItems';

interface SearchBarProps {
  onSearch: (query: string) => void;
  currentQuery?: string;
  searchHistory?: string[];
}

export function SearchBar({ onSearch, currentQuery = '' }: SearchBarProps) {
  const [query, setQuery] = useState(currentQuery);
  const [showResults, setShowResults] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { searchRecipes, searchHistory, addSearchHistory, clearSearchHistory } = useRecipesStore();
  const { foodItems } = useFoodItemsStore();

  useEffect(() => {
    setQuery(currentQuery);
  }, [currentQuery]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      addSearchHistory(query);
      onSearch(query);
      setShowResults(false);
    }
  };

  const handleClear = () => {
    setQuery('');
    onSearch('');
    setShowResults(false);
    inputRef.current?.focus();
  };

  const handleHistoryClick = (historyItem: string) => {
    setQuery(historyItem);
    addSearchHistory(historyItem);
    onSearch(historyItem);
    setShowResults(false);
  };

  const handleRecipeClick = (recipeId: string) => {
    setShowResults(false);
    navigate(`/recipe/${recipeId}`);
  };

  const results = query ? searchRecipes(query) : [];
  const isIngredientSearch = query && foodItems.some(f => f.name.includes(query));

  return (
    <div className="relative">
      <form onSubmit={handleSubmit}>
        <div className="flex items-center gap-3 bg-card border border-divider rounded-input px-4 py-3">
          <Search className="w-5 h-5 text-secondary" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowResults(true);
            }}
            onFocus={() => setShowResults(true)}
            placeholder="搜索菜谱、食材、标签..."
            className="flex-1 bg-transparent text-primary placeholder-secondary outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:bg-divider/50 rounded-full transition-colors"
            >
              <X className="w-4 h-4 text-secondary" />
            </button>
          )}
        </div>
      </form>

      {showResults && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-divider rounded-card shadow-lg z-50 overflow-hidden">
          {!query ? (
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-secondary">最近搜索</span>
                {searchHistory.length > 0 && (
                  <button
                    onClick={clearSearchHistory}
                    className="flex items-center gap-1 text-xs text-secondary hover:text-danger transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    清空
                  </button>
                )}
              </div>
              {searchHistory.length === 0 ? (
                <p className="text-sm text-secondary text-center py-4">暂无搜索历史</p>
              ) : (
                <div className="space-y-2">
                  {searchHistory.map((item) => (
                    <button
                      key={item}
                      onClick={() => handleHistoryClick(item)}
                      className="w-full text-left px-3 py-2 text-sm text-primary hover:bg-background rounded-lg transition-colors"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 max-h-64 overflow-y-auto">
              {isIngredientSearch && (
                <div className="mb-3">
                  <span className="text-xs text-secondary mb-2 block">食材反查</span>
                  <div className="space-y-2">
                    {results.slice(0, 3).map((recipe) => (
                      <button
                        key={recipe.id}
                        onClick={() => handleRecipeClick(recipe.id)}
                        className="w-full flex items-center gap-3 px-3 py-2 hover:bg-background rounded-lg transition-colors"
                      >
                        <div className="w-10 h-10 rounded-lg bg-divider/30 flex items-center justify-center">
                          {recipe.image ? (
                            <img src={recipe.image} alt="" className="w-full h-full object-cover rounded-lg" />
                          ) : (
                            <span className="text-xs text-secondary">{recipe.title[0]}</span>
                          )}
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-sm font-medium text-primary">{recipe.title}</p>
                          <p className="text-xs text-secondary">{recipe.category} · {recipe.baseServings}人份</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <span className="text-xs text-secondary mb-2 block">菜谱结果</span>
                {results.length === 0 ? (
                  <p className="text-sm text-secondary text-center py-4">未找到相关菜谱</p>
                ) : (
                  <div className="space-y-2">
                    {results.slice(0, 5).map((recipe) => (
                      <button
                        key={recipe.id}
                        onClick={() => handleRecipeClick(recipe.id)}
                        className="w-full flex items-center gap-3 px-3 py-2 hover:bg-background rounded-lg transition-colors"
                      >
                        <div className="w-10 h-10 rounded-lg bg-divider/30 flex items-center justify-center">
                          {recipe.image ? (
                            <img src={recipe.image} alt="" className="w-full h-full object-cover rounded-lg" />
                          ) : (
                            <span className="text-xs text-secondary">{recipe.title[0]}</span>
                          )}
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-sm font-medium text-primary">{recipe.title}</p>
                          <p className="text-xs text-secondary">{recipe.category} · {recipe.baseServings}人份</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
