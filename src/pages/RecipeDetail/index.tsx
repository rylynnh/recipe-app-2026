import { notify } from '../../store/feedback';
import { Modal, ConfirmDialog } from '../../components/Modal';
import { displayRecipeTitle } from '../../utils/recipeTitle';
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Bookmark, BookmarkCheck, Edit, Heart, Save, X, Camera, Plus, Trash2, Crop, Check, RotateCcw, Menu, Timer, Share2, Loader2 } from 'lucide-react';
import { useRecipesStore } from '../../store/recipes';
import { useTodosStore } from '../../store/todos';
import { useFoodItemsStore } from '../../store/foodItems';
import { ServingsAdjuster } from '../../components/ServingsAdjuster';
import { NutritionCard } from '../../components/NutritionCard';
import { TimerButton } from '../../components/TimerButton';
import { scaleIngredients, calculateRecipeNutrition, formatAmount, detectDurationInText, detectMainIngredients, parsePastedText } from '../../utils/nutrition';
import { generateId } from '../../utils/parser';
import { compressImage, getDroppedImageFiles } from '../../utils/image';
import { resolveRecipeImage } from '../../utils/recipeImage';
import { CoverImageEditor } from '../../components/CoverImageEditor';
import { AdminPinDialog } from '../../components/AdminPinDialog';
import { useAdminGate } from '../../hooks/useAdminGate';
import { createRecipeShareImage } from '../../utils/recipeShare';
import { formatServingAmount, parseServingAmount } from '../../utils/servings';
import { recipeTime } from '../../utils/recipePresentation';
import { ImageViewer } from '../../components/ImageViewer';

type EditableIngredient = { id: string; name: string; amount: number | string; unit: string; group?: string };
type EditableStep = { id: string; content: string; hasTimer: boolean; detectedDurationSeconds: number; timerManuallyEdited?: boolean; image?: string };

const getIngredientGroupKey = (group?: string) => group || '__ungrouped__';

function coalesceIngredientGroups(items: EditableIngredient[]) {
  const groups = new Map<string, EditableIngredient[]>();
  items.forEach((item) => {
    const key = item.group || '__ungrouped__';
    groups.set(key, [...(groups.get(key) || []), item]);
  });
  return Array.from(groups.values()).flat();
}

function moveIngredientGroup(items: EditableIngredient[], sourceKey: string, targetKey: string, placeAfter: boolean) {
  if (sourceKey === targetKey) return items;

  const groups = Array.from(
    items.reduce((result, item) => {
      const key = getIngredientGroupKey(item.group);
      result.set(key, [...(result.get(key) || []), item]);
      return result;
    }, new Map<string, EditableIngredient[]>())
  ).map(([key, groupItems]) => ({ key, items: groupItems }));
  const sourceIndex = groups.findIndex((group) => group.key === sourceKey);
  const targetIndex = groups.findIndex((group) => group.key === targetKey);
  if (sourceIndex < 0 || targetIndex < 0) return items;

  const [source] = groups.splice(sourceIndex, 1);
  const adjustedTargetIndex = groups.findIndex((group) => group.key === targetKey) + (placeAfter ? 1 : 0);
  groups.splice(adjustedTargetIndex, 0, source);
  return groups.flatMap((group) => group.items);
}

export function RecipeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getRecipeById, updateRecipe, deleteRecipe, toggleFavorite, favoriteIds, initialized } = useRecipesStore();
  const { addTodo, getPendingTodos, removeTodo } = useTodosStore();
  const { foodItems, unitConversions, categories } = useFoodItemsStore();
  const { pinDialogOpen, requireAdmin, cancelAdminUnlock, continueAfterUnlock } = useAdminGate();

  const recipe = getRecipeById(id || '');
  const isFavorited = recipe ? favoriteIds.includes(recipe.id) : false;
  const [servings, setServings] = useState(recipe?.baseServings || 1);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isPreparingShare, setIsPreparingShare] = useState(false);
  const [shareImageUrl, setShareImageUrl] = useState<string | null>(null);
  const [viewingImage, setViewingImage] = useState<{ src: string; alt: string } | null>(null);

  // Edit form state
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editBaseServings, setEditBaseServings] = useState(1);
  const [editBaseServingsInput, setEditBaseServingsInput] = useState('1');
  const [editImage, setEditImage] = useState<string | undefined>();
  const [editIngredients, setEditIngredients] = useState<EditableIngredient[]>([]);
  const [editSteps, setEditSteps] = useState<EditableStep[]>([]);
  const [editNote, setEditNote] = useState('');
  const [editPasteText, setEditPasteText] = useState('');
  const [editMainIngredients, setEditMainIngredients] = useState<string[]>([]);
  const [editTagInput, setEditTagInput] = useState('');
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
  const draggedIngredientIndex = useRef<number | null>(null);
  const draggedIngredientGroup = useRef<string | null>(null);
  const lastIngredientGroupTarget = useRef<string | null>(null);
  const draggedStepIndex = useRef<number | null>(null);

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

  const handleCropPointerDown = (e: React.PointerEvent, type: 'move' | 'resize-nw' | 'resize-ne' | 'resize-sw' | 'resize-se' | 'resize-n' | 'resize-s' | 'resize-e' | 'resize-w') => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setIsDragging(true);
    setDragType(type);
    setDragStart({ x: e.clientX, y: e.clientY });
    setCropStart({ ...cropArea });
  };

  const handleCropPointerMove = (e: React.PointerEvent) => {
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

  const handleCropPointerUp = () => {
    setIsDragging(false);
    setDragType(null);
  };

  const todo = recipe ? getPendingTodos().find((item) => item.recipeId === recipe.id) : undefined;

  useEffect(() => {
    if (recipe) {
      setServings(recipe.baseServings);
    }
  }, [recipe]);

  useEffect(() => {
    if (isEditing && recipe) {
      setEditTitle(displayRecipeTitle(recipe));
      setEditCategory(recipe.category);
      setEditCategoryId(recipe.categoryId);
      setEditBaseServings(recipe.baseServings);
      setEditBaseServingsInput(formatServingAmount(recipe.baseServings));
      setEditImage(recipe.image);
      setEditIngredients(coalesceIngredientGroups(recipe.ingredients.map(ing => ({ ...ing }))));
      setEditSteps(recipe.steps.map(step => ({ ...step, detectedDurationSeconds: step.detectedDurationSeconds || 0 })));
      setEditNote(recipe.note || '');
      setEditPasteText('');
      setEditMainIngredients(recipe.mainIngredient);
      setEditTagInput('');
      // Reset group selector
      setNewIngGroup('');
    }
  }, [isEditing, recipe]);

  useEffect(() => () => {
    if (shareImageUrl) URL.revokeObjectURL(shareImageUrl);
  }, [shareImageUrl]);

  if (!recipe) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center px-6">
          {!initialized ? (
            <>
              <Loader2 className="w-5 h-5 mx-auto mb-3 text-accent animate-spin" />
              <p className="text-secondary">正在打开菜谱…</p>
              <p className="mt-1 text-xs text-secondary/60">正在同步料理档案</p>
            </>
          ) : (
            <>
              <p className="text-secondary">暂时无法打开这道菜谱</p>
              <p className="mt-1 text-xs text-secondary/60">链接可能不完整，或菜谱已被移除</p>
            </>
          )}
        </div>
      </div>
    );
  }

  const scaledIngredients = scaleIngredients(recipe.ingredients, recipe.baseServings, servings);
  const nutrition = calculateRecipeNutrition(scaledIngredients, foodItems, unitConversions);
  const detectedTagSuggestions = detectMainIngredients(editIngredients);
  const visibleEditTags = Array.from(new Set([...detectedTagSuggestions, ...editMainIngredients]));

  const handleAddTodo = () => {
    if (todo) {
      removeTodo(todo.id);
    } else {
      addTodo(recipe.id);
    }
  };

  const handleShareRecipe = async () => {
    setIsPreparingShare(true);
    try {
      const blob = await createRecipeShareImage(recipe);
      const file = new File([blob], `${displayRecipeTitle(recipe)}-MISE\u83DC\u8C31.jpg`, { type: 'image/jpeg' });
      if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
        try {
          await navigator.share({ title: displayRecipeTitle(recipe), text: `MISE \u83DC\u8C31\uFF5C${displayRecipeTitle(recipe)}`, files: [file] });
          return;
        } catch (error) {
          if (error instanceof DOMException && error.name === 'AbortError') return;
        }
      }
      setShareImageUrl(URL.createObjectURL(blob));
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      notify(error instanceof Error ? error.message : '\u5206\u4EAB\u56FE\u7247\u751F\u6210\u5931\u8D25\uFF0C\u8BF7\u91CD\u8BD5\u3002', 'error');
    } finally {
      setIsPreparingShare(false);
    }
  };

  const handleSaveEdit = () => {
    if (!editTitle.trim()) {
      notify('请输入菜谱名称', 'error');
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
      structureTag: editCategory,
      baseServings: editBaseServings,
      image: editImage,
      ingredients,
      steps,
      note: editNote || undefined,
      mainIngredient: editMainIngredients,
    });

    notify('菜谱更改已保存');
    setIsEditing(false);
  };

  const handleParseEditText = () => {
    if (!editPasteText.trim()) return;
    const parsed = parsePastedText(editPasteText);
    if (parsed.title) setEditTitle(parsed.title);
    if (parsed.ingredients.length > 0) {
      const nextIngredients = coalesceIngredientGroups(parsed.ingredients.map((ingredient) => ({
        ...ingredient,
        id: generateId(),
      })));
      setEditIngredients(nextIngredients);
      setEditMainIngredients((current) => Array.from(new Set([
        ...current,
        ...detectMainIngredients(nextIngredients),
      ])));
    }
    if (parsed.steps.length > 0) {
      setEditSteps(parsed.steps.map((content) => {
        const duration = detectDurationInText(content);
        return {
          id: generateId(),
          content,
          hasTimer: duration > 0,
          detectedDurationSeconds: duration,
        };
      }));
    }
    if (parsed.note) setEditNote(parsed.note);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const requestEditing = () => requireAdmin(() => setIsEditing(true));
  const requestDeleteConfirmation = () => requireAdmin(() => setShowDeleteConfirm(true));

  const removeEditIngredient = (id: string) => {
    setEditIngredients(prev => prev.filter(ing => ing.id !== id));
  };

  const updateEditIngredient = (id: string, field: string, value: any) => {
    setEditIngredients(prev => {
      const next = prev.map(ing =>
        ing.id === id ? { ...ing, [field]: field === 'amount' ? (value || 0) : field === 'group' ? value || undefined : value } : ing
      );
      return field === 'group' ? coalesceIngredientGroups(next) : next;
    });
  };

  const moveEditIngredient = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    setEditIngredients((prev) => {
      const next = [...prev];
      const [dragged] = next.splice(fromIndex, 1);
      const targetIndex = fromIndex < toIndex ? toIndex - 1 : toIndex;
      next.splice(targetIndex, 0, { ...dragged, group: prev[toIndex]?.group });
      return coalesceIngredientGroups(next);
    });
  };

  const reorderEditIngredientGroup = (sourceKey: string, targetKey: string, placeAfter: boolean) => {
    setEditIngredients((prev) => moveIngredientGroup(prev, sourceKey, targetKey, placeAfter));
  };

  const removeEditStep = (id: string) => {
    setEditSteps(prev => prev.filter(s => s.id !== id));
  };

  const moveEditStep = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    setEditSteps((prev) => {
      const next = [...prev];
      const [dragged] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, dragged);
      return next;
    });
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

  if (isEditing) {
    return (
      <div className="mise-form min-h-screen bg-background">
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
                <div className="mise-edit-cover relative w-full rounded-lg overflow-hidden">
                  <img
                    ref={cropImageRef}
                    src={editImage}
                    alt="封面预览"
                    className="mise-edit-cover-image"
                  />
                  <button
                    onClick={removeEditImage}
                    className="absolute top-2 right-2 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => startCrop()}
                    aria-label="调整封面裁剪"
                    className="absolute bottom-2 right-2 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70 transition-colors"
                  >
                    <Crop className="w-4 h-4" />
                  </button>
                </div>
              ) : isCropping && editImage ? (
                <CoverImageEditor
                  image={editImage}
                  onCancel={cancelCrop}
                  onConfirm={(nextImage) => {
                    setEditImage(nextImage);
                    setIsCropping(false);
                  }}
                />
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

            {/* Re-parse recipe text */}
            <div className="card p-4">
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-medium text-primary">粘贴完整文字</label>
                {editPasteText && (
                  <button type="button" onClick={() => setEditPasteText('')} className="text-xs text-secondary hover:text-primary">
                    × 清空
                  </button>
                )}
              </div>
              <textarea
                value={editPasteText}
                onChange={(event) => setEditPasteText(event.target.value)}
                placeholder="可粘贴食材、步骤和小贴士，解析后会更新已识别到的内容。"
                rows={7}
                className="w-full resize-y rounded-input bg-background px-3 py-2 text-sm text-primary outline-none ring-1 ring-divider focus:ring-accent"
              />
              <button type="button" onClick={handleParseEditText} className="mt-3 rounded-input bg-accent px-4 py-2 text-sm text-white hover:bg-accent/90">
                解析文字
              </button>
            </div>
            {/* Tags */}
            <div className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-primary">标签</label>
                <span className="text-xs text-secondary">自动识别可修改</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {visibleEditTags.map((tag) => {
                  const selected = editMainIngredients.includes(tag);
                  if (!selected) return <button key={tag} type="button" onClick={() => setEditMainIngredients((current) => [...current, tag])} className="rounded-full px-3 py-1.5 text-xs transition-colors" style={{ border: '1px solid var(--color-divider)', color: 'var(--color-text-secondary)' }}>{tag}</button>;
                  return <span key={tag} className="relative inline-flex rounded-full px-3 py-1.5 pr-6 text-xs" style={{ border: '1px solid var(--color-divider)', backgroundColor: 'var(--color-accent-tint)', color: 'var(--color-accent)' }}>{tag}<button type="button" aria-label={`删除标签 ${tag}`} onClick={() => setEditMainIngredients((current) => current.filter((item) => item !== tag))} className="absolute right-1 top-1 grid h-3.5 w-3.5 place-items-center rounded-full text-secondary hover:bg-background"><X className="h-3 w-3" strokeWidth={1.8} /></button></span>;
                })}
                {visibleEditTags.length === 0 && <span className="text-xs text-secondary">暂未识别到标签</span>}
              </div>
              <div className="mt-3 flex gap-2">
                <input value={editTagInput} onChange={(event) => setEditTagInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); const tag = editTagInput.trim(); if (tag && !editMainIngredients.includes(tag)) setEditMainIngredients((current) => [...current, tag]); setEditTagInput(''); } }} placeholder="手动添加标签" className="min-w-0 flex-1 rounded-input bg-background px-3 py-2 text-sm text-primary outline-none ring-1 ring-divider focus:ring-accent" />
                <button type="button" onClick={() => { const tag = editTagInput.trim(); if (tag && !editMainIngredients.includes(tag)) setEditMainIngredients((current) => [...current, tag]); setEditTagInput(''); }} className="rounded-input border border-divider px-3 text-sm text-secondary">添加</button>
              </div>
            </div>

            {/* Servings */}
            <div className="card p-4">
              <label className="block text-sm font-medium text-primary mb-2">配方基准量</label>
              <input
                type="text"
                inputMode="text"
                value={editBaseServingsInput}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  if (!/^\d*(?:\.\d*)?(?:\/\d*(?:\.\d*)?)?$/.test(nextValue)) return;
                  setEditBaseServingsInput(nextValue);
                  const parsed = parseServingAmount(nextValue);
                  if (parsed !== null) setEditBaseServings(parsed);
                }}
                onBlur={() => {
                  if (parseServingAmount(editBaseServingsInput) === null) setEditBaseServingsInput(formatServingAmount(editBaseServings));
                }}
                placeholder="如 1、0.5、1/2"
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
                      onClick={() => setEditIngredients((prev) => coalesceIngredientGroups([...prev, { id: generateId(), name: '', amount: 0, unit: 'g', group: newIngGroup || undefined }]))}
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
                        <div className="flex items-center gap-1.5 mt-3 mb-1 first:mt-0" data-edit-ingredient-group-key={getIngredientGroupKey(ing.group)}>
                          <button
                            type="button"
                            onPointerDown={(event) => {
                              draggedIngredientGroup.current = getIngredientGroupKey(ing.group);
                              lastIngredientGroupTarget.current = null;
                              event.currentTarget.setPointerCapture?.(event.pointerId);
                            }}
                            onPointerMove={(event) => {
                              const sourceKey = draggedIngredientGroup.current;
                              const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-edit-ingredient-group-key]');
                              const targetKey = target?.dataset.editIngredientGroupKey;
                              if (!sourceKey || !targetKey || sourceKey === targetKey) return;
                              const bounds = target.getBoundingClientRect();
                              const targetPosition = event.clientY > bounds.top + bounds.height / 2 ? 'after' : 'before';
                              const targetSignature = `${targetKey}:${targetPosition}`;
                              if (lastIngredientGroupTarget.current === targetSignature) return;
                              lastIngredientGroupTarget.current = targetSignature;
                              reorderEditIngredientGroup(sourceKey, targetKey, targetPosition === 'after');
                            }}
                            onPointerUp={() => {
                              draggedIngredientGroup.current = null;
                              lastIngredientGroupTarget.current = null;
                            }}
                            onPointerCancel={() => {
                              draggedIngredientGroup.current = null;
                              lastIngredientGroupTarget.current = null;
                            }}
                            className="-ml-1 shrink-0 cursor-grab touch-none p-1 text-secondary/45 active:cursor-grabbing"
                            title="拖动调整分组顺序"
                            aria-label={`拖动 ${ing.group} 分组调整顺序`}
                          >
                            <Menu className="h-3.5 w-3.5" strokeWidth={1.5} />
                          </button>
                          <input
                            key={ing.group}
                            defaultValue={ing.group}
                            aria-label={`修改分组名称 ${ing.group}`}
                            title="点击修改分组名称"
                            onBlur={(event) => {
                              const name = event.target.value.trim();
                              if (!name) { event.target.value = ing.group || ''; return; }
                              if (name === ing.group) return;
                              setEditIngredients((prev) => coalesceIngredientGroups(prev.map((item) => item.group === ing.group ? { ...item, group: name } : item)));
                              setNewIngGroup((current) => current === ing.group ? name : current);
                            }}
                            onKeyDown={(event) => {
                              if (event.nativeEvent.isComposing) return;
                              if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur(); }
                              if (event.key === 'Escape') { event.currentTarget.value = ing.group || ''; event.currentTarget.blur(); }
                            }}
                            className="min-w-0 w-32 rounded bg-transparent text-xs font-medium text-accent outline-none focus:ring-1 focus:ring-accent/40"
                          />
                          <span className="flex-1 h-px bg-divider/50"></span>
                        </div>
                      )}
                      {!ing.group && (index === 0 || editIngredients[index - 1].group !== undefined) && (
                        <div className="flex items-center gap-1.5 mt-3 mb-1 first:mt-0" data-edit-ingredient-group-key={getIngredientGroupKey()}>
                          <button
                            type="button"
                            onPointerDown={(event) => {
                              draggedIngredientGroup.current = getIngredientGroupKey();
                              lastIngredientGroupTarget.current = null;
                              event.currentTarget.setPointerCapture?.(event.pointerId);
                            }}
                            onPointerMove={(event) => {
                              const sourceKey = draggedIngredientGroup.current;
                              const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-edit-ingredient-group-key]');
                              const targetKey = target?.dataset.editIngredientGroupKey;
                              if (!sourceKey || !targetKey || sourceKey === targetKey) return;
                              const bounds = target.getBoundingClientRect();
                              const targetPosition = event.clientY > bounds.top + bounds.height / 2 ? 'after' : 'before';
                              const targetSignature = `${targetKey}:${targetPosition}`;
                              if (lastIngredientGroupTarget.current === targetSignature) return;
                              lastIngredientGroupTarget.current = targetSignature;
                              reorderEditIngredientGroup(sourceKey, targetKey, targetPosition === 'after');
                            }}
                            onPointerUp={() => {
                              draggedIngredientGroup.current = null;
                              lastIngredientGroupTarget.current = null;
                            }}
                            onPointerCancel={() => {
                              draggedIngredientGroup.current = null;
                              lastIngredientGroupTarget.current = null;
                            }}
                            className="-ml-1 shrink-0 cursor-grab touch-none p-1 text-secondary/45 active:cursor-grabbing"
                            title="拖动调整分组顺序"
                            aria-label="拖动其他分组调整顺序"
                          >
                            <Menu className="h-3.5 w-3.5" strokeWidth={1.5} />
                          </button>
                          <span className="text-xs font-medium text-secondary/50">其他</span>
                          <span className="flex-1 h-px bg-divider/50"></span>
                        </div>
                      )}
                      <div
                        className="flex items-center gap-1.5 py-1"
                        data-edit-ingredient-index={index}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={() => {
                          const fromIndex = draggedIngredientIndex.current;
                          draggedIngredientIndex.current = null;
                          if (fromIndex !== null) moveEditIngredient(fromIndex, index);
                        }}
                      >
                        <button
                          type="button"
                          onPointerDown={(event) => {
                            draggedIngredientIndex.current = index;
                            event.currentTarget.setPointerCapture?.(event.pointerId);
                          }}
                          onPointerMove={(event) => {
                            const fromIndex = draggedIngredientIndex.current;
                            const row = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-edit-ingredient-index]');
                            const toIndex = row ? Number(row.dataset.editIngredientIndex) : NaN;
                            if (fromIndex !== null && Number.isInteger(toIndex) && fromIndex !== toIndex) {
                              moveEditIngredient(fromIndex, toIndex);
                              draggedIngredientIndex.current = fromIndex < toIndex ? toIndex - 1 : toIndex;
                            }
                          }}
                          onPointerUp={(event) => {
                            const fromIndex = draggedIngredientIndex.current;
                            draggedIngredientIndex.current = null;
                            const row = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-edit-ingredient-index]');
                            const toIndex = row ? Number(row.dataset.editIngredientIndex) : NaN;
                            if (fromIndex !== null && Number.isInteger(toIndex)) moveEditIngredient(fromIndex, toIndex);
                          }}
                          onPointerCancel={() => { draggedIngredientIndex.current = null; }}
                          className="-ml-1 shrink-0 cursor-grab touch-none p-2 text-secondary/60 active:cursor-grabbing"
                          title="拖动调整顺序"
                          aria-label={`拖动 ${ing.name || '食材'} 调整顺序`}
                        >
                          <Menu className="h-4 w-4" strokeWidth={1.5} />
                        </button>
                        <input
                          type="text"
                          value={ing.name}
                          onChange={(e) => updateEditIngredient(ing.id, 'name', e.target.value)}
                          placeholder="食材名"
                          className="flex-1 min-w-0 px-2 py-1.5 bg-background text-primary text-sm rounded focus:outline-none focus:ring-1 focus:ring-accent/50"
                        />
                        <input
                          type="text"
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
                        setEditIngredients((prev) => coalesceIngredientGroups([...prev, { id: generateId(), name: '', amount: 0, unit: 'g', group: name.trim() }]));
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
                    <div key={step.id} data-edit-step-index={index}>
                      <div className="flex items-start gap-2">
                        <span
                          className="mt-1.5 flex h-6 w-6 flex-shrink-0 touch-none cursor-grab items-center justify-center rounded-full bg-accent/10 text-xs font-medium text-accent active:cursor-grabbing"
                          role="button"
                          tabIndex={0}
                          aria-label={`拖动排序步骤 ${index + 1}`}
                          onPointerDown={(event) => {
                            event.preventDefault();
                            draggedStepIndex.current = index;
                            event.currentTarget.setPointerCapture(event.pointerId);
                          }}
                          onPointerMove={(event) => {
                            const fromIndex = draggedStepIndex.current;
                            if (fromIndex === null) return;
                            const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-edit-step-index]');
                            const toIndex = target ? Number(target.dataset.editStepIndex) : NaN;
                            if (!Number.isInteger(toIndex) || toIndex === fromIndex) return;
                            moveEditStep(fromIndex, toIndex);
                            draggedStepIndex.current = toIndex;
                          }}
                          onPointerUp={() => { draggedStepIndex.current = null; }}
                          onPointerCancel={() => { draggedStepIndex.current = null; }}
                        >
                          {index + 1}
                        </span>
                        <textarea
                          value={step.content}
                          onChange={(e) => {
                            const duration = detectDurationInText(e.target.value);
                            setEditSteps((prev) => prev.map((s, i) =>
                              i === index
                                ? (s.timerManuallyEdited ? { ...s, content: e.target.value } : { ...s, content: e.target.value, hasTimer: duration > 0, detectedDurationSeconds: duration })
                                : s
                            ));
                          }}
                          placeholder={`步骤 ${index + 1}`}
                          rows={2}
                          className="flex-1 min-w-0 px-2 py-1.5 bg-background text-primary text-sm rounded resize-none focus:outline-none focus:ring-1 focus:ring-accent/50"
                        />
                        {step.hasTimer && (
                          <div className="mt-1.5 flex h-8 w-[116px] flex-shrink-0 items-center gap-0.5 rounded border border-accent/40 bg-accent/10 px-1.5 text-xs text-accent">
                            <Timer className="h-3.5 w-3.5 flex-none" strokeWidth={1.5} aria-hidden="true" />
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={Math.floor(step.detectedDurationSeconds / 60)}
                              onChange={(event) => {
                                const minutes = Number(event.target.value);
                                if (!Number.isFinite(minutes) || minutes < 0) return;
                                setEditSteps((prev) => prev.map((s, i) => i === index
                                  ? { ...s, hasTimer: true, detectedDurationSeconds: Math.floor(minutes) * 60 + (s.detectedDurationSeconds % 60), timerManuallyEdited: true }
                                  : s));
                              }}
                              aria-label={`步骤 ${index + 1} 的计时分钟数`}
                              className="w-6 min-w-0 border-b border-accent/40 bg-transparent px-0 text-center outline-none"
                            />
                            <span className="font-mono-digit text-accent/70">:</span>
                            <input
                              type="number"
                              min="0"
                              max="59"
                              step="1"
                              value={step.detectedDurationSeconds % 60}
                              onChange={(event) => {
                                const seconds = Number(event.target.value);
                                if (!Number.isFinite(seconds) || seconds < 0 || seconds > 59) return;
                                setEditSteps((prev) => prev.map((s, i) => i === index
                                  ? { ...s, hasTimer: true, detectedDurationSeconds: Math.floor(s.detectedDurationSeconds / 60) * 60 + Math.floor(seconds), timerManuallyEdited: true }
                                  : s));
                              }}
                              aria-label={`步骤 ${index + 1} 的计时秒数`}
                              className="w-6 min-w-0 border-b border-accent/40 bg-transparent px-0 text-center outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => setEditSteps((prev) => prev.map((s, i) => i === index
                                ? { ...s, hasTimer: false, detectedDurationSeconds: 0, timerManuallyEdited: true }
                                : s))}
                              className="ml-auto rounded px-1 py-0.5 text-sm leading-none hover:bg-accent/20"
                              title="移除计时器"
                              aria-label={`移除步骤 ${index + 1} 的计时器`}
                            >
                              <span aria-hidden="true">×</span>
                            </button>
                          </div>
                        )}
                        {!step.hasTimer && (
                          <button
                            type="button"
                            onClick={() => setEditSteps((prev) => prev.map((s, i) => i === index
                              ? { ...s, hasTimer: true, detectedDurationSeconds: 60, timerManuallyEdited: true }
                              : s))}
                            className="mt-1.5 h-7 flex-shrink-0 rounded border border-accent/30 px-2 text-xs text-accent hover:bg-accent/10"
                            title="添加计时器"
                            aria-label={`为步骤 ${index + 1} 添加计时器`}
                          >
                            <Timer className="h-4 w-4" strokeWidth={1.5} />
                          </button>
                        )}
                        {/* Camera button for step image */}
                        {step.image ? (
                          <div className="relative flex-shrink-0 mt-1">
                            <img src={step.image} alt={`步骤${index + 1}`} referrerPolicy="no-referrer" className="w-10 h-10 rounded-lg object-cover" />
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
                onClick={requestDeleteConfirmation}
                className="w-full py-3 text-danger hover:bg-danger/5 rounded-input transition-colors"
              >
                删除菜谱
              </button>
            </div>
          </div>
        </main>

        {showDeleteConfirm && <ConfirmDialog title="删除这道菜谱？" description="删除后无法恢复，请确认不再需要这份配方。" confirmLabel="删除菜谱" onCancel={() => setShowDeleteConfirm(false)} onConfirm={() => { deleteRecipe(recipe.id); notify('菜谱已删除'); navigate('/mine'); }} />}
        <AdminPinDialog
          open={pinDialogOpen}
          onCancel={cancelAdminUnlock}
          onUnlocked={continueAfterUnlock}
        />
      </div>
    );
  }

  return (
    <div className="mise-detail min-h-screen bg-background">
      <header className="mise-detail-header sticky top-0 z-30 bg-background/95 backdrop-blur-sm px-5 py-3 flex items-center gap-2" style={{ borderBottom: '0.5px solid var(--color-divider)' }}>
        <button
          onClick={() => navigate(-1)}
          aria-label="返回上一页"
          className="p-2 -ml-2 hover:bg-divider/50 rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-primary" />
        </button>
        <span className="font-display text-[20px] tracking-[0.1em] text-primary flex-1">MISE</span>
        <button
          onClick={() => toggleFavorite(recipe.id)}
          className={`p-2 hover:bg-divider/50 rounded-full transition-colors ${
            isFavorited ? 'text-accent' : 'text-secondary'
          }`}
          title={isFavorited ? '取消收藏' : '收藏'}
          aria-label={isFavorited ? '取消收藏' : '收藏'}
          aria-pressed={isFavorited}
        >
          <Heart className={`w-5 h-5 ${isFavorited ? 'fill-current' : ''}`} />
        </button>
        <button
          onClick={handleAddTodo}
          className={`p-2 hover:bg-divider/50 rounded-full transition-colors ${
            todo ? 'text-accent' : 'text-secondary'
          }`}
          title={todo ? '移出待办' : '加入待办'}
          aria-label={todo ? '移出待办' : '加入待办'}
        >
          {todo ? (
            <BookmarkCheck className="w-5 h-5" />
          ) : (
            <Bookmark className="w-5 h-5" />
          )}
        </button>
        <details className="relative">
          <summary className="flex min-h-11 min-w-11 cursor-pointer list-none items-center justify-center text-secondary" aria-label="更多菜谱操作"><Menu className="w-5 h-5" /></summary>
          <div className="absolute right-0 top-full w-44 border border-divider bg-card p-2 shadow-sm"><button onClick={requestEditing} className="flex min-h-11 w-full items-center gap-2 px-2 text-sm text-primary"><Edit size={16} />编辑菜谱</button><button onClick={handleShareRecipe} disabled={isPreparingShare} className="flex min-h-11 w-full items-center gap-2 px-2 text-sm text-primary disabled:opacity-50">{isPreparingShare ? <Loader2 size={16} className="animate-spin" /> : <Share2 size={16} />}分享菜谱</button></div>
        </details>
      </header>

      <main className="px-5 py-5">
        <div className="mise-detail-title"><p className="mise-eyebrow">RECIPE / {recipe.structureTag}</p><h1>{displayRecipeTitle(recipe)}</h1>{recipeTime(recipe) && <div className="mise-detail-meta"><span>用时 {recipeTime(recipe)}</span></div>}</div>
        {recipe.image && (
          <button type="button" className="mise-detail-cover" aria-label={`查看完整图片：${displayRecipeTitle(recipe)}`} onClick={() => setViewingImage({ src: resolveRecipeImage(recipe.image), alt: displayRecipeTitle(recipe) })}>
            <img
              src={resolveRecipeImage(recipe.image)}
              alt={displayRecipeTitle(recipe)}
              className="mise-detail-cover-image"
            />
            <span className="mise-image-hint"><Crop size={13} />查看全图</span>
          </button>
        )}

        {recipe.description && <p className="mise-detail-description">{recipe.description}</p>}
        {recipe.mainIngredient.length > 0 && <div className="flex items-center gap-2 flex-wrap my-5" aria-label="食材标签">{recipe.mainIngredient.map(tag => <span key={tag} className="border border-divider px-2.5 py-1 text-[12px] text-secondary rounded">{tag}</span>)}</div>}

        <div className="card mb-4 p-5">
          <ServingsAdjuster
            currentServings={servings}
            onChange={setServings}
            baseServings={recipe.baseServings}
          />
        </div>

        <div className="card mise-detail-section">
          <div className="px-5 py-4" style={{ borderBottom: '0.5px solid var(--color-divider)' }}>
            <h2 className="font-display text-[21px] font-medium text-primary">食材清单</h2>
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
                      <span className="text-xs font-medium text-secondary">{group.name}</span>
                    </div>
                  )}
                  {group.items.map((ing) => (
                    <div key={ing.id} className="mise-ingredient-row flex items-center justify-between px-5 py-3.5">
                      <span className="text-primary text-[15px]">{ing.name}</span>
                      {(ing.amount !== 0 || ing.unit) && (
                        <span className="font-mono-digit text-primary text-[15px]">
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

        <div id="recipe-steps" className="card mise-detail-section">
          <div className="px-5 py-4" style={{ borderBottom: '0.5px solid var(--color-divider)' }}>
            <h2 className="font-display text-[21px] font-medium text-primary">制作步骤</h2>
          </div>
          <div className="divide-y divide-divider">
            {recipe.steps.map((step) => (
              <div key={step.id} className="px-5 py-6">
                <div className="flex gap-4">
                  <span className="w-7 h-7 rounded-full bg-accent-tint text-accent flex items-center justify-center font-mono-digit text-[13px] font-semibold flex-shrink-0">
                    {step.order}
                  </span>
                  <div className="flex-1">
                    <p className="text-primary text-[16px] leading-[1.9] mb-2 whitespace-pre-line">{step.content}</p>
                    {step.image && (
                      <button type="button" className="mise-step-image" aria-label={`查看完整图片：步骤 ${step.order}`} onClick={() => setViewingImage({ src: step.image!, alt: `${displayRecipeTitle(recipe)} · 步骤 ${step.order}` })}>
                        <img src={step.image} alt={`步骤${step.order}`} referrerPolicy="no-referrer" loading="lazy" />
                        <span className="mise-image-hint"><Crop size={13} />查看全图</span>
                      </button>
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

        {recipe.note && (
          <div className="card mb-4 p-5">
            <h3 className="font-display text-[16px] font-medium text-primary mb-2">备注</h3>
            <p className="text-secondary text-[14px] leading-relaxed" style={{ whiteSpace: 'pre-wrap' }}>{recipe.note}</p>
          </div>
        )}

        <div className="mb-4">
          <NutritionCard nutrition={nutrition.nutritionPer100g} />
        </div>
      </main>
      {viewingImage && <ImageViewer src={viewingImage.src} alt={viewingImage.alt} onClose={() => setViewingImage(null)} />}
      {shareImageUrl && <Modal title="保存菜谱长图" description="长按图片保存到相册，再从微信发送。" onClose={() => setShareImageUrl(null)}><img src={shareImageUrl} alt={displayRecipeTitle(recipe)+' 菜谱长图'} className="w-full rounded bg-divider" /><a href={shareImageUrl} target="_blank" rel="noreferrer" className="mise-secondary-button mt-4 w-full">打开完整长图</a></Modal>}
      <AdminPinDialog
        open={pinDialogOpen}
        onCancel={cancelAdminUnlock}
        onUnlocked={continueAfterUnlock}
      />
    </div>
  );
}
