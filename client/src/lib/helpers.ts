import { supabase } from './supabase';

const defaultPricing = {
  weekday: { morning: 5000, afternoon: 6000, night: 7000 },
  weekend: { morning: 6000, afternoon: 7000, night: 8000 },
  special: { morning: 7000, afternoon: 8000, night: 9000 },
};

export function monthRange(month: string) {
  const [y, m] = month.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  return { start: `${month}-01`, end: `${month}-${String(last).padStart(2, '0')}` };
}

export async function getBusinessDate(): Promise<string> {
  const { data } = await supabase
    .from('business_days')
    .select('date')
    .order('date', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (data?.date) return String(data.date).slice(0, 10);
  return new Date().toISOString().slice(0, 10);
}

export async function calcFee(playerType: string, gameCount: number, shoeRental: number) {
  const { data: fee } = await supabase
    .from('fee_settings')
    .select('*')
    .eq('name', playerType)
    .maybeSingle();
  if (!fee) return { gameFee: gameCount * 6000, shoeFee: shoeRental ? 1000 : 0 };
  const pricing = (fee.pricing || {}) as { weekday?: { afternoon?: number } };
  const p = pricing.weekday?.afternoon ?? 6000;
  const gameFee = fee.payment_type === '선불' ? p : gameCount * p;
  return { gameFee, shoeFee: shoeRental ? fee.shoe_fee : 0 };
}

export async function ensureSeed() {
  const { count } = await supabase.from('lanes').select('*', { count: 'exact', head: true });
  if (count && count > 0) return;

  const lanes = Array.from({ length: 16 }, (_, i) => ({ id: i + 1, status: 'waiting' }));
  await supabase.from('lanes').insert(lanes);

  await supabase.from('fee_settings').insert(
    ['일반', '회원', '학생'].map((name) => ({
      name,
      payment_type: '후불',
      game_count: 0,
      shoe_fee: 1000,
      pricing: defaultPricing,
    }))
  );

  await supabase.from('settings').insert([
    { key: 'password', value: 'admin' },
    { key: 'opening_time', value: '09:00' },
    { key: 'score_reset', value: '게임완료 즉시' },
    { key: 'graphic_exposure', value: '노출' },
    { key: 'frame_border', value: '노출' },
    { key: 'standby_skin', value: '1' },
    { key: 'score_skin', value: '1' },
    { key: 'license_customer', value: '데모 볼링장' },
    { key: 'license_key', value: 'DEMO-ONSCORING-2024' },
    { key: 'license_status', value: '등록됨' },
  ]);

  const today = new Date().toISOString().slice(0, 10);
  await supabase.from('business_days').upsert(
    { date: today, day_type: '평일', am_start: '09:00', pm_start: '14:00', night_start: '18:00' },
    { onConflict: 'date' }
  );
}
