import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, LockKeyhole, ShieldCheck } from 'lucide-react';
import { useRecipesStore } from '../../store/recipes';
import { useTodosStore } from '../../store/todos';
import { useFoodItemsStore } from '../../store/foodItems';
import { ADMIN_MODE_EVENT, disableAdminMode, isAdminMode } from '../../lib/adminMode';
import { AdminPinDialog } from '../../components/AdminPinDialog';
import { ConfirmDialog } from '../../components/Modal';
import { notify } from '../../store/feedback';

type ClearType = 'all' | 'recipes' | 'todos' | 'food';
const labels:Record<ClearType,string>={all:'全部数据',recipes:'全部菜谱',todos:'全部待办记录',food:'全部食材数据'};
export function Settings() {
  const navigate=useNavigate();
  const {clearAllRecipes}=useRecipesStore();
  const {clearAllTodos}=useTodosStore();
  const {clearAllFoodItems}=useFoodItemsStore();
  const [admin,setAdmin]=useState(isAdminMode);
  const [pinOpen,setPinOpen]=useState(false);
  const [clearType,setClearType]=useState<ClearType|null>(null);
  useEffect(()=>{const update=()=>setAdmin(isAdminMode());window.addEventListener(ADMIN_MODE_EVENT,update);return()=>window.removeEventListener(ADMIN_MODE_EVENT,update);},[]);
  const clear=()=>{
    if(clearType==='recipes'||clearType==='all')clearAllRecipes();
    if(clearType==='todos'||clearType==='all')clearAllTodos();
    if(clearType==='food'||clearType==='all')clearAllFoodItems();
    setClearType(null);notify('数据已清空');
  };
  return <div className="mise-shell">
    <header className="mise-page-heading"><button className="mise-icon-button" aria-label="返回上一页" onClick={()=>navigate(-1)}><ArrowLeft size={19}/></button><div><p className="mise-eyebrow">SETTINGS</p><h1>设置</h1></div></header>
    <main className="mise-page-content">
      <section className="mise-settings-section"><h2>管理模式</h2><div className="flex items-center gap-3 mb-3">{admin?<ShieldCheck size={20}/>:<LockKeyhole size={20}/>}<span className="text-sm">{admin?'已解锁':'尚未解锁'}</span></div><p>管理模式用于收录和编辑菜谱，修改可同步至云端。收藏保留在当前设备，待办记录按当前同步设置保存。</p><button className="mise-secondary-button mt-4" onClick={()=>{if(admin){disableAdminMode();notify('已退出管理模式');}else setPinOpen(true);}}>{admin?'退出管理模式':'解锁管理模式'}</button></section>
      <section className="mise-settings-section"><h2>数据管理</h2><p>清空操作无法撤销，请先确认不再需要这些内容。</p><div className="mt-3">{(['recipes','todos','food','all'] as const).map(type=><button key={type} className="block w-full border-t border-divider py-3 text-left text-sm text-danger" onClick={()=>setClearType(type)}>清空{labels[type]}</button>)}</div></section>
    </main>
    <AdminPinDialog open={pinOpen} onCancel={()=>setPinOpen(false)} onUnlocked={()=>{setPinOpen(false);notify('管理模式已解锁');}}/>
    {clearType&&<ConfirmDialog title={`清空${labels[clearType]}？`} description={`此操作无法恢复。${admin&&(clearType==='recipes'||clearType==='all')?'当前处于管理模式，菜谱清空操作也会同步至云端。':'仅继续清空你已确认不再需要的数据。'}`} confirmLabel="确认清空" onConfirm={clear} onCancel={()=>setClearType(null)}/>}
  </div>;
}
