import { supabase, throwIfError } from '@/lib/supabase';
import { calcFee, getBusinessDate, monthRange } from '@/lib/helpers';

export const api = {
  getBusinessDay: async () => {
    const date = await getBusinessDate();
    const row = throwIfError(
      await supabase.from('business_days').select('*').eq('date', date).maybeSingle()
    );
    return (
      row || {
        date,
        day_type: '평일',
        am_start: '09:00',
        pm_start: '14:00',
        night_start: '18:00',
      }
    );
  },

  putBusinessDay: async (data: BusinessDay) => {
    throwIfError(
      await supabase.from('business_days').upsert(
        {
          date: data.date,
          day_type: data.day_type,
          am_start: data.am_start,
          pm_start: data.pm_start,
          night_start: data.night_start,
        },
        { onConflict: 'date' }
      )
    );
    return { ok: true };
  },

  getLanes: async () => {
    const lanes = throwIfError(await supabase.from('lanes').select('*').order('id'));
    const players = throwIfError(
      await supabase.from('lane_players').select('*').order('lane_id').order('sort_order')
    );
    const byLane: Record<number, LanePlayer[]> = {};
    for (const p of players || []) {
      if (!byLane[p.lane_id]) byLane[p.lane_id] = [];
      byLane[p.lane_id].push(p);
    }
    return lanes!.map((l) => ({ ...l, players: byLane[l.id] || [] })) as Lane[];
  },

  patchLane: async (id: number, data: Partial<Lane>) => {
    const patch: Record<string, unknown> = {};
    const fields = ['status', 'game_type', 'power_on', 'score_mode', 'collapsed', 'competition_mode'] as const;
    for (const f of fields) {
      if (data[f] !== undefined) patch[f] = data[f];
    }
    if (Object.keys(patch).length) {
      throwIfError(await supabase.from('lanes').update(patch).eq('id', id));
    }
    return { ok: true };
  },

  addPlayer: async (laneId: number, data: Partial<LanePlayer>) => {
    const { count } = await supabase
      .from('lane_players')
      .select('*', { count: 'exact', head: true })
      .eq('lane_id', laneId);
    if ((count ?? 0) >= 6) throw new Error('레인당 최대 6명');

    const { data: lane } = await supabase.from('lanes').select('*').eq('id', laneId).single();
    const row = throwIfError(
      await supabase
        .from('lane_players')
        .insert({
          lane_id: laneId,
          name: data.name || '게스트',
          player_type: data.player_type || '일반',
          shoe_rental: data.shoe_rental ? 1 : 0,
          sort_order: count ?? 0,
        })
        .select('id')
        .single()
    );

    if (lane?.status === 'waiting') {
      await supabase.from('lanes').update({ status: 'active', power_on: 1 }).eq('id', laneId);
    }
    return { id: row!.id };
  },

  patchPlayer: async (laneId: number, playerId: number, data: Partial<LanePlayer>) => {
    const patch: Record<string, unknown> = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.player_type !== undefined) patch.player_type = data.player_type;
    if (data.shoe_rental !== undefined) patch.shoe_rental = data.shoe_rental ? 1 : 0;
    if (data.game_count !== undefined) patch.game_count = data.game_count;
    if (data.settled !== undefined) patch.settled = data.settled ? 1 : 0;
    if (Object.keys(patch).length) {
      throwIfError(await supabase.from('lane_players').update(patch).eq('id', playerId));
    }
    return { ok: true };
  },

  deletePlayer: async (laneId: number, playerId: number) => {
    throwIfError(await supabase.from('lane_players').delete().eq('id', playerId));
    const { count } = await supabase
      .from('lane_players')
      .select('*', { count: 'exact', head: true })
      .eq('lane_id', laneId);
    if (!count) {
      await supabase.from('lanes').update({ status: 'waiting', power_on: 0 }).eq('id', laneId);
    }
    return { ok: true };
  },

  endGame: async (laneId: number) => {
    const players = throwIfError(
      await supabase.from('lane_players').select('*').eq('lane_id', laneId)
    );
    const date = await getBusinessDate();
    const inserts = [];
    for (const p of players || []) {
      if (p.game_count > 0) {
        const { gameFee, shoeFee } = await calcFee(p.player_type, p.game_count, p.shoe_rental);
        const total = gameFee + shoeFee;
        inserts.push({
          business_date: date,
          lane_id: laneId,
          player_name: p.name,
          category: p.player_type,
          game_count: p.game_count,
          shoe_rental: p.shoe_rental,
          fee: total,
          cash_amount: total,
        });
      }
    }
    if (inserts.length) throwIfError(await supabase.from('settlements').insert(inserts));
    await supabase.from('lane_players').delete().eq('lane_id', laneId);
    await supabase.from('lanes').update({ status: 'waiting', power_on: 0 }).eq('id', laneId);
    return { ok: true };
  },

  bulkLanes: async (body: {
    laneIds: number[];
    action: string;
    payload?: Record<string, unknown>;
  }) => {
    const { laneIds, action, payload } = body;
    for (const id of laneIds) {
      if (action === 'assign') {
        await supabase
          .from('lanes')
          .update({
            status: 'active',
            game_type: (payload?.game_type as string) || '일반',
            power_on: 1,
          })
          .eq('id', id);
        const pc = payload?.player_count as number | undefined;
        if (pc) {
          const rows = [];
          for (let i = 0; i < Math.min(pc, 6); i++) {
            rows.push({
              lane_id: id,
              name: `게스트${i + 1}`,
              player_type: (payload?.player_type as string) || '일반',
              sort_order: i,
            });
          }
          await supabase.from('lane_players').insert(rows);
        }
      } else if (action === 'pause') {
        await supabase.from('lanes').update({ status: 'paused' }).eq('id', id);
      } else if (action === 'resume') {
        await supabase.from('lanes').update({ status: 'active' }).eq('id', id);
      } else if (action === 'power') {
        await supabase.from('lanes').update({ power_on: payload?.on ? 1 : 0 }).eq('id', id);
      }
    }
    return { ok: true };
  },

  getLockers: async (params?: Record<string, string>) => {
    let q = supabase.from('lockers').select('*');
    if (params?.type) q = q.eq('locker_type', params.type);
    if (params?.status) q = q.eq('status', params.status);
    if (params?.q) q = q.or(`locker_number.ilike.%${params.q}%,user_name.ilike.%${params.q}%`);
    return throwIfError(await q.order('locker_number')) as Locker[];
  },

  createLocker: async (data: Partial<Locker>) => {
    const row = throwIfError(
      await supabase
        .from('lockers')
        .insert({
          locker_number: data.locker_number,
          locker_type: data.locker_type || '기타',
          user_name: data.user_name,
          contact: data.contact,
          start_date: data.start_date || null,
          end_date: data.end_date || null,
          status: data.status || '대기',
          remarks: data.remarks,
        })
        .select('id')
        .single()
    );
    return { id: row!.id };
  },

  updateLocker: async (id: number, data: Partial<Locker>) => {
    throwIfError(
      await supabase
        .from('lockers')
        .update({
          locker_number: data.locker_number,
          locker_type: data.locker_type,
          user_name: data.user_name,
          contact: data.contact,
          start_date: data.start_date || null,
          end_date: data.end_date || null,
          status: data.status,
          remarks: data.remarks,
        })
        .eq('id', id)
    );
    return { ok: true };
  },

  deleteLocker: async (id: number) => {
    throwIfError(await supabase.from('lockers').delete().eq('id', id));
    return { ok: true };
  },

  getFees: async () => throwIfError(await supabase.from('fee_settings').select('*')) as FeeSetting[],

  putFees: async (body: { fees: FeeSetting[]; shoe_fee?: number }) => {
    const { fees, shoe_fee } = body;
    if (shoe_fee !== undefined) {
      const all = throwIfError(await supabase.from('fee_settings').select('id'));
      for (const f of all || []) {
        await supabase.from('fee_settings').update({ shoe_fee }).eq('id', f.id);
      }
    }
    for (const f of fees || []) {
      if (!f.name?.trim()) {
        if (f.id) await supabase.from('fee_settings').delete().eq('id', f.id);
        continue;
      }
      const row = {
        name: f.name,
        payment_type: f.payment_type,
        game_count: f.game_count,
        pricing: f.pricing || {},
      };
      if (f.id) {
        await supabase.from('fee_settings').update(row).eq('id', f.id);
      } else {
        await supabase.from('fee_settings').insert({ ...row, shoe_fee: shoe_fee ?? 1000 });
      }
    }
    return { ok: true };
  },

  getClosing: async (date?: string) => {
    const d = date || (await getBusinessDate());
    const settlements = throwIfError(
      await supabase.from('settlements').select('*').eq('business_date', d).order('id')
    ) as Settlement[];

    const summaryMap: Record<
      string,
      { category: string; qty: number; total_fee: number; cash: number; card: number }
    > = {};
    for (const s of settlements) {
      const cat = s.category || '기타';
      if (!summaryMap[cat]) summaryMap[cat] = { category: cat, qty: 0, total_fee: 0, cash: 0, card: 0 };
      summaryMap[cat].qty += s.game_count || 0;
      summaryMap[cat].total_fee += s.fee || 0;
      summaryMap[cat].cash += s.cash_amount || 0;
      summaryMap[cat].card += s.card_amount || 0;
    }

    const hourlyMap: Record<string, { hour: string; users: number; games: number; fee: number }> = {};
    for (const s of settlements) {
      if (!s.game_start) continue;
      const hour =
        new Date(s.game_start).getHours().toString().padStart(2, '0') + ':00';
      if (!hourlyMap[hour]) hourlyMap[hour] = { hour, users: 0, games: 0, fee: 0 };
      hourlyMap[hour].users += 1;
      hourlyMap[hour].games += s.game_count || 0;
      hourlyMap[hour].fee += s.fee || 0;
    }

    const { data: closed } = await supabase
      .from('daily_closings')
      .select('*')
      .eq('business_date', d)
      .maybeSingle();

    return {
      date: d,
      settlements,
      summary: Object.values(summaryMap),
      hourly: Object.values(hourlyMap),
      closed: closed || null,
    } as ClosingData;
  },

  postClosing: async (date?: string) => {
    const d = date || (await getBusinessDate());
    const settlements = throwIfError(
      await supabase.from('settlements').select('cash_amount, card_amount').eq('business_date', d)
    );
    const cash = (settlements || []).reduce((a, s) => a + (s.cash_amount || 0), 0);
    const card = (settlements || []).reduce((a, s) => a + (s.card_amount || 0), 0);

    throwIfError(
      await supabase.from('daily_closings').upsert(
        {
          business_date: d,
          closed_at: new Date().toISOString(),
          total_cash: cash,
          total_card: card,
        },
        { onConflict: 'business_date' }
      )
    );

    const next = new Date(d);
    next.setDate(next.getDate() + 1);
    const nextStr = next.toISOString().slice(0, 10);
    const { data: exists } = await supabase.from('business_days').select('id').eq('date', nextStr).maybeSingle();
    if (!exists) {
      await supabase.from('business_days').insert({ date: nextStr, day_type: '평일' });
    }
    return { ok: true, nextDate: nextStr };
  },

  getClosingStats: async () => {
    const closings = throwIfError(await supabase.from('daily_closings').select('*'));
    const monthlyMap: Record<string, number> = {};
    for (const c of closings || []) {
      const month = String(c.business_date).slice(0, 7);
      monthlyMap[month] = (monthlyMap[month] || 0) + (c.total_cash || 0) + (c.total_card || 0);
    }
    const monthly = Object.entries(monthlyMap)
      .map(([month, amount]) => ({ month, amount }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-6);

    const settlements = throwIfError(
      await supabase.from('settlements').select('category, fee, game_count')
    );
    const catMap: Record<string, { category: string; amount: number; games: number }> = {};
    for (const s of settlements || []) {
      const cat = s.category || '기타';
      if (!catMap[cat]) catMap[cat] = { category: cat, amount: 0, games: 0 };
      catMap[cat].amount += s.fee || 0;
      catMap[cat].games += s.game_count || 0;
    }
    return { monthly, byCategory: Object.values(catMap) } as ClosingStats;
  },

  getMembers: async (q?: string) => {
    let query = supabase.from('members').select('*, clubs(name)');
    if (q) query = query.ilike('name', `%${q}%`);
    const rows = throwIfError(await query.order('id', { ascending: false }));
    return (rows || []).map((m) => {
      const { clubs, ...rest } = m as Member & { clubs?: { name?: string } | null };
      return { ...rest, club_name: clubs?.name ?? null };
    });
  },

  createMember: async (data: Partial<Member>) => {
    const row = throwIfError(
      await supabase
        .from('members')
        .insert({
          name: data.name,
          category: data.category || '일반',
          contact: data.contact,
          club_id: data.club_id || null,
          remarks: data.remarks,
        })
        .select('id')
        .single()
    );
    return { id: row!.id };
  },

  updateMember: async (id: number, data: Partial<Member>) => {
    throwIfError(
      await supabase
        .from('members')
        .update({
          name: data.name,
          category: data.category,
          contact: data.contact,
          club_id: data.club_id || null,
          remarks: data.remarks,
        })
        .eq('id', id)
    );
    return { ok: true };
  },

  deleteMember: async (id: number) => {
    throwIfError(await supabase.from('members').delete().eq('id', id));
    return { ok: true };
  },

  getMemberStats: async (month?: string) => {
    const m = month || new Date().toISOString().slice(0, 7);
    const { start, end } = monthRange(m);
    const settlements = throwIfError(
      await supabase
        .from('settlements')
        .select('player_name, game_count, fee')
        .gte('business_date', start)
        .lte('business_date', end)
    );
    const map: Record<string, MemberStat> = {};
    for (const s of settlements || []) {
      const name = s.player_name || '미상';
      if (!map[name]) map[name] = { name, game_count: 0, game_fee: 0 };
      map[name].game_count += s.game_count || 0;
      map[name].game_fee += s.fee || 0;
    }
    return Object.values(map).sort((a, b) => b.game_count - a.game_count).slice(0, 50);
  },

  searchMembers: async (q: string) =>
    throwIfError(
      await supabase.from('members').select('id, name, category').ilike('name', `%${q}%`).limit(10)
    ) as { id: number; name: string; category: string }[],

  getClubs: async (q?: string) => {
    let query = supabase.from('clubs').select('*');
    if (q) query = query.ilike('name', `%${q}%`);
    const clubs = throwIfError(await query.order('id'));
    const members = throwIfError(await supabase.from('members').select('club_id'));
    const counts: Record<number, number> = {};
    for (const m of members || []) {
      if (m.club_id) counts[m.club_id] = (counts[m.club_id] || 0) + 1;
    }
    return (clubs || []).map((c) => ({ ...c, member_count: counts[c.id] || 0 })) as Club[];
  },

  createClub: async (data: Partial<Club>) => {
    const row = throwIfError(
      await supabase.from('clubs').insert({ name: data.name, remarks: data.remarks }).select('id').single()
    );
    return { id: row!.id };
  },

  updateClub: async (id: number, data: Partial<Club>) => {
    throwIfError(
      await supabase.from('clubs').update({ name: data.name, remarks: data.remarks }).eq('id', id)
    );
    return { ok: true };
  },

  deleteClub: async (id: number) => {
    throwIfError(await supabase.from('clubs').delete().eq('id', id));
    return { ok: true };
  },

  getClubStats: async (month?: string) => {
    const m = month || new Date().toISOString().slice(0, 7);
    const { start, end } = monthRange(m);
    const settlements = throwIfError(
      await supabase
        .from('settlements')
        .select('player_name, game_count, fee')
        .gte('business_date', start)
        .lte('business_date', end)
    );
    const members = throwIfError(await supabase.from('members').select('name, club_id'));
    const clubs = throwIfError(await supabase.from('clubs').select('id, name'));
    const nameToClub: Record<string, number> = {};
    for (const mb of members || []) {
      if (mb.club_id) nameToClub[mb.name] = mb.club_id;
    }
    const clubNames = Object.fromEntries((clubs || []).map((c) => [c.id, c.name]));
    const map: Record<number, ClubStat> = {};
    for (const s of settlements || []) {
      const clubId = nameToClub[s.player_name];
      if (!clubId) continue;
      const club_name = clubNames[clubId];
      if (!map[clubId]) map[clubId] = { club_name, game_count: 0, game_fee: 0 };
      map[clubId].game_count += s.game_count || 0;
      map[clubId].game_fee += s.fee || 0;
    }
    return Object.values(map).sort((a, b) => b.game_count - a.game_count);
  },

  getTournaments: async () =>
    throwIfError(await supabase.from('tournaments').select('*').order('id', { ascending: false })) as Tournament[],

  createTournament: async (data: Partial<Tournament>) => {
    const row = throwIfError(
      await supabase
        .from('tournaments')
        .insert({
          name: data.name,
          type: data.type,
          round_num: data.round_num,
          game_count: data.game_count,
          participant_count: data.participant_count,
          lane_from: data.lane_from,
          lane_to: data.lane_to,
          lane_movement: data.lane_movement,
          status: data.status || 'draft',
        })
        .select('id')
        .single()
    );
    return { id: row!.id };
  },

  updateTournament: async (id: number, data: Partial<Tournament>) => {
    throwIfError(
      await supabase
        .from('tournaments')
        .update({
          name: data.name,
          type: data.type,
          round_num: data.round_num,
          game_count: data.game_count,
          participant_count: data.participant_count,
          lane_from: data.lane_from,
          lane_to: data.lane_to,
          lane_movement: data.lane_movement,
          status: data.status,
        })
        .eq('id', id)
    );
    return { ok: true };
  },

  getParticipants: async (id: number) =>
    throwIfError(
      await supabase
        .from('tournament_participants')
        .select('*')
        .eq('tournament_id', id)
        .order('id')
    ) as TournamentParticipant[],

  saveParticipants: async (id: number, participants: TournamentParticipant[]) => {
    await supabase.from('tournament_participants').delete().eq('tournament_id', id);
    const rows = participants.map((p) => ({
      tournament_id: id,
      name: p.name,
      handicap: p.handicap || 0,
      team_name: p.team_name,
      lane_order: p.lane_order,
      scores: p.scores || [],
    }));
    if (rows.length) throwIfError(await supabase.from('tournament_participants').insert(rows));
    return { ok: true };
  },

  assignLanes: async (id: number) => {
    const { data: t, error } = await supabase.from('tournaments').select('*').eq('id', id).single();
    if (error || !t) throw new Error('대회를 찾을 수 없습니다');
    const parts = throwIfError(
      await supabase.from('tournament_participants').select('*').eq('tournament_id', id)
    );
    await supabase.from('tournaments').update({ status: 'active' }).eq('id', id);
    let lane = t.lane_from;
    for (const p of parts || []) {
      await supabase
        .from('lanes')
        .update({ status: 'active', competition_mode: 1, game_type: '대회' })
        .eq('id', lane);
      await supabase.from('lane_players').insert({
        lane_id: lane,
        name: p.name,
        player_type: '일반',
        sort_order: 0,
      });
      lane++;
      if (lane > t.lane_to) lane = t.lane_from;
    }
    return { ok: true };
  },

  endCompetition: async () => {
    await supabase.from('lanes').update({ competition_mode: 0, game_type: '일반' }).eq('competition_mode', 1);
    await supabase.from('tournaments').update({ status: 'completed' }).eq('status', 'active');
    return { ok: true };
  },

  getSettings: async () => {
    const rows = throwIfError(await supabase.from('settings').select('key, value'));
    return Object.fromEntries((rows || []).map((r) => [r.key, r.value]));
  },

  putSettings: async (data: Record<string, string>) => {
    const rows = Object.entries(data).map(([key, value]) => ({ key, value: String(value) }));
    throwIfError(await supabase.from('settings').upsert(rows, { onConflict: 'key' }));
    return { ok: true };
  },

  getNotices: async () =>
    (throwIfError(await supabase.from('notices').select('*').order('sort_order')) || []) as {
      id: number;
      content: string;
    }[],

  putNotices: async (notices: string[]) => {
    const existing = throwIfError(await supabase.from('notices').select('id'));
    if (existing?.length) {
      throwIfError(
        await supabase.from('notices').delete().in(
          'id',
          existing.map((r) => r.id)
        )
      );
    }
    const rows = notices.map((content, i) => ({ content, sort_order: i }));
    if (rows.length) throwIfError(await supabase.from('notices').insert(rows));
    return { ok: true };
  },
};

export interface BusinessDay {
  date: string;
  day_type: string;
  am_start: string;
  pm_start: string;
  night_start: string;
}

export interface LanePlayer {
  id: number;
  lane_id: number;
  name: string;
  player_type: string;
  shoe_rental: number;
  game_count: number;
  settled: number;
  sort_order: number;
}

export interface Lane {
  id: number;
  status: 'waiting' | 'active' | 'paused';
  game_type: string;
  power_on: number;
  score_mode: string;
  collapsed: number;
  competition_mode: number;
  players: LanePlayer[];
}

export interface Locker {
  id: number;
  locker_number: string;
  locker_type: string;
  user_name: string;
  contact: string;
  start_date: string;
  end_date: string;
  status: string;
  remarks: string;
}

export interface FeeSetting {
  id?: number;
  name: string;
  payment_type: string;
  game_count: number;
  shoe_fee?: number;
  pricing: {
    weekday: { morning: number; afternoon: number; night: number };
    weekend: { morning: number; afternoon: number; night: number };
    special: { morning: number; afternoon: number; night: number };
  };
}

export interface ClosingData {
  date: string;
  settlements: Settlement[];
  summary: { category: string; qty: number; total_fee: number; cash: number; card: number }[];
  hourly: { hour: string; users: number; games: number; fee: number }[];
  closed: { business_date: string; closed_at: string } | null;
}

export interface Settlement {
  id: number;
  business_date: string;
  lane_id: number;
  player_name: string;
  category: string;
  game_count: number;
  shoe_rental: number;
  fee: number;
  card_payment: number;
  cash_amount?: number;
  card_amount?: number;
  game_start?: string;
}

export interface ClosingStats {
  monthly: { month: string; amount: number }[];
  byCategory: { category: string; amount: number; games: number }[];
}

export interface Member {
  id: number;
  name: string;
  category: string;
  contact: string;
  club_id: number | null;
  club_name?: string | null;
  remarks: string;
  created_at: string;
}

export interface MemberStat {
  name: string;
  game_count: number;
  game_fee: number;
}

export interface Club {
  id: number;
  name: string;
  remarks: string;
  member_count: number;
  created_at: string;
}

export interface ClubStat {
  club_name: string;
  game_count: number;
  game_fee: number;
}

export interface Tournament {
  id: number;
  name: string;
  type: string;
  round_num: number;
  game_count: number;
  participant_count: number;
  lane_from: number;
  lane_to: number;
  lane_movement: string;
  status: string;
}

export interface TournamentParticipant {
  id?: number;
  name: string;
  handicap: number;
  team_name: string;
  lane_order: number;
  scores: number[];
}
