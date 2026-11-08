-- ตารางอันดับคะแนนของบ้านเกมเรียนรู้
-- วิธีใช้: Supabase → SQL Editor → New query → วางทั้งไฟล์นี้ → Run (รันครั้งเดียว)

create table if not exists public.scores (
  id          bigint generated always as identity primary key,
  game_id     text        not null check (char_length(game_id) between 1 and 40),
  board       text        not null default '' check (char_length(board) <= 80),
  player_name text        not null check (char_length(btrim(player_name)) between 1 and 20),
  score       integer     not null check (score between 0 and 100000),
  time_ms     integer     check (time_ms between 0 and 86400000),
  detail      text        not null default '' check (char_length(detail) <= 120),
  created_at  timestamptz not null default now()
);

create index if not exists scores_ranking_idx
  on public.scores (game_id, board, score desc, time_ms asc nulls last, created_at);

-- เปิด RLS: ผู้เล่น (คีย์ publishable ทำงานในสิทธิ์ anon) อ่านและเพิ่มคะแนนได้อย่างเดียว แก้ไข/ลบไม่ได้
alter table public.scores enable row level security;

drop policy if exists "anyone can read scores" on public.scores;
create policy "anyone can read scores" on public.scores
  for select to anon, authenticated using (true);

drop policy if exists "anyone can add a score" on public.scores;
create policy "anyone can add a score" on public.scores
  for insert to anon, authenticated with check (true);

grant select, insert on public.scores to anon, authenticated;

-- ลบคะแนนที่ไม่เหมาะสม: Table Editor → scores → เลือกแถว → Delete
-- หรือ: delete from public.scores where id = 123;
