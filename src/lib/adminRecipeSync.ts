import { supabase } from './supabase';
import { Recipe } from '../types';
import { getAdminPin } from './adminMode';

type AdminAction = 'verify' | 'upsert' | 'delete' | 'clear';

async function invoke(action: AdminAction, payload: Record<string, unknown> = {}) {
  const pin = getAdminPin();
  if (!pin) return { ok: false, error: '管理模式未解锁' };
  const { data, error } = await supabase.functions.invoke('admin-recipe-sync', {
    body: { action, pin, ...payload },
  });
  if (error || !data?.ok) return { ok: false, error: error?.message || data?.error || '云端同步失败' };
  return { ok: true, data };
}

export async function verifyAdminPin(pin: string) {
  const { data, error } = await supabase.functions.invoke('admin-recipe-sync', {
    body: { action: 'verify', pin },
  });
  return error || !data?.ok
    ? { ok: false, error: error?.message || data?.error || 'PIN 不正确' }
    : { ok: true };
}

export const syncAdminRecipe = (recipe: Recipe) => invoke('upsert', { recipe });
export const deleteAdminRecipe = (id: string) => invoke('delete', { id });
export const clearAdminRecipes = () => invoke('clear');
