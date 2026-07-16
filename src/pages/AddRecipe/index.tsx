import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, X, Loader2, Plus, Trash2, Image as ImageIcon } from 'lucide-react';
import { useRecipesStore } from '../../store/recipes';
import { useFoodItemsStore } from '../../store/foodItems';
import { detectDurationInText, parsePastedText } from '../../utils/nutrition';
import { extractTextFromImages } from '../../utils/ocr';
import { generateId } from '../../utils/parser';

interface ParsedStep {
  content: string;
  hasTimer: boolean;
  detectedDurationSeconds: number;
  image?: string;
}

export function AddRecipe() {
  const navigate = useNavigate();
  const addRecipe = useRecipesStore((state) => state.addRecipe);
  const { categories } = useFoodItemsStore();

  const [title, setTitle] = useState('');
  const [coverImage, setCoverImage] = useState<string>('');
  const [categoryId, setCategoryId] = useState('');
  const [baseServings, setBaseServings] = useState(1);
  const [note, setNote] = useState('');

  // Paste text
  const [pasteText, setPasteText] = useState('');

  // Parsed results
  const [ingredients, setIngredients] = useState<{ name: string; amount: number; unit: string; group?: string }[]>([]);
  const [steps, setSteps] = useState<ParsedStep[]>([]);
  const [_newItemGroup, set_newItemGroup] = useState('');

  // Image OCR
  const [showImageOCR, setShowImageOCR] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [ocrText, setOcrText] = useState('');
  const [extraText, setExtraText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState('');

  // Step image refs
  const stepImageInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const categoryOptions = categories.filter((c) => c.id !== 's1');
  const inputClass = 'w-full px-4 py-3 bg-background text-primary rounded-input focus:outline-none focus:ring-2 focus:ring-accent/50';

  // --- Paste text parse ---
  const handleParseText = () => {
    if (!pasteText.trim()) return;
    const result = parsePastedText(pasteText);
    if (result.title && !title) setTitle(result.title);
    if (result.ingredients.length > 0) setIngredients(result.ingredients);
    if (result.steps.length > 0) {
      setSteps(
        result.steps.map((step) => ({
          content: step,
          hasTimer: detectDurationInText(step) > 0,
          detectedDurationSeconds: detectDurationInText(step),
        }))
      );
    }
    const issues: string[] = [];
    if (!result.title) issues.push('未识别到标题，请手动填写');
    if (result.ingredients.length === 0) issues.push('未识别到食材，请手动添加');
    if (result.steps.length === 0) issues.push('未识别到步骤，请手动添加');
    if (issues.length > 0) alert(issues.join('\n'));
  };

  // --- Image OCR handlers ---
  const handleImageFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || []);
    if (newFiles.length === 0) return;
    setImageFiles((prev) => [...prev, ...newFiles]);
    const newPreviews: string[] = [];
    newFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        newPreviews.push(ev.target?.result as string);
        if (newPreviews.length === newFiles.length) {
          setImagePreviews((prev) => [...prev, ...newPreviews]);
        }
      };
      reader.readAsDataURL(file);
    });
    setOcrText('');
    e.target.value = '';
  };

  const removeImage = (index: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
    setOcrText('');
  };

  const handleOCR = async () => {
    if (imageFiles.length === 0) return;
    setIsProcessing(true);
    setOcrProgress('正在初始化...');
    try {
      const text = await extractTextFromImages(imageFiles, (_current, _total, status) => {
        setOcrProgress(status);
      });
      setOcrText(text);
    } catch {
      alert('OCR 识别失败，请重试或手动输入文字');
    } finally {
      setIsProcessing(false);
      setOcrProgress('');
    }
  };

  const handleParseOCRText = () => {
    const combined = [ocrText, extraText].filter(Boolean).join('\n\n');
    if (!combined.trim()) return;
    const result = parsePastedText(combined);
    if (result.title && !title) setTitle(result.title);
    if (result.ingredients.length > 0) setIngredients(result.ingredients);
    if (result.steps.length > 0) {
      setSteps(
        result.steps.map((step) => ({
          content: step,
          hasTimer: detectDurationInText(step) > 0,
          detectedDurationSeconds: detectDurationInText(step),
        }))
      );
    }
  };

  // --- Cover image upload ---
  const handleCoverImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => setCoverImage(event.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  // --- Step image upload ---
  const handleStepImageUpload = (stepIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setSteps((prev) =>
        prev.map((step, i) => (i === stepIndex ? { ...step, image: event.target?.result as string } : step))
      );
    };
    reader.readAsDataURL(file);
  };

  const removeStepImage = (stepIndex: number) => {
    setSteps((prev) =>
      prev.map((step, i) => (i === stepIndex ? { ...step, image: undefined } : step))
    );
  };

  // --- Submit ---
  const handleSubmit = () => {
    const category = categoryOptions.find((c) => c.id === categoryId);
    const missing: string[] = [];
    if (!title.trim()) missing.push('菜谱名称');
    if (!categoryId) missing.push('分类');
    if (ingredients.length === 0) missing.push('食材');
    if (steps.length === 0) missing.push('步骤');
    if (missing.length > 0) {
      alert(`请填写：${missing.join('、')}`);
      return;
    }

    addRecipe({
      title,
      image: coverImage || undefined,
      category: category?.name || '其他',
      categoryId,
      baseServings,
      ingredients: ingredients.map((ing) => ({
        id: generateId(),
        recipeId: '',
        name: ing.name,
        amount: ing.amount,
        unit: ing.unit,
        group: ing.group,
      })),
      steps: steps.map((step, index) => ({
        id: generateId(),
        recipeId: '',
        order: index + 1,
        content: step.content,
        hasTimer: step.hasTimer,
        detectedDurationSeconds: step.detectedDurationSeconds,
        image: step.image,
      })),
      structureTag: category?.name || '荤菜',
      mainIngredient: [],
      sourceType: showImageOCR && ocrText ? 'screenshot' : 'pasted_text',
      note: note || undefined,
    });

    navigate('/');
  };

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
        <div className="space-y-4">
          {/* Title */}
          <div className="card p-4">
            <label className="block text-sm font-medium text-primary mb-2">
              菜谱名称 <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="输入菜谱名称"
              className={inputClass}
            />
          </div>

          {/* Cover image */}
          <div className="card p-4">
            <label className="block text-sm font-medium text-primary mb-2">封面图片（选填）</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleCoverImageUpload}
              className="w-full px-4 py-3 bg-background text-primary rounded-input"
            />
            {coverImage && (
              <img src={coverImage} alt="封面预览" className="w-24 h-24 rounded-lg object-cover mt-3" />
            )}
          </div>

          {/* Category */}
          <div className="card p-4">
            <label className="block text-sm font-medium text-primary mb-2">
              分类 <span className="text-danger">*</span>
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className={inputClass}
            >
              <option value="">请选择分类</option>
              {categoryOptions.map((cat) => (
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
              value={baseServings}
              onChange={(e) => setBaseServings(Number(e.target.value))}
              className={inputClass}
            />
          </div>

          {/* Paste complete text */}
          <div className="card p-4">
            <label className="block text-sm font-medium text-primary mb-2">粘贴完整文字</label>
            <p className="text-xs text-secondary mb-3">
              粘贴含食材和步骤的完整菜谱文字，点击解析后自动提取，结果可在下方编辑修改
            </p>
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder={`粘贴菜谱文字，例如：\n\n油泼面\n\n高筋粉 500g\n盐 3g\n水 240g\n\n酱汁：\n姜 1片\n陈醋 30g\n\n先加水合无干粉，静置5分钟\n揉成条，均分成8个剂子\n面剂切面朝上揉成粗条，盘底抹油\n静置1小时`}
              rows={10}
              className={`${inputClass} resize-none`}
            />
            <div className="flex items-center gap-3 mt-3">
              <button
                onClick={handleParseText}
                className="px-4 py-2 bg-accent text-white rounded-input hover:bg-accent/90 transition-colors text-sm"
              >
                解析文字
              </button>
              <button
                onClick={() => setShowImageOCR(!showImageOCR)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-input transition-colors"
                style={{
                  color: 'var(--color-accent)',
                  backgroundColor: showImageOCR ? 'var(--color-accent-tint)' : 'transparent',
                }}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                图片识别
              </button>
            </div>
          </div>

          {/* Image OCR section (expandable) */}
          {showImageOCR && (
            <div className="card p-4">
              <label className="flex flex-col items-center justify-center w-full py-6 border-2 border-dashed border-divider rounded-lg cursor-pointer hover:border-accent/50 transition-colors">
                <Camera className="w-7 h-7 text-secondary mb-2" />
                <span className="text-sm text-secondary">点击选择截图</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageFilesChange}
                  className="hidden"
                />
              </label>

              {imagePreviews.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="relative w-16 h-16 rounded-lg overflow-hidden group">
                      <img src={preview} alt={`截图 ${index + 1}`} className="w-full h-full object-cover" />
                      <button
                        onClick={() => removeImage(index)}
                        className="absolute top-0.5 right-0.5 w-4 h-4 bg-black/60 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {imageFiles.length > 0 && (
                <button
                  onClick={handleOCR}
                  disabled={isProcessing}
                  className="mt-3 w-full px-4 py-2.5 bg-accent text-white rounded-input hover:bg-accent/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                >
                  {isProcessing ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /><span>{ocrProgress}</span></>
                  ) : (
                    <>提取文字（{imageFiles.length} 张）</>
                  )}
                </button>
              )}

              {ocrText && (
                <>
                  <textarea
                    value={ocrText}
                    onChange={(e) => setOcrText(e.target.value)}
                    placeholder="识别结果，可手动修正..."
                    rows={6}
                    className={`${inputClass} resize-none font-mono-digit text-sm mt-3`}
                  />
                  <textarea
                    value={extraText}
                    onChange={(e) => setExtraText(e.target.value)}
                    placeholder="补充文字（选填）..."
                    rows={3}
                    className={`${inputClass} resize-none text-sm mt-2`}
                  />
                  <button
                    onClick={handleParseOCRText}
                    className="mt-2 px-4 py-2 bg-accent text-white rounded-input hover:bg-accent/90 transition-colors text-sm"
                  >
                    解析为菜谱
                  </button>
                </>
              )}
            </div>
          )}

          {/* Editable ingredients */}
          {ingredients.length > 0 && (
            <div className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-primary">食材（{ingredients.length} 项）</h4>
                <div className="flex items-center gap-3">
                  <select
                    value={_newItemGroup}
                    onChange={(e) => set_newItemGroup(e.target.value)}
                    className="text-xs px-2 py-1 bg-background text-secondary rounded border border-divider focus:outline-none focus:border-accent"
                  >
                    <option value="">无分组</option>
                    {[...new Set(ingredients.map((ing) => ing.group).filter(Boolean))].map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => setIngredients((prev) => [...prev, { name: '', amount: 0, unit: 'g', group: _newItemGroup || undefined }])}
                    className="flex items-center gap-1 text-xs text-accent hover:text-accent/70 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    添加
                  </button>
                </div>
              </div>
              <div className="space-y-1">
                {ingredients.map((ing, index) => (
                  <div key={index}>
                    {ing.group && (index === 0 || ingredients[index - 1].group !== ing.group) && (
                      <div className="flex items-center gap-2 mt-3 mb-1 first:mt-0">
                        <span className="text-xs font-medium text-accent">{ing.group}</span>
                        <span className="flex-1 h-px bg-divider/50"></span>
                      </div>
                    )}
                    {!ing.group && (index === 0 || ingredients[index - 1].group !== undefined) && (
                      <div className="flex items-center gap-2 mt-3 mb-1 first:mt-0">
                        <span className="text-xs font-medium text-secondary/50">其他</span>
                        <span className="flex-1 h-px bg-divider/50"></span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 py-1">
                      <input
                        type="text"
                        value={ing.name}
                        onChange={(e) => setIngredients((prev) => prev.map((item, i) => i === index ? { ...item, name: e.target.value } : item))}
                        placeholder="食材名"
                        className="flex-1 min-w-0 px-2 py-1.5 bg-background text-primary text-sm rounded focus:outline-none focus:ring-1 focus:ring-accent/50"
                      />
                      <input
                        type="number"
                        value={ing.amount || ''}
                        onChange={(e) => setIngredients((prev) => prev.map((item, i) => i === index ? { ...item, amount: parseFloat(e.target.value) || 0 } : item))}
                        placeholder="数量"
                        className="w-14 px-2 py-1.5 bg-background text-primary text-sm text-right rounded focus:outline-none focus:ring-1 focus:ring-accent/50"
                      />
                      <input
                        type="text"
                        value={ing.unit}
                        onChange={(e) => setIngredients((prev) => prev.map((item, i) => i === index ? { ...item, unit: e.target.value } : item))}
                        placeholder="单位"
                        className="w-12 px-2 py-1.5 bg-background text-primary text-sm rounded focus:outline-none focus:ring-1 focus:ring-accent/50"
                      />
                      <select
                        value={ing.group || ''}
                        onChange={(e) => setIngredients((prev) => prev.map((item, i) => i === index ? { ...item, group: e.target.value || undefined } : item))}
                        className="w-16 px-1 py-1.5 bg-background text-secondary text-xs rounded border border-divider focus:outline-none focus:border-accent"
                        title="选择分组"
                      >
                        <option value="">无分组</option>
                        {[...new Set(ingredients.map((i) => i.group).filter(Boolean))].map((g) => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => setIngredients((prev) => prev.filter((_, i) => i !== index))}
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
                      setIngredients((prev) => [...prev, { name: '', amount: 0, unit: 'g', group: name.trim() }]);
                      set_newItemGroup(name.trim());
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
          {steps.length > 0 && (
            <div className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-primary">步骤（{steps.length} 步）</h4>
                <button
                  onClick={() => setSteps((prev) => [...prev, { content: '', hasTimer: false, detectedDurationSeconds: 0 }])}
                  className="flex items-center gap-1 text-xs text-accent hover:text-accent/70 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  添加
                </button>
              </div>
              <div className="space-y-3">
                {steps.map((step, index) => (
                  <div key={index}>
                    <div className="flex items-start gap-2">
                      <span className="w-6 h-6 rounded-full bg-accent/10 text-accent flex items-center justify-center text-xs font-medium flex-shrink-0 mt-1.5">
                        {index + 1}
                      </span>
                      <textarea
                        value={step.content}
                        onChange={(e) => setSteps((prev) => prev.map((s, i) => {
                          if (i !== index) return s;
                          const duration = detectDurationInText(e.target.value);
                          return { ...s, content: e.target.value, hasTimer: duration > 0, detectedDurationSeconds: duration };
                        }))}
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
                            onClick={() => removeStepImage(index)}
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
                        onChange={(e) => handleStepImageUpload(index, e)}
                        className="hidden"
                      />
                      <button
                        onClick={() => setSteps((prev) => prev.filter((_, i) => i !== index))}
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
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="添加备注信息..."
              rows={3}
              className={`${inputClass} resize-none`}
            />
          </div>

          {/* Submit */}
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
