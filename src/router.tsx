import { createHashRouter } from 'react-router-dom';
import { App } from './app';
import { Home } from './pages/home';
import { Category } from './pages/category';
import { Todo } from './pages/Todo';
import { Mine } from './pages/mine';
import { Favorites } from './pages/Favorites';
import { RecipeDetail } from './pages/RecipeDetail';
import { AddRecipe } from './pages/AddRecipe';
import { FoodItems } from './pages/FoodItems';
import { Conversions } from './pages/Conversions';
import { Settings } from './pages/Settings';

export const router = createHashRouter([
  {
    path: '/',
    element: <App />,
    children: [
      {
        path: '',
        element: <Home />,
      },
      {
        path: 'category',
        element: <Category />,
      },
      {
        path: 'todo',
        element: <Todo />,
      },
      {
        path: 'mine',
        element: <Mine />,
      },
      {
        path: 'favorites',
        element: <Favorites />,
      },
      {
        path: 'recipe/:id',
        element: <RecipeDetail />,
      },
      {
        path: 'add',
        element: <AddRecipe />,
      },
      {
        path: 'food-items',
        element: <FoodItems />,
      },
      {
        path: 'conversions',
        element: <Conversions />,
      },
      {
        path: 'settings',
        element: <Settings />,
      },
    ],
  },
]);
