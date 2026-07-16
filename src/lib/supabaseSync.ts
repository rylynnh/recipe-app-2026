import { supabase } from './supabase';
import { Recipe, TodoItem, FoodItem, UnitConversion, ReviewItem } from '../types';
import { saveToStorage, loadFromStorage, STORAGE_KEYS } from '../utils/storage';

// ============ Load (Supabase -> merge into localStorage) ============

export async function loadAllFromSupabase() {
  try {
    const [recipesRes, todosRes, foodItemsRes, conversionsRes, reviewsRes] = await Promise.all([
      supabase.from('recipes').select('*'),
      supabase.from('todos').select('*'),
      supabase.from('food_items').select('*'),
      supabase.from('unit_conversions').select('*'),
      supabase.from('review_items').select('*'),
    ]);

    if (recipesRes.data) {
      const recipes = recipesRes.data.map(dbRowToRecipe);
      const local = loadFromStorage<Recipe[]>(STORAGE_KEYS.RECIPES, []);
      const merged = mergeById(local, recipes).map((r: any) => ({
        ...r,
        structureTag: r.structureTag ?? r.category ?? '荤菜',
        mainIngredient: r.mainIngredient ?? [],
        favorited: r.favorited ?? false,
      }));
      saveToStorage(STORAGE_KEYS.RECIPES, merged);
    }

    if (todosRes.data) {
      const todos = todosRes.data.map(dbRowToTodo);
      const local = loadFromStorage<TodoItem[]>(STORAGE_KEYS.TODOS, []);
      const merged = mergeById(local, todos);
      saveToStorage(STORAGE_KEYS.TODOS, merged);
    }

    if (foodItemsRes.data) {
      const foodItems = foodItemsRes.data.map(dbRowToFoodItem);
      const local = loadFromStorage<FoodItem[]>(STORAGE_KEYS.FOOD_ITEMS, []);
      const merged = mergeById(local, foodItems);
      saveToStorage(STORAGE_KEYS.FOOD_ITEMS, merged);
    }

    if (conversionsRes.data) {
      const conversions = conversionsRes.data.map(dbRowToUnitConversion);
      saveToStorage(STORAGE_KEYS.FOOD_ITEMS + '_conversions', conversions);
    }

    if (reviewsRes.data) {
      const reviews = reviewsRes.data.map(dbRowToReviewItem);
      const local = loadFromStorage<ReviewItem[]>(STORAGE_KEYS.REVIEW_ITEMS, []);
      const merged = mergeById(local, reviews);
      saveToStorage(STORAGE_KEYS.REVIEW_ITEMS, merged);
    }
  } catch (e) {
    console.error('Failed to load from Supabase:', e);
  }
}

// ============ Recipes ============

export async function syncRecipeToSupabase(recipe: Recipe) {
  try {
    const { error } = await supabase.from('recipes').upsert({
      id: recipe.id,
      title: recipe.title,
      image: recipe.image ?? null,
      category: recipe.category,
      category_id: recipe.categoryId,
      base_servings: recipe.baseServings,
      ingredients: recipe.ingredients,
      steps: recipe.steps,
      structure_tag: recipe.structureTag,
      main_ingredient: recipe.mainIngredient,
      source_type: recipe.sourceType,
      source_snapshot: recipe.sourceSnapshot ?? null,
      note: recipe.note ?? null,
      favorited: recipe.favorited ?? false,
      created_at: recipe.createdAt,
      updated_at: recipe.updatedAt,
    });
    if (error) console.error('Supabase sync recipe error:', error);
  } catch (e) {
    console.error('Failed to sync recipe:', e);
  }
}

export async function deleteRecipeFromSupabase(id: string) {
  try {
    await supabase.from('recipes').delete().eq('id', id);
  } catch (e) {
    console.error('Failed to delete recipe from Supabase:', e);
  }
}

export async function clearRecipesFromSupabase() {
  try {
    await supabase.from('recipes').delete().neq('id', '');
  } catch (e) {
    console.error('Failed to clear recipes from Supabase:', e);
  }
}

// ============ Todos ============

export async function syncTodoToSupabase(todo: TodoItem) {
  try {
    await supabase.from('todos').upsert({
      id: todo.id,
      recipe_id: todo.recipeId,
      added_at: todo.addedAt,
      is_completed: todo.isCompleted,
      completed_at: todo.completedAt ?? null,
    });
  } catch (e) {
    console.error('Failed to sync todo:', e);
  }
}

export async function deleteTodoFromSupabase(id: string) {
  try {
    await supabase.from('todos').delete().eq('id', id);
  } catch (e) {
    console.error('Failed to delete todo from Supabase:', e);
  }
}

export async function clearTodosFromSupabase() {
  try {
    await supabase.from('todos').delete().neq('id', '');
  } catch (e) {
    console.error('Failed to clear todos from Supabase:', e);
  }
}

// ============ Food Items ============

export async function syncFoodItemToSupabase(item: FoodItem) {
  try {
    await supabase.from('food_items').upsert({
      id: item.id,
      name: item.name,
      nutrition_per_100g: item.nutritionPer100g,
      source: item.source,
    });
  } catch (e) {
    console.error('Failed to sync food item:', e);
  }
}

export async function deleteFoodItemFromSupabase(id: string) {
  try {
    await supabase.from('food_items').delete().eq('id', id);
  } catch (e) {
    console.error('Failed to delete food item from Supabase:', e);
  }
}

export async function clearFoodItemsFromSupabase() {
  try {
    await supabase.from('food_items').delete().neq('id', '');
  } catch (e) {
    console.error('Failed to clear food items from Supabase:', e);
  }
}

// ============ Unit Conversions ============

export async function syncUnitConversionToSupabase(conversion: UnitConversion) {
  try {
    await supabase.from('unit_conversions').upsert({
      id: conversion.id,
      food_item_id: conversion.foodItemId ?? null,
      unit: conversion.unit,
      grams_equivalent: conversion.gramsEquivalent,
    });
  } catch (e) {
    console.error('Failed to sync unit conversion:', e);
  }
}

export async function deleteUnitConversionFromSupabase(id: string) {
  try {
    await supabase.from('unit_conversions').delete().eq('id', id);
  } catch (e) {
    console.error('Failed to delete unit conversion from Supabase:', e);
  }
}

// ============ Review Items ============

export async function syncReviewItemToSupabase(item: ReviewItem) {
  try {
    await supabase.from('review_items').upsert({
      id: item.id,
      parsed_data: item.parsedData,
      source_type: item.sourceType,
      source_snapshot: item.sourceSnapshot ?? null,
      confidence: item.confidence,
      created_at: item.createdAt,
    });
  } catch (e) {
    console.error('Failed to sync review item:', e);
  }
}

export async function deleteReviewItemFromSupabase(id: string) {
  try {
    await supabase.from('review_items').delete().eq('id', id);
  } catch (e) {
    console.error('Failed to delete review item from Supabase:', e);
  }
}

// ============ DB row -> TypeScript type mappers ============

function dbRowToRecipe(row: any): Recipe {
  return {
    id: row.id,
    title: row.title,
    image: row.image ?? undefined,
    category: row.category,
    categoryId: row.category_id,
    baseServings: row.base_servings,
    ingredients: row.ingredients ?? [],
    steps: row.steps ?? [],
    structureTag: row.structure_tag ?? row.category ?? '荤菜',
    mainIngredient: row.main_ingredient ?? [],
    sourceType: row.source_type,
    sourceSnapshot: row.source_snapshot ?? undefined,
    note: row.note ?? undefined,
    favorited: row.favorited ?? false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function dbRowToTodo(row: any): TodoItem {
  return {
    id: row.id,
    recipeId: row.recipe_id,
    addedAt: row.added_at,
    isCompleted: row.is_completed,
    completedAt: row.completed_at ?? undefined,
  };
}

function dbRowToFoodItem(row: any): FoodItem {
  return {
    id: row.id,
    name: row.name,
    nutritionPer100g: row.nutrition_per_100g,
    source: row.source,
  };
}

function dbRowToUnitConversion(row: any): UnitConversion {
  return {
    id: row.id,
    foodItemId: row.food_item_id ?? undefined,
    unit: row.unit,
    gramsEquivalent: row.grams_equivalent,
  };
}

function dbRowToReviewItem(row: any): ReviewItem {
  return {
    id: row.id,
    parsedData: row.parsed_data,
    sourceType: row.source_type,
    sourceSnapshot: row.source_snapshot ?? undefined,
    confidence: row.confidence ?? {},
    createdAt: row.created_at,
  };
}

// ============ Merge helpers ============

function mergeById<T extends { id: string; updatedAt?: number; createdAt?: number }>(
  local: T[],
  remote: T[]
): T[] {
  const map = new Map<string, T>();
  for (const item of local) {
    map.set(item.id, item);
  }
  for (const item of remote) {
    const existing = map.get(item.id);
    if (!existing) {
      map.set(item.id, item);
    } else {
      const localTime = existing.updatedAt ?? existing.createdAt ?? 0;
      const remoteTime = item.updatedAt ?? item.createdAt ?? 0;
      if (remoteTime > localTime) {
        map.set(item.id, item);
      }
    }
  }
  return Array.from(map.values());
}
