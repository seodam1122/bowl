import { supabase, assertSupabase } from './supabase.js';

const defaultPricing = {
  weekday: { morning: 5000, afternoon: 6000, night: 7000 },
  weekend: { morning: 6000, afternoon: 7000, night: 8000 },
  special: { morning: 7000, afternoon: 8000, night: 9000 },
};

const defaultSettings = {
  password: 'admin',
  opening_time: '09:00',
  score_reset: '게임완료 즉시',
  graphic_exposure: '노출',
  frame_border: '노출',
  standby_skin: '1',
  score_skin: '1',
  license_customer: '데모 볼링장',
  license_key: 'DEMO-ONSCORING-2024',
  license_status: '등록됨',
};

export async function seedIfEmpty() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return;

  const { count: laneCount } = await supabase
    .from('lanes')
    .select('*', { count: 'exact', head: true });

  if (!laneCount) {
    const lanes = Array.from({ length: 16 }, (_, i) => ({ id: i + 1, status: 'waiting' }));
    assertSupabase(await supabase.from('lanes').insert(lanes));
    console.log('[seed] 16 lanes created');
  }

  const { count: feeCount } = await supabase
    .from('fee_settings')
    .select('*', { count: 'exact', head: true });

  if (!feeCount) {
    const fees = ['일반', '회원', '학생'].map((name) => ({
      name,
      payment_type: '후불',
      game_count: 0,
      shoe_fee: 1000,
      pricing: defaultPricing,
    }));
    assertSupabase(await supabase.from('fee_settings').insert(fees));
    console.log('[seed] fee_settings created');
  }

  const { count: settingsCount } = await supabase
    .from('settings')
    .select('*', { count: 'exact', head: true });

  if (!settingsCount) {
    const rows = Object.entries(defaultSettings).map(([key, value]) => ({ key, value }));
    assertSupabase(await supabase.from('settings').insert(rows));
    console.log('[seed] settings created');
  }

  const today = new Date().toISOString().slice(0, 10);
  const { data: bd } = await supabase.from('business_days').select('id').eq('date', today).maybeSingle();
  if (!bd) {
    assertSupabase(
      await supabase.from('business_days').insert({
        date: today,
        day_type: '평일',
        am_start: '09:00',
        pm_start: '14:00',
        night_start: '18:00',
      })
    );
    console.log('[seed] business_days today created');
  }
}
