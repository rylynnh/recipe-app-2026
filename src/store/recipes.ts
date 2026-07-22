import { create } from 'zustand';
import { Recipe, ReviewItem } from '../types';
import { mockRecipes } from '../data/mock';
import { saveToStorage, loadFromStorage, STORAGE_KEYS } from '../utils/storage';
import { generateId } from '../utils/parser';
import { detectMainIngredients } from '../utils/nutrition';
import {
  loadAllFromSupabase,
  syncRecipeToSupabase,
  deleteRecipeFromSupabase,
  clearRecipesFromSupabase,
  syncReviewItemToSupabase,
  deleteReviewItemFromSupabase,
} from '../lib/supabaseSync';

function normalizeRecipe(r: any): Recipe {
  return {
    ...r,
    structureTag: r.structureTag ?? r.structureTags?.[0] ?? r.category ?? '荤菜',
    mainIngredient: r.mainIngredient ?? [],
    favorited: r.favorited ?? false,
  };
}

function normalizeRecipes(recipes: any[]): Recipe[] {
  return recipes.map(normalizeRecipe);
}

interface RecipesStore {
  recipes: Recipe[];
  reviewItems: ReviewItem[];
  searchHistory: string[];
  initialized: boolean;
  initFromSupabase: () => Promise<void>;
  addRecipe: (recipe: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateRecipe: (id: string, updates: Partial<Recipe>) => void;
  deleteRecipe: (id: string) => void;
  clearAllRecipes: () => void;
  addReviewItem: (item: Omit<ReviewItem, 'id' | 'createdAt'>) => void;
  removeReviewItem: (id: string) => void;
  approveReviewItem: (id: string) => void;
  approveRecipe: (id: string) => void;
  rejectRecipe: (id: string) => void;
  addSearchHistory: (query: string) => void;
  clearSearchHistory: () => void;
  searchRecipes: (query: string) => Recipe[];
  filterByStructure: (structureId: string) => Recipe[];
  filterByIngredient: (recipes: Recipe[], ingredientNames: string[]) => Recipe[];
  getRecipeById: (id: string) => Recipe | undefined;
  getFavoritedRecipes: () => Recipe[];
  toggleFavorite: (id: string) => void;
  getReviewCount: () => number;
}

export const useRecipesStore = create<RecipesStore>((set, get) => ({
  recipes: normalizeRecipes(loadFromStorage<Recipe[]>(STORAGE_KEYS.RECIPES, mockRecipes)),
  reviewItems: loadFromStorage<ReviewItem[]>(STORAGE_KEYS.REVIEW_ITEMS, []),
  searchHistory: loadFromStorage<string[]>(STORAGE_KEYS.SEARCH_HISTORY, []),
  initialized: false,

  initFromSupabase: async () => {
    if (get().initialized) return;
    await loadAllFromSupabase();
    let recipes = normalizeRecipes(loadFromStorage<Recipe[]>(STORAGE_KEYS.RECIPES, mockRecipes));

    // Migration: re-evaluate mainIngredient tags for ALL recipes
    let needsSave = false;
    recipes = recipes.map((r) => {
      const autoTags = detectMainIngredients(r.ingredients);
      const currentTags = r.mainIngredient || [];
      // Update if auto-detected tags differ from current
      if (JSON.stringify(autoTags) !== JSON.stringify(currentTags)) {
        needsSave = true;
        const updated = { ...r, mainIngredient: autoTags };
        syncRecipeToSupabase(updated);
        return updated;
      }
      return r;
    });

    if (needsSave) {
      saveToStorage(STORAGE_KEYS.RECIPES, recipes);
    }

    set({
      recipes,
      reviewItems: loadFromStorage<ReviewItem[]>(STORAGE_KEYS.REVIEW_ITEMS, []),
      searchHistory: loadFromStorage<string[]>(STORAGE_KEYS.SEARCH_HISTORY, []),
      initialized: true,
    });
  },

  addRecipe: (recipeData) => {
    const autoTags = detectMainIngredients(recipeData.ingredients);
    const newRecipe: Recipe = {
      ...recipeData,
      id: generateId(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      mainIngredient: recipeData.mainIngredient && recipeData.mainIngredient.length > 0
        ? recipeData.mainIngredient
        : autoTags,
    };
    set((state) => {
      const updated = [...state.recipes, newRecipe];
      saveToStorage(STORAGE_KEYS.RECIPES, updated);
      return { recipes: updated };
    });
    syncRecipeToSupabase(newRecipe);
  },

  updateRecipe: (id, updates) => {
    set((state) => {
      const existing = state.recipes.find(r => r.id === id);
      const mergedUpdates = { ...updates };

      // Auto-detect mainIngredient tags when ingredients are updated
      if (updates.ingredients) {
        const autoTags = detectMainIngredients(updates.ingredients);
        if (autoTags.length > 0) {
          mergedUpdates.mainIngredient = autoTags;
        }
      } else if (existing) {
        // Re-detect from existing ingredients if not explicitly updating
        const autoTags = detectMainIngredients(existing.ingredients);
        if (autoTags.length > 0 && (!mergedUpdates.mainIngredient || mergedUpdates.mainIngredient.length === 0)) {
          mergedUpdates.mainIngredient = autoTags;
        }
      }

      const updated = state.recipes.map((r) =>
        r.id === id ? { ...r, ...mergedUpdates, updatedAt: Date.now() } : r
      );
      saveToStorage(STORAGE_KEYS.RECIPES, updated);
      const updatedRecipe = updated.find((r) => r.id === id);
      if (updatedRecipe) syncRecipeToSupabase(updatedRecipe);
      return { recipes: updated };
    });
  },

  deleteRecipe: (id) => {
    set((state) => {
      const updated = state.recipes.filter((r) => r.id !== id);
      saveToStorage(STORAGE_KEYS.RECIPES, updated);
      return { recipes: updated };
    });
    deleteRecipeFromSupabase(id);
  },

  clearAllRecipes: () => {
    saveToStorage(STORAGE_KEYS.RECIPES, []);
    set({ recipes: [] });
    clearRecipesFromSupabase();
  },

  addReviewItem: (itemData) => {
    const newItem: ReviewItem = {
      ...itemData,
      id: generateId(),
      createdAt: Date.now(),
    };
    set((state) => {
      const updated = [...state.reviewItems, newItem];
      saveToStorage(STORAGE_KEYS.REVIEW_ITEMS, updated);
      return { reviewItems: updated };
    });
    syncReviewItemToSupabase(newItem);
  },

  removeReviewItem: (id) => {
    set((state) => {
      const updated = state.reviewItems.filter((r) => r.id !== id);
      saveToStorage(STORAGE_KEYS.REVIEW_ITEMS, updated);
      return { reviewItems: updated };
    });
    deleteReviewItemFromSupabase(id);
  },

  approveReviewItem: (id) => {
    set((state) => {
      const item = state.reviewItems.find((r) => r.id === id);
      if (item) {
        const newRecipe: Recipe = {
          id: generateId(),
          title: item.parsedData.title,
          category: '中餐',
          categoryId: 't2',
          baseServings: item.parsedData.servings,
          ingredients: item.parsedData.ingredients.map((ing) => ({
            id: generateId(),
            recipeId: '',
            name: ing.name,
            amount: ing.amount,
            unit: ing.unit,
            group: ing.group,
          })),
          steps: item.parsedData.steps.map((step, idx) => ({
            id: generateId(),
            recipeId: '',
            order: idx + 1,
            content: step.content,
            detectedDurationSeconds: step.detectedDurationSeconds,
            hasTimer: !!step.detectedDurationSeconds,
          })),
          structureTag: item.parsedData.tags?.[0] || '荤菜',
          techniqueTags: [],
          mainIngredient: detectMainIngredients(item.parsedData.ingredients),
          difficultyLevel: '入门',
          sourceType: item.sourceType,
          sourceSnapshot: item.sourceSnapshot,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        const updatedRecipes = [...state.recipes, newRecipe];
        const updatedReviews = state.reviewItems.filter((r) => r.id !== id);
        saveToStorage(STORAGE_KEYS.RECIPES, updatedRecipes);
        saveToStorage(STORAGE_KEYS.REVIEW_ITEMS, updatedReviews);
        syncRecipeToSupabase(newRecipe);
        deleteReviewItemFromSupabase(id);
        return { recipes: updatedRecipes, reviewItems: updatedReviews };
      }
      return state;
    });
  },

  approveRecipe: (id) => {
    const item = get().reviewItems.find((r) => r.id === id);
    if (item) {
      get().approveReviewItem(id);
    }
  },

  rejectRecipe: (id) => {
    get().removeReviewItem(id);
  },

  approveReview: (id) => {
    get().approveReviewItem(id);
  },

  rejectReview: (id) => {
    get().removeReviewItem(id);
  },

  addSearchHistory: (query) => {
    set((state) => {
      const filtered = state.searchHistory.filter((h) => h !== query);
      const updated = [query, ...filtered].slice(0, 10);
      saveToStorage(STORAGE_KEYS.SEARCH_HISTORY, updated);
      return { searchHistory: updated };
    });
  },

  clearSearchHistory: () => {
    saveToStorage(STORAGE_KEYS.SEARCH_HISTORY, []);
    set({ searchHistory: [] });
  },

  searchRecipes: (query) => {
    const { recipes } = get();
    const sorted = [...recipes].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    if (!query.trim()) return sorted;
    const lowerQuery = query.toLowerCase();
    return sorted.filter(
      (r) =>
        r.title.toLowerCase().includes(lowerQuery) ||
        r.structureTag.toLowerCase().includes(lowerQuery) ||
        r.mainIngredient.some((tag) => tag.toLowerCase().includes(lowerQuery)) ||
        r.ingredients.some((ing) => ing.name.toLowerCase().includes(lowerQuery))
    );
  },

  filterByStructure: (structureId) => {
    const { recipes } = get();
    const sorted = [...recipes].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    if (structureId === 's1') return sorted;
    return sorted.filter((r) => r.categoryId === structureId);
  },

  filterByIngredient: (recipes, ingredientNames) => {
    if (ingredientNames.length === 0) return recipes;
    return recipes.filter((r) =>
      ingredientNames.some((name) => r.mainIngredient.some((tag) => tag === name))
    );
  },

  getRecipeById: (id) => {
    const { recipes } = get();
    return recipes.find((r) => r.id === id);
  },

  toggleFavorite: (id) => {
    set((state) => {
      const updated = state.recipes.map((r) =>
        r.id === id ? { ...r, favorited: !r.favorited, updatedAt: Date.now() } : r
      );
      saveToStorage(STORAGE_KEYS.RECIPES, updated);
      const updatedRecipe = updated.find((r) => r.id === id);
      if (updatedRecipe) syncRecipeToSupabase(updatedRecipe);
      return { recipes: updated };
    });
  },

  getFavoritedRecipes: () => {
    const { recipes } = get();
    return recipes.filter((r) => r.favorited);
  },

  getReviewCount: () => {
    return get().reviewItems.length;
  },
}));
