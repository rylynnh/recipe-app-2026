import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight, LockKeyhole, ShieldCheck, Trash2 } from 'lucide-react';
import { useRecipesStore } from '../../store/recipes';
import { useTodosStore } from '../../store/todos';
import { useFoodItemsStore } from '../../store/foodItems';
import { ADMIN_MODE_EVENT, disableAdminMode, enableAdminMode, isAdminMode } from '../../lib/adminMode';
import { verifyAdminPin } from '../../lib/adminRecipeSync';

type ClearType = 'all' | 'recipes' | 'todos' | 'food';

export function Settings() {
  const navigate = useNavigate();
  const { clearAllRecipes } = useRecipesStore();
  const { clearAllTodos } = useTodosStore();
  const { clearAllFoodItems } = useFoodItemsStore();
  const [admin, setAdmin] = useState(isAdminMode());
  const [pin, setPin] = useState('');
  const [pinOpen, setPinOpen] = useState(false);
  const [pinError, setPinError] = useState('');
  const [checking, setChecking] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearType, setClearType] = useState<ClearType>('all');

  useEffect(() => {
    const update = () => setAdmin(isAdminMode());
    window.addEventListener(ADMIN_MODE_EVENT, update);
    return () => window.removeEventListener(ADMIN_MODE_EVENT, update);
  }, []);

  const unlock = async () => {
    if (!pin.trim()) return setPinError('请输入管理 PIN');
    setChecking(true);
    setPinError('');
    const result = await verifyAdminPin(pin);
    setChecking(false);
    if (!result.ok) return setPinError('PIN 不正确，请重试');
    enableAdminMode(pin);
    setPin('');
    setPinOpen(false);
  };

  const clear = () => {
    if (clearType === 'recipes' || clearType === 'all') clearAllRecipes();
    if (clearType === 'todos' || clearType === 'all') clearAllTodos();
    if (clearType === 'food' || clearType === 'all') clearAllFoodItems();
    setShowClearConfirm(false);
  };

  const clearLabel: Record<ClearType, string> = {
    all: '所有本机数据', recipes: '所有菜谱', todos: '所有待办', food: '所有食材',
  };
  const remove = (type: ClearType) => { setClearType(type); setShowClearConfirm(true); };

  return <div className="min-h-screen bg-background pb-20">
    <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm px-4 py-4 border-b border-divider flex items-center gap-4">
      <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-divider/50 rounded-full"><ArrowLeft className="w-5 h-5 text-primary" /></button>
      <h1 className="font-display text-xl font-medium text-primary">设置</h1>
    </header>

    <main className="px-4 py-4 space-y-4">
      <section className="card overflow-hidden">
        <div className="p-4 border-b border-divider"><h2 className="font-display text-base text-primary">管理模式</h2></div>
        {admin ? <>
          <div className="p-4 flex gap-3 items-start">
            <ShieldCheck className="w-5 h-5 text-accent mt-0.5" />
            <div><p className="text-sm text-primary">已解锁</p><p className="text-xs text-secondary mt-1">本次会话中的菜谱新增、编辑和删除会同步到云端。</p></div>
          </div>
          <button onClick={disableAdminMode} className="w-full px-4 py-3 border-t border-divider text-sm text-danger text-left">退出管理模式</button>
        </> : <button onClick={() => setPinOpen(true)} className="w-full p-4 flex items-center justify-between text-left">
          <span className="flex items-center gap-3"><LockKeyhole className="w-5 h-5 text-secondary" /><span><span className="block text-sm text-primary">解锁管理模式</span><span className="block text-xs text-secondary mt-1">输入 PIN 后才会同步菜谱到云端。</span></span></span><ChevronRight className="w-5 h-5 text-secondary" />
        </button>}
      </section>

      <p className="px-1 text-xs leading-5 text-secondary">未开启管理模式时，新增菜谱、收藏和待办只保存在当前设备；公开菜谱仍可正常浏览。</p>

      <section className="card overflow-hidden">
        <div className="p-4 border-b border-divider"><h2 className="font-display text-base text-primary">本机数据</h2></div>
        {[['recipes', '清除本机菜谱'], ['todos', '清除本机待办'], ['food', '清除本机食材'], ['all', '清除全部本机数据']].map(([type, label]) => <button key={type} onClick={() => remove(type as ClearType)} className="w-full p-4 border-b last:border-0 border-divider text-left text-sm text-danger">{label}</button>)}
      </section>
      <section className="card p-4 flex justify-between text-sm"><span className="text-primary">数据存储</span><span className="text-secondary">本机 · 管理菜谱可同步</span></section>
    </main>

    {pinOpen && <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-card rounded-card p-6 w-full max-w-sm"><h3 className="font-display text-lg text-primary">解锁管理模式</h3><p className="text-sm text-secondary mt-2">PIN 仅用于本次浏览器会话验证。</p>
        <input autoFocus type="password" inputMode="text" value={pin} onChange={(e) => setPin(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && void unlock()} placeholder="管理 PIN" className="mt-5 w-full rounded-input border border-divider bg-background px-3 py-3 text-primary outline-none focus:border-accent" />
        {pinError && <p className="mt-2 text-sm text-danger">{pinError}</p>}
        <div className="mt-5 flex gap-3"><button onClick={() => { setPinOpen(false); setPinError(''); }} className="flex-1 py-3 text-secondary">取消</button><button disabled={checking} onClick={() => void unlock()} className="flex-1 py-3 rounded-input bg-primary text-white disabled:opacity-60">{checking ? '验证中…' : '解锁'}</button></div>
      </div>
    </div>}
    {showClearConfirm && <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"><div className="bg-card rounded-card p-6 w-full max-w-sm"><Trash2 className="w-7 h-7 text-danger mb-3" /><h3 className="font-display text-lg text-primary">确认清除</h3><p className="mt-2 text-sm text-secondary">确定清除{clearLabel[clearType]}吗？此操作无法撤销。</p><div className="mt-5 flex gap-3"><button onClick={() => setShowClearConfirm(false)} className="flex-1 py-3 text-secondary">取消</button><button onClick={clear} className="flex-1 py-3 rounded-input bg-danger text-white">清除</button></div></div></div>}
  </div>;
}
