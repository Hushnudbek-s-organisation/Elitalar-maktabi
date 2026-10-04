-- ============================================================================
-- ELITA eMaktab: LOCAL / DEMO Supabase bootstrap
-- ============================================================================
-- WARNING: DO NOT USE THIS SCRIPT WITH REAL STUDENT DATA OR IN PRODUCTION.
-- The current frontend uses a legacy client-side login: the public anon key
-- reads profiles.password, the role is stored in localStorage, and database
-- writes are issued directly from the browser. To make that legacy demo work,
-- the RLS policies below deliberately allow anon users to read/write school
-- records. Anyone who obtains the public project URL/key can impersonate users,
-- change profiles/points, read messages, and access uploaded files.
--
-- For a real school deployment, migrate sign-in/account provisioning to
-- Supabase Auth + server-side admin functions and replace these demo policies
-- with least-privilege auth.uid()-based RLS BEFORE importing real data.
-- Run only against a fresh, isolated Supabase project using SQL Editor.
-- ============================================================================

begin;

-- Core school tables ----------------------------------------------------------
create table if not exists public.classes (
  name text primary key,
  max_limit integer not null default 24 check (max_limit > 0),
  total_cp bigint not null default 0,
  homeroom_teacher text,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id text primary key check (length(trim(id)) between 1 and 40),
  full_name text not null,
  role text not null check (role in ('student', 'teacher', 'director', 'admin')),
  -- Plain-text password is retained ONLY because the current demo frontend compares it directly.
  -- Never use this column or this login model for real accounts.
  password text not null,
  bio text,
  homeroom text references public.classes(name) on update cascade on delete set null,
  class_name text references public.classes(name) on update cascade on delete set null,
  pp_balance bigint not null default 0 check (pp_balance >= 0),
  cp_score bigint not null default 0,
  avatar_url text,
  username text unique,
  created_at timestamptz not null default now()
);

create table if not exists public.timetable (
  id uuid primary key default gen_random_uuid(),
  class_name text not null references public.classes(name) on update cascade on delete cascade,
  day_of_week text not null check (day_of_week in ('Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh')),
  lesson_number smallint not null check (lesson_number between 1 and 6),
  subject text not null,
  teacher_id text not null references public.profiles(id) on update cascade on delete cascade,
  group_type text not null default 'Barchasi',
  room text,
  term text not null,
  start_date date not null,
  end_date date not null,
  created_at timestamptz not null default now(),
  check (start_date <= end_date),
  unique (term, class_name, day_of_week, lesson_number, group_type),
  unique (term, day_of_week, lesson_number, teacher_id)
);

create table if not exists public.homeworks (
  id uuid primary key default gen_random_uuid(),
  class_name text not null references public.classes(name) on update cascade on delete cascade,
  subject text not null,
  topic text,
  description text,
  deadline text,
  date date not null,
  created_at timestamptz not null default now()
);

create table if not exists public.feedbacks (
  id uuid primary key default gen_random_uuid(),
  sender_id text references public.profiles(id) on update cascade on delete set null,
  sender_name text,
  message text not null check (length(trim(message)) > 0),
  is_anonymous boolean not null default false,
  status text not null default 'kutilmoqda',
  answer text,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.profiles(id) on update cascade on delete cascade,
  title text not null,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- Direct-message contacts and conversations ---------------------------------
create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null references public.profiles(id) on update cascade on delete cascade,
  contact_id text not null references public.profiles(id) on update cascade on delete cascade,
  contact_name text not null,
  created_at timestamptz not null default now(),
  unique (owner_id, contact_id),
  check (owner_id <> contact_id)
);

create table if not exists public.chats (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  type text not null check (type in ('group', 'channel')),
  avatar_url text,
  created_by text not null references public.profiles(id) on update cascade on delete cascade,
  created_at timestamptz not null default now(),
  unique (created_by, name)
);

-- receiver_id is intentionally polymorphic: it contains either a profile ID
-- (direct chat) or a chats.id UUID (group/channel chat).
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id text not null references public.profiles(id) on update cascade on delete cascade,
  receiver_id text not null,
  text text not null default '',
  msg_type text not null default 'text' check (msg_type in ('text', 'image', 'video', 'audio', 'voice', 'round_video', 'file')),
  file_url text,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  check (length(trim(text)) > 0 or file_url is not null)
);

-- Wallet ---------------------------------------------------------------------
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  sender_id text not null references public.profiles(id) on update cascade on delete restrict,
  receiver_id text not null references public.profiles(id) on update cascade on delete restrict,
  amount bigint not null check (amount > 0),
  created_at timestamptz not null default now(),
  check (sender_id <> receiver_id)
);

-- Helpful lookup indexes ------------------------------------------------------
create index if not exists profiles_role_class_idx on public.profiles(role, class_name);
create index if not exists classes_total_cp_idx on public.classes(total_cp desc);
create index if not exists timetable_teacher_term_idx on public.timetable(teacher_id, term);
create index if not exists timetable_class_term_idx on public.timetable(class_name, term, day_of_week, lesson_number);
create index if not exists homeworks_class_date_idx on public.homeworks(class_name, date desc);
create index if not exists feedbacks_created_at_idx on public.feedbacks(created_at desc);
create index if not exists notifications_user_created_idx on public.notifications(user_id, created_at desc);
create index if not exists messages_sender_created_idx on public.messages(sender_id, created_at desc);
create index if not exists messages_receiver_created_idx on public.messages(receiver_id, created_at desc);
create index if not exists transactions_sender_created_idx on public.transactions(sender_id, created_at desc);
create index if not exists transactions_receiver_created_idx on public.transactions(receiver_id, created_at desc);

-- The frontend subscribes to new direct messages and student notifications.
do $$
declare
  realtime_table text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach realtime_table in array array['messages', 'notifications'] loop
      if not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = realtime_table
      ) then
        execute format('alter publication supabase_realtime add table public.%I', realtime_table);
      end if;
    end loop;
  end if;
end $$;

-- The current browser-only legacy login cannot use user-scoped RLS. These
-- intentionally permissive policies are suitable only for a throwaway demo.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'classes', 'profiles', 'timetable', 'homeworks', 'feedbacks',
    'notifications', 'contacts', 'chats', 'messages'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('drop policy if exists demo_open_access on public.%I', table_name);
    execute format(
      'create policy demo_open_access on public.%I for all to anon, authenticated using (true) with check (true)',
      table_name
    );
  end loop;
end $$;

alter table public.transactions enable row level security;
drop policy if exists demo_read_transactions on public.transactions;
create policy demo_read_transactions on public.transactions
  for select to anon, authenticated using (true);

-- Explicit API grants for this demo only. RLS policies above still control rows.
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;

-- Atomic transfer endpoint used by the wallet. The RPC verifies the sender's
-- demo password and locks both accounts in a deterministic order.
create or replace function public.transfer_pp(
  p_sender_id text,
  p_receiver_id text,
  p_amount bigint,
  p_pin text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  sender_row public.profiles%rowtype;
  receiver_row public.profiles%rowtype;
  new_balance bigint;
  new_transaction_id text;
begin
  if p_sender_id is null or p_receiver_id is null or p_pin is null then
    raise exception 'Transfer ma''lumotlari to''liq emas.' using errcode = 'P0001';
  end if;
  if p_amount is null or p_amount < 1 then
    raise exception 'O''tkazma miqdori kamida 1 PP bo''lishi kerak.' using errcode = 'P0001';
  end if;
  if p_sender_id = p_receiver_id then
    raise exception 'O''zingizga PP o''tkaza olmaysiz.' using errcode = 'P0001';
  end if;

  perform id from public.profiles
    where id in (p_sender_id, p_receiver_id)
    order by id
    for update;

  select * into sender_row from public.profiles where id = p_sender_id;
  if not found or lower(coalesce(sender_row.role, '')) <> 'student' then
    raise exception 'Yuboruvchi o''quvchi topilmadi.' using errcode = 'P0001';
  end if;
  if sender_row.password is distinct from p_pin then
    raise exception 'Parol noto''g''ri.' using errcode = 'P0001';
  end if;
  if coalesce(sender_row.pp_balance, 0) < p_amount then
    raise exception 'Hisobingizda mablag'' yetarli emas.' using errcode = 'P0001';
  end if;

  select * into receiver_row from public.profiles where id = p_receiver_id;
  if not found or lower(coalesce(receiver_row.role, '')) <> 'student' then
    raise exception 'Qabul qiluvchi o''quvchi topilmadi.' using errcode = 'P0001';
  end if;

  new_balance := coalesce(sender_row.pp_balance, 0) - p_amount;
  update public.profiles set pp_balance = new_balance where id = p_sender_id;
  update public.profiles set pp_balance = coalesce(pp_balance, 0) + p_amount where id = p_receiver_id;

  insert into public.transactions (sender_id, receiver_id, amount)
  values (p_sender_id, p_receiver_id, p_amount)
  returning id::text into new_transaction_id;

  return jsonb_build_object(
    'balance', new_balance,
    'transaction_id', new_transaction_id,
    'amount', p_amount
  );
end;
$$;

revoke all on function public.transfer_pp(text, text, bigint, text) from public;
grant execute on function public.transfer_pp(text, text, bigint, text) to anon, authenticated;

-- Public demo uploads for the app's avatars and messenger attachments.
insert into storage.buckets (id, name, public, file_size_limit)
values
  ('avatars', 'avatars', true, 26214400),
  ('attachments', 'attachments', true, 26214400)
on conflict (id) do update
set public = excluded.public, file_size_limit = excluded.file_size_limit;

drop policy if exists demo_public_read_files on storage.objects;
create policy demo_public_read_files on storage.objects
  for select to anon, authenticated
  using (bucket_id in ('avatars', 'attachments'));
drop policy if exists demo_open_upload_files on storage.objects;
create policy demo_open_upload_files on storage.objects
  for insert to anon, authenticated
  with check (bucket_id in ('avatars', 'attachments'));
drop policy if exists demo_open_update_files on storage.objects;
create policy demo_open_update_files on storage.objects
  for update to anon, authenticated
  using (bucket_id in ('avatars', 'attachments'))
  with check (bucket_id in ('avatars', 'attachments'));
drop policy if exists demo_open_delete_files on storage.objects;
create policy demo_open_delete_files on storage.objects
  for delete to anon, authenticated
  using (bucket_id in ('avatars', 'attachments'));

-- Four predictable accounts for local/demo testing only ----------------------
insert into public.classes (name, max_limit, total_cp, homeroom_teacher)
values ('7-A', 24, 0, 'Demo Teacher')
on conflict (name) do update set
  max_limit = excluded.max_limit,
  homeroom_teacher = excluded.homeroom_teacher;

insert into public.profiles (id, full_name, role, password, bio, homeroom, class_name, pp_balance, cp_score, username)
values
  ('D-100001', 'Demo Director', 'director', 'DirectorDemo#2026', null, null, null, 0, 0, 'demo.director'),
  ('T-100001', 'Demo Teacher', 'teacher', 'TeacherDemo#2026', 'Matematika', '7-A', null, 0, 0, 'demo.teacher'),
  ('S-100001', 'Demo Student One', 'student', 'StudentOne#2026', null, null, '7-A', 100000, 0, 'demo.student1'),
  ('S-100002', 'Demo Student Two', 'student', 'StudentTwo#2026', null, null, '7-A', 50000, 0, 'demo.student2')
on conflict (id) do update set
  full_name = excluded.full_name,
  role = excluded.role,
  password = excluded.password,
  bio = excluded.bio,
  homeroom = excluded.homeroom,
  class_name = excluded.class_name,
  pp_balance = excluded.pp_balance,
  cp_score = excluded.cp_score,
  username = excluded.username;

update public.classes set homeroom_teacher = 'Demo Teacher' where name = '7-A';

insert into public.timetable (class_name, day_of_week, lesson_number, subject, teacher_id, group_type, room, term, start_date, end_date)
values
  ('7-A', 'Du', 1, 'Kelajak soati', 'T-100001', 'Barchasi', '101', '1-chorak', '2026-09-02', '2026-11-03'),
  ('7-A', 'Du', 2, 'Algebra', 'T-100001', 'Barchasi', '101', '1-chorak', '2026-09-02', '2026-11-03'),
  ('7-A', 'Ch', 2, 'Algebra', 'T-100001', 'Barchasi', '101', '1-chorak', '2026-09-02', '2026-11-03')
on conflict (term, class_name, day_of_week, lesson_number, group_type) do update set
  subject = excluded.subject,
  teacher_id = excluded.teacher_id,
  room = excluded.room,
  start_date = excluded.start_date,
  end_date = excluded.end_date;

do $$
begin
  if not exists (select 1 from public.homeworks where class_name = '7-A' and subject = 'Matematika' and topic = 'Kasrlar bilan amallar') then
    insert into public.homeworks (class_name, subject, topic, description, deadline, date)
    values ('7-A', 'Matematika', 'Kasrlar bilan amallar', 'Darslikdagi 12–15-mashqlarni bajaring.', 'Keyingi darsgacha', '2026-10-05');
  end if;
  if not exists (select 1 from public.homeworks where class_name = '7-A' and subject = 'Matematika' and topic = 'Tenglamalarni yechish') then
    insert into public.homeworks (class_name, subject, topic, description, deadline, date)
    values ('7-A', 'Matematika', 'Tenglamalarni yechish', '3 ta misol va 2 ta masalani yeching.', '2026-10-07', '2026-10-07');
  end if;
end $$;

insert into public.contacts (owner_id, contact_id, contact_name)
values
  ('T-100001', 'S-100001', 'Demo Student One'),
  ('T-100001', 'S-100002', 'Demo Student Two'),
  ('S-100001', 'T-100001', 'Demo Teacher'),
  ('S-100001', 'S-100002', 'Demo Student Two'),
  ('S-100002', 'T-100001', 'Demo Teacher'),
  ('S-100002', 'S-100001', 'Demo Student One')
on conflict (owner_id, contact_id) do update set contact_name = excluded.contact_name;

insert into public.chats (name, type, created_by)
values ('7-A sinfi', 'group', 'T-100001')
on conflict (created_by, name) do nothing;

commit;

notify pgrst, 'reload schema';

-- Demo sign-in credentials (use ONLY in this isolated test project):
-- Director: D-100001 / DirectorDemo#2026
-- Teacher:  T-100001 / TeacherDemo#2026
-- Student:  S-100001 / StudentOne#2026
-- Student:  S-100002 / StudentTwo#2026
