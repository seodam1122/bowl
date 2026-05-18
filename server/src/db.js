import Database from 'better-sqlite3';
import { mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', 'data');
mkdirSync(dataDir, { recursive: true });
const dbPath = join(dataDir, 'onscoring.db');

export const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS business_days (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT UNIQUE NOT NULL,
      day_type TEXT DEFAULT '평일',
      am_start TEXT DEFAULT '09:00',
      pm_start TEXT DEFAULT '14:00',
      night_start TEXT DEFAULT '18:00'
    );

    CREATE TABLE IF NOT EXISTS fee_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      payment_type TEXT DEFAULT '후불',
      game_count INTEGER DEFAULT 0,
      shoe_fee INTEGER DEFAULT 1000,
      pricing TEXT NOT NULL DEFAULT '{}'
    );

    CREATE TABLE IF NOT EXISTS lanes (
      id INTEGER PRIMARY KEY,
      status TEXT DEFAULT 'waiting',
      game_type TEXT DEFAULT '일반',
      power_on INTEGER DEFAULT 0,
      score_mode TEXT DEFAULT '기본',
      collapsed INTEGER DEFAULT 0,
      competition_mode INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS lane_players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lane_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      player_type TEXT DEFAULT '일반',
      shoe_rental INTEGER DEFAULT 0,
      game_count INTEGER DEFAULT 0,
      settled INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      FOREIGN KEY (lane_id) REFERENCES lanes(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS lockers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      locker_number TEXT NOT NULL,
      locker_type TEXT DEFAULT '기타',
      user_name TEXT,
      contact TEXT,
      start_date TEXT,
      end_date TEXT,
      status TEXT DEFAULT '대기',
      remarks TEXT
    );

    CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT DEFAULT '일반',
      contact TEXT,
      club_id INTEGER,
      remarks TEXT,
      created_at TEXT DEFAULT (date('now'))
    );

    CREATE TABLE IF NOT EXISTS clubs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      remarks TEXT,
      created_at TEXT DEFAULT (date('now'))
    );

    CREATE TABLE IF NOT EXISTS tournaments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT DEFAULT '개인',
      round_num INTEGER DEFAULT 1,
      game_count INTEGER DEFAULT 3,
      participant_count INTEGER DEFAULT 0,
      lane_from INTEGER DEFAULT 1,
      lane_to INTEGER DEFAULT 16,
      lane_movement TEXT DEFAULT '우측',
      status TEXT DEFAULT 'draft',
      created_at TEXT DEFAULT (date('now'))
    );

    CREATE TABLE IF NOT EXISTS tournament_participants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tournament_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      handicap INTEGER DEFAULT 0,
      team_name TEXT,
      lane_order INTEGER,
      scores TEXT DEFAULT '[]',
      FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS settlements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_date TEXT NOT NULL,
      lane_id INTEGER,
      player_name TEXT,
      category TEXT,
      game_count INTEGER DEFAULT 0,
      shoe_rental INTEGER DEFAULT 0,
      game_start TEXT,
      game_end TEXT,
      card_payment INTEGER DEFAULT 0,
      fee INTEGER DEFAULT 0,
      cash_amount INTEGER DEFAULT 0,
      card_amount INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS daily_closings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_date TEXT UNIQUE NOT NULL,
      closed_at TEXT,
      total_cash INTEGER DEFAULT 0,
      total_card INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS ads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0
    );
  `);

  const laneCount = db.prepare('SELECT COUNT(*) as c FROM lanes').get().c;
  if (laneCount === 0) {
    const insert = db.prepare('INSERT INTO lanes (id, status) VALUES (?, ?)');
    for (let i = 1; i <= 16; i++) insert.run(i, 'waiting');
  }

  const feeCount = db.prepare('SELECT COUNT(*) as c FROM fee_settings').get().c;
  if (feeCount === 0) {
    const defaultPricing = JSON.stringify({
      weekday: { morning: 5000, afternoon: 6000, night: 7000 },
      weekend: { morning: 6000, afternoon: 7000, night: 8000 },
      special: { morning: 7000, afternoon: 8000, night: 9000 },
    });
    db.prepare(
      `INSERT INTO fee_settings (name, payment_type, game_count, shoe_fee, pricing) VALUES (?, ?, ?, ?, ?)`
    ).run('일반', '후불', 0, 1000, defaultPricing);
    db.prepare(
      `INSERT INTO fee_settings (name, payment_type, game_count, shoe_fee, pricing) VALUES (?, ?, ?, ?, ?)`
    ).run('회원', '후불', 0, 1000, defaultPricing);
    db.prepare(
      `INSERT INTO fee_settings (name, payment_type, game_count, shoe_fee, pricing) VALUES (?, ?, ?, ?, ?)`
    ).run('학생', '후불', 0, 1000, defaultPricing);
  }

  const settingsCount = db.prepare('SELECT COUNT(*) as c FROM settings').get().c;
  if (settingsCount === 0) {
    const defaults = {
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
    const ins = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');
    for (const [k, v] of Object.entries(defaults)) ins.run(k, v);
  }

  const today = new Date().toISOString().slice(0, 10);
  const bd = db.prepare('SELECT id FROM business_days WHERE date = ?').get(today);
  if (!bd) {
    db.prepare(
      'INSERT INTO business_days (date, day_type, am_start, pm_start, night_start) VALUES (?, ?, ?, ?, ?)'
    ).run(today, '평일', '09:00', '14:00', '18:00');
  }
}
