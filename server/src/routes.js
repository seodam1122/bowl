import { db } from './db.js';

function getBusinessDate() {
  const row = db.prepare('SELECT date FROM business_days ORDER BY date DESC LIMIT 1').get();
  return row?.date || new Date().toISOString().slice(0, 10);
}

function calcFee(playerType, gameCount, shoeRental) {
  const fee = db.prepare('SELECT * FROM fee_settings WHERE name = ?').get(playerType);
  if (!fee) return { gameFee: gameCount * 6000, shoeFee: shoeRental ? 1000 : 0 };
  const pricing = JSON.parse(fee.pricing);
  const p = pricing.weekday?.afternoon ?? 6000;
  const gameFee = fee.payment_type === '선불' ? p : gameCount * p;
  return { gameFee, shoeFee: shoeRental ? fee.shoe_fee : 0 };
}

export function registerRoutes(app) {
  app.get('/api/health', (_, res) => res.json({ ok: true }));

  app.get('/api/business-day', (_, res) => {
    const date = getBusinessDate();
    const row = db.prepare('SELECT * FROM business_days WHERE date = ?').get(date);
    res.json(row || { date, day_type: '평일', am_start: '09:00', pm_start: '14:00', night_start: '18:00' });
  });

  app.put('/api/business-day', (req, res) => {
    const { date, day_type, am_start, pm_start, night_start } = req.body;
    db.prepare(
      `INSERT INTO business_days (date, day_type, am_start, pm_start, night_start)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(date) DO UPDATE SET day_type=excluded.day_type, am_start=excluded.am_start,
       pm_start=excluded.pm_start, night_start=excluded.night_start`
    ).run(date, day_type, am_start, pm_start, night_start);
    res.json({ ok: true });
  });

  app.get('/api/lanes', (_, res) => {
    const lanes = db.prepare('SELECT * FROM lanes ORDER BY id').all();
    const players = db.prepare('SELECT * FROM lane_players ORDER BY lane_id, sort_order').all();
    const byLane = {};
    for (const p of players) {
      if (!byLane[p.lane_id]) byLane[p.lane_id] = [];
      byLane[p.lane_id].push(p);
    }
    res.json(lanes.map((l) => ({ ...l, players: byLane[l.id] || [] })));
  });

  app.patch('/api/lanes/:id', (req, res) => {
    const id = +req.params.id;
    const fields = ['status', 'game_type', 'power_on', 'score_mode', 'collapsed', 'competition_mode'];
    const sets = [];
    const vals = [];
    for (const f of fields) {
      if (req.body[f] !== undefined) {
        sets.push(`${f} = ?`);
        vals.push(req.body[f]);
      }
    }
    if (sets.length) {
      vals.push(id);
      db.prepare(`UPDATE lanes SET ${sets.join(', ')} WHERE id = ?`).run(...vals);
    }
    res.json({ ok: true });
  });

  app.post('/api/lanes/:id/players', (req, res) => {
    const laneId = +req.params.id;
    const count = db.prepare('SELECT COUNT(*) as c FROM lane_players WHERE lane_id = ?').get(laneId).c;
    if (count >= 6) return res.status(400).json({ error: '레인당 최대 6명' });
    const lane = db.prepare('SELECT * FROM lanes WHERE id = ?').get(laneId);
    const r = db
      .prepare(
        'INSERT INTO lane_players (lane_id, name, player_type, shoe_rental, sort_order) VALUES (?, ?, ?, ?, ?)'
      )
      .run(laneId, req.body.name || '게스트', req.body.player_type || '일반', req.body.shoe_rental ? 1 : 0, count);
    if (lane.status === 'waiting') {
      db.prepare('UPDATE lanes SET status = ?, power_on = 1 WHERE id = ?').run('active', laneId);
    }
    res.json({ id: r.lastInsertRowid });
  });

  app.patch('/api/lanes/:laneId/players/:playerId', (req, res) => {
    const { name, player_type, shoe_rental, game_count, settled } = req.body;
    const sets = [];
    const vals = [];
    if (name !== undefined) { sets.push('name = ?'); vals.push(name); }
    if (player_type !== undefined) { sets.push('player_type = ?'); vals.push(player_type); }
    if (shoe_rental !== undefined) { sets.push('shoe_rental = ?'); vals.push(shoe_rental ? 1 : 0); }
    if (game_count !== undefined) { sets.push('game_count = ?'); vals.push(game_count); }
    if (settled !== undefined) { sets.push('settled = ?'); vals.push(settled ? 1 : 0); }
    if (sets.length) {
      vals.push(+req.params.playerId);
      db.prepare(`UPDATE lane_players SET ${sets.join(', ')} WHERE id = ?`).run(...vals);
    }
    res.json({ ok: true });
  });

  app.delete('/api/lanes/:laneId/players/:playerId', (req, res) => {
    db.prepare('DELETE FROM lane_players WHERE id = ?').run(+req.params.playerId);
    const laneId = +req.params.laneId;
    const remaining = db.prepare('SELECT COUNT(*) as c FROM lane_players WHERE lane_id = ?').get(laneId).c;
    if (remaining === 0) {
      db.prepare('UPDATE lanes SET status = ?, power_on = 0 WHERE id = ?').run('waiting', laneId);
    }
    res.json({ ok: true });
  });

  app.post('/api/lanes/:id/end-game', (req, res) => {
    const laneId = +req.params.id;
    const players = db.prepare('SELECT * FROM lane_players WHERE lane_id = ?').all(laneId);
    const date = getBusinessDate();
    for (const p of players) {
      if (p.game_count > 0) {
        const { gameFee, shoeFee } = calcFee(p.player_type, p.game_count, p.shoe_rental);
        db.prepare(
          `INSERT INTO settlements (business_date, lane_id, player_name, category, game_count, shoe_rental, fee, cash_amount)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(date, laneId, p.name, p.player_type, p.game_count, p.shoe_rental, gameFee + shoeFee, gameFee + shoeFee);
      }
    }
    db.prepare('DELETE FROM lane_players WHERE lane_id = ?').run(laneId);
    db.prepare('UPDATE lanes SET status = ?, power_on = 0 WHERE id = ?').run('waiting', laneId);
    res.json({ ok: true });
  });

  app.post('/api/lanes/bulk', (req, res) => {
    const { laneIds, action, payload } = req.body;
    for (const id of laneIds) {
      if (action === 'assign') {
        db.prepare('UPDATE lanes SET status = ?, game_type = ?, power_on = 1 WHERE id = ?').run(
          'active',
          payload?.game_type || '일반',
          id
        );
        if (payload?.player_count) {
          for (let i = 0; i < Math.min(payload.player_count, 6); i++) {
            db.prepare(
              'INSERT INTO lane_players (lane_id, name, player_type, sort_order) VALUES (?, ?, ?, ?)'
            ).run(id, `게스트${i + 1}`, payload?.player_type || '일반', i);
          }
        }
      } else if (action === 'pause') {
        db.prepare('UPDATE lanes SET status = ? WHERE id = ?').run('paused', id);
      } else if (action === 'resume') {
        db.prepare('UPDATE lanes SET status = ? WHERE id = ?').run('active', id);
      } else if (action === 'power') {
        db.prepare('UPDATE lanes SET power_on = ? WHERE id = ?').run(payload?.on ? 1 : 0, id);
      }
    }
    res.json({ ok: true });
  });

  app.get('/api/lockers', (req, res) => {
    let sql = 'SELECT * FROM lockers WHERE 1=1';
    const params = [];
    if (req.query.type) { sql += ' AND locker_type = ?'; params.push(req.query.type); }
    if (req.query.status) { sql += ' AND status = ?'; params.push(req.query.status); }
    if (req.query.q) {
      sql += ' AND (locker_number LIKE ? OR user_name LIKE ?)';
      params.push(`%${req.query.q}%`, `%${req.query.q}%`);
    }
    sql += ' ORDER BY locker_number';
    res.json(db.prepare(sql).all(...params));
  });

  app.post('/api/lockers', (req, res) => {
    const r = db
      .prepare(
        `INSERT INTO lockers (locker_number, locker_type, user_name, contact, start_date, end_date, status, remarks)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        req.body.locker_number,
        req.body.locker_type || '기타',
        req.body.user_name,
        req.body.contact,
        req.body.start_date,
        req.body.end_date,
        req.body.status || '대기',
        req.body.remarks
      );
    res.json({ id: r.lastInsertRowid });
  });

  app.put('/api/lockers/:id', (req, res) => {
    const b = req.body;
    db.prepare(
      `UPDATE lockers SET locker_number=?, locker_type=?, user_name=?, contact=?, start_date=?, end_date=?, status=?, remarks=? WHERE id=?`
    ).run(b.locker_number, b.locker_type, b.user_name, b.contact, b.start_date, b.end_date, b.status, b.remarks, +req.params.id);
    res.json({ ok: true });
  });

  app.delete('/api/lockers/:id', (req, res) => {
    db.prepare('DELETE FROM lockers WHERE id = ?').run(+req.params.id);
    res.json({ ok: true });
  });

  app.get('/api/fees', (_, res) => {
    const rows = db.prepare('SELECT * FROM fee_settings').all();
    res.json(rows.map((r) => ({ ...r, pricing: JSON.parse(r.pricing) })));
  });

  app.put('/api/fees', (req, res) => {
    const { fees, shoe_fee } = req.body;
    if (shoe_fee !== undefined) {
      db.prepare('UPDATE fee_settings SET shoe_fee = ?').run(shoe_fee);
    }
    for (const f of fees || []) {
      if (!f.name?.trim()) {
        if (f.id) db.prepare('DELETE FROM fee_settings WHERE id = ?').run(f.id);
        continue;
      }
      const pricing = JSON.stringify(f.pricing || {});
      if (f.id) {
        db.prepare(
          'UPDATE fee_settings SET name=?, payment_type=?, game_count=?, pricing=? WHERE id=?'
        ).run(f.name, f.payment_type, f.game_count, pricing, f.id);
      } else {
        db.prepare(
          'INSERT INTO fee_settings (name, payment_type, game_count, shoe_fee, pricing) VALUES (?,?,?,?,?)'
        ).run(f.name, f.payment_type, f.game_count, shoe_fee ?? 1000, pricing);
      }
    }
    res.json({ ok: true });
  });

  app.get('/api/closing', (req, res) => {
    const date = req.query.date || getBusinessDate();
    const settlements = db.prepare('SELECT * FROM settlements WHERE business_date = ? ORDER BY id').all(date);
    const summary = db
      .prepare(
        `SELECT category, SUM(game_count) as qty, SUM(fee) as total_fee,
         SUM(cash_amount) as cash, SUM(card_amount) as card
         FROM settlements WHERE business_date = ? GROUP BY category`
      )
      .all(date);
    const hourly = db
      .prepare(
        `SELECT strftime('%H', game_start) as hour, COUNT(*) as users, SUM(game_count) as games, SUM(fee) as fee
         FROM settlements WHERE business_date = ? AND game_start IS NOT NULL GROUP BY hour`
      )
      .all(date);
    const closed = db.prepare('SELECT * FROM daily_closings WHERE business_date = ?').get(date);
    res.json({ date, settlements, summary, hourly, closed });
  });

  app.post('/api/closing', (req, res) => {
    const date = req.body.date || getBusinessDate();
    const totals = db
      .prepare(
        `SELECT SUM(cash_amount) as cash, SUM(card_amount) as card FROM settlements WHERE business_date = ?`
      )
      .get(date);
    db.prepare(
      `INSERT INTO daily_closings (business_date, closed_at, total_cash, total_card)
       VALUES (?, datetime('now'), ?, ?)
       ON CONFLICT(business_date) DO UPDATE SET closed_at=excluded.closed_at, total_cash=excluded.total_cash, total_card=excluded.total_card`
    ).run(date, totals?.cash || 0, totals?.card || 0);
    const next = new Date(date);
    next.setDate(next.getDate() + 1);
    const nextStr = next.toISOString().slice(0, 10);
    const exists = db.prepare('SELECT id FROM business_days WHERE date = ?').get(nextStr);
    if (!exists) {
      db.prepare(
        'INSERT INTO business_days (date, day_type) VALUES (?, ?)'
      ).run(nextStr, '평일');
    }
    res.json({ ok: true, nextDate: nextStr });
  });

  app.get('/api/closing/stats', (_, res) => {
    const monthly = db
      .prepare(
        `SELECT business_date as month, SUM(total_cash + total_card) as amount
         FROM daily_closings GROUP BY substr(business_date, 1, 7) ORDER BY month DESC LIMIT 6`
      )
      .all();
    const byCategory = db
      .prepare(
        `SELECT category, SUM(fee) as amount, SUM(game_count) as games FROM settlements GROUP BY category`
      )
      .all();
    res.json({ monthly: monthly.reverse(), byCategory });
  });

  app.get('/api/members', (req, res) => {
    let sql = `SELECT m.*, c.name as club_name FROM members m LEFT JOIN clubs c ON m.club_id = c.id WHERE 1=1`;
    const params = [];
    if (req.query.q) {
      sql += ' AND (m.name LIKE ? OR c.name LIKE ?)';
      params.push(`%${req.query.q}%`, `%${req.query.q}%`);
    }
    sql += ' ORDER BY m.id DESC';
    res.json(db.prepare(sql).all(...params));
  });

  app.post('/api/members', (req, res) => {
    const b = req.body;
    const r = db
      .prepare('INSERT INTO members (name, category, contact, club_id, remarks) VALUES (?,?,?,?,?)')
      .run(b.name, b.category || '일반', b.contact, b.club_id || null, b.remarks);
    res.json({ id: r.lastInsertRowid });
  });

  app.put('/api/members/:id', (req, res) => {
    const b = req.body;
    db.prepare('UPDATE members SET name=?, category=?, contact=?, club_id=?, remarks=? WHERE id=?').run(
      b.name, b.category, b.contact, b.club_id || null, b.remarks, +req.params.id
    );
    res.json({ ok: true });
  });

  app.delete('/api/members/:id', (req, res) => {
    db.prepare('DELETE FROM members WHERE id = ?').run(+req.params.id);
    res.json({ ok: true });
  });

  app.get('/api/members/stats', (req, res) => {
    const month = req.query.month || new Date().toISOString().slice(0, 7);
    const rows = db
      .prepare(
        `SELECT player_name as name, SUM(game_count) as game_count, SUM(fee) as game_fee
         FROM settlements WHERE business_date LIKE ? GROUP BY player_name ORDER BY game_count DESC LIMIT 50`
      )
      .all(`${month}%`);
    res.json(rows);
  });

  app.get('/api/clubs', (req, res) => {
    let sql = `SELECT c.*, (SELECT COUNT(*) FROM members m WHERE m.club_id = c.id) as member_count FROM clubs c`;
    const params = [];
    if (req.query.q) {
      sql += ' WHERE c.name LIKE ?';
      params.push(`%${req.query.q}%`);
    }
    sql += ' ORDER BY c.id';
    res.json(db.prepare(sql).all(...params));
  });

  app.post('/api/clubs', (req, res) => {
    const r = db.prepare('INSERT INTO clubs (name, remarks) VALUES (?, ?)').run(req.body.name, req.body.remarks);
    res.json({ id: r.lastInsertRowid });
  });

  app.put('/api/clubs/:id', (req, res) => {
    db.prepare('UPDATE clubs SET name=?, remarks=? WHERE id=?').run(req.body.name, req.body.remarks, +req.params.id);
    res.json({ ok: true });
  });

  app.delete('/api/clubs/:id', (req, res) => {
    db.prepare('DELETE FROM clubs WHERE id = ?').run(+req.params.id);
    res.json({ ok: true });
  });

  app.get('/api/clubs/stats', (req, res) => {
    const month = req.query.month || new Date().toISOString().slice(0, 7);
    res.json(
      db
        .prepare(
          `SELECT c.name as club_name, SUM(s.game_count) as game_count, SUM(s.fee) as game_fee
           FROM settlements s
           JOIN members m ON m.name = s.player_name
           JOIN clubs c ON c.id = m.club_id
           WHERE s.business_date LIKE ?
           GROUP BY c.id ORDER BY game_count DESC`
        )
        .all(`${month}%`)
    );
  });

  app.get('/api/tournaments', (_, res) => {
    const list = db.prepare('SELECT * FROM tournaments ORDER BY id DESC').all();
    return res.json(list);
  });

  app.post('/api/tournaments', (req, res) => {
    const b = req.body;
    const r = db
      .prepare(
        `INSERT INTO tournaments (name, type, round_num, game_count, participant_count, lane_from, lane_to, lane_movement, status)
         VALUES (?,?,?,?,?,?,?,?,?)`
      )
      .run(
        b.name, b.type, b.round_num, b.game_count, b.participant_count,
        b.lane_from, b.lane_to, b.lane_movement, b.status || 'draft'
      );
    res.json({ id: r.lastInsertRowid });
  });

  app.put('/api/tournaments/:id', (req, res) => {
    const b = req.body;
    db.prepare(
      `UPDATE tournaments SET name=?, type=?, round_num=?, game_count=?, participant_count=?,
       lane_from=?, lane_to=?, lane_movement=?, status=? WHERE id=?`
    ).run(
      b.name, b.type, b.round_num, b.game_count, b.participant_count,
      b.lane_from, b.lane_to, b.lane_movement, b.status, +req.params.id
    );
    res.json({ ok: true });
  });

  app.get('/api/tournaments/:id/participants', (req, res) => {
    res.json(
      db.prepare('SELECT * FROM tournament_participants WHERE tournament_id = ? ORDER BY id').all(+req.params.id)
    );
  });

  app.post('/api/tournaments/:id/participants', (req, res) => {
    const tid = +req.params.id;
    db.prepare('DELETE FROM tournament_participants WHERE tournament_id = ?').run(tid);
    const ins = db.prepare(
      'INSERT INTO tournament_participants (tournament_id, name, handicap, team_name, lane_order, scores) VALUES (?,?,?,?,?,?)'
    );
    for (const p of req.body.participants || []) {
      ins.run(tid, p.name, p.handicap || 0, p.team_name, p.lane_order, JSON.stringify(p.scores || []));
    }
    res.json({ ok: true });
  });

  app.post('/api/tournaments/:id/assign-lanes', (req, res) => {
    const tid = +req.params.id;
    const t = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(tid);
    const parts = db.prepare('SELECT * FROM tournament_participants WHERE tournament_id = ?').all(tid);
    db.prepare('UPDATE tournaments SET status = ? WHERE id = ?').run('active', tid);
    let lane = t.lane_from;
    for (const p of parts) {
      db.prepare('UPDATE lanes SET status=?, competition_mode=1, game_type=? WHERE id=?').run('active', '대회', lane);
      db.prepare(
        'INSERT INTO lane_players (lane_id, name, player_type, sort_order) VALUES (?,?,?,0)'
      ).run(lane, p.name, '일반');
      lane++;
      if (lane > t.lane_to) lane = t.lane_from;
    }
    res.json({ ok: true });
  });

  app.post('/api/tournaments/end-competition', (_, res) => {
    db.prepare('UPDATE lanes SET competition_mode=0, game_type=? WHERE competition_mode=1').run('일반');
    db.prepare('UPDATE tournaments SET status=? WHERE status=?').run('completed', 'active');
    res.json({ ok: true });
  });

  app.get('/api/settings', (_, res) => {
    const rows = db.prepare('SELECT key, value FROM settings').all();
    res.json(Object.fromEntries(rows.map((r) => [r.key, r.value])));
  });

  app.put('/api/settings', (req, res) => {
    const ins = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value');
    for (const [k, v] of Object.entries(req.body)) ins.run(k, String(v));
    res.json({ ok: true });
  });

  app.get('/api/notices', (_, res) => {
    res.json(db.prepare('SELECT * FROM notices ORDER BY sort_order').all());
  });

  app.put('/api/notices', (req, res) => {
    db.prepare('DELETE FROM notices').run();
    const ins = db.prepare('INSERT INTO notices (content, sort_order) VALUES (?, ?)');
    (req.body.notices || []).forEach((c, i) => ins.run(c, i));
    res.json({ ok: true });
  });

  app.get('/api/members/search', (req, res) => {
    const q = req.query.q || '';
    res.json(
      db.prepare('SELECT id, name, category FROM members WHERE name LIKE ? LIMIT 10').all(`%${q}%`)
    );
  });
}
