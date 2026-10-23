import { FunctionsFetchError, FunctionsHttpError, FunctionsRelayError } from '@supabase/supabase-js';

export async function adminVerificationFailure(error: unknown, data: unknown): Promise<string> {
  const connectionMessage = '无法连接验证服务，请检查网络或预览地址后重试。';
  if (error instanceof FunctionsFetchError || error instanceof FunctionsRelayError) return connectionMessage;
  let body = data;
  let status: number | undefined;
  if (error instanceof FunctionsHttpError && error.context instanceof Response) {
    status = error.context.status;
    try { body = await error.context.clone().json(); } catch { /* Keep service errors distinct from PIN errors. */ }
  }
  const reason = body && typeof body === 'object' && 'error' in body ? body.error : undefined;
  if (reason === 'Invalid PIN') return 'PIN 不正确，请检查后重试。';
  if (reason === 'Origin not allowed' || status === 403) return '当前预览地址未获验证服务允许，请使用已配置的地址。';
  if (status === 429) return '验证请求过于频繁，请稍后重试。';
  return '验证服务暂时不可用，请稍后重试。';
}
