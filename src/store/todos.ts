import { create } from 'zustand';
import { notify } from './feedback';
import { TodoItem } from '../types';
import { saveToStorage, loadFromStorage, STORAGE_KEYS } from '../utils/storage';
import { generateId } from '../utils/parser';
import {
  syncTodoToSupabase,
  deleteTodoFromSupabase,
  clearTodosFromSupabase,
} from '../lib/supabaseSync';

interface TodosStore {
  todos: TodoItem[];
  addTodo: (recipeId: string) => void;
  toggleTodo: (id: string) => void;
  removeTodo: (id: string) => void;
  clearAllTodos: () => void;
  getTodoByRecipeId: (recipeId: string) => TodoItem | undefined;
  getPendingTodos: () => TodoItem[];
  getCompletedTodos: () => TodoItem[];
  refreshFromStorage: () => void;
}

export const useTodosStore = create<TodosStore>((set, get) => ({
  todos: loadFromStorage<TodoItem[]>(STORAGE_KEYS.TODOS, []),

  refreshFromStorage: () => {
    set({ todos: loadFromStorage<TodoItem[]>(STORAGE_KEYS.TODOS, []) });
  },

  addTodo: (recipeId) => {
    const existing = get().todos.find((t) => t.recipeId === recipeId && !t.isCompleted);
    if (existing) return;

    const newTodo: TodoItem = {
      id: generateId(),
      recipeId,
      addedAt: Date.now(),
      isCompleted: false,
    };

    set((state) => {
      const updated = [...state.todos, newTodo];
      if (!saveToStorage(STORAGE_KEYS.TODOS, updated)) return state;
      notify('已加入待办');
      return { todos: updated };
    });
    if (get().todos.some((item) => item.id === newTodo.id)) syncTodoToSupabase(newTodo);
  },

  toggleTodo: (id) => {
    set((state) => {
      const updated = state.todos.map((t) =>
        t.id === id
          ? { ...t, isCompleted: !t.isCompleted, completedAt: !t.isCompleted ? Date.now() : undefined }
          : t
      );
      if (!saveToStorage(STORAGE_KEYS.TODOS, updated)) return state;
      const toggled = updated.find((t) => t.id === id);
      if (toggled) { syncTodoToSupabase(toggled); notify(toggled.isCompleted ? '已标记做过' : '已恢复待办'); }
      return { todos: updated };
    });
  },

  removeTodo: (id) => {
    set((state) => {
      const updated = state.todos.filter((t) => t.id !== id);
      if (!saveToStorage(STORAGE_KEYS.TODOS, updated)) return state;
      notify('已移出待办');
      return { todos: updated };
    });
    if (!get().todos.some((item) => item.id === id)) deleteTodoFromSupabase(id);
  },

  clearAllTodos: () => {
    saveToStorage(STORAGE_KEYS.TODOS, []);
    set({ todos: [] });
    clearTodosFromSupabase();
  },

  getTodoByRecipeId: (recipeId) => {
    return get().todos.find((t) => t.recipeId === recipeId);
  },

  getPendingTodos: () => {
    return get().todos.filter((t) => !t.isCompleted).sort((a, b) => b.addedAt - a.addedAt);
  },

  getCompletedTodos: () => {
    return get().todos.filter((t) => t.isCompleted).sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));
  },
}));
