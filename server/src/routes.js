import { supabase, assertSupabase } from './supabase.js';

async function getBusinessDate() {
  const { data } = await supabase
    .from('business_days')
    .select('date')
    .order('date', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (data?.date) return String(data.date).slice(0, 10);
  return new Date().toISOString().slice(0, 10);
}

async function calcFee(playerType, gameCount, shoeRental) {
  const { data: fee } = await supabase
    .from('fee_settings')
    .select('*')
    .eq('name', playerType)
    .maybeSingle();
  if (!fee) return { gameFee: gameCount * 6000, shoeFee: shoeRental ? 1000 : 0 };
  const pricing = fee.pricing || {};
  const p = pricing.weekday?.afternoon ?? 6000;
  const gameFee = fee.payment_type === '선불' ? p : gameCount * p;
  return { gameFee, shoeFee: shoeRental ? fee.shoe_fee : 0 };
}

function wrap(fn) {
  return async (req, res) => {
    try {
      await fn(req, res);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: e.message || 'Server error' });
    }
  };
}

function monthRange(month) {
  const [y, m] = month.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  return { start: `${month}-01`, end: `${month}-${String(last).padStart(2, '0')}` };
}

export function registerRoutes(app) {
  app.get(
    '/api/health',
    wrap(async (_, res) => {
      const ok = !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
      res.json({ ok, supabase: ok });
    })
  );

  app.get(
    '/api/business-day',
    wrap(async (_, res) => {
      const date = await getBusinessDate();
      const { data: row } = await supabase.from('business_days').select('*').eq('date', date).maybeSingle();
      res.json(
        row || { date, day_type: '평일', am_start: '09:00', pm_start: '14:00', night_start: '18:00' }
      );
    })
  );

  app.put(
    '/api/business-day',
    wrap(async (req, res) => {
      const { date, day_type, am_start, pm_start, night_start } = req.body;
      assertSupabase(
        await supabase.from('business_days').upsert(
          { date, day_type, am_start, pm_start, night_start },
          { onConflict: 'date' }
        )
      );
      res.json({ ok: true });
    })
  );

  app.get(
    '/api/lanes',
    wrap(async (_, res) => {
      const lanes = assertSupabase(await supabase.from('lanes').select('*').order('id'));
      const players = assertSupabase(
        await supabase.from('lane_players').select('*').order('lane_id').order('sort_order')
      );
      const byLane = {};
      for (const p of players) {
        if (!byLane[p.lane_id]) byLane[p.lane_id] = [];
        byLane[p.lane_id].push(p);
      }
      res.json(lanes.map((l) => ({ ...l, players: byLane[l.id] || [] })));
    })
  );

  app.patch(
    '/api/lanes/:id',
    wrap(async (req, res) => {
      const id = +req.params.id;
      const fields = ['status', 'game_type', 'power_on', 'score_mode', 'collapsed', 'competition_mode'];
      const patch = {};
      for (const f of fields) {
        if (req.body[f] !== undefined) patch[f] = req.body[f];
      }
      if (Object.keys(patch).length) {
        assertSupabase(await supabase.from('lanes').update(patch).eq('id', id));
      }
      res.json({ ok: true });
    })
  );

  app.post(
    '/api/lanes/:id/players',
    wrap(async (req, res) => {
      const laneId = +req.params.id;
      const { count } = await supabase
        .from('lane_players')
        .select('*', { count: 'exact', head: true })
        .eq('lane_id', laneId);
      if ((count ?? 0) >= 6) return res.status(400).json({ error: '레인당 최대 6명' });

      const { data: lane } = await supabase.from('lanes').select('*').eq('id', laneId).single();
      const row = assertSupabase(
        await supabase
          .from('lane_players')
          .insert({
            lane_id: laneId,
            name: req.body.name || '게스트',
            player_type: req.body.player_type || '일반',
            shoe_rental: req.body.shoe_rental ? 1 : 0,
            sort_order: count ?? 0,
          })
          .select('id')
          .single()
      );

      if (lane?.status === 'waiting') {
        await supabase.from('lanes').update({ status: 'active', power_on: 1 }).eq('id', laneId);
      }
      res.json({ id: row.id });
    })
  );

  app.patch(
    '/api/lanes/:laneId/players/:playerId',
    wrap(async (req, res) => {
      const { name, player_type, shoe_rental, game_count, settled } = req.body;
      const patch = {};
      if (name !== undefined) patch.name = name;
      if (player_type !== undefined) patch.player_type = player_type;
      if (shoe_rental !== undefined) patch.shoe_rental = shoe_rental ? 1 : 0;
      if (game_count !== undefined) patch.game_count = game_count;
      if (settled !== undefined) patch.settled = settled ? 1 : 0;
      if (Object.keys(patch).length) {
        assertSupabase(
          await supabase.from('lane_players').update(patch).eq('id', +req.params.playerId)
        );
      }
      res.json({ ok: true });
    })
  );

  app.delete(
    '/api/lanes/:laneId/players/:playerId',
    wrap(async (req, res) => {
      const laneId = +req.params.laneId;
      assertSupabase(await supabase.from('lane_players').delete().eq('id', +req.params.playerId));
      const { count } = await supabase
        .from('lane_players')
        .select('*', { count: 'exact', head: true })
        .eq('lane_id', laneId);
      if (!count) {
        await supabase.from('lanes').update({ status: 'waiting', power_on: 0 }).eq('id', laneId);
      }
      res.json({ ok: true });
    })
  );

  app.post(
    '/api/lanes/:id/end-game',
    wrap(async (req, res) => {
      const laneId = +req.params.id;
      const players = assertSupabase(
        await supabase.from('lane_players').select('*').eq('lane_id', laneId)
      );
      const date = await getBusinessDate();
      const inserts = [];
      for (const p of players) {
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
      if (inserts.length) assertSupabase(await supabase.from('settlements').insert(inserts));
      await supabase.from('lane_players').delete().eq('lane_id', laneId);
      await supabase.from('lanes').update({ status: 'waiting', power_on: 0 }).eq('id', laneId);
      res.json({ ok: true });
    })
  );

  app.post(
    '/api/lanes/bulk',
    wrap(async (req, res) => {
      const { laneIds, action, payload } = req.body;
      for (const id of laneIds) {
        if (action === 'assign') {
          await supabase
            .from('lanes')
            .update({ status: 'active', game_type: payload?.game_type || '일반', power_on: 1 })
            .eq('id', id);
          if (payload?.player_count) {
            const rows = [];
            for (let i = 0; i < Math.min(payload.player_count, 6); i++) {
              rows.push({
                lane_id: id,
                name: `게스트${i + 1}`,
                player_type: payload?.player_type || '일반',
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
      res.json({ ok: true });
    })
  );

  app.get(
    '/api/lockers',
    wrap(async (req, res) => {
      let q = supabase.from('lockers').select('*');
      if (req.query.type) q = q.eq('locker_type', req.query.type);
      if (req.query.status) q = q.eq('status', req.query.status);
      if (req.query.q) q = q.or(`locker_number.ilike.%${req.query.q}%,user_name.ilike.%${req.query.q}%`);
      res.json(assertSupabase(await q.order('locker_number')));
    })
  );

  app.post(
    '/api/lockers',
    wrap(async (req, res) => {
      const row = assertSupabase(
        await supabase
          .from('lockers')
          .insert({
            locker_number: req.body.locker_number,
            locker_type: req.body.locker_type || '기타',
            user_name: req.body.user_name,
            contact: req.body.contact,
            start_date: req.body.start_date || null,
            end_date: req.body.end_date || null,
            status: req.body.status || '대기',
            remarks: req.body.remarks,
          })
          .select('id')
          .single()
      );
      res.json({ id: row.id });
    })
  );

  app.put(
    '/api/lockers/:id',
    wrap(async (req, res) => {
      const b = req.body;
      assertSupabase(
        await supabase
          .from('lockers')
          .update({
            locker_number: b.locker_number,
            locker_type: b.locker_type,
            user_name: b.user_name,
            contact: b.contact,
            start_date: b.start_date || null,
            end_date: b.end_date || null,
            status: b.status,
            remarks: b.remarks,
          })
          .eq('id', +req.params.id)
      );
      res.json({ ok: true });
    })
  );

  app.delete(
    '/api/lockers/:id',
    wrap(async (req, res) => {
      assertSupabase(await supabase.from('lockers').delete().eq('id', +req.params.id));
      res.json({ ok: true });
    })
  );

  app.get(
    '/api/fees',
    wrap(async (_, res) => {
      const rows = assertSupabase(await supabase.from('fee_settings').select('*'));
      res.json(rows);
    })
  );

  app.put(
    '/api/fees',
    wrap(async (req, res) => {
      const { fees, shoe_fee } = req.body;
      if (shoe_fee !== undefined) {
        const all = assertSupabase(await supabase.from('fee_settings').select('id'));
        for (const f of all) {
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
      res.json({ ok: true });
    })
  );

  app.get(
    '/api/closing',
    wrap(async (req, res) => {
      const date = req.query.date || (await getBusinessDate());
      const settlements = assertSupabase(
        await supabase.from('settlements').select('*').eq('business_date', date).order('id')
      );

      const summaryMap = {};
      for (const s of settlements) {
        const cat = s.category || '기타';
        if (!summaryMap[cat]) summaryMap[cat] = { category: cat, qty: 0, total_fee: 0, cash: 0, card: 0 };
        summaryMap[cat].qty += s.game_count || 0;
        summaryMap[cat].total_fee += s.fee || 0;
        summaryMap[cat].cash += s.cash_amount || 0;
        summaryMap[cat].card += s.card_amount || 0;
      }

      const hourlyMap = {};
      for (const s of settlements) {
        if (!s.game_start) continue;
        const hour = new Date(s.game_start).getHours().toString().padStart(2, '0') + ':00';
        if (!hourlyMap[hour]) hourlyMap[hour] = { hour, users: 0, games: 0, fee: 0 };
        hourlyMap[hour].users += 1;
        hourlyMap[hour].games += s.game_count || 0;
        hourlyMap[hour].fee += s.fee || 0;
      }

      const { data: closed } = await supabase
        .from('daily_closings')
        .select('*')
        .eq('business_date', date)
        .maybeSingle();

      res.json({
        date,
        settlements,
        summary: Object.values(summaryMap),
        hourly: Object.values(hourlyMap),
        closed: closed || null,
      });
    })
  );

  app.post(
    '/api/closing',
    wrap(async (req, res) => {
      const date = req.body.date || (await getBusinessDate());
      const settlements = assertSupabase(
        await supabase.from('settlements').select('cash_amount, card_amount').eq('business_date', date)
      );
      const cash = settlements.reduce((a, s) => a + (s.cash_amount || 0), 0);
      const card = settlements.reduce((a, s) => a + (s.card_amount || 0), 0);

      assertSupabase(
        await supabase.from('daily_closings').upsert(
          {
            business_date: date,
            closed_at: new Date().toISOString(),
            total_cash: cash,
            total_card: card,
          },
          { onConflict: 'business_date' }
        )
      );

      const next = new Date(date);
      next.setDate(next.getDate() + 1);
      const nextStr = next.toISOString().slice(0, 10);
      const { data: exists } = await supabase.from('business_days').select('id').eq('date', nextStr).maybeSingle();
      if (!exists) {
        await supabase.from('business_days').insert({ date: nextStr, day_type: '평일' });
      }
      res.json({ ok: true, nextDate: nextStr });
    })
  );

  app.get(
    '/api/closing/stats',
    wrap(async (_, res) => {
      const closings = assertSupabase(await supabase.from('daily_closings').select('*'));
      const monthlyMap = {};
      for (const c of closings) {
        const month = String(c.business_date).slice(0, 7);
        monthlyMap[month] = (monthlyMap[month] || 0) + (c.total_cash || 0) + (c.total_card || 0);
      }
      const monthly = Object.entries(monthlyMap)
        .map(([month, amount]) => ({ month, amount }))
        .sort((a, b) => a.month.localeCompare(b.month))
        .slice(-6);

      const settlements = assertSupabase(await supabase.from('settlements').select('category, fee, game_count'));
      const catMap = {};
      for (const s of settlements) {
        const cat = s.category || '기타';
        if (!catMap[cat]) catMap[cat] = { category: cat, amount: 0, games: 0 };
        catMap[cat].amount += s.fee || 0;
        catMap[cat].games += s.game_count || 0;
      }

      res.json({ monthly, byCategory: Object.values(catMap) });
    })
  );

  app.get(
    '/api/members',
    wrap(async (req, res) => {
      let q = supabase.from('members').select('*, clubs(name)');
      if (req.query.q) {
        q = q.ilike('name', `%${req.query.q}%`);
      }
      const rows = assertSupabase(await q.order('id', { ascending: false }));
      res.json(
        rows.map((m) => ({
          ...m,
          club_name: m.clubs?.name ?? null,
          clubs: undefined,
        }))
      );
    })
  );

  app.post(
    '/api/members',
    wrap(async (req, res) => {
      const b = req.body;
      const row = assertSupabase(
        await supabase
          .from('members')
          .insert({
            name: b.name,
            category: b.category || '일반',
            contact: b.contact,
            club_id: b.club_id || null,
            remarks: b.remarks,
          })
          .select('id')
          .single()
      );
      res.json({ id: row.id });
    })
  );

  app.put(
    '/api/members/:id',
    wrap(async (req, res) => {
      const b = req.body;
      assertSupabase(
        await supabase
          .from('members')
          .update({
            name: b.name,
            category: b.category,
            contact: b.contact,
            club_id: b.club_id || null,
            remarks: b.remarks,
          })
          .eq('id', +req.params.id)
      );
      res.json({ ok: true });
    })
  );

  app.delete(
    '/api/members/:id',
    wrap(async (req, res) => {
      assertSupabase(await supabase.from('members').delete().eq('id', +req.params.id));
      res.json({ ok: true });
    })
  );

  app.get(
    '/api/members/stats',
    wrap(async (req, res) => {
      const month = req.query.month || new Date().toISOString().slice(0, 7);
      const { start, end } = monthRange(month);
      const settlements = assertSupabase(
        await supabase
          .from('settlements')
          .select('player_name, game_count, fee')
          .gte('business_date', start)
          .lte('business_date', end)
      );
      const map = {};
      for (const s of settlements) {
        const name = s.player_name || '미상';
        if (!map[name]) map[name] = { name, game_count: 0, game_fee: 0 };
        map[name].game_count += s.game_count || 0;
        map[name].game_fee += s.fee || 0;
      }
      res.json(
        Object.values(map).sort((a, b) => b.game_count - a.game_count).slice(0, 50)
      );
    })
  );

  app.get(
    '/api/members/search',
    wrap(async (req, res) => {
      const q = req.query.q || '';
      const rows = assertSupabase(
        await supabase
          .from('members')
          .select('id, name, category')
          .ilike('name', `%${q}%`)
          .limit(10)
      );
      res.json(rows);
    })
  );

  app.get(
    '/api/clubs',
    wrap(async (req, res) => {
      let q = supabase.from('clubs').select('*');
      if (req.query.q) q = q.ilike('name', `%${req.query.q}%`);
      const clubs = assertSupabase(await q.order('id'));
      const members = assertSupabase(await supabase.from('members').select('club_id'));
      const counts = {};
      for (const m of members) {
        if (m.club_id) counts[m.club_id] = (counts[m.club_id] || 0) + 1;
      }
      res.json(clubs.map((c) => ({ ...c, member_count: counts[c.id] || 0 })));
    })
  );

  app.post(
    '/api/clubs',
    wrap(async (req, res) => {
      const row = assertSupabase(
        await supabase
          .from('clubs')
          .insert({ name: req.body.name, remarks: req.body.remarks })
          .select('id')
          .single()
      );
      res.json({ id: row.id });
    })
  );

  app.put(
    '/api/clubs/:id',
    wrap(async (req, res) => {
      assertSupabase(
        await supabase
          .from('clubs')
          .update({ name: req.body.name, remarks: req.body.remarks })
          .eq('id', +req.params.id)
      );
      res.json({ ok: true });
    })
  );

  app.delete(
    '/api/clubs/:id',
    wrap(async (req, res) => {
      assertSupabase(await supabase.from('clubs').delete().eq('id', +req.params.id));
      res.json({ ok: true });
    })
  );

  app.get(
    '/api/clubs/stats',
    wrap(async (req, res) => {
      const month = req.query.month || new Date().toISOString().slice(0, 7);
      const { start, end } = monthRange(month);
      const settlements = assertSupabase(
        await supabase
          .from('settlements')
          .select('player_name, game_count, fee')
          .gte('business_date', start)
          .lte('business_date', end)
      );
      const members = assertSupabase(await supabase.from('members').select('name, club_id'));
      const clubs = assertSupabase(await supabase.from('clubs').select('id, name'));
      const nameToClub = {};
      for (const m of members) {
        if (m.club_id) nameToClub[m.name] = m.club_id;
      }
      const clubNames = Object.fromEntries(clubs.map((c) => [c.id, c.name]));
      const map = {};
      for (const s of settlements) {
        const clubId = nameToClub[s.player_name];
        if (!clubId) continue;
        const club_name = clubNames[clubId];
        if (!map[clubId]) map[clubId] = { club_name, game_count: 0, game_fee: 0 };
        map[clubId].game_count += s.game_count || 0;
        map[clubId].game_fee += s.fee || 0;
      }
      res.json(Object.values(map).sort((a, b) => b.game_count - a.game_count));
    })
  );

  app.get(
    '/api/tournaments',
    wrap(async (_, res) => {
      res.json(assertSupabase(await supabase.from('tournaments').select('*').order('id', { ascending: false })));
    })
  );

  app.post(
    '/api/tournaments',
    wrap(async (req, res) => {
      const b = req.body;
      const row = assertSupabase(
        await supabase
          .from('tournaments')
          .insert({
            name: b.name,
            type: b.type,
            round_num: b.round_num,
            game_count: b.game_count,
            participant_count: b.participant_count,
            lane_from: b.lane_from,
            lane_to: b.lane_to,
            lane_movement: b.lane_movement,
            status: b.status || 'draft',
          })
          .select('id')
          .single()
      );
      res.json({ id: row.id });
    })
  );

  app.put(
    '/api/tournaments/:id',
    wrap(async (req, res) => {
      const b = req.body;
      assertSupabase(
        await supabase
          .from('tournaments')
          .update({
            name: b.name,
            type: b.type,
            round_num: b.round_num,
            game_count: b.game_count,
            participant_count: b.participant_count,
            lane_from: b.lane_from,
            lane_to: b.lane_to,
            lane_movement: b.lane_movement,
            status: b.status,
          })
          .eq('id', +req.params.id)
      );
      res.json({ ok: true });
    })
  );

  app.get(
    '/api/tournaments/:id/participants',
    wrap(async (req, res) => {
      const rows = assertSupabase(
        await supabase
          .from('tournament_participants')
          .select('*')
          .eq('tournament_id', +req.params.id)
          .order('id')
      );
      res.json(rows);
    })
  );

  app.post(
    '/api/tournaments/:id/participants',
    wrap(async (req, res) => {
      const tid = +req.params.id;
      await supabase.from('tournament_participants').delete().eq('tournament_id', tid);
      const rows = (req.body.participants || []).map((p) => ({
        tournament_id: tid,
        name: p.name,
        handicap: p.handicap || 0,
        team_name: p.team_name,
        lane_order: p.lane_order,
        scores: p.scores || [],
      }));
      if (rows.length) assertSupabase(await supabase.from('tournament_participants').insert(rows));
      res.json({ ok: true });
    })
  );

  app.post(
    '/api/tournaments/:id/assign-lanes',
    wrap(async (req, res) => {
      const tid = +req.params.id;
      const { data: t } = await supabase.from('tournaments').select('*').eq('id', tid).single();
      if (!t) throw new Error('Tournament not found');
      const parts = assertSupabase(
        await supabase.from('tournament_participants').select('*').eq('tournament_id', tid)
      );
      await supabase.from('tournaments').update({ status: 'active' }).eq('id', tid);
      let lane = t.lane_from;
      for (const p of parts) {
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
      res.json({ ok: true });
    })
  );

  app.post(
    '/api/tournaments/end-competition',
    wrap(async (_, res) => {
      await supabase.from('lanes').update({ competition_mode: 0, game_type: '일반' }).eq('competition_mode', 1);
      await supabase.from('tournaments').update({ status: 'completed' }).eq('status', 'active');
      res.json({ ok: true });
    })
  );

  app.get(
    '/api/settings',
    wrap(async (_, res) => {
      const rows = assertSupabase(await supabase.from('settings').select('key, value'));
      res.json(Object.fromEntries(rows.map((r) => [r.key, r.value])));
    })
  );

  app.put(
    '/api/settings',
    wrap(async (req, res) => {
      const rows = Object.entries(req.body).map(([key, value]) => ({ key, value: String(value) }));
      assertSupabase(await supabase.from('settings').upsert(rows, { onConflict: 'key' }));
      res.json({ ok: true });
    })
  );

  app.get(
    '/api/notices',
    wrap(async (_, res) => {
      res.json(assertSupabase(await supabase.from('notices').select('*').order('sort_order')));
    })
  );

  app.put(
    '/api/notices',
    wrap(async (req, res) => {
      await supabase.from('notices').delete().gte('id', 0);
      const rows = (req.body.notices || []).map((content, i) => ({ content, sort_order: i }));
      if (rows.length) assertSupabase(await supabase.from('notices').insert(rows));
      res.json({ ok: true });
    })
  );
}
