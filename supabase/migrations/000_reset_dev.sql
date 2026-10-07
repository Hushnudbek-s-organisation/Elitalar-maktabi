-- ============================================================================
-- SchoolOS Uzbekistan — 000: DEV LOYIHASINI TO'LIQ TOZALASH (RESET)
-- ----------------------------------------------------------------------------
-- ⚠️⚠️⚠️ FAQAT DEV / DEMO SUPABASE LOYIHASI UCHUN! ⚠️⚠️⚠️
--
-- BU SKRIPT O'CHIRADI:
--   1. Yangi SchoolOS sxemasining BARCHA jadvallari (001-003)
--   2. ESKI PROTOTIP jadvallari (DEMO_SETUP.sql: classes, profiles, timetable,
--      homeworks, feedbacks, notifications, contacts, chats, messages,
--      transactions) — ular anon uchun ochiq demo_open_access siyosatlari
--      bilan ishlagan va yangi sxema bilan KONFLIKT qiladi
--      (001 xato beradi: "column school_id does not exist")
--   3. Barcha app_*/audit_*/snapshot_* funksiyalari, transfer_pp, tiplar, view
--   4. SchoolOS storage bucketlari (student-documents, homework, school-files,
--      avatars) + eski 'files' bucket + schoolos_*/demo_* storage siyosatlari
--   5. 004 seed yaratgan demo auth userlari (*@demo.school.uz)
--
-- MA'LUMOT QAYTMAYDI. Production yoki real ma'lumotli loyihada ISHLATMANG.
-- Ishlatish tartibi: 000_reset_dev → 001_schema → 002_rls → 003_audit →
-- → (ixtiyoriy, demo uchun) 004_seed_dev
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1. Storage siyosatlari (funksiyalarni o'chirishdan AVVAL — policy ularga
--    bog'liq bo'lishi mumkin)
-- ---------------------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and (policyname like 'schoolos%' or policyname like 'demo\_%')
  loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 2. Jadvallar: SchoolOS (001-003) + eski prototip (DEMO_SETUP.sql)
--    cascade — tartib muhim emas
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
  v_tables text[] := array[
    -- SchoolOS (yangi sxema)
    'audit_log',
    'student_enrollments_history','parent_student_history','teacher_assignments_history',
    'class_teacher_assignments_history','group_students_history','parent_contact_history',
    'import_errors','import_jobs','export_jobs',
    'documents','document_templates',
    'data_quality_issues','risk_events','risk_rules','daily_summaries',
    'telegram_accounts','push_subscriptions','notification_deliveries',
    'notification_preferences','notifications',
    'announcement_recipients','announcements','message_recipients','messages',
    'message_templates',
    'homework_submissions','homework_targets','homework',
    'grades','attendance','lessons',
    'timetable_exceptions','timetable_slots','timetable_versions',
    'substitute_assignments','teacher_absences','teacher_availability',
    'teacher_assignments','teachers','group_students','subject_groups',
    'class_teacher_assignments','parent_student','parents',
    'student_enrollments','students','calendar_events',
    'class_subjects','grade_types','grading_scales','subjects',
    'classes','rooms','user_sessions','user_permission_overrides',
    'role_permissions','permissions','roles','profiles',
    'lesson_periods','academic_terms','academic_years',
    'school_features','school_settings','schools',
    -- Eski prototip (DEMO_SETUP.sql)
    'transactions','messages','chats','contacts','notifications','feedbacks',
    'homeworks','timetable','profiles','classes'
  ];
begin
  foreach t in array v_tables loop
    execute format('drop table if exists public.%I cascade', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 3. View
-- ---------------------------------------------------------------------------
drop view if exists public.teachers_public cascade;

-- ---------------------------------------------------------------------------
-- 4. Funksiyalar (SchoolOS yordamchilari + eski prototip RPC)
-- ---------------------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and (p.proname like 'app\_%'
           or p.proname like 'audit\_%'
           or p.proname like 'snapshot\_%'
           or p.proname in ('set_updated_at','dev_create_user','transfer_pp'))
  loop
    execute format('drop function if exists %s', r.sig);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 5. Enum tiplar
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
  v_types text[] := array[
    'user_role','gender','student_status','teacher_status','parent_relationship',
    'attendance_status','grade_status','timetable_version_status','homework_status',
    'notification_priority','notification_channel','room_type','absence_status',
    'substitute_status','job_status','risk_event_status','dq_issue_status'
  ];
begin
  foreach t in array v_types loop
    execute format('drop type if exists public.%I cascade', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 6. Storage bucketlar (obyektlar + bucket yozuvlari)
--    schoolos bucketlari + eski prototip 'files' bucketi
-- ---------------------------------------------------------------------------
delete from storage.objects
  where bucket_id in ('student-documents','homework','school-files','avatars','files');
delete from storage.buckets
  where id in ('student-documents','homework','school-files','avatars','files');

-- ---------------------------------------------------------------------------
-- 7. Demo auth userlari (004_seed_dev yaratganlari)
-- ---------------------------------------------------------------------------
delete from auth.identities
  where user_id in (select id from auth.users where email like '%@demo.school.uz');
delete from auth.users where email like '%@demo.school.uz';

commit;

-- Supabase API schema cache'ni yangilash
notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------------
-- Tekshiruv: public sxemasi bo'sh bo'lishi kerak
-- ---------------------------------------------------------------------------
do $$
declare
  v_left int;
begin
  select count(*) into v_left
  from information_schema.tables
  where table_schema = 'public' and table_type = 'BASE TABLE';
  if v_left > 0 then
    raise warning 'public sxemasida % ta jadval qoldi (kutilmagan): %', v_left,
      (select string_agg(table_name, ', ') from information_schema.tables
       where table_schema = 'public' and table_type = 'BASE TABLE');
  else
    raise notice 'TOZALASH TUGADI: public sxemasi bo''sh — 001_schema.sql dan boshlashingiz mumkin.';
  end if;
end $$;
