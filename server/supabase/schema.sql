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

-- RLS (프론트 anon 키용 — 운영 시 Supabase Auth + 세분화 정책 권장)
alter table business_days enable row level security;
alter table fee_settings enable row level security;
alter table lanes enable row level security;
alter table lane_players enable row level security;
alter table lockers enable row level security;
alter table clubs enable row level security;
alter table members enable row level security;
alter table tournaments enable row level security;
alter table tournament_participants enable row level security;
alter table settlements enable row level security;
alter table daily_closings enable row level security;
alter table settings enable row level security;
alter table notices enable row level security;
alter table ads enable row level security;

do $$ declare t text; begin
  foreach t in array array[
    'business_days','fee_settings','lanes','lane_players','lockers','clubs','members',
    'tournaments','tournament_participants','settlements','daily_closings','settings','notices','ads'
  ] loop
    execute format('drop policy if exists allow_anon_all on %I', t);
    execute format(
      'create policy allow_anon_all on %I for all to anon using (true) with check (true)',
      t
    );
  end loop;
end $$;

-- 초기 레인 (1~16)
insert into lanes (id, status) values
  (1,'waiting'),(2,'waiting'),(3,'waiting'),(4,'waiting'),
  (5,'waiting'),(6,'waiting'),(7,'waiting'),(8,'waiting'),
  (9,'waiting'),(10,'waiting'),(11,'waiting'),(12,'waiting'),
  (13,'waiting'),(14,'waiting'),(15,'waiting'),(16,'waiting')
on conflict (id) do nothing;
