-- ============================================================================
-- SchoolOS Uzbekistan — LOCAL TEST HARNESS (FAQAT LOKAL POSTGRES UCHUN!)
-- ----------------------------------------------------------------------------
-- Supabase muhitini (auth/storage sxemalari, rollar, grantlar) lokal
-- PostgreSQL'da emulyatsiya qiladi — migration va RLS testlarini Supabase'siz
-- tekshirish uchun. SUPABASE'DA BUNI ISHLATMANG (u yerda bunisi allaqachon bor).
-- Ishlatish: psql -f local_harness.sql -f ../migrations/001_schema.sql ...
-- ============================================================================

-- Supabase rollari
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin bypassrls;
  end if;
end $$;

create schema if not exists auth;
create schema if not exists storage;
create schema if not exists extensions;

-- Supabase'dagi kabi default privileges (jadval/funksiya grantlari)
alter default privileges for role postgres in schema public
  grant all on tables to postgres, anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  grant all on functions to postgres, anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  grant all on sequences to postgres, anon, authenticated, service_role;

grant usage on schema public, auth, storage, extensions to anon, authenticated, service_role;

-- auth.users / auth.identities stub
create table if not exists auth.users (
  id uuid primary key,
  aud text,
  role text,
  email text,
  encrypted_password text,
  email_confirmed_at timestamptz,
  raw_app_meta_data jsonb default '{}'::jsonb,
  raw_user_meta_data jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists auth.identities (
  id uuid not null,
  user_id uuid not null,
  provider_id text not null,
  identity_data jsonb default '{}'::jsonb,
  provider text not null,
  last_sign_in_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  primary key (provider, id)
);

-- auth.uid() — request.jwt.claim.sub GUC dan o'qiydi (Supabase JWT modeli)
create or replace function auth.uid() returns uuid
language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

-- storage stub
create table if not exists storage.buckets (
  id text primary key,
  name text not null,
  public boolean not null default false,
  file_size_limit bigint,
  allowed_mime_types jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text,
  name text,
  owner uuid,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table storage.objects enable row level security;

grant all on all tables in schema auth, storage to anon, authenticated, service_role;
