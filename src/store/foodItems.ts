import { create } from 'zustand';
import { FoodItem, UnitConversion, TagDimension } from '../types';
import { foodDatabase } from '../data/foodDatabase';
import { unitConversions as mockUnitConversions, structureTags } from '../data/mock';
import { saveToStorage, loadFromStorage, clearStorage, checkDataVersion, updateDataVersion, STORAGE_KEYS } from '../utils/storage';
import {
  syncFoodItemToSupabase,
  deleteFoodItemFromSupabase,
  clearFoodItemsFromSupabase,
  syncUnitConversionToSupabase,
  deleteUnitConversionFromSupabase,
} from '../lib/supabaseSync';

interface FoodItemsStore {
  foodItems: FoodItem[];
  unitConversions: UnitConversion[];
  categories: TagDimension[];
  addFoodItem: (item: Omit<FoodItem, 'id' | 'source'>) => void;
  updateFoodItem: (id: string, updates: Partial<FoodItem>) => void;
  deleteFoodItem: (id: string) => void;
  clearAllFoodItems: () => void;
  addUnitConversion: (conversion: Omit<UnitConversion, 'id'>) => void;
  deleteUnitConversion: (id: string) => void;
  findFoodItemByName: (name: string) => FoodItem | undefined;
  refreshFromStorage: () => void;
}

const isDataVersionCurrent = checkDataVersion();
if (!isDataVersionCurrent) {
  clearStorage(STORAGE_KEYS.FOOD_ITEMS);
  saveToStorage(STORAGE_KEYS.FOOD_ITEMS, foodDatabase);
  updateDataVersion();
}

export const useFoodItemsStore = create<FoodItemsStore>((set, get) => ({
  foodItems: loadFromStorage<FoodItem[]>(STORAGE_KEYS.FOOD_ITEMS, foodDatabase),
  unitConversions: loadFromStorage<UnitConversion[]>(STORAGE_KEYS.FOOD_ITEMS + '_conversions', mockUnitConversions),
  categories: structureTags,

  refreshFromStorage: () => {
    set({
      foodItems: loadFromStorage<FoodItem[]>(STORAGE_KEYS.FOOD_ITEMS, foodDatabase),
      unitConversions: loadFromStorage<UnitConversion[]>(STORAGE_KEYS.FOOD_ITEMS + '_conversions', mockUnitConversions),
    });
  },

  addFoodItem: (itemData) => {
    const newItem: FoodItem = {
      ...itemData,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      source: 'user_added',
    };
    set((state) => {
      const updated = [...state.foodItems, newItem];
      saveToStorage(STORAGE_KEYS.FOOD_ITEMS, updated);
      return { foodItems: updated };
    });
    syncFoodItemToSupabase(newItem);
  },

  updateFoodItem: (id, updates) => {
    set((state) => {
      const updated = state.foodItems.map((f) => (f.id === id ? { ...f, ...updates } : f));
      saveToStorage(STORAGE_KEYS.FOOD_ITEMS, updated);
      const updatedItem = updated.find((f) => f.id === id);
      if (updatedItem) syncFoodItemToSupabase(updatedItem);
      return { foodItems: updated };
    });
  },

  deleteFoodItem: (id) => {
    set((state) => {
      const updated = state.foodItems.filter((f) => f.id !== id);
      saveToStorage(STORAGE_KEYS.FOOD_ITEMS, updated);
      return { foodItems: updated };
    });
    deleteFoodItemFromSupabase(id);
  },

  clearAllFoodItems: () => {
    saveToStorage(STORAGE_KEYS.FOOD_ITEMS, []);
    set({ foodItems: [] });
    clearFoodItemsFromSupabase();
  },

  addUnitConversion: (conversionData) => {
    const newConversion: UnitConversion = {
      ...conversionData,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
    set((state) => {
      const updated = [...state.unitConversions, newConversion];
      saveToStorage(STORAGE_KEYS.FOOD_ITEMS + '_conversions', updated);
      return { unitConversions: updated };
    });
    syncUnitConversionToSupabase(newConversion);
  },

  deleteUnitConversion: (id) => {
    set((state) => {
      const updated = state.unitConversions.filter((u) => u.id !== id);
      saveToStorage(STORAGE_KEYS.FOOD_ITEMS + '_conversions', updated);
      return { unitConversions: updated };
    });
    deleteUnitConversionFromSupabase(id);
  },

  findFoodItemByName: (name) => {
    const { foodItems } = get();
    return foodItems.find(
      (f) => f.name.includes(name) || name.includes(f.name)
    );
  },
}));
