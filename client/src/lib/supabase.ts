import { createClient, type SupabaseClient } from '@supabase/supabase-js';

type SupabaseEnv = { url: string; key: string };

declare global {
  interface Window {
    __SUPABASE_ENV__?: SupabaseEnv;
  }
}

export function readSupabaseConfig(): SupabaseEnv {
  if (typeof window !== 'undefined' && window.__SUPABASE_ENV__?.url) {
    return window.__SUPABASE_ENV__;
  }
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  };
}

function isConfigured(cfg: SupabaseEnv) {
  return (
    !!cfg.url &&
    !!cfg.key &&
    !cfg.url.includes('placeholder') &&
    !cfg.key.includes('placeholder')
  );
}

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (client) return client;

  const cfg = readSupabaseConfig();
  if (!isConfigured(cfg)) {
    console.warn(
      '[Supabase] NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY 가 없습니다. Vercel Environment Variables 확인 후 재배포하세요.'
    );
  }

  client = createClient(
    cfg.url || 'https://placeholder.supabase.co',
    cfg.key || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder'
  );
  return client;
}

/** @deprecated getSupabase() 사용 권장 — 기존 import 호환용 Proxy */
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const c = getSupabase();
    const value = Reflect.get(c as object, prop, c);
    return typeof value === 'function' ? (value as (...args: unknown[]) => unknown).bind(c) : value;
  },
});

export function throwIfError<T>(result: { data: T; error: Error | null }) {
  if (result.error) throw result.error;
  return result.data;
}
