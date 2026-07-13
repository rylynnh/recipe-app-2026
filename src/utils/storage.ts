const STORAGE_KEYS = {
  RECIPES: 'recipe_app_recipes',
  TODOS: 'recipe_app_todos',
  FOOD_ITEMS: 'recipe_app_food_items',
  REVIEW_ITEMS: 'recipe_app_review_items',
  SEARCH_HISTORY: 'recipe_app_search_history',
  DATA_VERSION: 'recipe_app_data_version',
};

const CURRENT_DATA_VERSION = 3;

export function checkDataVersion(): boolean {
  try {
    const version = localStorage.getItem(STORAGE_KEYS.DATA_VERSION);
    return version === String(CURRENT_DATA_VERSION);
  } catch {
    return false;
  }
}

export function updateDataVersion(): void {
  try {
    localStorage.setItem(STORAGE_KEYS.DATA_VERSION, String(CURRENT_DATA_VERSION));
  } catch (e) {
    console.error('Failed to update data version:', e);
  }
}

export function saveToStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save to storage:', e);
  }
}

export function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const data = localStorage.getItem(key);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Failed to load from storage:', e);
  }
  return defaultValue;
}

export function clearStorage(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.error('Failed to clear storage:', e);
  }
}

export { STORAGE_KEYS };
