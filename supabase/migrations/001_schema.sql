-- ============================================================================
-- SchoolOS Uzbekistan — Migration 001: SCHEMA
-- ----------------------------------------------------------------------------
-- Tartib: 001_schema → 002_rls → 003_audit → 004_seed_dev
-- Supabase SQL Editor'da ketma-ket bajariladi (har fayl tranzaksiyada).
-- Idempotent: takroriy bajarishda xato bermaydi.
-- Talablar: Supabase (auth, storage sxemalari mavjud). pg_trgm ixtiyoriy
-- (Supabase'da bor; yo'q muhitda trigram indekslar o'tkazib yuboriladi).
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 0. Extensions
-- ---------------------------------------------------------------------------
create schema if not exists extensions;

do $$
begin
  if not exists (select 1 from pg_extension where extname = 'pg_trgm') then
    create extension pg_trgm with schema extensions;
  end if;
exception when others then
  raise notice 'pg_trgm mavjud emas — trigram indekslar yaratilmaydi: %', sqlerrm;
end $$;

-- ---------------------------------------------------------------------------
-- 1. Enums (tizim-fixed qiymatlar; maktab sozlaydigan qiymatlar — lookup
--    jadvallar: grading_scales, grade_types, subjects, ...)
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.user_role as enum ('SUPER_ADMIN','ADMIN','DIRECTOR','CLASS_TEACHER','TEACHER','PARENT','STUDENT');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.gender as enum ('MALE','FEMALE');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.student_status as enum ('ACTIVE','INACTIVE','GRADUATED','TRANSFERRED','ARCHIVED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.teacher_status as enum ('ACTIVE','INACTIVE','ON_LEAVE','ARCHIVED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.parent_relationship as enum ('MOTHER','FATHER','GUARDIAN','OTHER');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.attendance_status as enum ('PRESENT','ABSENT','EXCUSED','UNEXCUSED','LATE','LEFT_EARLY');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.grade_status as enum ('DRAFT','PUBLISHED','LOCKED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.timetable_version_status as enum ('DRAFT','PUBLISHED','ARCHIVED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.homework_status as enum ('ASSIGNED','SUBMITTED','LATE','CHECKED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.notification_priority as enum ('LOW','MEDIUM','HIGH','CRITICAL');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.notification_channel as enum ('IN_APP','PUSH','TELEGRAM','SMS','EMAIL');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.delivery_status as enum ('QUEUED','SENT','DELIVERED','FAILED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.room_type as enum ('CLASSROOM','LAB','COMPUTER_LAB','SPORTS_HALL','LIBRARY','WORKSHOP','OTHER');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.absence_status as enum ('OPEN','COVERED','CANCELLED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.substitute_status as enum ('PENDING','ASSIGNED','DECLINED','CANCELLED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.job_status as enum ('PENDING','VALIDATING','PREVIEW','RUNNING','COMPLETED','FAILED','CANCELLED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.risk_event_status as enum ('OPEN','ACKNOWLEDGED','RESOLVED','DISMISSED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.dq_issue_status as enum ('OPEN','IGNORED','RESOLVED');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- 2. Umumiy funksiyalar
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at() returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- 3. Platforma yadrosi: maktab, sozlamalar, feature flaglar
-- ---------------------------------------------------------------------------
create table if not exists public.schools (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (length(trim(name)) between 2 and 200),
  school_type  text not null default 'SCHOOL'
               check (school_type in ('SCHOOL','LYCEUM','GYMNASIUM','SPECIALIZED','PRIVATE')),
  address      text,
  phone        text,
  email        text,
  website      text,
  logo_url     text,
  timezone     text not null default 'Asia/Tashkent',
  locale       text not null default 'uz' check (locale in ('uz','ru')),
  branding     jsonb not null default '{}'::jsonb,
  is_demo      boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.school_settings (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid not null references public.schools(id) on delete cascade,
  key         text not null check (length(trim(key)) between 2 and 100),
  value       jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (school_id, key)
);

create table if not exists public.school_features (
  id           uuid primary key default gen_random_uuid(),
  school_id    uuid not null references public.schools(id) on delete cascade,
  feature_key  text not null check (length(trim(feature_key)) between 2 and 60),
  enabled      boolean not null default false,
  config       jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (school_id, feature_key)
);

-- ---------------------------------------------------------------------------
-- 4. O'quv yili, choraklar, dars vaqtlari
-- ---------------------------------------------------------------------------
create table if not exists public.academic_years (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid not null references public.schools(id) on delete cascade,
  name        text not null check (length(trim(name)) between 4 and 20),
  start_date  date not null,
  end_date    date not null,
  is_active   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (school_id, name),
  check (start_date < end_date)
);

create table if not exists public.academic_terms (
  id               uuid primary key default gen_random_uuid(),
  school_id        uuid not null references public.schools(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  term_type        text not null default 'QUARTER' check (term_type in ('QUARTER','SEMESTER')),
  number           smallint not null check (number between 1 and 4),
  name             text not null,
  start_date       date not null,
  end_date         date not null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (academic_year_id, term_type, number),
  check (start_date < end_date)
);

create table if not exists public.lesson_periods (
  id             uuid primary key default gen_random_uuid(),
  school_id      uuid not null references public.schools(id) on delete cascade,
  shift          smallint not null default 1 check (shift between 1 and 3),
  period_number  smallint not null check (period_number between 1 and 12),
  starts_at      time not null,
  ends_at        time not null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (school_id, shift, period_number),
  check (starts_at < ends_at)
);

-- ---------------------------------------------------------------------------
-- 5. Profil va permission tizimi
--    profiles = auth.users bilan 1:1; rol va tenant shu yerda.
--    RLS: 002_rls.sql (profiles'ga INSERT policy YO'Q — faqat service role
--    server tomonida profil yaratadi).
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  school_id    uuid references public.schools(id) on delete cascade,
  role         public.user_role not null default 'STUDENT',
  full_name    text not null check (length(trim(full_name)) between 2 and 200),
  phone        text,
  email        text,
  avatar_url   text,
  is_active    boolean not null default true,
  last_seen_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists profiles_school_idx on public.profiles (school_id, role);
create index if not exists profiles_phone_idx on public.profiles (phone) where phone is not null;

create table if not exists public.roles (
  key         text primary key check (key in ('SUPER_ADMIN','ADMIN','DIRECTOR','CLASS_TEACHER','TEACHER','PARENT','STUDENT')),
  name_uz     text not null,
  description text,
  updated_at  timestamptz not null default now()
);

create table if not exists public.permissions (
  key         text primary key check (length(trim(key)) between 3 and 80),
  description text,
  updated_at  timestamptz not null default now()
);

create table if not exists public.role_permissions (
  role_key        text not null references public.roles(key) on delete cascade,
  permission_key  text not null references public.permissions(key) on delete cascade,
  primary key (role_key, permission_key),
  updated_at      timestamptz not null default now()
);

create table if not exists public.user_permission_overrides (
  id              uuid primary key default gen_random_uuid(),
  school_id       uuid references public.schools(id) on delete cascade,
  profile_id      uuid not null references public.profiles(id) on delete cascade,
  permission_key  text not null references public.permissions(key) on delete cascade,
  allowed         boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (profile_id, permission_key)
);

create table if not exists public.user_sessions (
  id             uuid primary key default gen_random_uuid(),
  school_id      uuid references public.schools(id) on delete cascade,
  profile_id     uuid not null references public.profiles(id) on delete cascade,
  device_name    text,
  user_agent     text,
  ip_hash        text,
  created_at     timestamptz not null default now(),
  last_active_at timestamptz not null default now(),
  revoked_at     timestamptz
);
create index if not exists user_sessions_profile_idx on public.user_sessions (profile_id, revoked_at);

-- ---------------------------------------------------------------------------
-- 6. Xonalar va sinflar
-- ---------------------------------------------------------------------------
create table if not exists public.rooms (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid not null references public.schools(id) on delete cascade,
  name        text not null check (length(trim(name)) between 1 and 100),
  number      text,
  room_type   public.room_type not null default 'CLASSROOM',
  capacity    smallint check (capacity is null or capacity between 1 and 500),
  equipment   jsonb not null default '[]'::jsonb,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (school_id, name)
);

create table if not exists public.classes (
  id               uuid primary key default gen_random_uuid(),
  school_id        uuid not null references public.schools(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  name             text not null check (length(trim(name)) between 1 and 10),
  grade_level      smallint not null check (grade_level between 1 and 12),
  capacity         smallint check (capacity is null or capacity between 1 and 60),
  homeroom_room_id uuid references public.rooms(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (school_id, academic_year_id, name)
);
create index if not exists classes_school_year_idx on public.classes (school_id, academic_year_id);

-- ---------------------------------------------------------------------------
-- 7. Fanlar, baholash shkalalari va turlari
--    DAVLAT MODELIGA MOS KONFIGURATSIYA (2026-10 tasdiq):
--      FORMATIV (kunlik, 10-ball), BSB (bob bo'yicha summativ),
--      CHSB (chorak bo'yicha summativ) — http://lex.uz/mact/-6911657
--    Shkala/tur/vazn — maktab tomonidan sozlanadi, hardcode yo'q.
-- ---------------------------------------------------------------------------
create table if not exists public.subjects (
  id                  uuid primary key default gen_random_uuid(),
  school_id           uuid not null references public.schools(id) on delete cascade,
  name                text not null check (length(trim(name)) between 2 and 100),
  short_name          text check (short_name is null or length(trim(short_name)) between 1 and 20),
  category            text,
  required_room_type  public.room_type,
  is_active           boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (school_id, name)
);

create table if not exists public.grading_scales (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid not null references public.schools(id) on delete cascade,
  name        text not null check (length(trim(name)) between 2 and 50),
  scale_type  text not null default 'NUMERIC' check (scale_type in ('NUMERIC','LETTER')),
  min_value   numeric(6,2) not null default 1,
  max_value   numeric(6,2) not null default 10,
  step        numeric(6,2) not null default 1,
  pass_value  numeric(6,2),
  is_default  boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (school_id, name),
  check (min_value < max_value)
);

create table if not exists public.grade_types (
  id                 uuid primary key default gen_random_uuid(),
  school_id          uuid not null references public.schools(id) on delete cascade,
  code               text not null check (length(trim(code)) between 2 and 20),
  name               text not null check (length(trim(name)) between 2 and 60),
  grading_scale_id   uuid references public.grading_scales(id) on delete set null,
  weight_percent     numeric(5,2) not null default 0 check (weight_percent between 0 and 100),
  counts_toward_term boolean not null default true,
  is_exam            boolean not null default false,
  sort_order         smallint not null default 0,
  is_active          boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (school_id, code)
);

create table if not exists public.class_subjects (
  id                  uuid primary key default gen_random_uuid(),
  school_id           uuid not null references public.schools(id) on delete cascade,
  class_id            uuid not null references public.classes(id) on delete cascade,
  subject_id          uuid not null references public.subjects(id) on delete restrict,
  weekly_hours        smallint not null check (weekly_hours between 1 and 12),
  grading_scale_id    uuid references public.grading_scales(id) on delete set null,
  allow_double_period boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (class_id, subject_id)
);
create index if not exists class_subjects_school_idx on public.class_subjects (school_id, class_id);

create table if not exists public.subject_groups (
  id               uuid primary key default gen_random_uuid(),
  school_id        uuid not null references public.schools(id) on delete cascade,
  class_subject_id uuid not null references public.class_subjects(id) on delete cascade,
  name             text not null check (length(trim(name)) between 1 and 60),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (class_subject_id, name)
);

-- Kalendar (bayram, ta'til, imtihon, tadbir, yig'ilish)
create table if not exists public.calendar_events (
  id               uuid primary key default gen_random_uuid(),
  school_id        uuid not null references public.schools(id) on delete cascade,
  academic_year_id uuid references public.academic_years(id) on delete cascade,
  class_id         uuid references public.classes(id) on delete cascade,
  event_type       text not null check (event_type in ('HOLIDAY','BREAK','EXAM','EVENT','MEETING','OTHER')),
  title            text not null check (length(trim(title)) between 2 and 200),
  description      text,
  starts_on        date not null,
  ends_on          date not null,
  created_by       uuid references public.profiles(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  check (starts_on <= ends_on)
);
create index if not exists calendar_events_school_date_idx on public.calendar_events (school_id, starts_on);

-- ---------------------------------------------------------------------------
-- 8. O'quvchilar (markaziy entity; sinf a'zoligi — student_enrollments,
--    temporal). Yangi sinfga o'tganda yangi student YARATILMAYDI.
-- ---------------------------------------------------------------------------
create table if not exists public.students (
  id                uuid primary key default gen_random_uuid(),
  school_id         uuid not null references public.schools(id) on delete cascade,
  profile_id        uuid unique references public.profiles(id) on delete set null,
  full_name         text not null check (length(trim(full_name)) between 3 and 200),
  birth_date        date not null,
  gender            public.gender not null,
  status            public.student_status not null default 'ACTIVE',
  admission_number  text,
  external_id       text,
  enrolled_on       date default current_date,
  previous_school   text,
  notes             text,
  created_by        uuid references public.profiles(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  deleted_at        timestamptz
);
create unique index if not exists students_admission_uk on public.students (school_id, admission_number) where admission_number is not null;
create unique index if not exists students_external_uk on public.students (school_id, external_id) where external_id is not null;
create index if not exists students_school_status_idx on public.students (school_id, status);
-- search_name: normalized (lowercase) — trigram qidiruv uchun
alter table public.students
  add column if not exists search_name text
  generated always as (lower(full_name)) stored;

create table if not exists public.student_enrollments (
  id               uuid primary key default gen_random_uuid(),
  school_id        uuid not null references public.schools(id) on delete cascade,
  student_id       uuid not null references public.students(id) on delete cascade,
  class_id         uuid not null references public.classes(id) on delete restrict,
  academic_year_id uuid not null references public.academic_years(id) on delete restrict,
  valid_from       date not null default current_date,
  valid_to         date,
  changed_by       uuid references public.profiles(id) on delete set null,
  reason           text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create unique index if not exists student_enrollments_active_uk
  on public.student_enrollments (student_id, academic_year_id) where valid_to is null;
create index if not exists student_enrollments_class_idx
  on public.student_enrollments (class_id) where valid_to is null;

-- ---------------------------------------------------------------------------
-- 9. Ota-onalar (bitta ota-ona — bir nechta farzand; vasiylik va shartnoma
--    ma'lumotlari temporal). Manzil/telefon tarixi — parent_contact_history.
-- ---------------------------------------------------------------------------
create table if not exists public.parents (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid not null references public.schools(id) on delete cascade,
  profile_id  uuid unique references public.profiles(id) on delete set null,
  full_name   text not null check (length(trim(full_name)) between 3 and 200),
  phone       text check (phone is null or length(trim(phone)) between 5 and 30),
  email       text,
  address     text,
  workplace   text,
  notes       text,
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);
alter table public.parents
  add column if not exists search_name text
  generated always as (lower(full_name)) stored;
create index if not exists parents_school_phone_idx on public.parents (school_id, phone) where phone is not null;

create table if not exists public.parent_student (
  id                    uuid primary key default gen_random_uuid(),
  school_id             uuid not null references public.schools(id) on delete cascade,
  parent_id             uuid not null references public.parents(id) on delete cascade,
  student_id            uuid not null references public.students(id) on delete cascade,
  relationship          public.parent_relationship not null,
  is_primary_contact    boolean not null default false,
  can_view_grades       boolean not null default true,
  can_view_attendance   boolean not null default true,
  can_view_documents    boolean not null default false,
  can_receive_messages  boolean not null default true,
  contract_number       text,
  contract_signed_on    date,
  valid_from            date not null default current_date,
  valid_to              date,
  changed_by            uuid references public.profiles(id) on delete set null,
  reason                text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create unique index if not exists parent_student_active_uk
  on public.parent_student (parent_id, student_id) where valid_to is null;
create index if not exists parent_student_student_idx on public.parent_student (student_id) where valid_to is null;

-- ---------------------------------------------------------------------------
-- 10. O'qituvchilar va biriktirishlar (temporal)
-- ---------------------------------------------------------------------------
create table if not exists public.teachers (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid not null references public.schools(id) on delete cascade,
  profile_id  uuid unique references public.profiles(id) on delete set null,
  full_name   text not null check (length(trim(full_name)) between 3 and 200),
  phone       text,
  email       text,
  status      public.teacher_status not null default 'ACTIVE',
  hired_on    date,
  notes       text,
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);
alter table public.teachers
  add column if not exists search_name text
  generated always as (lower(full_name)) stored;

-- Biriktirish: o'qituvchi × sinf-fan × guruh (ixtiyoriy) × o'quv yili
create table if not exists public.teacher_assignments (
  id               uuid primary key default gen_random_uuid(),
  school_id        uuid not null references public.schools(id) on delete cascade,
  teacher_id       uuid not null references public.teachers(id) on delete cascade,
  class_subject_id uuid not null references public.class_subjects(id) on delete cascade,
  subject_group_id uuid references public.subject_groups(id) on delete set null,
  academic_year_id uuid not null references public.academic_years(id) on delete restrict,
  hours_per_week   numeric(4,1) not null default 0 check (hours_per_week >= 0 and hours_per_week <= 40),
  valid_from       date not null default current_date,
  valid_to         date,
  changed_by       uuid references public.profiles(id) on delete set null,
  reason           text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create unique index if not exists teacher_assignments_active_uk
  on public.teacher_assignments (teacher_id, class_subject_id,
      coalesce(subject_group_id, '00000000-0000-0000-0000-000000000000'::uuid))
  where valid_to is null;
create index if not exists teacher_assignments_teacher_idx
  on public.teacher_assignments (teacher_id) where valid_to is null;
create index if not exists teacher_assignments_cs_idx
  on public.teacher_assignments (class_subject_id) where valid_to is null;

-- O'qituvchining band/bo'sh kun-vaqtlari (is_available=false → band)
create table if not exists public.teacher_availability (
  id               uuid primary key default gen_random_uuid(),
  school_id        uuid not null references public.schools(id) on delete cascade,
  teacher_id       uuid not null references public.teachers(id) on delete cascade,
  academic_year_id uuid references public.academic_years(id) on delete cascade,
  day_of_week      smallint not null check (day_of_week between 1 and 7),
  period_number    smallint not null check (period_number between 1 and 12),
  is_available     boolean not null default false,
  reason           text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create unique index if not exists teacher_availability_uk
  on public.teacher_availability
  (teacher_id, coalesce(academic_year_id, '00000000-0000-0000-0000-000000000000'::uuid),
   day_of_week, period_number);

create table if not exists public.teacher_absences (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid not null references public.schools(id) on delete cascade,
  teacher_id  uuid not null references public.teachers(id) on delete cascade,
  starts_on   date not null,
  ends_on     date not null,
  reason      text,
  status      public.absence_status not null default 'OPEN',
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check (starts_on <= ends_on)
);

create table if not exists public.substitute_assignments (
  id                uuid primary key default gen_random_uuid(),
  school_id         uuid not null references public.schools(id) on delete cascade,
  teacher_absence_id uuid references public.teacher_absences(id) on delete set null,
  timetable_slot_id uuid, -- FK quyida (timetable_slots dan keyin) qo'siladi
  effective_date    date not null default current_date,
  substitute_teacher_id uuid not null references public.teachers(id) on delete restrict,
  status            public.substitute_status not null default 'PENDING',
  created_by        uuid references public.profiles(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Sinf rahbari (temporal)
create table if not exists public.class_teacher_assignments (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid not null references public.schools(id) on delete cascade,
  class_id    uuid not null references public.classes(id) on delete cascade,
  teacher_id  uuid not null references public.teachers(id) on delete restrict,
  valid_from  date not null default current_date,
  valid_to    date,
  changed_by  uuid references public.profiles(id) on delete set null,
  reason      text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create unique index if not exists class_teacher_active_uk
  on public.class_teacher_assignments (class_id) where valid_to is null;

-- Guruh a'zolari (temporal)
create table if not exists public.group_students (
  id                uuid primary key default gen_random_uuid(),
  school_id         uuid not null references public.schools(id) on delete cascade,
  subject_group_id  uuid not null references public.subject_groups(id) on delete cascade,
  student_id        uuid not null references public.students(id) on delete cascade,
  valid_from        date not null default current_date,
  valid_to          date,
  changed_by        uuid references public.profiles(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create unique index if not exists group_students_active_uk
  on public.group_students (subject_group_id, student_id) where valid_to is null;

-- ---------------------------------------------------------------------------
-- 11. Dars jadvali: versiyalar, slotlar, istisnolar
--     Konflikt himoyasi DB darajasida — noyoblik indekslari (quyida).
-- ---------------------------------------------------------------------------
create table if not exists public.timetable_versions (
  id               uuid primary key default gen_random_uuid(),
  school_id        uuid not null references public.schools(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  academic_term_id uuid references public.academic_terms(id) on delete set null,
  name             text not null default 'Asosiy jadval',
  status           public.timetable_version_status not null default 'DRAFT',
  score            smallint check (score is null or score between 0 and 100),
  warnings         jsonb not null default '[]'::jsonb,
  generated_by     uuid references public.profiles(id) on delete set null,
  published_at     timestamptz,
  published_by     uuid references public.profiles(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table if not exists public.timetable_slots (
  id                uuid primary key default gen_random_uuid(),
  school_id         uuid not null references public.schools(id) on delete cascade,
  timetable_version_id uuid not null references public.timetable_versions(id) on delete cascade,
  class_id          uuid not null references public.classes(id) on delete cascade,
  class_subject_id  uuid not null references public.class_subjects(id) on delete cascade,
  subject_group_id  uuid references public.subject_groups(id) on delete set null,
  teacher_id        uuid references public.teachers(id) on delete set null,
  room_id           uuid references public.rooms(id) on delete set null,
  day_of_week       smallint not null check (day_of_week between 1 and 7),
  period_number     smallint not null check (period_number between 1 and 12),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
-- Qattiq constraintlar: sinf/o'qituvchi/xona/guruh bir vaqtda ikki joyda bo'la olmaydi
create unique index if not exists timetable_slots_class_uk
  on public.timetable_slots (timetable_version_id, class_id, day_of_week, period_number)
  where subject_group_id is null;
create unique index if not exists timetable_slots_teacher_uk
  on public.timetable_slots (timetable_version_id, teacher_id, day_of_week, period_number)
  where teacher_id is not null;
create unique index if not exists timetable_slots_room_uk
  on public.timetable_slots (timetable_version_id, room_id, day_of_week, period_number)
  where room_id is not null;
create unique index if not exists timetable_slots_group_uk
  on public.timetable_slots (timetable_version_id, subject_group_id, day_of_week, period_number)
  where subject_group_id is not null;
create index if not exists timetable_slots_version_class_idx
  on public.timetable_slots (timetable_version_id, class_id, day_of_week, period_number);
create index if not exists timetable_slots_version_teacher_idx
  on public.timetable_slots (timetable_version_id, teacher_id, day_of_week, period_number);

-- Sana-maxsus ustma-ust yozuv: bekor qilish, xona almashish, almashtirish
create table if not exists public.timetable_exceptions (
  id                uuid primary key default gen_random_uuid(),
  school_id         uuid not null references public.schools(id) on delete cascade,
  base_slot_id      uuid references public.timetable_slots(id) on delete cascade,
  class_id          uuid not null references public.classes(id) on delete cascade,
  class_subject_id  uuid references public.class_subjects(id) on delete set null,
  teacher_id        uuid references public.teachers(id) on delete set null,
  room_id           uuid references public.rooms(id) on delete set null,
  effective_date    date not null,
  period_number     smallint check (period_number is null or period_number between 1 and 12),
  exception_type    text not null check (exception_type in ('CANCELLED','SUBSTITUTE','ROOM_CHANGE','TIME_CHANGE','EXTRA')),
  note              text,
  created_by        uuid references public.profiles(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists timetable_exceptions_date_idx
  on public.timetable_exceptions (school_id, effective_date);

-- substitute_assignments → timetable_slots FK (jadval tartibi sababli keyin)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'substitute_assignments_slot_fkey'
      and conrelid = 'public.substitute_assignments'::regclass
  ) then
    alter table public.substitute_assignments
      add constraint substitute_assignments_slot_fkey
      foreign key (timetable_slot_id) references public.timetable_slots(id) on delete cascade;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 12. Jurnal: darslar, davomat, baholar
-- ---------------------------------------------------------------------------
create table if not exists public.lessons (
  id                uuid primary key default gen_random_uuid(),
  school_id         uuid not null references public.schools(id) on delete cascade,
  class_id          uuid not null references public.classes(id) on delete cascade,
  class_subject_id  uuid not null references public.class_subjects(id) on delete cascade,
  subject_group_id  uuid references public.subject_groups(id) on delete set null,
  teacher_id        uuid references public.teachers(id) on delete set null,
  timetable_slot_id uuid references public.timetable_slots(id) on delete set null,
  lesson_date       date not null,
  period_number     smallint not null check (period_number between 1 and 12),
  topic             text,
  is_cancelled      boolean not null default false,
  created_by        uuid references public.profiles(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
-- Bir vaqtda parallel guruh darslari mumkin (har guruh alohida qator)
create unique index if not exists lessons_slot_uk
  on public.lessons (class_subject_id,
      coalesce(subject_group_id, '00000000-0000-0000-0000-000000000000'::uuid),
      lesson_date, period_number);
create index if not exists lessons_school_date_idx on public.lessons (school_id, lesson_date desc);
create index if not exists lessons_class_date_idx on public.lessons (class_id, lesson_date desc);
create index if not exists lessons_teacher_date_idx on public.lessons (teacher_id, lesson_date desc) where teacher_id is not null;

create table if not exists public.attendance (
  id                uuid primary key default gen_random_uuid(),
  school_id         uuid not null references public.schools(id) on delete cascade,
  lesson_id         uuid not null references public.lessons(id) on delete cascade,
  student_id        uuid not null references public.students(id) on delete cascade,
  status            public.attendance_status not null,
  reason            text,
  marked_by         uuid references public.profiles(id) on delete set null,
  marked_at         timestamptz not null default now(),
  is_locked         boolean not null default false,
  -- tuzatish maydonlari (audit_log bilan birga — ishbiznes sababi shu yerda)
  previous_status   public.attendance_status,
  change_reason     text,
  corrected_by      uuid references public.profiles(id) on delete set null,
  corrected_at      timestamptz,
  client_uuid       uuid,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (lesson_id, student_id)
);
create index if not exists attendance_school_student_idx
  on public.attendance (school_id, student_id, marked_at desc);
create index if not exists attendance_lesson_idx on public.attendance (lesson_id);
create unique index if not exists attendance_client_uuid_uk
  on public.attendance (client_uuid) where client_uuid is not null;

create table if not exists public.grades (
  id                uuid primary key default gen_random_uuid(),
  school_id         uuid not null references public.schools(id) on delete cascade,
  student_id        uuid not null references public.students(id) on delete cascade,
  class_subject_id  uuid not null references public.class_subjects(id) on delete cascade,
  lesson_id         uuid references public.lessons(id) on delete set null,
  grade_type_id     uuid not null references public.grade_types(id) on delete restrict,
  academic_term_id  uuid references public.academic_terms(id) on delete set null,
  value             numeric(6,2) not null check (value >= 0 and value <= 1000),
  status            public.grade_status not null default 'DRAFT',
  given_by          uuid references public.profiles(id) on delete set null,
  given_at          timestamptz not null default now(),
  -- tuzatish maydonlari
  previous_value    numeric(6,2),
  change_reason     text,
  corrected_by      uuid references public.profiles(id) on delete set null,
  corrected_at      timestamptz,
  client_uuid       uuid,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create unique index if not exists grades_lesson_uk
  on public.grades (student_id, class_subject_id, lesson_id, grade_type_id)
  where lesson_id is not null;
create unique index if not exists grades_term_uk
  on public.grades (student_id, class_subject_id, academic_term_id, grade_type_id)
  where lesson_id is null and academic_term_id is not null;
create index if not exists grades_school_student_idx
  on public.grades (school_id, student_id, given_at desc);
create index if not exists grades_class_subject_idx
  on public.grades (class_subject_id, status);
create unique index if not exists grades_client_uuid_uk
  on public.grades (client_uuid) where client_uuid is not null;

-- ---------------------------------------------------------------------------
-- 13. Uy vazifalari
-- ---------------------------------------------------------------------------
create table if not exists public.homework (
  id                uuid primary key default gen_random_uuid(),
  school_id         uuid not null references public.schools(id) on delete cascade,
  class_subject_id  uuid not null references public.class_subjects(id) on delete cascade,
  subject_group_id  uuid references public.subject_groups(id) on delete set null,
  title             text not null check (length(trim(title)) between 2 and 200),
  description       text,
  assigned_at       timestamptz not null default now(),
  due_at            timestamptz,
  target_type       text not null default 'CLASS'
                    check (target_type in ('CLASS','GROUP','STUDENTS')),
  attachments       jsonb not null default '[]'::jsonb,
  links             jsonb not null default '[]'::jsonb,
  is_published      boolean not null default true,
  created_by        uuid references public.profiles(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists homework_school_due_idx on public.homework (school_id, due_at);
create index if not exists homework_cs_idx on public.homework (class_subject_id);

create table if not exists public.homework_targets (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid not null references public.schools(id) on delete cascade,
  homework_id uuid not null references public.homework(id) on delete cascade,
  student_id  uuid not null references public.students(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (homework_id, student_id)
);

create table if not exists public.homework_submissions (
  id              uuid primary key default gen_random_uuid(),
  school_id       uuid not null references public.schools(id) on delete cascade,
  homework_id     uuid not null references public.homework(id) on delete cascade,
  student_id      uuid not null references public.students(id) on delete cascade,
  content         text,
  attachments     jsonb not null default '[]'::jsonb,
  submitted_at    timestamptz,
  status          public.homework_status not null default 'ASSIGNED',
  teacher_comment text,
  grade_id        uuid references public.grades(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (homework_id, student_id)
);

-- ---------------------------------------------------------------------------
-- 14. Xabarlar va e'lonlar
-- ---------------------------------------------------------------------------
create table if not exists public.message_templates (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid not null references public.schools(id) on delete cascade,
  name        text not null check (length(trim(name)) between 2 and 100),
  category    text not null default 'GENERAL',
  body        text not null check (length(trim(body)) between 2 and 2000),
  is_active   boolean not null default true,
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (school_id, name)
);

create table if not exists public.messages (
  id             uuid primary key default gen_random_uuid(),
  school_id      uuid not null references public.schools(id) on delete cascade,
  sender_id      uuid not null references public.profiles(id) on delete cascade,
  target_type    text not null default 'INDIVIDUAL'
                 check (target_type in ('INDIVIDUAL','CLASS','CLASS_PARENTS','GROUP','TEACHERS','SCHOOL')),
  class_id       uuid references public.classes(id) on delete set null,
  subject        text,
  body           text not null check (length(trim(body)) between 1 and 4000),
  scheduled_for  timestamptz,
  sent_at        timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists messages_school_created_idx on public.messages (school_id, created_at desc);

create table if not exists public.message_recipients (
  id           uuid primary key default gen_random_uuid(),
  school_id    uuid not null references public.schools(id) on delete cascade,
  message_id   uuid not null references public.messages(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  is_read      boolean not null default false,
  read_at      timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (message_id, recipient_id)
);
create index if not exists message_recipients_recipient_idx
  on public.message_recipients (recipient_id, is_read);

create table if not exists public.announcements (
  id             uuid primary key default gen_random_uuid(),
  school_id      uuid not null references public.schools(id) on delete cascade,
  author_id      uuid not null references public.profiles(id) on delete cascade,
  scope          text not null default 'SCHOOL'
                 check (scope in ('SCHOOL','CLASS','TEACHERS','CLASS_TEACHERS')),
  class_id       uuid references public.classes(id) on delete cascade,
  title          text not null check (length(trim(title)) between 2 and 200),
  body           text not null,
  attachments    jsonb not null default '[]'::jsonb,
  scheduled_for  timestamptz,
  published_at   timestamptz,
  expires_at     timestamptz,
  is_pinned      boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists announcements_school_published_idx
  on public.announcements (school_id, published_at desc);

create table if not exists public.announcement_recipients (
  id              uuid primary key default gen_random_uuid(),
  school_id       uuid not null references public.schools(id) on delete cascade,
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  profile_id      uuid not null references public.profiles(id) on delete cascade,
  read_at         timestamptz,
  created_at      timestamptz not null default now(),
  unique (announcement_id, profile_id)
);

-- ---------------------------------------------------------------------------
-- 15. Bildirishnomalar (event → notification → delivery; kanal adapterlari
--     alohida: IN_APP, PUSH, TELEGRAM, SMS, EMAIL)
-- ---------------------------------------------------------------------------
create table if not exists public.notifications (
  id             uuid primary key default gen_random_uuid(),
  school_id      uuid not null references public.schools(id) on delete cascade,
  recipient_id   uuid not null references public.profiles(id) on delete cascade,
  event_type     text not null check (length(event_type) between 2 and 60),
  title          text not null,
  body           text not null,
  priority       public.notification_priority not null default 'MEDIUM',
  entity_type    text,
  entity_id      uuid,
  payload        jsonb not null default '{}'::jsonb,
  is_read        boolean not null default false,
  read_at        timestamptz,
  created_by     uuid references public.profiles(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists notifications_recipient_idx
  on public.notifications (recipient_id, is_read, created_at desc);

create table if not exists public.notification_preferences (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid not null references public.schools(id) on delete cascade,
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  event_type  text not null,
  channel     public.notification_channel not null,
  enabled     boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (profile_id, event_type, channel)
);

create table if not exists public.notification_deliveries (
  id               uuid primary key default gen_random_uuid(),
  school_id        uuid not null references public.schools(id) on delete cascade,
  notification_id  uuid not null references public.notifications(id) on delete cascade,
  channel          public.notification_channel not null,
  target           text,
  status           public.delivery_status not null default 'QUEUED',
  attempts         smallint not null default 0,
  last_attempt_at  timestamptz,
  delivered_at     timestamptz,
  error            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists notification_deliveries_status_idx
  on public.notification_deliveries (status, created_at);

create table if not exists public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid not null references public.schools(id) on delete cascade,
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  user_agent  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  revoked_at  timestamptz
);

create table if not exists public.telegram_accounts (
  id              uuid primary key default gen_random_uuid(),
  school_id       uuid not null references public.schools(id) on delete cascade,
  profile_id      uuid not null references public.profiles(id) on delete cascade,
  telegram_user_id bigint not null,
  chat_id         bigint not null,
  username        text,
  is_verified     boolean not null default false,
  linked_at       timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (profile_id),
  unique (school_id, telegram_user_id)
);

-- ---------------------------------------------------------------------------
-- 16. Risk, data quality, agregatlar
-- ---------------------------------------------------------------------------
create table if not exists public.risk_rules (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid not null references public.schools(id) on delete cascade,
  code        text not null check (length(trim(code)) between 2 and 60),
  name        text not null,
  description text,
  config      jsonb not null default '{}'::jsonb,
  is_active   boolean not null default true,
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (school_id, code)
);

create table if not exists public.risk_events (
  id               uuid primary key default gen_random_uuid(),
  school_id        uuid not null references public.schools(id) on delete cascade,
  student_id       uuid not null references public.students(id) on delete cascade,
  rule_id          uuid references public.risk_rules(id) on delete set null,
  severity         public.notification_priority not null default 'MEDIUM',
  reasons          jsonb not null default '[]'::jsonb, -- izohlanadigan sabablar ro'yxati
  status           public.risk_event_status not null default 'OPEN',
  opened_at        timestamptz not null default now(),
  acknowledged_by  uuid references public.profiles(id) on delete set null,
  acknowledged_at  timestamptz,
  resolved_by      uuid references public.profiles(id) on delete set null,
  resolved_at      timestamptz,
  resolution_note  text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists risk_events_school_status_idx
  on public.risk_events (school_id, status, severity);

create table if not exists public.data_quality_issues (
  id             uuid primary key default gen_random_uuid(),
  school_id      uuid not null references public.schools(id) on delete cascade,
  issue_type     text not null,
  entity_type    text not null,
  entity_id      uuid,
  severity       public.notification_priority not null default 'LOW',
  message        text not null,
  suggested_fix  text,
  status         public.dq_issue_status not null default 'OPEN',
  detected_at    timestamptz not null default now(),
  resolved_at    timestamptz,
  updated_at     timestamptz not null default now()
);
create index if not exists data_quality_issues_school_idx
  on public.data_quality_issues (school_id, status);

-- Dashboard uchun precomputed kunlik agregatlar (trigger/cron yangilaydi)
create table if not exists public.daily_summaries (
  id            uuid primary key default gen_random_uuid(),
  school_id     uuid not null references public.schools(id) on delete cascade,
  summary_date  date not null,
  class_id      uuid references public.classes(id) on delete cascade,
  metrics       jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create unique index if not exists daily_summaries_uk
  on public.daily_summaries (school_id, summary_date, coalesce(class_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- ---------------------------------------------------------------------------
-- 17. Hujjatlar (metadata; fayllar — Supabase Storage, private bucket)
-- ---------------------------------------------------------------------------
create table if not exists public.document_templates (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid not null references public.schools(id) on delete cascade,
  code        text not null check (length(trim(code)) between 2 and 60),
  name        text not null,
  category    text not null default 'GENERAL',
  body        text not null,
  variables   jsonb not null default '[]'::jsonb,
  is_active   boolean not null default true,
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (school_id, code)
);

create table if not exists public.documents (
  id             uuid primary key default gen_random_uuid(),
  school_id      uuid not null references public.schools(id) on delete cascade,
  bucket         text not null,
  storage_path   text not null,
  name           text not null,
  document_type  text not null default 'OTHER',
  student_id     uuid references public.students(id) on delete cascade,
  parent_id      uuid references public.parents(id) on delete cascade,
  size_bytes     bigint check (size_bytes is null or size_bytes >= 0),
  mime_type      text,
  metadata       jsonb not null default '{}'::jsonb,
  uploaded_by    uuid references public.profiles(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (bucket, storage_path)
);
create index if not exists documents_school_student_idx on public.documents (school_id, student_id);

-- ---------------------------------------------------------------------------
-- 18. Import / eksport vazifalari
-- ---------------------------------------------------------------------------
create table if not exists public.import_jobs (
  id             uuid primary key default gen_random_uuid(),
  school_id      uuid not null references public.schools(id) on delete cascade,
  created_by     uuid not null references public.profiles(id) on delete cascade,
  import_type    text not null check (import_type in ('STUDENTS','PARENTS','TEACHERS','CLASSES','SUBJECTS','GRADES','ATTENDANCE')),
  file_name      text,
  status         public.job_status not null default 'PENDING',
  total_rows     integer not null default 0,
  valid_rows     integer not null default 0,
  error_rows     integer not null default 0,
  inserted_rows  integer not null default 0,
  updated_rows   integer not null default 0,
  options        jsonb not null default '{}'::jsonb,
  result         jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table if not exists public.import_errors (
  id             uuid primary key default gen_random_uuid(),
  school_id      uuid not null references public.schools(id) on delete cascade,
  import_job_id  uuid not null references public.import_jobs(id) on delete cascade,
  row_number     integer not null check (row_number > 0),
  column_name    text,
  raw_value      text,
  error_code     text,
  message        text not null,
  created_at     timestamptz not null default now()
);
create index if not exists import_errors_job_idx on public.import_errors (import_job_id);

create table if not exists public.export_jobs (
  id           uuid primary key default gen_random_uuid(),
  school_id    uuid not null references public.schools(id) on delete cascade,
  created_by   uuid not null references public.profiles(id) on delete cascade,
  export_type  text not null,
  format       text not null check (format in ('PDF','XLSX','CSV')),
  filters      jsonb not null default '{}'::jsonb,
  status       public.job_status not null default 'PENDING',
  file_bucket  text,
  file_path    text,
  error        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 19. Tarix (temporal) jadvallari — SCD snapshot modeli.
--     Trigger: yangilanganda/islanganda ESKI qator snapshot sifatida
--     yoziladi (valid_from..valid_to = yopilgan davr).
-- ---------------------------------------------------------------------------
create table if not exists public.student_enrollments_history (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid not null,
  entity_id   uuid not null,
  snapshot    jsonb not null,
  valid_from  date,
  valid_to    date,
  changed_by  uuid,
  reason      text,
  created_at  timestamptz not null default now()
);
create index if not exists student_enrollments_history_entity_idx
  on public.student_enrollments_history (entity_id, created_at desc);

create table if not exists public.parent_student_history (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid not null,
  entity_id   uuid not null,
  snapshot    jsonb not null,
  valid_from  date,
  valid_to    date,
  changed_by  uuid,
  reason      text,
  created_at  timestamptz not null default now()
);
create index if not exists parent_student_history_entity_idx
  on public.parent_student_history (entity_id, created_at desc);

create table if not exists public.teacher_assignments_history (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid not null,
  entity_id   uuid not null,
  snapshot    jsonb not null,
  valid_from  date,
  valid_to    date,
  changed_by  uuid,
  reason      text,
  created_at  timestamptz not null default now()
);
create index if not exists teacher_assignments_history_entity_idx
  on public.teacher_assignments_history (entity_id, created_at desc);

create table if not exists public.class_teacher_assignments_history (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid not null,
  entity_id   uuid not null,
  snapshot    jsonb not null,
  valid_from  date,
  valid_to    date,
  changed_by  uuid,
  reason      text,
  created_at  timestamptz not null default now()
);
create index if not exists class_teacher_assignments_history_entity_idx
  on public.class_teacher_assignments_history (entity_id, created_at desc);

create table if not exists public.group_students_history (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid not null,
  entity_id   uuid not null,
  snapshot    jsonb not null,
  valid_from  date,
  valid_to    date,
  changed_by  uuid,
  reason      text,
  created_at  timestamptz not null default now()
);
create index if not exists group_students_history_entity_idx
  on public.group_students_history (entity_id, created_at desc);

-- Ota-ona manzil/telefon o'zgarishlari (maydon-darajasidagi tarix)
create table if not exists public.parent_contact_history (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid not null,
  parent_id   uuid not null,
  field_name  text not null check (field_name in ('ADDRESS','PHONE','EMAIL','WORKPLACE')),
  old_value   text,
  new_value   text,
  changed_by  uuid,
  reason      text,
  created_at  timestamptz not null default now()
);
create index if not exists parent_contact_history_parent_idx
  on public.parent_contact_history (parent_id, created_at desc);

-- --- Snapshot trigger funksiyalari -----------------------------------------
create or replace function public.snapshot_student_enrollments_history()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' and to_jsonb(old) = to_jsonb(new) then return new; end if;
  insert into public.student_enrollments_history
    (school_id, entity_id, snapshot, valid_from, valid_to, changed_by, reason)
  values (old.school_id, old.id, to_jsonb(old), old.valid_from, old.valid_to,
          auth.uid(), case when tg_op = 'UPDATE' then new.reason else null end);
  return coalesce(new, old);
end $$;

create or replace function public.snapshot_parent_student_history()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' and to_jsonb(old) = to_jsonb(new) then return new; end if;
  insert into public.parent_student_history
    (school_id, entity_id, snapshot, valid_from, valid_to, changed_by, reason)
  values (old.school_id, old.id, to_jsonb(old), old.valid_from, old.valid_to,
          auth.uid(), case when tg_op = 'UPDATE' then new.reason else null end);
  return coalesce(new, old);
end $$;

create or replace function public.snapshot_teacher_assignments_history()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' and to_jsonb(old) = to_jsonb(new) then return new; end if;
  insert into public.teacher_assignments_history
    (school_id, entity_id, snapshot, valid_from, valid_to, changed_by, reason)
  values (old.school_id, old.id, to_jsonb(old), old.valid_from, old.valid_to,
          auth.uid(), case when tg_op = 'UPDATE' then new.reason else null end);
  return coalesce(new, old);
end $$;

create or replace function public.snapshot_class_teacher_assignments_history()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' and to_jsonb(old) = to_jsonb(new) then return new; end if;
  insert into public.class_teacher_assignments_history
    (school_id, entity_id, snapshot, valid_from, valid_to, changed_by, reason)
  values (old.school_id, old.id, to_jsonb(old), old.valid_from, old.valid_to,
          auth.uid(), case when tg_op = 'UPDATE' then new.reason else null end);
  return coalesce(new, old);
end $$;

create or replace function public.snapshot_group_students_history()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' and to_jsonb(old) = to_jsonb(new) then return new; end if;
  insert into public.group_students_history
    (school_id, entity_id, snapshot, valid_from, valid_to, changed_by, reason)
  values (old.school_id, old.id, to_jsonb(old), old.valid_from, old.valid_to,
          auth.uid(), case when tg_op = 'UPDATE' then new.reason else null end);
  return coalesce(new, old);
end $$;

create or replace function public.snapshot_parent_contact_history()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.address is distinct from new.address then
    insert into public.parent_contact_history (school_id, parent_id, field_name, old_value, new_value, changed_by)
    values (old.school_id, old.id, 'ADDRESS', old.address, new.address, auth.uid());
  end if;
  if old.phone is distinct from new.phone then
    insert into public.parent_contact_history (school_id, parent_id, field_name, old_value, new_value, changed_by)
    values (old.school_id, old.id, 'PHONE', old.phone, new.phone, auth.uid());
  end if;
  if old.email is distinct from new.email then
    insert into public.parent_contact_history (school_id, parent_id, field_name, old_value, new_value, changed_by)
    values (old.school_id, old.id, 'EMAIL', old.email, new.email, auth.uid());
  end if;
  if old.workplace is distinct from new.workplace then
    insert into public.parent_contact_history (school_id, parent_id, field_name, old_value, new_value, changed_by)
    values (old.school_id, old.id, 'WORKPLACE', old.workplace, new.workplace, auth.uid());
  end if;
  return new;
end $$;

drop trigger if exists trg_student_enrollments_history on public.student_enrollments;
create trigger trg_student_enrollments_history
  before update or delete on public.student_enrollments
  for each row execute function public.snapshot_student_enrollments_history();

drop trigger if exists trg_parent_student_history on public.parent_student;
create trigger trg_parent_student_history
  before update or delete on public.parent_student
  for each row execute function public.snapshot_parent_student_history();

drop trigger if exists trg_teacher_assignments_history on public.teacher_assignments;
create trigger trg_teacher_assignments_history
  before update or delete on public.teacher_assignments
  for each row execute function public.snapshot_teacher_assignments_history();

drop trigger if exists trg_class_teacher_assignments_history on public.class_teacher_assignments;
create trigger trg_class_teacher_assignments_history
  before update or delete on public.class_teacher_assignments
  for each row execute function public.snapshot_class_teacher_assignments_history();

drop trigger if exists trg_group_students_history on public.group_students;
create trigger trg_group_students_history
  before update or delete on public.group_students
  for each row execute function public.snapshot_group_students_history();

drop trigger if exists trg_parent_contact_history on public.parents;
create trigger trg_parent_contact_history
  before update on public.parents
  for each row execute function public.snapshot_parent_contact_history();

-- ---------------------------------------------------------------------------
-- 20. Trigram qidiruv indekslari (pg_trgm mavjud bo'lsa — Supabase'da bor)
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_trgm') then
    create index if not exists students_school_search_trgm
      on public.students using gin (search_name extensions.gin_trgm_ops);
    create index if not exists parents_school_search_trgm
      on public.parents using gin (search_name extensions.gin_trgm_ops);
    create index if not exists teachers_school_search_trgm
      on public.teachers using gin (search_name extensions.gin_trgm_ops);
  else
    raise notice 'pg_trgm o''rnatilmagan — trigram qidiruv indekslari yaratilmadi';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 21. updated_at triggerlari (updated_at ustuni bor barcha jadvallarga)
-- ---------------------------------------------------------------------------
do $$
declare
  t record;
begin
  for t in
    select table_name from information_schema.tables
    where table_schema = 'public' and table_type = 'BASE TABLE'
  loop
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = t.table_name and column_name = 'updated_at'
    ) then
      execute format('drop trigger if exists trg_set_updated_at on public.%I', t.table_name);
      execute format('create trigger trg_set_updated_at before update on public.%I
                      for each row execute function public.set_updated_at()', t.table_name);
    end if;
  end loop;
end $$;

commit;
