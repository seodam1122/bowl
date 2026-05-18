-- Supabase SQL Editor에서 전체 실행하세요.

create table if not exists business_days (
  id bigserial primary key,
  date date unique not null,
  day_type text default '평일',
  am_start text default '09:00',
  pm_start text default '14:00',
  night_start text default '18:00'
);

create table if not exists fee_settings (
  id bigserial primary key,
  name text not null,
  payment_type text default '후불',
  game_count int default 0,
  shoe_fee int default 1000,
  pricing jsonb not null default '{}'::jsonb
);

create table if not exists lanes (
  id int primary key,
  status text default 'waiting',
  game_type text default '일반',
  power_on int default 0,
  score_mode text default '기본',
  collapsed int default 0,
  competition_mode int default 0
);

create table if not exists lane_players (
  id bigserial primary key,
  lane_id int not null references lanes(id) on delete cascade,
  name text not null,
  player_type text default '일반',
  shoe_rental int default 0,
  game_count int default 0,
  settled int default 0,
  sort_order int default 0
);

create table if not exists lockers (
  id bigserial primary key,
  locker_number text not null,
  locker_type text default '기타',
  user_name text,
  contact text,
  start_date date,
  end_date date,
  status text default '대기',
  remarks text
);

create table if not exists clubs (
  id bigserial primary key,
  name text not null unique,
  remarks text,
  created_at date default current_date
);

create table if not exists members (
  id bigserial primary key,
  name text not null,
  category text default '일반',
  contact text,
  club_id bigint references clubs(id) on delete set null,
  remarks text,
  created_at date default current_date
);

create table if not exists tournaments (
  id bigserial primary key,
  name text not null,
  type text default '개인',
  round_num int default 1,
  game_count int default 3,
  participant_count int default 0,
  lane_from int default 1,
  lane_to int default 16,
  lane_movement text default '우측',
  status text default 'draft',
  created_at date default current_date
);

create table if not exists tournament_participants (
  id bigserial primary key,
  tournament_id bigint not null references tournaments(id) on delete cascade,
  name text not null,
  handicap int default 0,
  team_name text,
  lane_order int,
  scores jsonb default '[]'::jsonb
);

create table if not exists settlements (
  id bigserial primary key,
  business_date date not null,
  lane_id int,
  player_name text,
  category text,
  game_count int default 0,
  shoe_rental int default 0,
  game_start timestamptz,
  game_end timestamptz,
  card_payment int default 0,
  fee int default 0,
  cash_amount int default 0,
  card_amount int default 0
);

create table if not exists daily_closings (
  id bigserial primary key,
  business_date date unique not null,
  closed_at timestamptz,
  total_cash int default 0,
  total_card int default 0
);

create table if not exists settings (
  key text primary key,
  value text not null
);

create table if not exists notices (
  id bigserial primary key,
  content text not null,
  sort_order int default 0
);

create table if not exists ads (
  id bigserial primary key,
  filename text not null,
  sort_order int default 0
);

create index if not exists idx_settlements_business_date on settlements(business_date);
create index if not exists idx_lane_players_lane_id on lane_players(lane_id);
create index if not exists idx_members_club_id on members(club_id);
