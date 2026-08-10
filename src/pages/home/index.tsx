import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Drumstick, Egg, Fish, Leaf, Search, Soup, Utensils, Wheat } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SearchBar } from '../../components/SearchBar';
import { RecipeCard } from '../../components/RecipeCard';
import Empty from '../../components/Empty';
import { useRecipesStore } from '../../store/recipes';
import { Recipe } from '../../types';
import { resolveRecipeImage } from '../../utils/recipeImage';

const INGREDIENT_ICON_IMAGES: Record<string, string> = {
  '牛肉': `${import.meta.env.BASE_URL}ingredient-icons/beef.png`,
  '猪肉': `${import.meta.env.BASE_URL}ingredient-icons/pork.png`,
  '鸡肉': `${import.meta.env.BASE_URL}ingredient-icons/chicken.png`,
  '虾': `${import.meta.env.BASE_URL}ingredient-icons/shrimp.png`,
  '海鲜': `${import.meta.env.BASE_URL}ingredient-icons/seafood.png`,
  '鱼': `${import.meta.env.BASE_URL}ingredient-icons/fish.png`,
  '羊肉': `${import.meta.env.BASE_URL}ingredient-icons/lamb.png`,
  '蔬菜': `${import.meta.env.BASE_URL}ingredient-icons/vegetable.png`,
};

function RecipeMeta({ recipe }: { recipe: Recipe }) {
  const ingredients = recipe.mainIngredient.slice(0, 2).join('、');
  const details = [
    recipe.totalTimeMinutes ? `${recipe.totalTimeMinutes} 分钟` : null,
    ingredients || null,
  ].filter(Boolean).join(' · ');
  if (!details) return null;
  return (
    <p className="font-mono-digit text-[11px] leading-5 text-secondary">
      {details}
    </p>
  );
}

function LegacyIngredientIcon({ ingredient }: { ingredient: string }) {
  const iconClass = 'h-9 w-9 text-primary/70';
  if (/鸡蛋/.test(ingredient)) return <Egg className={iconClass} strokeWidth={1.35} />;
  if (/鱼|虾|海鲜/.test(ingredient)) return <Fish className={iconClass} strokeWidth={1.35} />;
  if (/菜|菌|瓜|豆|葱|姜|蒜/.test(ingredient)) return <Leaf className={iconClass} strokeWidth={1.35} />;
  if (/米|面|麦/.test(ingredient)) return <Wheat className={iconClass} strokeWidth={1.35} />;
  if (/汤|高汤/.test(ingredient)) return <Soup className={iconClass} strokeWidth={1.35} />;
  if (/鸡|牛|猪|肉/.test(ingredient)) return <Drumstick className={iconClass} strokeWidth={1.35} />;
  return <Utensils className={iconClass} strokeWidth={1.35} />;
}

function IngredientGlyph({ type }: { type: 'beef' | 'pork' | 'chicken' | 'shrimp' | 'seafood' | 'vegetable' }) {
  const className = 'h-9 w-9 text-primary/70';
  if (type === 'beef') return <svg viewBox="0 0 56 48" fill="none" className={className} aria-hidden="true"><path d="M7 29c0-9 7-15 17-15h11l5-5 2 5 6 2-3 4v9l-5 3v8m-23-8v8m9-8v8M7 28l-3-4m33-10 4-5 2 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><path d="M45 22h.01M47 23c3 1 4 3 4 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>;
  if (type === 'pork') return <svg viewBox="0 0 56 48" fill="none" className={className} aria-hidden="true"><path d="M7 28c0-9 8-14 18-14h13l5-4 1 5 5 2-3 5v7c0 7-7 11-17 11H16c-6 0-9-4-9-12Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><path d="M16 39v4m18-4v4M9 24l-4-2m38-4h.01M46 22h5l-3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>;
  if (type === 'chicken') return <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true"><path d="M11 30c0-8 6-14 14-14 7 0 12 5 12 12 0 7-6 11-13 11-7 0-13-3-13-9Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><path d="M34 19 40 17l-3 5m-17-8 1-4 2 4 2-4 1 4m-4 25v4m7-4v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><path d="M31 24h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>;
  if (type === 'shrimp') return <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true"><path d="M34 10c-9 0-16 6-16 15 0 8 5 13 12 13 5 0 9-3 9-8 0-4-3-6-6-6-4 0-7 3-7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><path d="m18 19-9-5m10 9-10 2m12 4-8 7m20-23 5-5m-2 8 5-2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>;
  if (type === 'seafood') return <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true"><path d="M10 35c0-13 6-22 14-22s14 9 14 22H10Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><path d="M15 34c1-8 4-13 9-18m0 18V14m9 20c-1-8-4-13-9-18M10 39h28" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>;
  return <svg viewBox="0 0 56 48" fill="none" className={className} aria-hidden="true"><path d="M14 37 25 13l5 3-4 25m-10-4 11-8m-5-12-7-5m8 2 5-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><path d="M37 35c0-6 4-10 9-10s8 4 8 10H37Zm5-10c0-5 2-8 5-8s5 3 5 8m-11 1-4-3m11-6 3-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

function IngredientIcon({ ingredient }: { ingredient: string }) {
  const image = INGREDIENT_ICON_IMAGES[ingredient];
  if (image) return <img src={image} alt="" aria-hidden="true" className="h-12 w-12 object-contain" />;
  const iconClass = 'h-9 w-9 text-primary/70';
  if (/鸡蛋/.test(ingredient)) return <Egg className={iconClass} strokeWidth={1.35} />;
  if (/虾/.test(ingredient)) return <IngredientGlyph type="shrimp" />;
  if (/海鲜/.test(ingredient)) return <IngredientGlyph type="seafood" />;
  if (/鱼/.test(ingredient)) return <Fish className={iconClass} strokeWidth={1.35} />;
  if (/牛肉|牛腩|牛排/.test(ingredient)) return <IngredientGlyph type="beef" />;
  if (/猪肉|猪排|五花肉/.test(ingredient)) return <IngredientGlyph type="pork" />;
  if (/鸡肉|鸡腿|鸡翅/.test(ingredient)) return <IngredientGlyph type="chicken" />;
  if (/菜|蔬|笋|菌|豆|葱|蒜|姜|萝卜|菠菜/.test(ingredient)) return <IngredientGlyph type="vegetable" />;
  if (/米|面|粉/.test(ingredient)) return <Wheat className={iconClass} strokeWidth={1.35} />;
  if (/汤|高汤/.test(ingredient)) return <Soup className={iconClass} strokeWidth={1.35} />;
  return <Utensils className={iconClass} strokeWidth={1.35} />;
}

function recipeIntro(recipe: Recipe) {
  const note = recipe.note?.replace(/\s+/g, ' ').trim();
  if (note) return note;
  const firstStep = recipe.steps.find((step) => step.content.trim())?.content.replace(/\s+/g, ' ').trim();
  return firstStep || '';
}

export function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchDraft, setSearchDraft] = useState('');
  const [isSearchComposing, setIsSearchComposing] = useState(false);
  const navigate = useNavigate();
  const { searchRecipes, searchHistory } = useRecipesStore();
  useEffect(() => {
    if (isSearchComposing) return;
    const query = searchDraft.trim();
    if (!query) {
      setSearchQuery('');
      return;
    }
    const timer = window.setTimeout(() => setSearchQuery(query), 350);
    return () => window.clearTimeout(timer);
  }, [searchDraft, isSearchComposing]);
  const recipes = searchRecipes(searchQuery);
  const featured = recipes[0];
  const featuredIntro = featured ? recipeIntro(featured) : '';
  const recent = recipes.slice(1, 7);
  const seasonal = recipes[4] ?? recipes[1];
  const showSeasonal = false;
  const ingredients = useMemo(() => {
    const unique = new Map<string, Recipe>();
    const vegetableTags = new Set(['芥兰', '茄子', '包菜', '白菜', '菌菇', '土豆', '番茄', '豆角', '黄瓜']);
    const displayOrder = ['鸡肉', '牛肉', '猪肉', '羊肉', '蔬菜', '虾', '海鲜', '鱼'];
    for (const recipe of recipes) {
      for (const ingredient of recipe.mainIngredient) {
        const displayName = vegetableTags.has(ingredient) ? '蔬菜' : ingredient;
        if (!unique.has(displayName)) unique.set(displayName, recipe);
      }
    }
    const ordered = displayOrder.flatMap((name) => unique.has(name) ? [[name, unique.get(name)!] as [string, Recipe]] : []);
    return ordered;
  }, [recipes]);

  if (!featured && !searchQuery) {
    return <div className="min-h-screen bg-background px-5 pt-10"><Empty title="尚未收录菜谱" description="登录管理者账号后，开始建立你的料理档案。" /></div>;
  }

  if (searchQuery) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <header className="sticky top-0 z-30 border-b border-divider bg-background/95 px-5 py-4 backdrop-blur">
          <div className="mb-4 flex items-center justify-between">
            <button type="button" onClick={() => { setSearchQuery(''); setSearchDraft(''); }} className="font-display text-[24px] tracking-[0.08em] text-primary">MISE</button>
            <span className="text-[11px] uppercase tracking-[0.16em] text-secondary">Search</span>
          </div>
          <SearchBar onSearch={(query) => { setSearchDraft(query); setSearchQuery(query); }} currentQuery={searchQuery} searchHistory={searchHistory} />
        </header>
        <main className="px-5 py-6">
          <p className="mb-4 text-[12px] text-secondary">检索结果 / {recipes.length}</p>
          {recipes.length === 0 ? <Empty title="没有找到相关菜谱" description="试试菜名、标签或食材名称。" /> : <div className="grid grid-cols-2 gap-x-4 gap-y-7">{recipes.map((recipe) => <RecipeCard key={recipe.id} recipe={recipe} />)}</div>}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="px-5 pb-3 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <div className="flex items-center justify-between border-b border-divider pb-4">
          <div>
            <p className="font-display text-[25px] tracking-[0.08em] text-primary">MISE</p>
            <p className="mt-0.5 text-[10px] uppercase tracking-[0.13em] text-secondary">Everything in its place.</p>
          </div>
          <form
            className="relative ml-auto block w-32"
            onSubmit={(event) => {
              event.preventDefault();
              setSearchQuery(searchDraft.trim());
            }}
          >
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-secondary" strokeWidth={1.5} />
            <input
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              onCompositionStart={() => setIsSearchComposing(true)}
              onCompositionEnd={(event) => {
                setIsSearchComposing(false);
                setSearchDraft(event.currentTarget.value);
              }}
              placeholder="搜索菜谱"
              aria-label="搜索菜谱"
              enterKeyHint="search"
              className="h-9 w-full rounded-full border border-divider bg-transparent pl-8 pr-3 text-[16px] text-primary outline-none placeholder:text-secondary focus:border-accent sm:text-[12px]"
            />
          </form>
        </div>
      </header>

      <main>
        <section className="px-5 pb-8 pt-7">
          <p className="mb-3 text-[11px] uppercase tracking-[0.16em] text-accent">Summer / 2026</p>
          <h1 className="font-display max-w-[11ch] text-[42px] font-medium leading-[1.04] tracking-[-0.035em] text-primary">一切，就位。</h1>
          <p className="mt-4 max-w-[29ch] text-[14px] leading-7 text-secondary">以准确的分量、时间和火候，完成值得反复练习的一餐。</p>
        </section>

        <section>
          <button type="button" onClick={() => navigate(`/recipe/${featured.id}`)} className="group block w-full text-left">
            <div className="aspect-[16/10] overflow-hidden bg-[#E7E0D5]">
              {featured.image ? <img src={resolveRecipeImage(featured.image)} alt={featured.title} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.02]" /> : <div className="flex h-full items-center justify-center font-display text-xl text-secondary">{featured.title}</div>}
            </div>
            <div className="px-5 py-5">
              <p className="mb-2 text-[10px] uppercase tracking-[0.16em] text-accent">Method / 001</p>
              <h2 className="font-display text-[28px] font-medium leading-tight text-primary">{featured.title}</h2>
              {featuredIntro && <p className="mt-2 line-clamp-2 text-[14px] leading-6 text-secondary">{featuredIntro}</p>}
              <div className="mt-4"><RecipeMeta recipe={featured} /></div>
            </div>
          </button>
        </section>

        {recent.length > 0 && <section className="px-5 py-9">
          <div className="mb-5 flex items-end justify-between border-b border-divider pb-3">
            <div><p className="text-[10px] uppercase tracking-[0.15em] text-accent">The archive</p><h2 className="font-display mt-1 text-[25px] text-primary">最近收录</h2></div>
            <button type="button" onClick={() => navigate('/category')} className="flex items-center gap-1 text-[12px] text-secondary">全部 <ArrowRight className="h-3.5 w-3.5" /></button>
          </div>
          <div className="grid grid-cols-2 items-start gap-x-4">
            <div className="space-y-6">
              {recent.filter((_, index) => index % 2 === 0).map((recipe, index) => (
                <RecipeCard key={recipe.id} recipe={recipe} variant={index % 2 === 0 ? 'portrait' : 'landscape'} />
              ))}
            </div>
            <div className="space-y-6 pt-10">
              {recent.filter((_, index) => index % 2 === 1).map((recipe, index) => (
                <RecipeCard key={recipe.id} recipe={recipe} variant={index % 2 === 0 ? 'landscape' : 'portrait'} />
              ))}
            </div>
          </div>
        </section>}

        {ingredients.length > 0 && <section className="border-y border-divider py-8">
          <div className="mb-4 flex items-end justify-between px-5"><div><p className="text-[10px] uppercase tracking-[0.15em] text-accent">Start with an ingredient</p><h2 className="font-display mt-1 text-[25px] text-primary">按食材灵感</h2></div><ArrowRight className="mb-1 h-4 w-4 text-secondary" /></div>
          <div className="flex snap-x gap-3 overflow-x-auto px-5 pb-1">
            {ingredients.map(([ingredient], index) => (
              <button key={ingredient} type="button" onClick={() => navigate(ingredient === '蔬菜' ? '/category?category=vegetable' : `/category?ingredient=${encodeURIComponent(ingredient)}`)} className="relative flex h-[116px] w-[140px] flex-none snap-start flex-col justify-between overflow-hidden rounded-card border border-divider bg-[#EEE8DE] p-4 text-left transition-colors hover:bg-[#E6DED1]" style={{ backgroundColor: ['#EAE4D9', '#E7E0D5', '#EEE7D9', '#E4E8E0', '#ECE3D7'][index % 5] }}>
                <IngredientIcon ingredient={ingredient} />
                <span className="font-display text-[20px] text-primary">{ingredient}</span>
              </button>
            ))}
          </div>
        </section>}

        {showSeasonal && seasonal && <section className="px-5 py-9">
          <div className="mb-4 flex items-end justify-between border-b border-divider pb-3"><div><p className="text-[10px] uppercase tracking-[0.15em] text-accent">Seasonal edition</p><h2 className="font-display mt-1 text-[25px] text-primary">时令专题</h2></div><span className="font-mono-digit text-[11px] text-secondary">No. 01</span></div>
          <button type="button" onClick={() => navigate(`/recipe/${seasonal.id}`)} className="grid w-full grid-cols-[1.1fr_.9fr] gap-4 text-left">
            <div className="aspect-square overflow-hidden rounded-card bg-[#E7E0D5]">{seasonal.image && <img src={seasonal.image} alt={seasonal.title} className="h-full w-full object-cover" />}</div>
            <div className="flex flex-col justify-between py-1"><div><p className="text-[11px] text-accent">本期食材</p><h3 className="font-display mt-2 text-[23px] leading-tight text-primary">让风味留出时间</h3><p className="mt-3 text-[13px] leading-6 text-secondary">从一份完整配方开始，理解食材、温度与时间的关系。</p></div><div className="flex items-center gap-1 text-[12px] text-primary">阅读专题 <ArrowRight className="h-3.5 w-3.5" /></div></div>
          </button>
        </section>}
      </main>
    </div>
  );
}
