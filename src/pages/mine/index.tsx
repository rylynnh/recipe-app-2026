import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, BookOpen, Clock, ChevronRight, Database, Scale, Settings, Heart, ArrowLeft, Trash2, RotateCcw, Check } from 'lucide-react';
import { useRecipesStore } from '../../store/recipes';
import { useTodosStore } from '../../store/todos';
import { useFoodItemsStore } from '../../store/foodItems';
import { RecipeListItem } from '../../components/RecipeListItem';
import { ConfirmDialog } from '../../components/Modal';
import Empty from '../../components/Empty';
import { notify } from '../../store/feedback';
import type { Recipe } from '../../types';

type ListView = 'all' | 'recent' | 'todos' | 'favorites' | 'deleted' | null;
const titles = { all: '全部菜谱', recent: '最近更新', todos: '待办清单', favorites: '我的收藏', deleted: '最近删除' };
const englishTitles = { all: 'ALL RECIPES', recent: 'RECENTLY UPDATED', todos: 'TO-DO LIST', favorites: 'SAVED RECIPES', deleted: 'RECENTLY DELETED' };
const date = (timestamp: number) => new Intl.DateTimeFormat('zh-CN', {month:'short',day:'numeric'}).format(timestamp);

export function Mine() {
  const navigate = useNavigate();
  const { recipes, getFavoritedRecipes, toggleFavorite, deletedRecipes, restoreRecipe, permanentlyDeleteRecipe, clearAllDeletedRecipes } = useRecipesStore();
  const { getPendingTodos, toggleTodo, removeTodo } = useTodosStore();
  const { foodItems } = useFoodItemsStore();
  const [view, setView] = useState<ListView>(null);
  const [confirmation, setConfirmation] = useState<{ id?: string; all?: boolean } | null>(null);
  const favorites = getFavoritedRecipes();
  const todos = getPendingTodos();
  const pendingIds = new Set(todos.map(todo => todo.recipeId));
  const recent = [...recipes].sort((a,b) => b.updatedAt-a.updatedAt);
  const stats = [
    { label:'全部菜谱', value:recipes.length, icon:BookOpen, view:'all' as const },
    { label:'待办', value:todos.length, icon:Clock, view:'todos' as const },
    { label:'我的收藏', value:favorites.length, icon:Heart, view:'favorites' as const },
    { label:'最近删除', value:deletedRecipes.length, icon:Trash2, view:'deleted' as const },
  ];
  const tools = [
    { label:'食材营养库', detail:`${foodItems.length} 项参考数据`, icon:Database, path:'/food-items' },
    { label:'单位换算', detail:'查找常用计量单位', icon:Scale, path:'/conversions' },
    { label:'设置', detail:'管理模式与数据', icon:Settings, path:'/settings' },
  ];
  const lists: Record<Exclude<ListView,null>, Recipe[]> = {
    all:[...recipes].sort((a,b)=>b.createdAt-a.createdAt),
    recent,
    todos:todos.flatMap(todo=>{const recipe=recipes.find(item=>item.id===todo.recipeId);return recipe?[recipe]:[];}),
    favorites,
    deleted:[...deletedRecipes].sort((a,b)=>b.deletedAt-a.deletedAt),
  };
  const confirmDelete = () => {
    if (confirmation?.all) { clearAllDeletedRecipes(); notify('已清空最近删除'); }
    else if (confirmation?.id) { permanentlyDeleteRecipe(confirmation.id); notify('已永久删除菜谱'); }
    setConfirmation(null);
  };
  return <div className="mise-shell mise-account">
    <header className="mise-page-heading">{view && <button className="mise-icon-button" aria-label="返回我的" onClick={()=>setView(null)}><ArrowLeft size={19}/></button>}<div><p className="mise-eyebrow">{view ? englishTitles[view] : 'MY KITCHEN'}</p><h1>{view ? titles[view] : '我的'}</h1></div>{view && <span>{lists[view].length} 道</span>}</header>
    <main className="mise-page-content">{view ? <>
      {lists[view].length ? lists[view].map(recipe=><RecipeListItem key={recipe.id} recipe={recipe} onOpen={view==='deleted'?undefined:()=>navigate(`/recipe/${recipe.id}`)} detail={view==='recent' ? `更新于 ${date(recipe.updatedAt)}` : view==='todos' ? '已加入待办' : view==='deleted' ? '可恢复至菜谱库' : undefined}>
        {view==='todos' && <><button className="mise-small-action" aria-label={`标记做过：${recipe.title}`} onClick={()=>{const item=todos.find(todo=>todo.recipeId===recipe.id);if(item)toggleTodo(item.id);}}><Check size={16}/>做过</button><button className="mise-icon-button" aria-label={`移出待办：${recipe.title}`} onClick={()=>{const item=todos.find(todo=>todo.recipeId===recipe.id);if(item)removeTodo(item.id);}}><Trash2 size={16}/></button></>}{view==='favorites' && <button className="mise-icon-button is-saved" aria-label={`取消收藏：${recipe.title}`} onClick={()=>toggleFavorite(recipe.id)}><Heart size={18} fill="currentColor"/></button>}
        {view==='deleted' && <><button className="mise-small-action" onClick={()=>{restoreRecipe(recipe.id);notify('菜谱已恢复');}}><RotateCcw size={15}/>恢复</button><button className="mise-small-action text-danger" onClick={()=>setConfirmation({id:recipe.id})}><Trash2 size={15}/>删除</button></>}
      </RecipeListItem>) : <Empty title={view==='todos'?'待办清单还是空的':view==='deleted'?'没有最近删除的菜谱':'这里还没有菜谱'} description={view==='todos'?'在菜谱详情页添加想做的菜。':undefined}/>}
      {view==='deleted' && deletedRecipes.length>0 && <button className="mise-text-button text-danger" onClick={()=>setConfirmation({all:true})}><Trash2 size={16}/>清空最近删除</button>}
    </> : <>
      <button className="mise-primary-button mise-add-recipe" onClick={()=>navigate('/add')}><Plus size={18}/>收录一道菜谱</button>
      <section className="mise-account-stats" aria-label="我的食谱统计">{stats.map(stat=><button key={stat.view} onClick={()=>setView(stat.view)}><stat.icon size={18}/><strong>{stat.value}</strong><span>{stat.label}</span></button>)}</section>
      <section className="mise-account-section"><div className="mise-section-heading"><h2>最近更新</h2><button className="mise-text-link" onClick={()=>setView('recent')}>全部 <ChevronRight size={15}/></button></div>{recent.length ? recent.slice(0,3).map(recipe=><RecipeListItem key={recipe.id} recipe={recipe} onOpen={()=>navigate(`/recipe/${recipe.id}`)} detail={`${pendingIds.has(recipe.id)?'待办 · ':''}更新于 ${date(recipe.updatedAt)}`}/>) : <Empty title="从第一道菜开始" description="收录后，你的食谱会显示在这里。"/>}</section>
      <section className="mise-account-section"><div className="mise-section-heading"><h2>厨房工具</h2></div>{tools.map(tool=><button className="mise-tool-row" key={tool.path} onClick={()=>navigate(tool.path)}><tool.icon size={19}/><span><strong>{tool.label}</strong><small>{tool.detail}</small></span><ChevronRight size={16}/></button>)}</section>
    </>}</main>
    {confirmation && <ConfirmDialog title={confirmation.all?'清空最近删除？':'永久删除这道菜谱？'} description={confirmation.all?`将永久删除 ${deletedRecipes.length} 道菜谱，此操作无法恢复。`:'永久删除后无法恢复，也可以取消并选择恢复菜谱。'} confirmLabel="永久删除" onConfirm={confirmDelete} onCancel={()=>setConfirmation(null)}/>}
  </div>;
}
