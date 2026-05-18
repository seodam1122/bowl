import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.warn(
    '[Supabase] SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY가 없습니다. server/.env.example을 참고하세요.'
  );
}

export const supabase = createClient(url || 'https://placeholder.supabase.co', key || 'placeholder', {
  auth: { persistSession: false, autoRefreshToken: false },
});

export function assertSupabase(res) {
  if (res.error) throw res.error;
  return res.data;
}
