import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Plus, Link } from 'lucide-react';
import { useRecipesStore } from '../../store/recipes';
import { useFoodItemsStore } from '../../store/foodItems';
import { parseIngredients, detectDurationInText, parsePastedText } from '../../utils/nutrition';
import { generateId } from '../../utils/parser';

type ImportMode = 'manual' | 'text' | 'link';

export function AddRecipe() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const addRecipe = useRecipesStore((state) => state.addRecipe);
  const { categories } = useFoodItemsStore();

  const mode = (searchParams.get('type') as ImportMode) || 'manual';

  const [title, setTitle] = useState('');
  const [image, setImage] = useState<string>('');
  const [categoryId, setCategoryId] = useState('');
  const [baseServings, setBaseServings] = useState(1);
  const [ingredientsText, setIngredientsText] = useState('');
  const [stepsText, setStepsText] = useState('');
  const [note, setNote] = useState('');

  const [ingredients, setIngredients] = useState<{ name: string; amount: number; unit: string }[]>([]);
  const [steps, setSteps] = useState<{ content: string; hasTimer: boolean; detectedDurationSeconds: number }[]>([]);

  useEffect(() => {
    if (mode === 'text' && ingredientsText) {
      setIngredients(parseIngredients(ingredientsText));
    }
  }, [ingredientsText, mode]);

  useEffect(() => {
    if (stepsText) {
      const lines = stepsText.split('\n').filter((line) => line.trim());
      setSteps(
        lines.map((line) => {
          const duration = detectDurationInText(line);
          return {
            content: line.trim(),
            hasTimer: duration > 0,
            detectedDurationSeconds: duration,
          };
        })
      );
    }
  }, [stepsText]);

  const handlePasteText = () => {
    const result = parsePastedText(ingredientsText);
    setTitle(result.title || '');
    setIngredients(result.ingredients);
    setSteps(
      result.steps.map((step) => ({
        content: step,
        hasTimer: detectDurationInText(step) > 0,
        detectedDurationSeconds: detectDurationInText(step),
      }))
    );
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = () => {
    const category = categories.find((c) => c.id === categoryId);
    if (!title || !categoryId || ingredients.length === 0 || steps.length === 0) {
      alert('请填写完整信息');
      return;
    }

    addRecipe({
      title,
      image: image || undefined,
      category: category?.name || '其他',
      categoryId,
      baseServings,
      ingredients: ingredients.map((ing) => ({
        id: generateId(),
        recipeId: '',
        name: ing.name,
        amount: ing.amount,
        unit: ing.unit,
      })),
      steps: steps.map((step, index) => ({
        id: generateId(),
        recipeId: '',
        order: index + 1,
        content: step.content,
        hasTimer: step.hasTimer,
        detectedDurationSeconds: step.detectedDurationSeconds,
      })),
      structureTag: '荤菜',
      mainIngredient: [],
      sourceType: mode === 'text' ? 'pasted_text' : mode === 'link' ? 'link_xiaohongshu' : 'manual',
      note: note || undefined,
    });

    navigate('/');
  };

  const modes: { value: ImportMode; label: string; icon: typeof Plus }[] = [
    { value: 'manual', label: '手动创建', icon: Plus },
    { value: 'text', label: '粘贴文字', icon: Plus },
    { value: 'link', label: '粘贴链接', icon: Link },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm px-4 py-4 border-b border-divider flex items-center gap-4">
        <button
          onClick={() => navigate('/mine')}
          className="p-2 -ml-2 hover:bg-divider/50 rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-primary" />
        </button>
        <h1 className="font-display text-xl font-medium text-primary">添加菜谱</h1>
      </header>

      <main className="px-4 py-4">
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {modes.map((m) => {
            const Icon = m.icon;
            return (
              <button
                key={m.value}
                onClick={() => navigate(`/add?type=${m.value}`)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
                  mode === m.value
                    ? 'bg-accent text-white'
                    : 'bg-card text-secondary hover:bg-divider/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{m.label}</span>
              </button>
            );
          })}
        </div>

        <div className="space-y-4">
          <div className="card p-4">
            <label className="block text-sm font-medium text-primary mb-2">菜谱名称</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="输入菜谱名称"
              className="w-full px-4 py-3 bg-background text-primary rounded-input focus:outline-none focus:ring-2 focus:ring-accent/50"
            />
          </div>

          <div className="card p-4">
            <label className="block text-sm font-medium text-primary mb-2">菜谱图片（选填）</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="w-full px-4 py-3 bg-background text-primary rounded-input"
              />
              {image && (
                <img
                  src={image}
                  alt="预览"
                  className="w-24 h-24 rounded-lg object-cover mt-3"
                />
              )}
          </div>

          <div className="card p-4">
            <label className="block text-sm font-medium text-primary mb-2">分类</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-4 py-3 bg-background text-primary rounded-input focus:outline-none focus:ring-2 focus:ring-accent/50"
            >
              <option value="">请选择分类</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div className="card p-4">
            <label className="block text-sm font-medium text-primary mb-2">份量</label>
            <input
              type="number"
              min="1"
              max="20"
              value={baseServings}
              onChange={(e) => setBaseServings(Number(e.target.value))}
              className="w-full px-4 py-3 bg-background text-primary rounded-input focus:outline-none focus:ring-2 focus:ring-accent/50"
            />
          </div>

          {mode === 'text' && (
            <div className="card p-4">
              <label className="block text-sm font-medium text-primary mb-2">粘贴完整文字</label>
              <textarea
                value={ingredientsText}
                onChange={(e) => setIngredientsText(e.target.value)}
                placeholder="粘贴从其他地方复制的菜谱文字..."
                rows={8}
                className="w-full px-4 py-3 bg-background text-primary rounded-input focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none"
              />
              <button
                onClick={handlePasteText}
                className="mt-3 px-4 py-2 bg-accent text-white rounded-input hover:bg-accent/90 transition-colors"
              >
                解析文字
              </button>
            </div>
          )}

          {mode !== 'text' && (
            <div className="card p-4">
              <label className="block text-sm font-medium text-primary mb-2">食材</label>
              <textarea
                value={ingredientsText}
                onChange={(e) => {
                  setIngredientsText(e.target.value);
                  setIngredients(parseIngredients(e.target.value));
                }}
                placeholder="每行一个食材，格式：食材名 数量 单位"
                rows={6}
                className="w-full px-4 py-3 bg-background text-primary rounded-input focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none"
              />
            </div>
          )}

          {ingredients.length > 0 && (
            <div className="card p-4">
              <h4 className="text-sm font-medium text-primary mb-3">解析结果</h4>
              <div className="space-y-2">
                {ingredients.map((ing, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b border-divider/50">
                    <span className="text-primary">{ing.name}</span>
                    <span className="font-mono-digit text-secondary">{ing.amount} {ing.unit}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="card p-4">
            <label className="block text-sm font-medium text-primary mb-2">步骤</label>
            <textarea
              value={stepsText}
              onChange={(e) => setStepsText(e.target.value)}
              placeholder="每行一个步骤，会自动识别时间"
              rows={8}
              className="w-full px-4 py-3 bg-background text-primary rounded-input focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none"
            />
          </div>

          {steps.length > 0 && (
            <div className="card p-4">
              <h4 className="text-sm font-medium text-primary mb-3">步骤预览</h4>
              <div className="space-y-2">
                {steps.map((step, index) => (
                  <div key={index} className="flex items-start gap-3 py-2 border-b border-divider/50">
                    <span className="w-6 h-6 rounded-full bg-accent/10 text-accent flex items-center justify-center text-sm font-medium flex-shrink-0">
                      {index + 1}
                    </span>
                    <span className="text-primary">{step.content}</span>
                    {step.hasTimer && (
                      <span className="text-xs text-accent bg-accent/10 px-2 py-0.5 rounded">
                        {Math.floor(step.detectedDurationSeconds / 60)}分钟
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="card p-4">
            <label className="block text-sm font-medium text-primary mb-2">备注</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="添加备注信息..."
              rows={3}
              className="w-full px-4 py-3 bg-background text-primary rounded-input focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none"
            />
          </div>

          <button
            onClick={handleSubmit}
            className="w-full py-4 bg-accent text-white rounded-input hover:bg-accent/90 transition-colors font-medium"
          >
            保存菜谱
          </button>
        </div>
      </main>
    </div>
  );
}
