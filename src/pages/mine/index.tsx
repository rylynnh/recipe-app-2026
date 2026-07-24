import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, BookOpen, Clock, ChevronRight, Database, Scale, Settings, Heart, ArrowLeft, Trash2, RotateCcw, Trash } from 'lucide-react';
import { useRecipesStore } from '../../store/recipes';
import { useTodosStore } from '../../store/todos';
import { useFoodItemsStore } from '../../store/foodItems';

type ListView = 'all' | 'recent' | 'todos' | 'favorites' | 'deleted' | null;

function formatDate(ts: number): string {
  const d = new Date(ts);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hours = d.getHours().toString().padStart(2, '0');
  const mins = d.getMinutes().toString().padStart(2, '0');
  return `${month}月${day}日 ${hours}:${mins}`;
}

export function Mine() {
  const navigate = useNavigate();
  const { recipes, getFavoritedRecipes, toggleFavorite, deletedRecipes, restoreRecipe, permanentlyDeleteRecipe, clearAllDeletedRecipes } = useRecipesStore();
  const { getPendingTodos, todos } = useTodosStore();
  const { foodItems } = useFoodItemsStore();

  const [listView, setListView] = useState<ListView>(null);

  const pendingTodos = getPendingTodos();
  const favoritedRecipes = getFavoritedRecipes();

  const allRecipesSorted = [...recipes].sort((a, b) => b.createdAt - a.createdAt);
  const recentRecipes = [...recipes].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 3);

  const tools = [
    { label: '食材营养库', icon: Database, path: '/food-items' },
    { label: '单位换算表', icon: Scale, path: '/conversions' },
    { label: '设置', icon: Settings, path: '/settings' },
  ];

  // List view header config
  const listConfig: Record<string, { title: string; backLabel: string }> = {
    all: { title: '全部菜谱', backLabel: '我的' },
    recent: { title: '最近更新', backLabel: '我的' },
    todos: { title: '待办中', backLabel: '我的' },
    favorites: { title: '我的收藏', backLabel: '我的' },
    deleted: { title: '最近删除', backLabel: '我的' },
  };

  // Render list view
  if (listView) {
    const config = listConfig[listView];
    let listRecipes: typeof recipes = [];
    let showTodoList = false;

    if (listView === 'all') {
      listRecipes = allRecipesSorted;
    } else if (listView === 'recent') {
      listRecipes = [...recipes].sort((a, b) => b.updatedAt - a.updatedAt);
    } else if (listView === 'todos') {
      showTodoList = true;
    } else if (listView === 'favorites') {
      listRecipes = favoritedRecipes;
    } else if (listView === 'deleted') {
      listRecipes = [...deletedRecipes].sort((a, b) => b.deletedAt - a.deletedAt);
    }

    return (
      <div className="min-h-screen bg-background pb-20">
        <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm px-5 py-4 flex items-center gap-3" style={{ borderBottom: '0.5px solid var(--color-divider)' }}>
          <button
            onClick={() => setListView(null)}
            className="p-2 -ml-2 hover:bg-divider/50 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-primary" />
          </button>
          <h1 className="font-display text-[20px] font-medium text-primary">{config.title}</h1>
          <span className="ml-auto text-xs text-secondary bg-divider/50 px-2 py-0.5 rounded-full">
            {showTodoList ? pendingTodos.length : listRecipes.length} 项
          </span>
        </header>

        <main className="px-5 py-4">
          {showTodoList ? (
            pendingTodos.length === 0 ? (
              <div className="p-8 text-center text-secondary text-[14px]">暂无待办</div>
            ) : (
              <div className="space-y-3">
                {pendingTodos.map((todo) => {
                  const recipe = recipes.find((r) => r.id === todo.recipeId);
                  if (!recipe) return null;
                  return (
                    <button
                      key={todo.id}
                      onClick={() => navigate(`/recipe/${recipe.id}`)}
                      className="w-full card p-4 flex items-center gap-4 hover:bg-divider/10 transition-colors text-left"
                    >
                      <div className="w-11 h-11 rounded-lg overflow-hidden flex-shrink-0" style={{ backgroundColor: '#EAE6DE' }}>
                        {recipe.image ? (
                          <img src={recipe.image} alt={recipe.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center p-1">
                            <span className="font-display text-secondary text-xs text-center leading-snug line-clamp-2">{recipe.title}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-display text-[15px] font-medium text-accent truncate">{recipe.title}</p>
                        <p className="text-[12px] text-secondary mt-0.5">{recipe.category}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-secondary/40 flex-shrink-0" />
                    </button>
                  );
                })}
              </div>
            )
          ) : listRecipes.length === 0 ? (
            <div className="p-8 text-center text-secondary text-[14px]">暂无菜谱</div>
          ) : (
            <div className="space-y-3">
              {listRecipes.map((recipe) => (
                <div
                  key={recipe.id}
                  className="card p-4"
                >
                  <button
                    onClick={() => listView !== 'deleted' && navigate(`/recipe/${recipe.id}`)}
                    className={`w-full flex items-center gap-4 text-left ${listView === 'deleted' ? '' : 'hover:bg-divider/10 transition-colors'}`}
                  >
                    <div className="w-11 h-11 rounded-lg overflow-hidden flex-shrink-0" style={{ backgroundColor: '#EAE6DE' }}>
                      {recipe.image ? (
                        <img src={recipe.image} alt={recipe.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center p-1">
                          <span className="font-display text-secondary text-xs text-center leading-snug line-clamp-2">{recipe.title}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-display text-[15px] font-medium text-accent truncate">{recipe.title}</p>
                      <p className="text-[11px] text-secondary/60 mt-0.5">
                        {recipe.category} · {formatDate(listView === 'deleted' ? (recipe as any).deletedAt : recipe.createdAt)}
                      </p>
                    </div>
                    {listView !== 'deleted' && <ChevronRight className="w-4 h-4 text-secondary/40 flex-shrink-0" />}
                  </button>
                  {listView === 'deleted' && (
                    <div className="flex gap-3 mt-3 pt-3" style={{ borderTop: '0.5px solid var(--color-divider)' }}>
                      <button
                        onClick={() => restoreRecipe(recipe.id)}
                        className="flex-1 flex items-center justify-center gap-2 py-2 bg-accent/10 text-accent rounded-lg hover:bg-accent/20 transition-colors text-[14px] font-medium"
                      >
                        <RotateCcw className="w-4 h-4" />
                        恢复
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('确定要彻底删除这个菜谱吗？此操作无法撤销。')) {
                            permanentlyDeleteRecipe(recipe.id);
                          }
                        }}
                        className="flex-1 flex items-center justify-center gap-2 py-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-colors text-[14px] font-medium"
                      >
                        <Trash className="w-4 h-4" />
                        彻底删除
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {listView === 'deleted' && deletedRecipes.length > 0 && (
                <button
                  onClick={() => {
                    if (confirm(`确定要清空所有已删除的菜谱吗？共 ${deletedRecipes.length} 项，此操作无法撤销。`)) {
                      clearAllDeletedRecipes();
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3 text-secondary text-[14px] hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  清空最近删除
                </button>
              )}
            </div>
          )}
        </main>
      </div>
    );
  }

  // Main "我的" page
  const stats = [
    { label: '菜谱总数', value: recipes.length, icon: BookOpen, view: 'all' as ListView },
    { label: '待办中', value: pendingTodos.length, icon: Clock, view: 'todos' as ListView },
    { label: '已收藏', value: favoritedRecipes.length, icon: Heart, view: 'favorites' as ListView },
    { label: '最近删除', value: deletedRecipes.length, icon: Trash2, view: 'deleted' as ListView },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-30 bg-background px-5 pt-5 pb-4" style={{ borderBottom: '0.5px solid var(--color-divider)' }}>
        <h1 className="font-display text-[22px] font-medium text-primary">我的</h1>
      </header>

      <main className="px-5 py-5">
        <button
          onClick={() => navigate('/add')}
          className="w-full p-4 flex items-center justify-center gap-2 bg-accent text-white rounded-card hover:bg-accent/90 transition-colors mb-6"
          style={{ boxShadow: '0 2px 8px rgba(62,75,60,0.15)' }}
        >
          <Plus className="w-5 h-5" />
          <span className="font-medium text-[15px]">添加菜谱</span>
        </button>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <button
                key={stat.label}
                onClick={() => setListView(stat.view)}
                className="card p-5 cursor-pointer hover:bg-divider/10 transition-colors text-left w-full"
              >
                <div className="w-9 h-9 rounded-full flex items-center justify-center mb-3" style={{ backgroundColor: 'var(--color-accent-tint)' }}>
                  <Icon className="w-4 h-4 text-accent" />
                </div>
                <div className="font-mono-digit text-[26px] font-semibold text-primary mb-0.5 leading-none">
                  {stat.value}
                </div>
                <div className="text-[12px] text-secondary mt-1">{stat.label}</div>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => setListView('recent')}
          className="w-full card mb-5 text-left hover:bg-divider/10 transition-colors"
        >
          <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '0.5px solid var(--color-divider)' }}>
            <h3 className="font-display text-[16px] font-medium text-primary">最近更新</h3>
            <ChevronRight className="w-4 h-4 text-secondary/40 flex-shrink-0" />
          </div>
          {recentRecipes.length === 0 ? (
            <div className="p-8 text-center text-secondary text-[14px]">暂无菜谱</div>
          ) : (
            <div className="divide-y divide-divider">
              {recentRecipes.map((recipe) => (
                <button
                  key={recipe.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/recipe/${recipe.id}`);
                  }}
                  className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-background/50 transition-colors"
                >
                  <div className="w-11 h-11 rounded-lg overflow-hidden flex-shrink-0" style={{ backgroundColor: '#EAE6DE' }}>
                    {recipe.image ? (
                      <img src={recipe.image} alt={recipe.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center p-1">
                        <span className="font-display text-secondary text-xs text-center leading-snug line-clamp-2">{recipe.title}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="font-display text-[15px] font-medium text-accent truncate">{recipe.title}</p>
                    <p className="text-[11px] text-secondary/60 mt-0.5">
                      {recipe.category} · {formatDate(recipe.updatedAt)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </button>

        <div className="card mb-6">
          <div className="px-5 py-4" style={{ borderBottom: '0.5px solid var(--color-divider)' }}>
            <h3 className="font-display text-[16px] font-medium text-primary">工具入口</h3>
          </div>
          <div className="divide-y divide-divider">
            {tools.map((tool) => (
              <button
                key={tool.label}
                onClick={() => navigate(tool.path)}
                className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-background/50 transition-colors"
              >
                <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--color-accent-tint)' }}>
                  <tool.icon className="w-4 h-4 text-accent" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-[15px] font-medium text-primary">{tool.label}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-secondary/40 flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>

        <div className="text-center">
          <p className="text-[12px] text-secondary/50">食材营养库共 {foodItems.length} 种食材</p>
        </div>
      </main>
    </div>
  );
}
