import { useNavigate } from 'react-router-dom';
import { Heart, ArrowRight } from 'lucide-react';
import { useRecipesStore } from '../../store/recipes';
import { RecipeListItem } from '../../components/RecipeListItem';
import Empty from '../../components/Empty';

export function Favorites() {
  const navigate = useNavigate();
  const { getFavoritedRecipes, toggleFavorite } = useRecipesStore();
  const recipes = getFavoritedRecipes();
  return <div className="mise-shell mise-collection-page">
    <header className="mise-page-heading"><div><p className="mise-eyebrow">SAVED RECIPES</p><h1>我的收藏</h1></div><span>{recipes.length} 道菜谱</span></header>
    <main className="mise-page-content">{recipes.length ? recipes.map(recipe => <RecipeListItem key={recipe.id} recipe={recipe} onOpen={() => navigate(`/recipe/${recipe.id}`)}><button type="button" className="mise-icon-button is-saved" aria-label={`取消收藏：${recipe.title}`} onClick={() => toggleFavorite(recipe.id)}><Heart size={19} fill="currentColor" /></button></RecipeListItem>) : <><Empty title="收藏喜欢的味道" description="在菜谱中点亮爱心，喜欢的配方就会留在这里。" /><button className="mise-primary-button mise-empty-action" onClick={() => navigate('/category')}>去看看菜谱 <ArrowRight size={16}/></button></>}</main>
  </div>;
}
