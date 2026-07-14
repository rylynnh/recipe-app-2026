import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { BottomNav } from './components/BottomNav';
import { useRecipesStore } from './store/recipes';
import { useTodosStore } from './store/todos';
import { useFoodItemsStore } from './store/foodItems';

export function App() {
  const location = useLocation();
  const initFromSupabase = useRecipesStore((s) => s.initFromSupabase);
  const refreshTodos = useTodosStore((s) => s.refreshFromStorage);
  const refreshFoodItems = useFoodItemsStore((s) => s.refreshFromStorage);

  useEffect(() => {
    initFromSupabase().then(() => {
      refreshTodos();
      refreshFoodItems();
    });
  }, []);

  const hideNavPaths = [
    '/recipe/',
    '/add',
    '/favorites',
    '/food-items',
    '/conversions',
    '/settings',
  ];

  const showNav = !hideNavPaths.some((path) => location.pathname.startsWith(path));

  return (
    <div className="min-h-screen bg-background">
      <Outlet />
      {showNav && <BottomNav />}
    </div>
  );
}
