import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Bookmark, BookmarkCheck, Edit, Heart, Save, X, Camera, Plus, Trash2 } from 'lucide-react';
import { useRecipesStore } from '../../store/recipes';
import { useTodosStore } from '../../store/todos';
import { useFoodItemsStore } from '../../store/foodItems';
import { ServingsAdjuster } from '../../components/ServingsAdjuster';
import { NutritionCard } from '../../components/NutritionCard';
import { TimerButton } from '../../components/TimerButton';
import { scaleIngredients, calculateRecipeNutrition, formatAmount, detectDurationInText } from '../../utils/nutrition';
import { generateId } from '../../utils/parser';

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
  const [editBaseServings, setEditBaseServings] = useState(1);
  const [editImage, setEditImage] = useState<string | undefined>();
  const [editIngredients, setEditIngredients] = useState<{ id: string; name: string; amount: number; unit: string; group?: string }[]>([]);
  const [editSteps, setEditSteps] = useState<{ id: string; content: string; hasTimer: boolean; detectedDurationSeconds: number; image?: string }[]>([]);
  const [editNote, setEditNote] = useState('');

  // Group selector for adding ingredients
  const [newIngGroup, setNewIngGroup] = useState('');
  const stepImageInputRefs = useRef<(HTMLInputElement | null)[]>([]);

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
      setEditBaseServings(recipe.baseServings);
      setEditImage(recipe.image);
      setEditIngredients(recipe.ingredients.map(ing => ({ ...ing })));
      setEditSteps(recipe.steps.map(step => ({ ...step, detectedDurationSeconds: step.detectedDurationSeconds || 0 })));
      setEditNote(recipe.note || '');
      // Reset group selector
      setNewIngGroup('');
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

    const ingredients = editIngredients.map(ing => ({
      id: ing.id || generateId(),
      recipeId: recipe.id,
      name: ing.name,
      amount: ing.amount,
      unit: ing.unit,
      group: ing.group || undefined,
    }));

    const steps = editSteps.map((step, index) => ({
      id: step.id || generateId(),
      recipeId: recipe.id,
      order: index + 1,
      content: step.content,
      detectedDurationSeconds: step.detectedDurationSeconds || undefined,
      hasTimer: step.hasTimer || step.detectedDurationSeconds > 0,
      image: step.image,
    }));

    updateRecipe(recipe.id, {
      title: editTitle,
      category: editCategory,
      categoryId: editCategoryId,
      baseServings: editBaseServings,
      image: editImage,
      ingredients,
      steps,
      note: editNote || undefined,
    });

    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const removeEditIngredient = (id: string) => {
    setEditIngredients(prev => prev.filter(ing => ing.id !== id));
  };

  const updateEditIngredient = (id: string, field: string, value: any) => {
    setEditIngredients(prev => prev.map(ing =>
      ing.id === id ? { ...ing, [field]: field === 'amount' ? (parseFloat(value) || 0) : value } : ing
    ));
  };

  const removeEditStep = (id: string) => {
    setEditSteps(prev => prev.filter(s => s.id !== id));
  };

  const handleEditStepImageUpload = (stepIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setEditSteps(prev =>
        prev.map((step, i) =>
          i === stepIndex ? { ...step, image: event.target?.result as string } : step
        )
      );
    };
    reader.readAsDataURL(file);
  };

  const removeEditStepImage = (stepIndex: number) => {
    setEditSteps(prev =>
      prev.map((step, i) => (i === stepIndex ? { ...step, image: undefined } : step))
    );
  };

  const handleEditImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setEditImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeEditImage = () => {
    setEditImage(undefined);
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

        <main className="px-4 py-4">
          <div className="space-y-4">
            {/* Title */}
            <div className="card p-4">
              <label className="block text-sm font-medium text-primary mb-2">
                菜谱名称 <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="输入菜谱名称"
                className="w-full px-4 py-3 bg-background text-primary rounded-input focus:outline-none focus:ring-2 focus:ring-accent/50"
              />
            </div>

            {/* Cover image */}
            <div className="card p-4">
              <label className="block text-sm font-medium text-primary mb-2">封面图片（选填）</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleEditImageUpload}
                className="w-full px-4 py-3 bg-background text-primary rounded-input"
              />
              {editImage && (
                <img src={editImage} alt="封面预览" className="w-24 h-24 rounded-lg object-cover mt-3" />
              )}
            </div>

            {/* Category */}
            <div className="card p-4">
              <label className="block text-sm font-medium text-primary mb-2">
                分类 <span className="text-danger">*</span>
              </label>
              <select
                value={editCategoryId}
                onChange={(e) => {
                  setEditCategoryId(e.target.value);
                  const cat = categories.find(c => c.id === e.target.value);
                  if (cat) setEditCategory(cat.name);
                }}
                className="w-full px-4 py-3 bg-background text-primary rounded-input focus:outline-none focus:ring-2 focus:ring-accent/50"
              >
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            {/* Servings */}
            <div className="card p-4">
              <label className="block text-sm font-medium text-primary mb-2">份量</label>
              <input
                type="number"
                min="1"
                max="20"
                value={editBaseServings}
                onChange={(e) => setEditBaseServings(Number(e.target.value))}
                className="w-full px-4 py-3 bg-background text-primary rounded-input focus:outline-none focus:ring-2 focus:ring-accent/50"
              />
            </div>

            {/* Editable ingredients */}
            {editIngredients.length > 0 && (
              <div className="card p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-primary">食材（{editIngredients.length} 项）</h4>
                  <div className="flex items-center gap-3">
                    <select
                      value={newIngGroup}
                      onChange={(e) => setNewIngGroup(e.target.value)}
                      className="text-xs px-2 py-1 bg-background text-secondary rounded border border-divider focus:outline-none focus:border-accent"
                    >
                      <option value="">无分组</option>
                      {[...new Set(editIngredients.map((ing) => ing.group).filter(Boolean))].map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => setEditIngredients((prev) => [...prev, { id: generateId(), name: '', amount: 0, unit: 'g', group: newIngGroup || undefined }])}
                      className="flex items-center gap-1 text-xs text-accent hover:text-accent/70 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      添加
                    </button>
                  </div>
                </div>
                <div className="space-y-1">
                  {editIngredients.map((ing, index) => (
                    <div key={ing.id}>
                      {ing.group && (index === 0 || editIngredients[index - 1].group !== ing.group) && (
                        <div className="flex items-center gap-2 mt-3 mb-1 first:mt-0">
                          <span className="text-xs font-medium text-accent">{ing.group}</span>
                          <span className="flex-1 h-px bg-divider/50"></span>
                        </div>
                      )}
                      {!ing.group && (index === 0 || editIngredients[index - 1].group !== undefined) && (
                        <div className="flex items-center gap-2 mt-3 mb-1 first:mt-0">
                          <span className="text-xs font-medium text-secondary/50">其他</span>
                          <span className="flex-1 h-px bg-divider/50"></span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 py-1">
                        <input
                          type="text"
                          value={ing.name}
                          onChange={(e) => updateEditIngredient(ing.id, 'name', e.target.value)}
                          placeholder="食材名"
                          className="flex-1 min-w-0 px-2 py-1.5 bg-background text-primary text-sm rounded focus:outline-none focus:ring-1 focus:ring-accent/50"
                        />
                        <input
                          type="number"
                          value={ing.amount || ''}
                          onChange={(e) => updateEditIngredient(ing.id, 'amount', e.target.value)}
                          placeholder="数量"
                          className="w-14 px-2 py-1.5 bg-background text-primary text-sm text-right rounded focus:outline-none focus:ring-1 focus:ring-accent/50"
                        />
                        <input
                          type="text"
                          value={ing.unit}
                          onChange={(e) => updateEditIngredient(ing.id, 'unit', e.target.value)}
                          placeholder="单位"
                          className="w-12 px-2 py-1.5 bg-background text-primary text-sm rounded focus:outline-none focus:ring-1 focus:ring-accent/50"
                        />
                        <select
                          value={ing.group || ''}
                          onChange={(e) => updateEditIngredient(ing.id, 'group', e.target.value)}
                          className="w-16 px-1 py-1.5 bg-background text-secondary text-xs rounded border border-divider focus:outline-none focus:border-accent"
                          title="选择分组"
                        >
                          <option value="">无分组</option>
                          {[...new Set(editIngredients.map((i) => i.group).filter(Boolean))].map((g) => (
                            <option key={g} value={g}>{g}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => removeEditIngredient(ing.id)}
                          className="p-1 text-secondary/40 hover:text-danger transition-colors flex-shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3" style={{ borderTop: '0.5px solid var(--color-divider)' }}>
                  <button
                    onClick={() => {
                      const name = prompt('输入新分组名称，如：面团、酱汁、腌料');
                      if (name && name.trim()) {
                        setEditIngredients((prev) => [...prev, { id: generateId(), name: '', amount: 0, unit: 'g', group: name.trim() }]);
                        setNewIngGroup(name.trim());
                      }
                    }}
                    className="flex items-center gap-1 text-xs text-accent/70 hover:text-accent transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    添加分组
                  </button>
                </div>
              </div>
            )}

            {/* Editable steps with camera */}
            {editSteps.length > 0 && (
              <div className="card p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-primary">步骤（{editSteps.length} 步）</h4>
                  <button
                    onClick={() => setEditSteps((prev) => [...prev, { id: generateId(), content: '', hasTimer: false, detectedDurationSeconds: 0 }])}
                    className="flex items-center gap-1 text-xs text-accent hover:text-accent/70 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    添加
                  </button>
                </div>
                <div className="space-y-3">
                  {editSteps.map((step, index) => (
                    <div key={step.id}>
                      <div className="flex items-start gap-2">
                        <span className="w-6 h-6 rounded-full bg-accent/10 text-accent flex items-center justify-center text-xs font-medium flex-shrink-0 mt-1.5">
                          {index + 1}
                        </span>
                        <textarea
                          value={step.content}
                          onChange={(e) => {
                            const duration = detectDurationInText(e.target.value);
                            setEditSteps((prev) => prev.map((s, i) =>
                              i === index ? { ...s, content: e.target.value, hasTimer: duration > 0, detectedDurationSeconds: duration } : s
                            ));
                          }}
                          placeholder={`步骤 ${index + 1}`}
                          rows={2}
                          className="flex-1 min-w-0 px-2 py-1.5 bg-background text-primary text-sm rounded resize-none focus:outline-none focus:ring-1 focus:ring-accent/50"
                        />
                        {step.hasTimer && (
                          <span className="text-xs text-accent bg-accent/10 px-2 py-0.5 rounded whitespace-nowrap flex-shrink-0 mt-1.5">
                            {Math.floor(step.detectedDurationSeconds / 60)}分钟
                          </span>
                        )}
                        {/* Camera button for step image */}
                        {step.image ? (
                          <div className="relative flex-shrink-0 mt-1">
                            <img src={step.image} alt={`步骤${index + 1}`} className="w-10 h-10 rounded-lg object-cover" />
                            <button
                              onClick={() => removeEditStepImage(index)}
                              className="absolute -top-1 -right-1 w-4 h-4 bg-black/60 text-white rounded-full flex items-center justify-center"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => stepImageInputRefs.current[index]?.click()}
                            className="p-1.5 hover:bg-divider/50 rounded-full transition-colors flex-shrink-0 mt-1"
                            title="添加步骤图片"
                          >
                            <Camera className="w-4 h-4 text-secondary/60" />
                          </button>
                        )}
                        <input
                          ref={(el) => { stepImageInputRefs.current[index] = el; }}
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleEditStepImageUpload(index, e)}
                          className="hidden"
                        />
                        <button
                          onClick={() => removeEditStep(step.id)}
                          className="p-1 text-secondary/40 hover:text-danger transition-colors flex-shrink-0 mt-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Note */}
            <div className="card p-4">
              <label className="block text-sm font-medium text-primary mb-2">备注</label>
              <textarea
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
                placeholder="添加备注信息..."
                rows={3}
                className="w-full px-4 py-3 bg-background text-primary rounded-input focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none"
              />
            </div>

            {/* Delete button */}
            <div className="pt-2">
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full py-3 text-danger hover:bg-danger/5 rounded-input transition-colors"
              >
                删除菜谱
              </button>
            </div>
          </div>
        </main>

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
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm px-5 py-4 flex items-center gap-3" style={{ borderBottom: '0.5px solid var(--color-divider)' }}>
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 hover:bg-divider/50 rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-primary" />
        </button>
        <h1 className="font-display text-[20px] font-medium text-primary flex-1 truncate">
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

      <main className="px-5 py-5">
        {recipe.image && (
          <div className="w-full rounded-card overflow-hidden mb-5" style={{ aspectRatio: '4/3' }}>
            <img
              src={recipe.image}
              alt={recipe.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="flex items-center gap-2 flex-wrap mb-5">
          <span
            className="px-2.5 py-1 text-[12px] rounded"
            style={{
              border: '1px solid var(--color-divider)',
              color: 'var(--color-text-secondary)',
            }}
          >
            {recipe.structureTag}
          </span>
          {recipe.mainIngredient.map((tag) => (
            <span
              key={tag}
              className="px-2.5 py-1 text-[12px] rounded"
              style={{
                border: '1px solid var(--color-divider)',
                color: 'var(--color-text-secondary)',
                opacity: 0.7,
              }}
            >
              {tag}
            </span>
          ))}
          <span className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--color-text-secondary)', opacity: 0.5 }}>
            <span className="w-1 h-1 rounded-full bg-accent/40"></span>
            {sourceLabels[recipe.sourceType]}
          </span>
        </div>

        <div className="card mb-4 p-5">
          <ServingsAdjuster
            baseServings={recipe.baseServings}
            currentServings={servings}
            onChange={setServings}
          />
        </div>

        <div className="card mb-4">
          <div className="px-5 py-4" style={{ borderBottom: '0.5px solid var(--color-divider)' }}>
            <h3 className="font-display text-[16px] font-medium text-primary">食材</h3>
          </div>
          <div className="divide-y divide-divider">
            {(() => {
              // Group ingredients by their group field
              const groups: { name: string | undefined; items: typeof scaledIngredients }[] = [];
              let currentGroupName: string | undefined = undefined;
              let currentGroupItems: typeof scaledIngredients = [];
              for (const ing of scaledIngredients) {
                if (ing.group !== currentGroupName) {
                  if (currentGroupItems.length > 0) {
                    groups.push({ name: currentGroupName, items: currentGroupItems });
                  }
                  currentGroupName = ing.group;
                  currentGroupItems = [ing];
                } else {
                  currentGroupItems.push(ing);
                }
              }
              if (currentGroupItems.length > 0) {
                groups.push({ name: currentGroupName, items: currentGroupItems });
              }
              return groups.map((group) => (
                <div key={group.name || '_ungrouped'}>
                  {group.name && (
                    <div className="px-5 pt-3 pb-1">
                      <span className="text-xs font-medium text-accent/70">{group.name}</span>
                    </div>
                  )}
                  {group.items.map((ing) => (
                    <div key={ing.id} className="flex items-center justify-between px-5 py-3.5">
                      <span className="text-primary text-[15px]">{ing.name}</span>
                      {(ing.amount !== 0 || ing.unit) && (
                        <span className="font-mono-digit text-accent text-[15px]">
                          {ing.amount !== 0 ? formatAmount(ing.amount) : ''} {ing.unit}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ));
            })()}
          </div>
        </div>

        <div className="card mb-4">
          <div className="px-5 py-4" style={{ borderBottom: '0.5px solid var(--color-divider)' }}>
            <h3 className="font-display text-[16px] font-medium text-primary">步骤</h3>
          </div>
          <div className="divide-y divide-divider">
            {recipe.steps.map((step) => (
              <div key={step.id} className="px-5 py-4">
                <div className="flex gap-4">
                  <span className="w-7 h-7 rounded-full bg-accent-tint text-accent flex items-center justify-center font-mono-digit text-[13px] font-semibold flex-shrink-0">
                    {step.order}
                  </span>
                  <div className="flex-1">
                    <p className="text-primary text-[15px] leading-relaxed mb-2">{step.content}</p>
                    {step.image && (
                      <img
                        src={step.image}
                        alt={`步骤${step.order}`}
                        className="mt-2 rounded-lg max-w-full max-h-48 object-cover"
                      />
                    )}
                    {step.hasTimer && step.detectedDurationSeconds && (
                      <TimerButton
                        duration={step.detectedDurationSeconds}
                        stepId={step.id}
                        onDurationChange={(newSeconds) => {
                          const updatedSteps = recipe.steps.map(s =>
                            s.id === step.id ? { ...s, detectedDurationSeconds: newSeconds, hasTimer: newSeconds > 0 } : s
                          );
                          updateRecipe(recipe.id, { steps: updatedSteps });
                        }}
                      />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <NutritionCard nutrition={nutrition.nutritionPer100g} />
        </div>

        {recipe.note && (
          <div className="card p-5">
            <h3 className="font-display text-[16px] font-medium text-primary mb-2">备注</h3>
            <p className="text-secondary text-[14px] leading-relaxed" style={{ whiteSpace: 'pre-wrap' }}>{recipe.note}</p>
          </div>
        )}
      </main>
    </div>
  );
}
