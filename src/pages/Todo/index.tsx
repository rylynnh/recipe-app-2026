import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Circle, Trash2 } from 'lucide-react';
import { useTodosStore } from '../../store/todos';
import { useRecipesStore } from '../../store/recipes';
import Empty from '../../components/Empty';

type TabType = 'pending' | 'completed';

interface SwipeableItemProps {
  children: React.ReactNode;
  onDelete: () => void;
}

function SwipeableItem({ children, onDelete }: SwipeableItemProps) {
  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);
  const currentXRef = useRef(0);
  const itemRef = useRef<HTMLDivElement>(null);

  const deleteWidth = 80;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    currentXRef.current = translateX;
    setIsDragging(true);
  }, [translateX]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return;
    const diff = e.touches[0].clientX - startXRef.current;
    let newTranslate = currentXRef.current + diff;
    newTranslate = Math.max(-deleteWidth, Math.min(0, newTranslate));
    setTranslateX(newTranslate);
  }, [isDragging, deleteWidth]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
    if (translateX < -deleteWidth / 2) {
      setTranslateX(-deleteWidth);
    } else {
      setTranslateX(0);
    }
  }, [translateX, deleteWidth]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    startXRef.current = e.clientX;
    currentXRef.current = translateX;
    setIsDragging(true);
  }, [translateX]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    const diff = e.clientX - startXRef.current;
    let newTranslate = currentXRef.current + diff;
    newTranslate = Math.max(-deleteWidth, Math.min(0, newTranslate));
    setTranslateX(newTranslate);
  }, [isDragging, deleteWidth]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    if (translateX < -deleteWidth / 2) {
      setTranslateX(-deleteWidth);
    } else {
      setTranslateX(0);
    }
  }, [translateX, deleteWidth]);

  const handleMouseLeave = useCallback(() => {
    if (isDragging) {
      handleMouseUp();
    }
  }, [isDragging, handleMouseUp]);

  return (
    <div className="relative overflow-hidden rounded-card">
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="absolute right-0 top-0 h-full w-[80px] flex items-center justify-center bg-red-500 text-white hover:bg-red-600 transition-colors"
      >
        <Trash2 className="w-5 h-5" />
      </button>
      <div
        ref={itemRef}
        className={`relative bg-card transition-transform ${isDragging ? '' : 'duration-200'}`}
        style={{ transform: `translateX(${translateX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        {children}
      </div>
    </div>
  );
}

export function Todo() {
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const navigate = useNavigate();
  const { getPendingTodos, getCompletedTodos, toggleTodo, removeTodo } = useTodosStore();
  const { getRecipeById } = useRecipesStore();

  const pendingTodos = getPendingTodos();
  const completedTodos = getCompletedTodos();
  const currentTodos = activeTab === 'pending' ? pendingTodos : completedTodos;

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-30 bg-background px-4 py-4 border-b border-divider">
        <h1 className="font-display text-xl font-medium text-primary">待办清单</h1>
        <div className="flex gap-4 mt-4">
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex items-center gap-2 transition-colors ${
              activeTab === 'pending' ? 'text-accent' : 'text-secondary'
            }`}
          >
            <span className="font-medium">待做</span>
            {pendingTodos.length > 0 && (
              <span className="px-2 py-0.5 bg-accent/10 text-accent text-xs rounded-full">
                {pendingTodos.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`flex items-center gap-2 transition-colors ${
              activeTab === 'completed' ? 'text-accent' : 'text-secondary'
            }`}
          >
            <span className="font-medium">已完成</span>
            {completedTodos.length > 0 && (
              <span className="px-2 py-0.5 bg-divider/50 text-secondary text-xs rounded-full">
                {completedTodos.length}
              </span>
            )}
          </button>
        </div>
      </header>

      <main className="px-4 py-4">
        {currentTodos.length === 0 ? (
          <Empty
            title={activeTab === 'pending' ? '暂无待办' : '暂无已完成'}
            description={activeTab === 'pending' ? '在菜谱详情页添加待办吧' : '继续加油！'}
          />
        ) : (
          <div className="space-y-3">
            {currentTodos.map((todo) => {
              const recipe = getRecipeById(todo.recipeId);
              return (
                <SwipeableItem
                  key={todo.id}
                  onDelete={() => removeTodo(todo.id)}
                >
                  <div className="p-4 flex items-center gap-4">
                    <button
                      onClick={() => toggleTodo(todo.id)}
                      className={`flex-shrink-0 transition-colors ${
                        todo.isCompleted ? 'text-accent' : 'text-secondary hover:text-accent'
                      }`}
                    >
                      {todo.isCompleted ? (
                        <CheckCircle2 className="w-6 h-6" />
                      ) : (
                        <Circle className="w-6 h-6" />
                      )}
                    </button>
                    <div
                      className="flex-1 cursor-pointer"
                      onClick={() => recipe && navigate(`/recipe/${recipe.id}`)}
                    >
                      <h3
                        className={`font-display text-base ${
                          todo.isCompleted ? 'text-secondary line-through' : 'text-primary'
                        }`}
                      >
                        {recipe?.title || '未知菜谱'}
                      </h3>
                      <p className="text-xs text-secondary">
                        {recipe?.category}
                      </p>
                    </div>
                  </div>
                </SwipeableItem>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
