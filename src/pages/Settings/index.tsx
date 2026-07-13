import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Moon, Sun, Trash2, ChevronRight, Volume2 } from 'lucide-react';
import { useRecipesStore } from '../../store/recipes';
import { useTodosStore } from '../../store/todos';
import { useFoodItemsStore } from '../../store/foodItems';

export function Settings() {
  const navigate = useNavigate();
  const { clearAllRecipes } = useRecipesStore();
  const { clearAllTodos } = useTodosStore();
  const { clearAllFoodItems } = useFoodItemsStore();
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearType, setClearType] = useState<'all' | 'recipes' | 'todos' | 'food'>('all');

  const settingsGroups = [
    {
      title: '数据管理',
      items: [
        { label: '清除所有菜谱', action: () => { setClearType('recipes'); setShowClearConfirm(true); }, danger: true },
        { label: '清除所有待办', action: () => { setClearType('todos'); setShowClearConfirm(true); }, danger: true },
        { label: '清除所有食材', action: () => { setClearType('food'); setShowClearConfirm(true); }, danger: true },
        { label: '清除所有数据', action: () => { setClearType('all'); setShowClearConfirm(true); }, danger: true },
      ],
    },
    {
      title: '关于',
      items: [
        { label: '版本', value: '1.0.0', disabled: true },
        { label: '数据存储', value: '本地存储', disabled: true },
      ],
    },
  ];

  const handleClear = () => {
    switch (clearType) {
      case 'recipes':
        clearAllRecipes();
        break;
      case 'todos':
        clearAllTodos();
        break;
      case 'food':
        clearAllFoodItems();
        break;
      case 'all':
        clearAllRecipes();
        clearAllTodos();
        clearAllFoodItems();
        break;
    }
    setShowClearConfirm(false);
  };

  const labels: Record<string, string> = {
    all: '所有数据',
    recipes: '所有菜谱',
    todos: '所有待办',
    food: '所有食材',
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm px-4 py-4 border-b border-divider flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 hover:bg-divider/50 rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-primary" />
        </button>
        <h1 className="font-display text-xl font-medium text-primary">设置</h1>
      </header>

      <main className="px-4 py-4">
        {settingsGroups.map((group) => (
          <div key={group.title} className="card mb-4">
            <div className="p-4 border-b border-divider">
              <h3 className="font-display text-base font-medium text-primary">{group.title}</h3>
            </div>
            <div className="divide-y divide-divider">
              {group.items.map((item) => (
                <button
                  key={item.label}
                  onClick={item.action}
                  disabled={item.disabled}
                  className={`w-full flex items-center justify-between p-4 hover:bg-background transition-colors ${
                    item.disabled ? 'opacity-50' : ''
                  }`}
                >
                  <span className={`text-sm ${item.danger ? 'text-danger' : 'text-primary'}`}>
                    {item.label}
                  </span>
                  {item.value ? (
                    <span className="text-sm text-secondary">{item.value}</span>
                  ) : (
                    <ChevronRight className={`w-5 h-5 ${item.danger ? 'text-danger' : 'text-secondary'}`} />
                  )}
                </button>
              ))}
            </div>
          </div>
        ))}
      </main>

      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-card p-6 w-full max-w-sm">
            <div className="w-16 h-16 rounded-full bg-danger/10 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-8 h-8 text-danger" />
            </div>
            <h3 className="font-display text-lg font-medium text-primary mb-2">确认清除</h3>
            <p className="text-secondary text-sm mb-6">
              确定要清除{labels[clearType]}吗？此操作无法撤销。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 py-2 bg-background text-secondary rounded-input hover:bg-divider/50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleClear}
                className="flex-1 py-2 bg-danger text-white rounded-input hover:bg-danger/90 transition-colors"
              >
                确认清除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
