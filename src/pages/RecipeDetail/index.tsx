import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Bookmark, BookmarkCheck, Edit, Heart, Save, X } from 'lucide-react';
import { useRecipesStore } from '../../store/recipes';
import { useTodosStore } from '../../store/todos';
import { useFoodItemsStore } from '../../store/foodItems';
import { ServingsAdjuster } from '../../components/ServingsAdjuster';
import { NutritionCard } from '../../components/NutritionCard';
import { TimerButton } from '../../components/TimerButton';
import { scaleIngredients, calculateRecipeNutrition, formatAmount, detectDurationInText } from '../../utils/nutrition';

export function RecipeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getRecipeById, updateRecipe, deleteRecipe, toggleFavorite } = useRecipesStore();
  const { addTodo, getTodoByRecipeId, toggleTodo } = useTodosStore();
  const { foodItems, unitConversions, categories } = useFoodItemsStore();

  const recipe = getRecipeById(id || '');
  const [servings, setServings] = useState(recipe?.baseServings || 1);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Edit form state
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editIngredientsText, setEditIngredientsText] = useState('');
  const [editStepsText, setEditStepsText] = useState('');
  const [editNote, setEditNote] = useState('');

  const todo = recipe ? getTodoByRecipeId(recipe.id) : undefined;

  useEffect(() => {
    if (recipe) {
      setServings(recipe.baseServings);
    }
  }, [recipe]);

  useEffect(() => {
    if (isEditing && recipe) {
      setEditTitle(recipe.title);
      setEditCategory(recipe.category);
      setEditCategoryId(recipe.categoryId);
      setEditIngredientsText(recipe.ingredients.map(ing => `${ing.name} ${ing.amount} ${ing.unit}`).join('\n'));
      setEditStepsText(recipe.steps.map(step => step.content).join('\n'));
      setEditNote(recipe.note || '');
    }
  }, [isEditing, recipe]);

  if (!recipe) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-secondary">菜谱不存在</p>
      </div>
    );
  }

  const scaledIngredients = scaleIngredients(recipe.ingredients, recipe.baseServings, servings);
  const nutrition = calculateRecipeNutrition(scaledIngredients, foodItems, unitConversions);

  const handleAddTodo = () => {
    if (todo) {
      toggleTodo(todo.id);
    } else {
      addTodo(recipe.id);
    }
  };

  const handleSaveEdit = () => {
    if (!editTitle.trim()) {
      alert('请输入菜谱名称');
      return;
    }

    const ingredients = editIngredientsText
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 3) {
          return {
            id: generateId(),
            recipeId: recipe.id,
            name: parts[0],
            amount: parseFloat(parts[1]) || 0,
            unit: parts[2],
          };
        }
        return null;
      })
      .filter(Boolean) as any[];

    const steps = editStepsText
      .split('\n')
      .filter(line => line.trim())
      .map((content, index) => {
        const duration = detectDurationInText(content.trim());
        return {
          id: generateId(),
          recipeId: recipe.id,
          order: index + 1,
          content: content.trim(),
          detectedDurationSeconds: duration > 0 ? duration : undefined,
          hasTimer: duration > 0,
        };
      });

    updateRecipe(recipe.id, {
      title: editTitle,
      category: editCategory,
      categoryId: editCategoryId,
      ingredients,
      steps,
      note: editNote || undefined,
    });

    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const sourceLabels: Record<string, string> = {
    manual: '手动添加',
    pasted_text: '粘贴文字',
    screenshot: '截图导入',
    link_xiaohongshu: '来自小红书',
    link_xiachufang: '来自下厨房',
    link_wechat: '来自公众号',
  };

  if (isEditing) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm px-4 py-4 border-b border-divider flex items-center gap-4">
          <button
            onClick={handleCancelEdit}
            className="p-2 -ml-2 hover:bg-divider/50 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-primary" />
          </button>
          <h1 className="font-display text-xl font-medium text-primary flex-1">
            编辑菜谱
          </h1>
          <button
            onClick={handleSaveEdit}
            className="p-2 hover:bg-divider/50 rounded-full transition-colors text-accent"
          >
            <Save className="w-5 h-5" />
          </button>
        </header>

        <main className="px-4 py-4 space-y-4">
          <div className="card p-4">
            <label className="block text-sm font-medium text-primary mb-2">菜谱名称</label>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-divider rounded-input text-primary focus:outline-none focus:border-accent"
              placeholder="输入菜谱名称"
            />
          </div>

          <div className="card p-4">
            <label className="block text-sm font-medium text-primary mb-2">分类</label>
            <select
              value={editCategoryId}
              onChange={(e) => {
                setEditCategoryId(e.target.value);
                const cat = categories.find(c => c.id === e.target.value);
                if (cat) setEditCategory(cat.name);
              }}
              className="w-full px-3 py-2 bg-background border border-divider rounded-input text-primary focus:outline-none focus:border-accent"
            >
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div className="card p-4">
            <label className="block text-sm font-medium text-primary mb-2">食材</label>
            <p className="text-xs text-secondary mb-2">每行一个食材，格式：食材名 数量 单位</p>
            <textarea
              value={editIngredientsText}
              onChange={(e) => setEditIngredientsText(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-divider rounded-input text-primary focus:outline-none focus:border-accent min-h-[120px]"
              placeholder="例如：&#10;西红柿 2 个&#10;鸡蛋 3 个&#10;盐 1 勺"
            />
          </div>

          <div className="card p-4">
            <label className="block text-sm font-medium text-primary mb-2">步骤</label>
            <p className="text-xs text-secondary mb-2">每行一个步骤</p>
            <textarea
              value={editStepsText}
              onChange={(e) => setEditStepsText(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-divider rounded-input text-primary focus:outline-none focus:border-accent min-h-[200px]"
              placeholder="例如：&#10;西红柿切块&#10;鸡蛋打散炒熟&#10;加入西红柿翻炒3分钟&#10;加盐调味"
            />
          </div>

          <div className="card p-4">
            <label className="block text-sm font-medium text-primary mb-2">备注</label>
            <textarea
              value={editNote}
              onChange={(e) => setEditNote(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-divider rounded-input text-primary focus:outline-none focus:border-accent min-h-[80px]"
              placeholder="添加备注信息..."
            />
          </div>

          <div className="pt-2">
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full py-3 text-danger hover:bg-danger/5 rounded-input transition-colors"
            >
              删除菜谱
            </button>
          </div>

          {showDeleteConfirm && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-card rounded-card p-6 w-full max-w-sm">
                <h3 className="font-display text-lg font-medium text-primary mb-2">确认删除</h3>
                <p className="text-secondary text-sm mb-6">删除后无法恢复，确定要删除这个菜谱吗？</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 py-2 bg-background text-primary rounded-input hover:bg-divider/50 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={() => {
                      deleteRecipe(recipe.id);
                      navigate('/mine');
                    }}
                    className="flex-1 py-2 bg-danger text-white rounded-input hover:bg-danger/90 transition-colors"
                  >
                    删除
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm px-4 py-4 border-b border-divider flex items-center gap-4">
        <button
          onClick={() => navigate('/mine')}
          className="p-2 -ml-2 hover:bg-divider/50 rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-primary" />
        </button>
        <h1 className="font-display text-xl font-medium text-primary flex-1 truncate">
          {recipe.title}
        </h1>
        <button
          onClick={() => setIsEditing(true)}
          className="p-2 hover:bg-divider/50 rounded-full transition-colors text-secondary"
          title="编辑菜谱"
        >
          <Edit className="w-5 h-5" />
        </button>
        <button
          onClick={() => toggleFavorite(recipe.id)}
          className={`p-2 hover:bg-divider/50 rounded-full transition-colors ${
            recipe.favorited ? 'text-accent' : 'text-secondary'
          }`}
          title={recipe.favorited ? '取消收藏' : '收藏'}
        >
          <Heart className={`w-5 h-5 ${recipe.favorited ? 'fill-current' : ''}`} />
        </button>
        <button
          onClick={handleAddTodo}
          className={`p-2 hover:bg-divider/50 rounded-full transition-colors ${
            todo?.isCompleted ? 'text-accent' : 'text-secondary'
          }`}
          title={todo ? '取消待办' : '加入待办'}
        >
          {todo ? (
            <BookmarkCheck className="w-5 h-5" />
          ) : (
            <Bookmark className="w-5 h-5" />
          )}
        </button>
      </header>

      <main className="px-4 py-4">
        {recipe.image && (
          <div className="w-full aspect-square rounded-card overflow-hidden mb-4">
            <img
              src={recipe.image}
              alt={recipe.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="flex items-center gap-2 flex-wrap mb-4">
          <span
            className="px-3 py-1 bg-accent/10 text-accent text-sm rounded-full"
          >
            {recipe.structureTag}
          </span>
          {recipe.mainIngredient.map((tag) => (
            <span
              key={tag}
              className="px-3 py-1 bg-background text-secondary text-sm rounded-full"
            >
              {tag}
            </span>
          ))}
          <span className="flex items-center gap-1 text-xs text-secondary">
            <span className="w-1.5 h-1.5 rounded-full bg-accent/60"></span>
            {sourceLabels[recipe.sourceType]}
          </span>
        </div>

        <div className="card mb-4 p-4">
          <ServingsAdjuster
            baseServings={recipe.baseServings}
            currentServings={servings}
            onChange={setServings}
          />
        </div>

        <div className="card mb-4">
          <div className="p-4 border-b border-divider">
            <h3 className="font-display text-base font-medium text-primary">食材</h3>
          </div>
          <div className="divide-y divide-divider">
            {scaledIngredients.map((ing) => (
              <div key={ing.id} className="flex items-center justify-between p-4">
                <span className="text-primary">{ing.name}</span>
                <span className="font-mono-digit text-secondary">
                  {formatAmount(ing.amount)} {ing.unit}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="card mb-4">
          <div className="p-4 border-b border-divider">
            <h3 className="font-display text-base font-medium text-primary">步骤</h3>
          </div>
          <div className="divide-y divide-divider">
            {recipe.steps.map((step) => (
              <div key={step.id} className="p-4">
                <div className="flex gap-4">
                  <span className="w-7 h-7 rounded-full bg-accent/10 text-accent flex items-center justify-center font-mono-digit text-sm font-medium flex-shrink-0">
                    {step.order}
                  </span>
                  <div className="flex-1">
                    <p className="text-primary mb-2">{step.content}</p>
                    {step.hasTimer && step.detectedDurationSeconds && (
                      <TimerButton duration={step.detectedDurationSeconds} stepId={step.id} />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <NutritionCard nutrition={nutrition.nutritionPer100g} />

        {recipe.note && (
          <div className="card mt-4 p-4">
            <h3 className="font-display text-base font-medium text-primary mb-2">备注</h3>
            <p className="text-secondary text-sm">{recipe.note}</p>
          </div>
        )}
      </main>
    </div>
  );
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
