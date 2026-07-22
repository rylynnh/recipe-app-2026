import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Bookmark, BookmarkCheck, Edit, Heart, Save, X, Camera, Plus, Trash2, Crop, Check, RotateCcw } from 'lucide-react';
import { useRecipesStore } from '../../store/recipes';
import { useTodosStore } from '../../store/todos';
import { useFoodItemsStore } from '../../store/foodItems';
import { ServingsAdjuster } from '../../components/ServingsAdjuster';
import { NutritionCard } from '../../components/NutritionCard';
import { TimerButton } from '../../components/TimerButton';
import { scaleIngredients, calculateRecipeNutrition, formatAmount, detectDurationInText } from '../../utils/nutrition';
import { generateId } from '../../utils/parser';
import { compressImage, getDroppedImageFiles } from '../../utils/image';

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
  const [editCoverDragOver, setEditCoverDragOver] = useState(false);
  const [isCropping, setIsCropping] = useState(false);
  const [cropArea, setCropArea] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragType, setDragType] = useState<'move' | 'resize-nw' | 'resize-ne' | 'resize-sw' | 'resize-se' | 'resize-n' | 'resize-s' | 'resize-e' | 'resize-w' | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [cropStart, setCropStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const cropImageRef = useRef<HTMLImageElement>(null);
  const cropCanvasRef = useRef<HTMLCanvasElement>(null);

  const [newIngGroup, setNewIngGroup] = useState('');
  const stepImageInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const ASPECT_RATIO = 4 / 3;
  const MIN_SIZE = 60;

  const startCrop = () => {
    const img = cropImageRef.current;
    if (!img) return;
    let width = img.offsetWidth * 0.8;
    let height = width / ASPECT_RATIO;
    if (height > img.offsetHeight * 0.8) {
      height = img.offsetHeight * 0.8;
      width = height * ASPECT_RATIO;
    }
    setCropArea({
      x: (img.offsetWidth - width) / 2,
      y: (img.offsetHeight - height) / 2,
      width,
      height,
    });
    setIsCropping(true);
  };

  const cancelCrop = () => {
    setIsCropping(false);
    setIsDragging(false);
    setDragType(null);
  };

  const applyCrop = () => {
    const img = cropImageRef.current;
    const canvas = cropCanvasRef.current;
    if (!img || !canvas) return;

    const scaleX = img.naturalWidth / img.offsetWidth;
    const scaleY = img.naturalHeight / img.offsetHeight;

    canvas.width = cropArea.width * scaleX;
    canvas.height = cropArea.height * scaleY;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(
        img,
        cropArea.x * scaleX,
        cropArea.y * scaleY,
        cropArea.width * scaleX,
        cropArea.height * scaleY,
        0,
        0,
        canvas.width,
        canvas.height
      );
      setEditImage(canvas.toDataURL('image/jpeg', 0.9));
      setIsCropping(false);
      setIsDragging(false);
      setDragType(null);
    }
  };

  const getCursorStyle = (type: string | null) => {
    const styles: Record<string, string> = {
      'move': 'move',
      'resize-nw': 'nw-resize',
      'resize-ne': 'ne-resize',
      'resize-sw': 'sw-resize',
      'resize-se': 'se-resize',
      'resize-n': 'n-resize',
      'resize-s': 's-resize',
      'resize-e': 'e-resize',
      'resize-w': 'w-resize',
    };
    return styles[type || ''] || 'default';
  };

  const handleCropMouseDown = (e: React.MouseEvent, type: 'move' | 'resize-nw' | 'resize-ne' | 'resize-sw' | 'resize-se' | 'resize-n' | 'resize-s' | 'resize-e' | 'resize-w') => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    setDragType(type);
    setDragStart({ x: e.clientX, y: e.clientY });
    setCropStart({ ...cropArea });
  };

  const handleCropMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !dragType) return;

    const img = cropImageRef.current;
    if (!img) return;

    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    const minWidth = MIN_SIZE;
    const minHeight = MIN_SIZE / ASPECT_RATIO;

    let newX = cropStart.x;
    let newY = cropStart.y;
    let newWidth = cropStart.width;
    let newHeight = cropStart.height;

    switch (dragType) {
      case 'move':
        newX = Math.max(0, Math.min(img.offsetWidth - cropStart.width, cropStart.x + dx));
        newY = Math.max(0, Math.min(img.offsetHeight - cropStart.height, cropStart.y + dy));
        break;

      case 'resize-se':
        newWidth = Math.max(minWidth, Math.min(img.offsetWidth - cropStart.x, cropStart.width + dx));
        newHeight = newWidth / ASPECT_RATIO;
        if (newHeight > img.offsetHeight - cropStart.y) {
          newHeight = img.offsetHeight - cropStart.y;
          newWidth = newHeight * ASPECT_RATIO;
        }
        break;

      case 'resize-nw':
        newWidth = Math.max(minWidth, cropStart.width - dx);
        newHeight = newWidth / ASPECT_RATIO;
        newX = cropStart.x + dx;
        newY = cropStart.y + dy;
        if (newX < 0) {
          newWidth += newX;
          newX = 0;
        }
        if (newY < 0) {
          newHeight += newY;
          newY = 0;
        }
        if (newWidth < minWidth) {
          newX -= minWidth - newWidth;
          newWidth = minWidth;
          newHeight = minWidth / ASPECT_RATIO;
        }
        break;

      case 'resize-ne':
        newWidth = Math.max(minWidth, Math.min(img.offsetWidth - cropStart.x, cropStart.width + dx));
        newHeight = newWidth / ASPECT_RATIO;
        newY = cropStart.y + dy;
        if (newY < 0) {
          newHeight += newY;
          newY = 0;
        }
        if (newHeight > img.offsetHeight - newY) {
          newHeight = img.offsetHeight - newY;
          newWidth = newHeight * ASPECT_RATIO;
        }
        break;

      case 'resize-sw':
        newWidth = Math.max(minWidth, cropStart.width - dx);
        newHeight = newWidth / ASPECT_RATIO;
        newX = cropStart.x + dx;
        if (newX < 0) {
          newWidth += newX;
          newX = 0;
        }
        if (newHeight > img.offsetHeight - cropStart.y) {
          newHeight = img.offsetHeight - cropStart.y;
          newWidth = newHeight * ASPECT_RATIO;
        }
        break;

      case 'resize-n':
        newHeight = Math.max(minHeight, cropStart.height - dy);
        newWidth = newHeight * ASPECT_RATIO;
        newY = cropStart.y + dy;
        if (newY < 0) {
          newHeight += newY;
          newY = 0;
        }
        if (newWidth > img.offsetWidth - cropStart.x) {
          newWidth = img.offsetWidth - cropStart.x;
          newHeight = newWidth / ASPECT_RATIO;
        }
        break;

      case 'resize-s':
        newHeight = Math.max(minHeight, Math.min(img.offsetHeight - cropStart.y, cropStart.height + dy));
        newWidth = newHeight * ASPECT_RATIO;
        if (newWidth > img.offsetWidth - cropStart.x) {
          newWidth = img.offsetWidth - cropStart.x;
          newHeight = newWidth / ASPECT_RATIO;
        }
        break;

      case 'resize-e':
        newWidth = Math.max(minWidth, Math.min(img.offsetWidth - cropStart.x, cropStart.width + dx));
        newHeight = newWidth / ASPECT_RATIO;
        if (newHeight > img.offsetHeight - cropStart.y) {
          newHeight = img.offsetHeight - cropStart.y;
          newWidth = newHeight * ASPECT_RATIO;
        }
        break;

      case 'resize-w':
        newWidth = Math.max(minWidth, cropStart.width - dx);
        newHeight = newWidth / ASPECT_RATIO;
        newX = cropStart.x + dx;
        if (newX < 0) {
          newWidth += newX;
          newX = 0;
        }
        if (newHeight > img.offsetHeight - cropStart.y) {
          newHeight = img.offsetHeight - cropStart.y;
          newWidth = newHeight * ASPECT_RATIO;
        }
        break;
    }

    setCropArea({ x: newX, y: newY, width: newWidth, height: newHeight });
  };

  const handleCropMouseUp = () => {
    setIsDragging(false);
    setDragType(null);
  };

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

  const handleEditStepImageUpload = async (stepIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressedDataUrl = await compressImage(file, 600, 0.7);
      setEditSteps(prev =>
        prev.map((step, i) =>
          i === stepIndex ? { ...step, image: compressedDataUrl } : step
        )
      );
    } catch (error) {
      console.error('步骤图片压缩失败:', error);
      const reader = new FileReader();
      reader.onload = (event) => {
        setEditSteps(prev =>
          prev.map((step, i) =>
            i === stepIndex ? { ...step, image: event.target?.result as string } : step
          )
        );
      };
      reader.readAsDataURL(file);
    }
  };

  const removeEditStepImage = (stepIndex: number) => {
    setEditSteps(prev =>
      prev.map((step, i) => (i === stepIndex ? { ...step, image: undefined } : step))
    );
  };

  const processEditCoverFile = async (file: File) => {
    try {
      const compressedDataUrl = await compressImage(file, 800, 0.8);
      setEditImage(compressedDataUrl);
    } catch (error) {
      console.error('图片压缩失败:', error);
      const reader = new FileReader();
      reader.onload = (event) => {
        setEditImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEditImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processEditCoverFile(file);
  };

  const handleEditCoverDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setEditCoverDragOver(false);
    const files = getDroppedImageFiles(e.dataTransfer);
    if (files.length > 0) processEditCoverFile(files[0]);
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
              <label className="block text-sm font-medium text-primary mb-2">封面图片</label>
              {editImage && !isCropping ? (
                <div className="relative w-full rounded-lg overflow-hidden" style={{ aspectRatio: '4/3', backgroundColor: '#EAE6DE' }}>
                  <img
                    ref={cropImageRef}
                    src={editImage}
                    alt="封面预览"
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={removeEditImage}
                    className="absolute top-2 right-2 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => startCrop()}
                    className="absolute bottom-2 right-2 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70 transition-colors"
                  >
                    <Crop className="w-4 h-4" />
                  </button>
                </div>
              ) : isCropping ? (
                <div className="space-y-3">
                  <div 
                    className="relative w-full rounded-lg overflow-hidden" 
                    style={{ aspectRatio: '4/3', backgroundColor: '#EAE6DE' }}
                    onMouseMove={handleCropMouseMove}
                    onMouseUp={handleCropMouseUp}
                    onMouseLeave={handleCropMouseUp}
                  >
                    <img
                      ref={cropImageRef}
                      src={editImage}
                      alt="裁剪预览"
                      className="w-full h-full object-cover"
                    />
                    <div
                      className="absolute border-2 border-accent bg-accent/20"
                      style={{
                        width: `${cropArea.width}px`,
                        height: `${cropArea.height}px`,
                        left: `${cropArea.x}px`,
                        top: `${cropArea.y}px`,
                        cursor: getCursorStyle(dragType) || 'move',
                      }}
                      onMouseDown={(e) => handleCropMouseDown(e, 'move')}
                    >
                      <div 
                        className="absolute -top-1 -left-1 w-4 h-4 bg-accent rounded-sm cursor-nw-resize"
                        onMouseDown={(e) => handleCropMouseDown(e, 'resize-nw')}
                      />
                      <div 
                        className="absolute -top-1 -right-1 w-4 h-4 bg-accent rounded-sm cursor-ne-resize"
                        onMouseDown={(e) => handleCropMouseDown(e, 'resize-ne')}
                      />
                      <div 
                        className="absolute -bottom-1 -left-1 w-4 h-4 bg-accent rounded-sm cursor-sw-resize"
                        onMouseDown={(e) => handleCropMouseDown(e, 'resize-sw')}
                      />
                      <div 
                        className="absolute -bottom-1 -right-1 w-4 h-4 bg-accent rounded-sm cursor-se-resize"
                        onMouseDown={(e) => handleCropMouseDown(e, 'resize-se')}
                      />
                      <div 
                        className="absolute -top-1 left-1/2 -translate-x-1/2 w-4 h-1 bg-accent cursor-n-resize"
                        onMouseDown={(e) => handleCropMouseDown(e, 'resize-n')}
                      />
                      <div 
                        className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-1 bg-accent cursor-s-resize"
                        onMouseDown={(e) => handleCropMouseDown(e, 'resize-s')}
                      />
                      <div 
                        className="absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-4 bg-accent cursor-w-resize"
                        onMouseDown={(e) => handleCropMouseDown(e, 'resize-w')}
                      />
                      <div 
                        className="absolute -right-1 top-1/2 -translate-y-1/2 w-1 h-4 bg-accent cursor-e-resize"
                        onMouseDown={(e) => handleCropMouseDown(e, 'resize-e')}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => cancelCrop()}
                      className="flex-1 py-3 bg-bg-input text-text-secondary rounded-input flex items-center justify-center gap-2"
                    >
                      <RotateCcw className="w-4 h-4" />
                      取消
                    </button>
                    <button
                      onClick={() => applyCrop()}
                      className="flex-1 py-3 bg-accent text-text-white rounded-input flex items-center justify-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      确认裁剪
                    </button>
                  </div>
                </div>
              ) : (
                <label
                  className="block w-full cursor-pointer"
                  onDragOver={(e) => { e.preventDefault(); setEditCoverDragOver(true); }}
                  onDragLeave={() => setEditCoverDragOver(false)}
                  onDrop={handleEditCoverDrop}
                >
                  <div
                    className={`w-full py-6 rounded-input flex flex-col items-center justify-center gap-1.5 transition-colors border-2 border-dashed ${
                      editCoverDragOver ? 'border-accent bg-accent/10' : 'border-transparent bg-bg-input hover:bg-bg-hover'
                    }`}
                  >
                    <Camera className="w-6 h-6 text-text-tertiary" />
                    <span className="text-sm text-text-tertiary">
                      {editCoverDragOver ? '松开以上传封面' : '点击或拖拽图片上传封面'}
                    </span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleEditImageUpload}
                    className="hidden"
                  />
                </label>
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

            <canvas ref={cropCanvasRef} className="hidden" />

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
