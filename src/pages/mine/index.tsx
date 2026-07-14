import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, BookOpen, Clock, ChevronRight, Database, Scale, Settings, Heart } from 'lucide-react';
import { useRecipesStore } from '../../store/recipes';
import { useTodosStore } from '../../store/todos';
import { useFoodItemsStore } from '../../store/foodItems';

type ImportType = 'manual' | 'text' | 'link';

export function Mine() {
  const [showAddMenu, setShowAddMenu] = useState(false);
  const navigate = useNavigate();
  const { recipes, getFavoritedRecipes, toggleFavorite } = useRecipesStore();
  const { getPendingTodos } = useTodosStore();
  const { foodItems } = useFoodItemsStore();

  const pendingTodos = getPendingTodos();
  const favoritedRecipes = getFavoritedRecipes();

  const thisMonth = new Date().getMonth();
  const thisYear = new Date().getFullYear();
  const thisMonthRecipes = recipes.filter(
    (r) => {
      const date = new Date(r.createdAt);
      return date.getMonth() === thisMonth && date.getFullYear() === thisYear;
    }
  );

  const stats = [
    { label: '菜谱总数', value: recipes.length, icon: BookOpen, color: 'text-accent' },
    { label: '本月新增', value: thisMonthRecipes.length, icon: Plus, color: 'text-accent' },
    { label: '待办中', value: pendingTodos.length, icon: Clock, color: 'text-accent' },
    { label: '已收藏', value: favoritedRecipes.length, icon: Heart, color: 'text-accent' },
  ];

  const tools = [
    { label: '食材营养库', icon: Database, path: '/food-items' },
    { label: '单位换算表', icon: Scale, path: '/conversions' },
    { label: '设置', icon: Settings, path: '/settings' },
  ];

  const handleImportSelect = (type: ImportType) => {
    setShowAddMenu(false);
    navigate(`/add?type=${type}`);
  };

  const recentRecipes = [...recipes].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 3);

  const statPaths: Record<string, string> = {
    '已收藏': '/favorites',
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-30 bg-background px-4 py-4 border-b border-divider">
        <h1 className="font-display text-xl font-medium text-primary">我的</h1>
      </header>

      <main className="px-4 py-4">
        <button
          onClick={() => setShowAddMenu(!showAddMenu)}
          className="w-full card p-4 flex items-center justify-center gap-2 bg-accent text-white hover:bg-accent/90 transition-colors mb-6"
        >
          <Plus className="w-5 h-5" />
          <span className="font-medium">添加新菜谱</span>
        </button>

        {showAddMenu && (
          <div className="card p-2 mb-6">
            {[
              { type: 'manual' as const, label: '手动创建', desc: '填写结构化表单' },
              { type: 'text' as const, label: '粘贴文字', desc: '粘贴任意来源的文字菜谱' },
              { type: 'link' as const, label: '粘贴链接', desc: '小红书/下厨房/公众号' },
            ].map((item) => (
              <button
                key={item.type}
                onClick={() => handleImportSelect(item.type)}
                className="w-full flex items-center gap-4 p-4 hover:bg-background rounded-lg transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                  <Plus className="w-5 h-5 text-accent" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium text-primary">{item.label}</p>
                  <p className="text-xs text-secondary">{item.desc}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-secondary" />
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 mb-6">
          {stats.map((stat) => {
            const Icon = stat.icon;
            const path = statPaths[stat.label];
            const CardWrapper = path ? 'button' : 'div';
            return (
              <CardWrapper
                key={stat.label}
                onClick={() => path && navigate(path)}
                className={`card p-4 ${path ? 'cursor-pointer hover:bg-divider/20 transition-colors text-left w-full' : ''}`}
              >
                <div className={`w-10 h-10 rounded-full bg-background flex items-center justify-center mb-3 ${stat.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="font-mono-digit text-2xl font-medium text-primary mb-1">
                  {stat.value}
                </div>
                <div className="text-xs text-secondary">{stat.label}</div>
              </CardWrapper>
            );
          })}
        </div>

        {favoritedRecipes.length > 0 && (
          <div className="card mb-6">
            <div className="p-4 border-b border-divider">
              <h3 className="font-display text-base font-medium text-primary">我的收藏</h3>
            </div>
            <div className="divide-y divide-divider">
              {favoritedRecipes.map((recipe) => (
                <div
                  key={recipe.id}
                  className="flex items-center gap-4 p-4"
                >
                  <button
                    onClick={() => navigate(`/recipe/${recipe.id}`)}
                    className="flex-1 flex items-center gap-4 text-left"
                  >
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-divider/30 flex-shrink-0">
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
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-primary truncate">{recipe.title}</p>
                      <p className="text-xs text-secondary">{recipe.category}</p>
                    </div>
                  </button>
                  <button
                    onClick={() => toggleFavorite(recipe.id)}
                    className="p-2 hover:bg-divider/50 rounded-full transition-colors text-accent flex-shrink-0"
                    title="取消收藏"
                  >
                    <Heart className="w-4 h-4 fill-current" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="card mb-6">
          <div className="p-4 border-b border-divider">
            <h3 className="font-display text-base font-medium text-primary">最近更新</h3>
          </div>
          {recentRecipes.length === 0 ? (
            <div className="p-8 text-center text-secondary text-sm">暂无菜谱</div>
          ) : (
            <div className="divide-y divide-divider">
              {recentRecipes.map((recipe) => (
                <button
                  key={recipe.id}
                  onClick={() => navigate(`/recipe/${recipe.id}`)}
                  className="w-full flex items-center gap-4 p-4 hover:bg-background transition-colors"
                >
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-divider/30">
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
                  <div className="flex-1 text-left">
                    <p className="font-medium text-primary">{recipe.title}</p>
                    <p className="text-xs text-secondary">{recipe.category}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-secondary" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="p-4 border-b border-divider">
            <h3 className="font-display text-base font-medium text-primary">工具入口</h3>
          </div>
          <div className="divide-y divide-divider">
            {tools.map((tool) => (
              <button
                key={tool.label}
                onClick={() => navigate(tool.path)}
                className="w-full flex items-center gap-4 p-4 hover:bg-background transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center text-accent">
                  <tool.icon className="w-5 h-5" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium text-primary">{tool.label}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-secondary" />
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-secondary">食材营养库共 {foodItems.length} 种食材</p>
        </div>
      </main>
    </div>
  );
}