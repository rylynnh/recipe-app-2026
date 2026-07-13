export interface Recipe {
  id: string;
  title: string;
  image?: string;
  category: string;
  categoryId: string;
  baseServings: number;
  ingredients: Ingredient[];
  steps: Step[];
  structureTag: string;
  mainIngredient: string[];
  sourceType: 'manual' | 'pasted_text' | 'screenshot' | 'link_xiaohongshu' | 'link_xiachufang' | 'link_wechat';
  sourceSnapshot?: string;
  createdAt: number;
  updatedAt: number;
  note?: string;
  favorited?: boolean;
}

export interface Ingredient {
  id: string;
  recipeId: string;
  name: string;
  amount: number;
  unit: string;
  linkedFoodItemId?: string;
}

export interface Step {
  id: string;
  recipeId: string;
  order: number;
  content: string;
  detectedDurationSeconds?: number;
  hasTimer: boolean;
}

export interface FoodItem {
  id: string;
  name: string;
  category?: string;
  subcategory?: string;
  nutritionPer100g: {
    kcal: number;
    protein: number;
    fat: number;
    carb: number;
  };
  edible?: number;
  source: 'public_db' | 'user_added' | 'china_food_db';
}

export interface UnitConversion {
  id: string;
  foodItemId?: string;
  unit: string;
  gramsEquivalent: number;
}

export interface TodoItem {
  id: string;
  recipeId: string;
  addedAt: number;
  isCompleted: boolean;
  completedAt?: number;
}

export interface TagDimension {
  id: string;
  name: string;
  dimension: 'structure' | 'ingredient';
}

export interface Nutrition {
  kcal: number;
  protein: number;
  fat: number;
  carb: number;
}

export interface ReviewItem {
  id: string;
  parsedData: {
    title: string;
    servings: number;
    ingredients: { name: string; amount: number; unit: string }[];
    steps: { content: string; detectedDurationSeconds?: number }[];
    tags: string[];
  };
  sourceType: 'pasted_text' | 'screenshot' | 'link_xiaohongshu' | 'link_xiachufang' | 'link_wechat';
  sourceSnapshot?: string;
  confidence: { [field: string]: number };
  createdAt: number;
}

export interface TimerState {
  id: string;
  stepId: string;
  recipeId: string;
  duration: number;
  remaining: number;
  isRunning: boolean;
  startedAt?: number;
}
