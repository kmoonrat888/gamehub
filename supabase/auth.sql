-- ระบบบัญชีผู้เล่น (Supabase Auth) ของบ้านเกมเรียนรู้
-- วิธีใช้: รัน scores.sql ก่อน แล้ว Supabase → SQL Editor → New query → วางทั้งไฟล์นี้ → Run
-- รันซ้ำได้ ไม่ลบข้อมูลเดิม
--
-- ตั้งค่าเพิ่มใน Supabase (ทำครั้งเดียว):
--   Authentication → Sign In / Providers → Email: เปิด Email และปิด "Confirm email"
--   (ระบบส่งอีเมลฟรีของ Supabase ส่งได้เฉพาะอีเมลของสมาชิกทีม ถ้าไม่ปิด คนอื่นจะสมัครไม่ได้
--    หรือถ้าต้องการยืนยันอีเมล ให้ต่อ SMTP ของตัวเองที่ Authentication → Emails → SMTP Settings)

-- ---------- โปรไฟล์: ชื่อเล่นที่ใช้บนตารางอันดับ (1 บัญชี = 1 ชื่อ ห้ามซ้ำกับบัญชีอื่น) ----------
create table if not exists public.profiles (
  id           uuid        primary key references auth.users (id) on delete cascade,
  display_name text        not null check (char_length(display_name) between 1 and 20 and display_name = btrim(display_name)),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create unique index if not exists profiles_display_name_key on public.profiles (lower(display_name));

alter table public.profiles enable row level security;

drop policy if exists "players read their own profile" on public.profiles;
create policy "players read their own profile" on public.profiles
  for select to authenticated using (id = (select auth.uid()));

drop policy if exists "players create their own profile" on public.profiles;
create policy "players create their own profile" on public.profiles
  for insert to authenticated with check (id = (select auth.uid()));

drop policy if exists "players rename themselves" on public.profiles;
create policy "players rename themselves" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

revoke all on public.profiles from anon, authenticated;
grant select, insert (id, display_name), update (display_name) on public.profiles to authenticated;

-- จัดรูปชื่อ: ตัดช่องว่างหัวท้าย ยุบช่องว่างซ้อน ยาวไม่เกิน 20 ตัว
create or replace function public.clean_display_name(name text)
returns text
language sql
immutable
set search_path = ''
as $$
  select btrim(left(regexp_replace(btrim(coalesce(name, '')), '\s+', ' ', 'g'), 20));
$$;

-- ใช้ตอนสมัคร: เช็กว่าชื่อเล่นนี้มีบัญชีอื่นใช้แล้วหรือยัง (บอกแค่ใช่/ไม่ใช่ ไม่เปิดเผยข้อมูลอื่น)
create or replace function public.display_name_taken(name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p where lower(p.display_name) = lower(public.clean_display_name(name))
  );
$$;

revoke all on function public.display_name_taken(text) from public;
grant execute on function public.display_name_taken(text) to anon, authenticated;

-- สมัครสมาชิกแล้วสร้างโปรไฟล์ให้อัตโนมัติจากชื่อเล่นที่กรอก (ถ้าชื่อซ้ำพอดี เติมตัวเลขต่อท้าย สมัครไม่ล้ม)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  wanted    text := public.clean_display_name(new.raw_user_meta_data ->> 'display_name');
  candidate text;
  n         int  := 1;
begin
  if wanted = '' then
    wanted := 'ผู้เล่น';
  end if;
  candidate := wanted;
  while exists (select 1 from public.profiles p where lower(p.display_name) = lower(candidate)) loop
    n := n + 1;
    candidate := btrim(left(wanted, 20 - char_length(n::text))) || n;
  end loop;
  insert into public.profiles (id, display_name) values (new.id, candidate)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- เปลี่ยนชื่อเล่น: จัดรูปชื่อ และเปลี่ยนชื่อในคะแนนเก่าของบัญชีนี้ทั้งหมด
create or replace function public.profiles_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.display_name := public.clean_display_name(new.display_name);
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_before_write on public.profiles;
create trigger profiles_before_write
  before insert or update on public.profiles
  for each row execute function public.profiles_before_write();

create or replace function public.profiles_after_rename()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.scores set player_name = new.display_name where user_id = new.id;
  return null;
end;
$$;

drop trigger if exists profiles_after_rename on public.profiles;
create trigger profiles_after_rename
  after update of display_name on public.profiles
  for each row
  when (old.display_name is distinct from new.display_name)
  execute function public.profiles_after_rename();

-- ---------- ผูกคะแนนกับบัญชี ----------
-- ผู้เล่นที่ Log in: user_id = บัญชีของตัวเองอัตโนมัติ · ผู้เล่นทั่วไป (ไม่ Log in): user_id ว่าง
alter table public.scores
  add column if not exists user_id uuid default auth.uid() references auth.users (id) on delete cascade;

create index if not exists scores_user_idx on public.scores (user_id, created_at desc);

-- คะแนนของบัญชีใช้ชื่อเล่นในโปรไฟล์เสมอ · ผู้เล่นทั่วไปห้ามใช้ชื่อที่มีเจ้าของบัญชีแล้ว (กันแอบอ้างชื่อ)
create or replace function public.scores_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  account_name text;
begin
  if new.user_id is not null then
    select p.display_name into account_name from public.profiles p where p.id = new.user_id;
    if account_name is not null then
      new.player_name := account_name;
    end if;
  elsif exists (
    select 1 from public.profiles p where lower(p.display_name) = lower(public.clean_display_name(new.player_name))
  ) then
    raise exception 'name_taken' using errcode = 'P0001', hint = 'ชื่อนี้มีเจ้าของบัญชีแล้ว';
  end if;
  return new;
end;
$$;

drop trigger if exists scores_before_insert on public.scores;
create trigger scores_before_insert
  before insert on public.scores
  for each row execute function public.scores_before_insert();

-- สิทธิ์เพิ่มคะแนน: ผู้เล่นทั่วไปเพิ่มได้เฉพาะคะแนนที่ไม่มีบัญชี · คนที่ Log in เพิ่มได้เฉพาะในบัญชีตัวเอง
drop policy if exists "anyone can add a score" on public.scores;
drop policy if exists "guests add scores without an account" on public.scores;
create policy "guests add scores without an account" on public.scores
  for insert to anon with check (user_id is null);

drop policy if exists "players add scores to their own account" on public.scores;
create policy "players add scores to their own account" on public.scores
  for insert to authenticated with check (user_id = (select auth.uid()));

-- ฟังก์ชันภายใน ไม่ต้องให้เรียกผ่าน API
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.profiles_before_write() from public, anon, authenticated;
revoke all on function public.profiles_after_rename() from public, anon, authenticated;
revoke all on function public.scores_before_insert() from public, anon, authenticated;

-- ลบบัญชี: Authentication → Users → เลือกผู้ใช้ → Delete user (โปรไฟล์และคะแนนของบัญชีจะถูกลบตาม)
