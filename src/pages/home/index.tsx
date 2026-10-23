import { displayRecipeTitle } from '../../utils/recipeTitle';
import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Search, X } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { RecipeCard } from '../../components/RecipeCard';
import Empty from '../../components/Empty';
import { useRecipesStore } from '../../store/recipes';
import { resolveRecipeImage } from '../../utils/recipeImage';
import { recipeSummary, recipeTime } from '../../utils/recipePresentation';
export function Home() {
  const [params, setParams] = useSearchParams();
  const query = params.get('q') || '';
  const [draft, setDraft] = useState(query);
  const [composing, setComposing] = useState(false);
  const navigate = useNavigate();
  const {
    searchRecipes,
    searchHistory,
    addSearchHistory,
    clearSearchHistory,
    recipes: allRecipes
  } = useRecipesStore();
  useEffect(() => {
    setDraft(query);
  }, [query]);
  useEffect(() => {
    if (composing) return;
    const timer = window.setTimeout(() => {
      const next = draft.trim();
      if (next !== query) setParams(next ? {
        q: next
      } : {}, {
        replace: true
      });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [draft, query, composing, setParams]);
  const recipes = searchRecipes(query);
  const recent = useMemo(() => [...allRecipes].sort((a, b) => b.createdAt - a.createdAt).slice(0, 4), [allRecipes]);
  const featured = allRecipes.find(recipe => recipe.image && recipe.structureTag !== '烘焙' && recipe.structureTag !== '酱料' && recipe.ingredients.length > 0) || allRecipes[0];
  const ingredients = useMemo(() => {
    const present = new Set(allRecipes.flatMap(recipe => recipe.mainIngredient));
    return ['鸡肉', '牛肉', '猪肉', '鱼', '虾', '鸡蛋', '豆制品', '茄子', '花菜', '包菜'].filter(item => present.has(item)).slice(0, 6);
  }, [allRecipes]);
  return <div className="mise-home mise-shell">
      <header className="mise-masthead"><div><p className="mise-wordmark">MISE</p><p className="mise-eyebrow">EVERYTHING IN ITS PLACE</p></div><span className="mise-masthead-note">私人食谱集</span></header>
      <form className="mise-search" role="search" onSubmit={event => {
      event.preventDefault();
      if (draft.trim()) addSearchHistory(draft.trim());
      setParams(draft.trim() ? {
        q: draft.trim()
      } : {}, {
        replace: true
      });
    }}>
        <Search size={18} strokeWidth={1.5} aria-hidden="true" />
        <input aria-label="搜索菜名或食材" placeholder="搜索菜名、食材，找到想做的味道" value={draft} onChange={event => setDraft(event.target.value)} onCompositionStart={() => setComposing(true)} onCompositionEnd={event => {
        setComposing(false);
        setDraft(event.currentTarget.value);
      }} />
        {draft && <button type="button" aria-label="清除搜索" onClick={() => {
        setDraft('');
        setParams({}, {
          replace: true
        });
      }}><X size={17} /></button>}
      </form>
      {!draft && searchHistory.length > 0 && <details className="mise-recent-searches"><summary>最近搜索</summary><div>{searchHistory.slice(0, 6).map(item => <button key={item} onClick={() => { setDraft(item); addSearchHistory(item); setParams({ q: item }, { replace: true }); }}>{item}</button>)}<button onClick={clearSearchHistory}>清空记录</button></div></details>}
      <main>
        {query ? <section className="mise-section"><div className="mise-section-heading"><h1>搜索结果</h1><span role="status">{recipes.length} 道菜谱</span></div>{recipes.length ? <div className="mise-recipe-grid">{recipes.map(recipe => <RecipeCard key={recipe.id} recipe={recipe} variant="landscape" />)}</div> : <Empty title="还没找到这道味道" description="换个菜名或食材试试，也许有新的灵感。" />}</section> : featured ? <>
          <section className="mise-opening"><h1>一切，就位。</h1><p>整理风味，从容下厨。</p></section>
          <section aria-label="食谱一页" className="mise-featured"><button className="mise-featured-link" onClick={() => navigate(`/recipe/${featured.id}`)}><div className="mise-featured-photo">{featured.image && <img src={resolveRecipeImage(featured.image)} alt={displayRecipeTitle(featured)} fetchPriority="high" />}<span className="mise-photo-label">食谱一页 / FEATURED RECIPE</span></div><div className="mise-featured-copy"><div className="mise-featured-meta"><span>{featured.structureTag}</span>{recipeTime(featured) && <span>{recipeTime(featured)}</span>}</div><h2>{displayRecipeTitle(featured)}</h2>{recipeSummary(featured) && <p>{recipeSummary(featured)}</p>}<span className="mise-text-link">翻开食谱 <ArrowRight size={16} /></span></div></button></section>
          {ingredients.length > 0 && <section className="mise-section mise-ingredient-section"><div className="mise-section-heading"><h2>从食材开始</h2><span>手边有什么？</span></div><div className="mise-ingredient-links">{ingredients.map(ingredient => <button key={ingredient} onClick={() => navigate(`/category?ingredient=${encodeURIComponent(ingredient)}`)}>{ingredient}<ArrowRight size={14} /></button>)}</div></section>}
          <section className="mise-section"><div className="mise-section-heading"><div><p className="mise-eyebrow">RECENT ADDITIONS</p><h2>最近收录</h2></div><button className="mise-text-link" onClick={() => navigate('/category')}>全部菜谱 <ArrowRight size={15} /></button></div><div className="mise-recipe-grid">{recent.map(recipe => <RecipeCard key={recipe.id} recipe={recipe} variant="landscape" />)}</div></section>
          <footer className="mise-colophon"><span>MISE</span><p>让每一味，各就其位。</p></footer>
        </> : <section className="mise-section"><Empty title="从第一道菜开始" description="收录喜欢的配方，慢慢建立自己的食谱集。" /></section>}
      </main>
    </div>;
}
