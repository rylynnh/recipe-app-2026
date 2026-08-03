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
  const isLegacyColdDish = r.categoryId === 's4'
    || r.category === '凉菜'
    || r.structureTag === '凉菜'
    || r.structureTags?.includes?.('凉菜');
  return {
    ...r,
    category: isLegacyColdDish ? '素菜' : r.category,
    categoryId: isLegacyColdDish ? 's3' : r.categoryId,
    structureTag: isLegacyColdDish ? '素菜' : (r.structureTag ?? r.structureTags?.[0] ?? r.category ?? '荤菜'),
    mainIngredient: r.mainIngredient ?? [],
    favorited: r.favorited ?? false,
  };
}

function normalizeRecipes(recipes: any[]): Recipe[] {
  return recipes.map(normalizeRecipe);
}

function syncRecipeAndPersistCloudImage(recipe: Recipe) {
  void syncRecipeToSupabase(recipe).then((cloudImageUrl) => {
    if (!cloudImageUrl) return;
    useRecipesStore.setState((state) => {
      const recipes = state.recipes.map((item) =>
        item.id === recipe.id ? { ...item, image: cloudImageUrl } : item
      );
      saveToStorage(STORAGE_KEYS.RECIPES, recipes);
      return { recipes };
    });
  });
}

interface DeletedRecipe extends Recipe {
  deletedAt: number;
}

interface RecipesStore {
  recipes: Recipe[];
  deletedRecipes: DeletedRecipe[];
  reviewItems: ReviewItem[];
  favoriteIds: string[];
  searchHistory: string[];
  initialized: boolean;
  initFromSupabase: () => Promise<void>;
  addRecipe: (recipe: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateRecipe: (id: string, updates: Partial<Recipe>) => void;
  deleteRecipe: (id: string) => void;
  restoreRecipe: (id: string) => void;
  permanentlyDeleteRecipe: (id: string) => void;
  clearAllDeletedRecipes: () => void;
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
  deletedRecipes: loadFromStorage<DeletedRecipe[]>(STORAGE_KEYS.DELETED_RECIPES, []),
  reviewItems: loadFromStorage<ReviewItem[]>(STORAGE_KEYS.REVIEW_ITEMS, []),
  favoriteIds: loadFromStorage<string[]>(STORAGE_KEYS.FAVORITE_IDS, []),
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
      const needsTagUpgrade = currentTags.length === 0 || currentTags.includes('素菜') || currentTags.length > 2;
      if (needsTagUpgrade && JSON.stringify(autoTags) !== JSON.stringify(currentTags)) {
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
    syncRecipeAndPersistCloudImage(newRecipe);
  },

  updateRecipe: (id, updates) => {
    set((state) => {
      const existing = state.recipes.find(r => r.id === id);
      const mergedUpdates = { ...updates };

      // Auto-detect mainIngredient tags when ingredients are updated
      if (updates.ingredients && !updates.mainIngredient) {
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
      if (updatedRecipe) syncRecipeAndPersistCloudImage(updatedRecipe);
      return { recipes: updated };
    });
  },

  deleteRecipe: (id) => {
    set((state) => {
      const recipeToDelete = state.recipes.find((r) => r.id === id);
      if (!recipeToDelete) return state;

      const updatedRecipes = state.recipes.filter((r) => r.id !== id);
      const deletedRecipe: DeletedRecipe = {
        ...recipeToDelete,
        deletedAt: Date.now(),
      };
      const updatedDeletedRecipes = [...state.deletedRecipes, deletedRecipe].slice(-50);

      saveToStorage(STORAGE_KEYS.RECIPES, updatedRecipes);
      saveToStorage(STORAGE_KEYS.DELETED_RECIPES, updatedDeletedRecipes);
      return { recipes: updatedRecipes, deletedRecipes: updatedDeletedRecipes };
    });
    deleteRecipeFromSupabase(id);
  },

  restoreRecipe: (id) => {
    set((state) => {
      const deletedRecipe = state.deletedRecipes.find((r) => r.id === id);
      if (!deletedRecipe) return state;

      const updatedDeletedRecipes = state.deletedRecipes.filter((r) => r.id !== id);
      const updatedRecipes = [...state.recipes, { ...deletedRecipe }];

      saveToStorage(STORAGE_KEYS.RECIPES, updatedRecipes);
      saveToStorage(STORAGE_KEYS.DELETED_RECIPES, updatedDeletedRecipes);

      syncRecipeAndPersistCloudImage(deletedRecipe);
      return { recipes: updatedRecipes, deletedRecipes: updatedDeletedRecipes };
    });
  },

  permanentlyDeleteRecipe: (id) => {
    set((state) => {
      const updated = state.deletedRecipes.filter((r) => r.id !== id);
      saveToStorage(STORAGE_KEYS.DELETED_RECIPES, updated);
      return { deletedRecipes: updated };
    });
  },

  clearAllDeletedRecipes: () => {
    saveToStorage(STORAGE_KEYS.DELETED_RECIPES, []);
    set({ deletedRecipes: [] });
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
        syncRecipeAndPersistCloudImage(newRecipe);
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
    const keywords = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return sorted
      .map((recipe) => {
        const title = recipe.title.toLowerCase();
        const tags = [...recipe.mainIngredient, recipe.category, recipe.structureTag].join(' ').toLowerCase();
        const ingredients = recipe.ingredients.map((ingredient) => ingredient.name).join(' ').toLowerCase();
        const details = [recipe.note || '', ...recipe.steps.map((step) => step.content)].join(' ').toLowerCase();
        let score = 0;

        for (const keyword of keywords) {
          if (title.includes(keyword)) score += 100;
          else if (tags.includes(keyword)) score += 70;
          else if (ingredients.includes(keyword)) score += 40;
          else if (details.includes(keyword)) score += 10;
          else return null;
        }

        return { recipe, score };
      })
      .filter((item): item is { recipe: Recipe; score: number } => item !== null)
      .sort((a, b) => b.score - a.score || (b.recipe.updatedAt || 0) - (a.recipe.updatedAt || 0))
      .map(({ recipe }) => recipe);
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
      const favoriteIds = state.favoriteIds.includes(id)
        ? state.favoriteIds.filter((favoriteId) => favoriteId !== id)
        : [...state.favoriteIds, id];
      saveToStorage(STORAGE_KEYS.FAVORITE_IDS, favoriteIds);
      return { favoriteIds };
    });
  },

  getFavoritedRecipes: () => {
    const { recipes, favoriteIds } = get();
    return recipes.filter((r) => favoriteIds.includes(r.id));
  },

  getReviewCount: () => {
    return get().reviewItems.length;
  },
}));
