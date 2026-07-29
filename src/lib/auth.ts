import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

export type AccessState =
  | { status: 'loading' }
  | { status: 'signed_out' }
  | { status: 'denied'; email?: string }
  | { status: 'granted'; session: Session };

const OWNER_EMAIL = '949454639@qq.com';
const CANONICAL_APP_URL = 'https://recipe-app-2026-one.vercel.app';

export function getAuthRedirectUrl(): string {
  // Always return to the public production domain. This avoids sending a
  // magic link back to a legacy Vercel alias or the retired GitHub Pages site.
  return `${CANONICAL_APP_URL}/#/admin`;
}

export async function requestMagicLink(email: string): Promise<void> {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: getAuthRedirectUrl() },
  });
  if (error) throw error;
}

export async function resolveAccess(session: Session | null): Promise<AccessState> {
  if (!session) return { status: 'signed_out' };

  if (session.user.email?.toLowerCase() !== OWNER_EMAIL) {
    return { status: 'denied', email: session.user.email };
  }

  return { status: 'granted', session };
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
