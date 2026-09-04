import { supabase } from './supabase';
import { getAdminPin } from './adminMode';

export interface XiachufangImportResult {
  sourceUrl: string;
  title: string;
  author?: string;
  description?: string;
  tips?: string;
  coverImage?: string;
  ingredients: Array<{ name: string; amount: number | string; unit: string; group?: string }>;
  steps: Array<{ content: string; image?: string }>;
}

export async function importXiachufangRecipe(url: string): Promise<XiachufangImportResult> {
  const pin = getAdminPin();
  if (!pin) throw new Error('请先在“我的”页面开启管理模式，再导入菜谱。');

  let timeoutId: number | undefined;
  const request = supabase.functions.invoke('recipe-import', { body: { pin, url } });
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = window.setTimeout(
      () => reject(new Error('导入超时：下厨房页面暂时没有响应，请稍后重试或改用文字粘贴。')),
      35_000,
    );
  });
  const { data, error } = await Promise.race([request, timeout]).finally(() => {
    if (timeoutId !== undefined) window.clearTimeout(timeoutId);
  });

  if (error) {
    const context = (error as { context?: unknown }).context;
    const response = context instanceof Response ? context : null;
    const payload = response ? await response.json().catch(() => null) : null;
    throw new Error(payload?.error || error.message || '下厨房链接导入失败');
  }

  if (!data?.ok) {
    throw new Error(data?.error || '下厨房链接导入失败');
  }

  return data.recipe as XiachufangImportResult;
}
