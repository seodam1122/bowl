import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.warn(
    '[Supabase] NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY 가 없습니다.'
  );
}

export const supabase = createClient(
  url || 'https://placeholder.supabase.co',
  key || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder'
);

export function throwIfError<T>(result: { data: T; error: Error | null }) {
  if (result.error) throw result.error;
  return result.data;
}
