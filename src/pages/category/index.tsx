import { displayRecipeTitle } from '../../utils/recipeTitle';
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowUpRight, Search, X, ChevronDown } from 'lucide-react';
import { structureTags } from '../../data/mock';
import { useRecipesStore } from '../../store/recipes';
import Empty from '../../components/Empty';
import { resolveRecipeImage } from '../../utils/recipeImage';
import { recipeTime } from '../../utils/recipePresentation';
export function Category() {
  const [params, setParams] = useSearchParams();
  const structure = params.get('structure') || (params.get('category') === 'vegetable' ? 's3' : 's1');
  const ingredient = params.get('ingredient') || '';
  const query = params.get('q') || '';
  const [showAllTags, setShowAllTags] = useState(false);
  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState(query);
  const navigate = useNavigate();
  const {
    recipes,
    filterByStructure,
    filterByIngredient,
    searchRecipes
  } = useRecipesStore();
  const change = (nextStructure: string, nextIngredient: string, nextQuery = query) => {
    const next = new URLSearchParams();
    if (nextStructure !== 's1') next.set('structure', nextStructure);
    if (nextIngredient) next.set('ingredient', nextIngredient);
    if (nextQuery.trim()) next.set('q', nextQuery.trim());
    setParams(next, {
      replace: true
    });
  };
  const categoryRecipes = filterByStructure(structure);
  const foundIds = query ? new Set(searchRecipes(query).map(recipe => recipe.id)) : null;
  const filtered = filterByIngredient(categoryRecipes, ingredient ? [ingredient] : []).filter(recipe => !foundIds || foundIds.has(recipe.id));
  const tags = [...new Set(categoryRecipes.flatMap(recipe => recipe.mainIngredient))];
  const counts = Object.fromEntries(structureTags.map(tag => [tag.id, tag.id === 's1' ? recipes.length : recipes.filter(recipe => recipe.categoryId === tag.id).length]));
  const categoryName = structureTags.find(tag => tag.id === structure)?.name || '全部';
  return <div className="mise-library mise-shell">
    <header className="mise-library-header"><div className="mise-section-heading"><div><p className="mise-eyebrow">RECIPE COLLECTION</p><h1>我的食谱</h1></div><span>{recipes.length} 道收录</span></div><form className="mise-search" role="search" onSubmit={event => {
        event.preventDefault();
        change(structure, ingredient, draft);
      }}><Search size={18} strokeWidth={1.5} aria-hidden="true" /><input aria-label="在菜谱库中搜索" placeholder="搜索菜名或食材" value={composing ? draft : query} onCompositionStart={() => {
          setDraft(query);
          setComposing(true);
        }} onCompositionEnd={event => {
          setComposing(false);
          setDraft(event.currentTarget.value);
          change(structure, ingredient, event.currentTarget.value);
        }} onChange={event => {
          setDraft(event.target.value);
          if (!composing) change(structure, ingredient, event.target.value);
        }} />{query && <button type="button" aria-label="清除搜索" onClick={() => {
          setDraft('');
          change(structure, ingredient, '');
        }}><X size={16} /></button>}</form></header>
    <div className="mise-library-layout"><aside className="mise-categories" aria-label="菜谱分类">{structureTags.map(tag => <button key={tag.id} aria-pressed={structure === tag.id} onClick={() => {
          change(tag.id, '');
          setShowAllTags(false);
        }}><span>{tag.name}</span><span className="mise-count">{counts[tag.id]}</span></button>)}</aside><main className="mise-library-results">
      {tags.length > 0 && <div className="mise-filter-bar"><div className={`mise-filter-tags ${showAllTags ? 'is-expanded' : ''}`}>{tags.map(tag => <button key={tag} aria-pressed={ingredient === tag} onClick={() => change(structure, ingredient === tag ? '' : tag)}>{tag}</button>)}</div><button className="mise-filter-expand" aria-label={showAllTags ? '收起食材' : '展开全部食材'} aria-expanded={showAllTags} onClick={() => setShowAllTags(!showAllTags)}><ChevronDown size={17} className={showAllTags ? 'rotate-180' : ''} /></button></div>}
      <div className="mise-results-summary"><span role="status">{ingredient || categoryName} · {filtered.length} 道</span>{(ingredient || query) && <button onClick={() => {
            setDraft('');
            change(structure, '', '');
          }}>清除筛选 <X size={12} /></button>}</div>
      {filtered.length ? <div className="mise-library-list">{filtered.map(recipe => <button key={recipe.id} className="mise-library-row" onClick={() => navigate(`/recipe/${recipe.id}`)}><div className="mise-library-image">{recipe.image ? <img src={resolveRecipeImage(recipe.image)} alt="" loading="lazy" /> : <span className="mise-placeholder-mark">M</span>}</div><div className="mise-library-row-copy"><h2>{displayRecipeTitle(recipe)}</h2><p>{[recipe.structureTag, recipeTime(recipe) || recipe.mainIngredient.slice(0, 2).join(' / ')].filter(Boolean).join(' · ')}</p></div><ArrowUpRight size={16} aria-hidden="true" /></button>)}</div> : <Empty title="这里还没有合适的菜谱" description="试试其他食材，或清除筛选条件。" />}
    </main></div>
  </div>;
}
