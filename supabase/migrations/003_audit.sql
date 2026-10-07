-- ============================================================================
-- SchoolOS Uzbekistan — Migration 003: AUDIT LOG
-- ----------------------------------------------------------------------------
-- 002_rls dan keyin bajariladi.
-- Har muhim mutation trigger orqali audit_log'ga yoziladi (application bug
-- auditni chetlab o'tolmaydi). App-event'lar (LOGIN, EXPORT, IMPORT,
-- PUBLISH...) uchun audit_log_action() funksiyasi — faqat service role.
-- audit_log IMMUTABLE: UPDATE/DELETE hech bir rolga ruxsat etilmagan.
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1. Jadval
-- ---------------------------------------------------------------------------
create table if not exists public.audit_log (
  id              uuid primary key default gen_random_uuid(),
  school_id       uuid,                  -- tenant (system eventlarda null bo'lishi mumkin)
  actor_profile_id uuid,                 -- kim (auth.uid(); system eventda null)
  actor_type      text not null default 'USER'
                  check (actor_type in ('USER','SYSTEM','SERVICE')),
  actor_role      public.user_role,      -- paytdagi roli
  action          text not null check (length(action) between 2 and 60),
  entity_type     text,                  -- masalan: 'students', 'grades'
  entity_id       uuid,
  old_data        jsonb,
  new_data        jsonb,
  ip_hash         text,                  -- to'liq IP emas — hash (privacy)
  user_agent      text,
  request_id      text,
  created_at      timestamptz not null default now()
);

create index if not exists audit_log_school_time_idx
  on public.audit_log (school_id, created_at desc);
create index if not exists audit_log_entity_idx
  on public.audit_log (entity_type, entity_id, created_at desc);
create index if not exists audit_log_actor_idx
  on public.audit_log (actor_profile_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 2. Umumiy trigger funksiyasi
--    old_data/new_data: sezgir kalitlar (password, secret, token) maskalanadi.
-- ---------------------------------------------------------------------------
create or replace function public.audit_mask_sensitive(p_data jsonb)
returns jsonb language sql stable
set search_path = public, extensions as $$
  select case
    when p_data is null then null
    else coalesce((
      select jsonb_object_agg(
        key,
        case when key ~* '(password|secret|token|private_key)'
             then to_jsonb('***'::text) else value end
      )
      from jsonb_each(p_data)
    ), '{}'::jsonb)
  end
$$;

create or replace function public.audit_row_change()
returns trigger language plpgsql security definer
set search_path = public, auth as $$
declare
  v_old jsonb; v_new jsonb;
  v_school uuid; v_actor uuid; v_role public.user_role;
begin
  v_actor := auth.uid();  -- service role/null bo'lsa null
  if v_actor is not null then
    select p.school_id, p.role into v_school, v_role
    from public.profiles p where p.id = v_actor;
  end if;

  if tg_op = 'DELETE' then
    v_old := public.audit_mask_sensitive(to_jsonb(old));
    insert into public.audit_log
      (school_id, actor_profile_id, actor_type, actor_role, action,
       entity_type, entity_id, old_data, new_data)
    values
      (coalesce(v_school, ((to_jsonb(old))->>'school_id')::uuid), v_actor, 'USER', v_role, 'DELETE',
       tg_table_name, old.id, v_old, null);
  else
    if tg_op = 'UPDATE' then
      v_old := public.audit_mask_sensitive(to_jsonb(old));
    end if;
    v_new := public.audit_mask_sensitive(to_jsonb(new));
    insert into public.audit_log
      (school_id, actor_profile_id, actor_type, actor_role, action,
       entity_type, entity_id, old_data, new_data)
    values
      (coalesce(v_school, (v_new->>'school_id')::uuid), v_actor,
       case when v_actor is null then 'SERVICE' else 'USER' end, v_role,
       case when tg_op = 'INSERT' then 'CREATE' else 'UPDATE' end,
       tg_table_name, new.id, v_old, v_new);
  end if;

  return coalesce(new, old);
end $$;

-- ---------------------------------------------------------------------------
-- 3. Audit triggerlarini o'rnatish (muhim jadvallar)
--    AFTER trigger: NEW qiymati barcha BEFORE triggerlardan keyingi holatda.
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
  v_tables text[] := array[
    'profiles', 'user_permission_overrides',
    'students', 'student_enrollments', 'parents', 'parent_student', 'teachers',
    'teacher_assignments', 'class_teacher_assignments', 'group_students',
    'classes', 'subjects', 'class_subjects', 'subject_groups', 'rooms',
    'grading_scales', 'grade_types',
    'timetable_versions', 'timetable_slots', 'timetable_exceptions',
    'teacher_absences', 'substitute_assignments',
    'lessons', 'attendance', 'grades',
    'homework', 'homework_submissions',
    'messages', 'announcements',
    'documents', 'document_templates',
    'school_settings', 'school_features',
    'risk_events', 'risk_rules',
    'import_jobs', 'export_jobs'
  ];
begin
  foreach t in array v_tables loop
    execute format('drop trigger if exists trg_audit_%s on public.%I', t, t);
    execute format('create trigger trg_audit_%s after insert or update or delete on public.%I
                    for each row execute function public.audit_row_change()', t, t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 4. App-event audit funksiyasi (LOGIN, LOGOUT, EXPORT, IMPORT, PUBLISH...)
--    FAQAT service role chaqirishi mumkin (authenticated'ga revoke).
--    IP hash: current_setting orqali middleware'dan uzatiladi (bo'lmasa null).
-- ---------------------------------------------------------------------------
create or replace function public.audit_log_action(
  p_action      text,
  p_entity_type text default null,
  p_entity_id   uuid default null,
  p_old_data    jsonb default null,
  p_new_data    jsonb default null
) returns uuid
language plpgsql security definer
set search_path = public, auth as $$
declare
  v_id uuid; v_actor uuid; v_school uuid; v_role public.user_role;
begin
  v_actor := auth.uid();
  if v_actor is not null then
    select p.school_id, p.role into v_school, v_role
    from public.profiles p where p.id = v_actor;
  end if;

  insert into public.audit_log
    (school_id, actor_profile_id, actor_type, actor_role, action,
     entity_type, entity_id, old_data, new_data,
     ip_hash, user_agent, request_id)
  values
    (v_school, v_actor, 'USER', v_role, p_action,
     p_entity_type, p_entity_id,
     public.audit_mask_sensitive(p_old_data), public.audit_mask_sensitive(p_new_data),
     nullif(current_setting('request.headers.x_hashed_ip', true), ''),
     nullif(current_setting('request.headers.user_agent', true), ''),
     nullif(current_setting('request.headers.x_request_id', true), ''))
  returning id into v_id;

  return v_id;
end $$;

-- Sahtekorlik himoyasi: oddiy foydalanuvchi audit yozolmasin
revoke execute on function public.audit_log_action(text, text, uuid, jsonb, jsonb)
  from public, anon, authenticated;
grant execute on function public.audit_log_action(text, text, uuid, jsonb, jsonb)
  to service_role;

-- ---------------------------------------------------------------------------
-- 5. IMMUTABLE: audit_log'ni hech kim o'zgartira/yangilolmasin
-- ---------------------------------------------------------------------------
revoke update, delete, insert on public.audit_log from anon, authenticated;

create or replace function public.audit_log_immutable()
returns trigger language plpgsql as $$
begin
  raise exception 'audit_log o''zgartirib bo''lmaydi (immutable audit yozuvi): %', tg_op;
end $$;

drop trigger if exists trg_audit_log_immutable on public.audit_log;
create trigger trg_audit_log_immutable
  before update or delete on public.audit_log
  for each row execute function public.audit_log_immutable();

-- ---------------------------------------------------------------------------
-- 6. RLS: o'qish — maktab admini yoki super admin; yozish — faqat triggerlar
-- ---------------------------------------------------------------------------
alter table public.audit_log enable row level security;

drop policy if exists audit_log_select on public.audit_log;
create policy audit_log_select on public.audit_log for select to authenticated
  using ((school_id = public.app_school_id() and public.app_is_school_admin())
         or public.app_is_super_admin());

commit;
