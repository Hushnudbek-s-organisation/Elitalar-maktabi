-- ============================================================================
-- SchoolOS Uzbekistan — Migration 004: DEV SEED (FAQAT DEVELOPMENT UCHUN)
-- ----------------------------------------------------------------------------
-- DIQQAT: Bu seed FAQAT yangi, bo'sh Supabase loyihasida (yoki local dev)
-- ishlatiladi. is_demo=true — demo ma'lumot production bilan ARALASHTIRILMAYDI.
-- 001 → 002 → 003 dan keyin bajariladi.
--
-- BAHOLASH KONFIGURATSIYASI (foydalanuvchi tasdiqlagan model):
--   FORMATIV (kunlik) — 10-ball shkala
--   BSB — bob bo'yicha summativ baholash   (chorak 100 ballining ~50%)
--   CHSB — chorak bo'yicha summativ baholash (~40%), formativ ~10%
--   Manba: lex.uz/mact/-6911657 — vaznlar maktab tomonidan sozlanadi.
--
-- TEST HISOBLARI (email + parol; production'da HECH QACHON ishlatilmaydi):
--   director@demo.school.uz / DirectorDemo#2026   (DIREKTOR)
--   admin@demo.school.uz    / AdminDemo#2026      (ADMIN)
--   hakimov@demo.school.uz  / TeacherDemo#2026    (O'QITUVCHI, 10-A sinf rahbari)
--   yusupova@demo.school.uz / TeacherDemo#2026    (O'QITUVCHI, 10-B sinf rahbari)
--   parent1@demo.school.uz  / ParentDemo#2026     (OTA-ONA, 2 farzand)
--   student1@demo.school.uz / StudentDemo#2026    (O'QUVCHI, 10-A)
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- GUARD: seed allaqachon qo'llanilganmi? (idempotent emas — atrofik to'xtatadi)
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from public.schools where is_demo) then
    raise exception '004_seed_dev: demo ma''lumot allaqachon mavjud. Qayta ishga tushirishga ruxsat yo''q (duplikat oldini olish uchun). Yangi seed uchun demo maktabni o''chiring.';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 0. Yordamchi: auth.users yaratish (DEV ONLY — parollar bcrypt hash literal)
-- ---------------------------------------------------------------------------
create or replace function public.dev_create_user(p_id uuid, p_email text, p_hash text)
returns void language plpgsql security definer
set search_path = auth, public as $$
begin
  insert into auth.users (id, aud, role, email, encrypted_password,
                          email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
                          created_at, updated_at)
  values (p_id, 'authenticated', 'authenticated', p_email, p_hash,
          now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
          now(), now())
  on conflict (id) do update set encrypted_password = excluded.encrypted_password,
                                 email = excluded.email;

  insert into auth.identities (id, user_id, provider_id, identity_data, provider,
                               last_sign_in_at, created_at, updated_at)
  values (p_id, p_id, p_id::text,
          jsonb_build_object('sub', p_id::text, 'email', p_email, 'email_verified', true),
          'email', now(), now(), now())
  on conflict (provider, id) do update set identity_data = excluded.identity_data;
end $$;

-- ---------------------------------------------------------------------------
-- 1. Permission katalogi va rol bundle'lari
-- ---------------------------------------------------------------------------
insert into public.roles (key, name_uz, description) values
  ('SUPER_ADMIN',   'Super administrator', 'Platforma egasi'),
  ('ADMIN',         'Ma''muriyat',          'Maktab ma''muriyati'),
  ('DIRECTOR',      'Direktor',             'Maktab direktori'),
  ('CLASS_TEACHER', 'Sinf rahbari',         'O''qituvchi + sinf rahbari huquqlari'),
  ('TEACHER',       'O''qituvchi',          'Fan o''qituvchisi'),
  ('PARENT',        'Ota-ona',              'Farzandining ma''lumotlari'),
  ('STUDENT',       'O''quvchi',            'O''z ma''lumotlari')
on conflict (key) do nothing;

insert into public.permissions (key, description) values
  ('students.view',        'O''quvchilarni ko''rish'),
  ('students.create',      'O''quvchi qo''shish'),
  ('students.update',      'O''quvchini tahrirlash'),
  ('students.archive',     'O''quvchini arxivlash'),
  ('students.export_pii',  'O''quvchi shaxsiy ma''lumotlarini eksport'),
  ('parents.view',         'Ota-onalarni ko''rish'),
  ('parents.create',       'Ota-ona qo''shish'),
  ('parents.update',       'Ota-onani tahrirlash'),
  ('teachers.view',        'O''qituvchilarni ko''rish'),
  ('teachers.create',      'O''qituvchi qo''shish'),
  ('teachers.update',      'O''qituvchini tahrirlash'),
  ('teachers.export',      'O''qituvchilarni eksport'),
  ('classes.view',         'Sinflarni ko''rish'),
  ('classes.manage',       'Sinflarni boshqarish'),
  ('subjects.view',        'Fanlarni ko''rish'),
  ('subjects.manage',      'Fanlarni boshqarish'),
  ('groups.manage',        'Guruhlarni boshqarish'),
  ('rooms.manage',         'Xonalarni boshqarish'),
  ('assignments.manage',   'O''qituvchi biriktirishlari'),
  ('attendance.view',      'Davomatni ko''rish'),
  ('attendance.mark',      'Davomat belgilash'),
  ('attendance.override',  'Davomatni qayta ko''rib chiqish (override)'),
  ('attendance.lock_manage','Davomat lock sozlamalari'),
  ('grades.view',          'Baholarni ko''rish'),
  ('grades.enter',         'Baho kiritish'),
  ('grades.publish',       'Baholarni e''lon qilish'),
  ('grades.override',      'Baho override (sabab bilan)'),
  ('gradebook.config',     'Baholash tizimi sozlamalari'),
  ('homework.view',        'Uy vazifasini ko''rish'),
  ('homework.assign',      'Uy vazifasi berish'),
  ('homework.check',       'Uy vazifasini tekshirish'),
  ('timetable.view',       'Jadvalni ko''rish'),
  ('timetable.edit',       'Jadvalni tahrirlash'),
  ('timetable.generate',   'Jadval generatori'),
  ('timetable.publish',    'Jadvalni nashr etish'),
  ('substitutes.manage',   'Almashtiruvchilarni boshqarish'),
  ('messages.send',        'Xabar yuborish'),
  ('message_templates.manage', 'Xabar shablonlari'),
  ('announcements.send',   'E''lon yuborish'),
  ('reports.view',         'Hisobotlarni ko''rish'),
  ('reports.export',       'Hisobot eksport'),
  ('reports.build',        'Maxsus hisobot yasash'),
  ('documents.view',       'Hujjatlarni ko''rish'),
  ('documents.upload',     'Hujjat yuklash'),
  ('document_templates.manage', 'Hujjat shablonlari'),
  ('import.run',           'Import ishga tushirish'),
  ('export.run',           'Eksport ishga tushirish'),
  ('audit.view',           'Audit jurnalini ko''rish'),
  ('risk.view',            'Risk voqealarini ko''rish'),
  ('risk.manage',          'Risk qoidalarini boshqarish'),
  ('dataquality.view',     'Data Quality Center'),
  ('settings.manage',      'Maktab sozlamalari'),
  ('features.manage',      'Feature flaglar'),
  ('search.all',           'Global qidiruv')
on conflict (key) do nothing;

-- ADMIN va DIRECTOR — maktab bo'yicha to'liq bundle
insert into public.role_permissions (role_key, permission_key)
select 'ADMIN', p.key from public.permissions p
on conflict do nothing;

insert into public.role_permissions (role_key, permission_key)
select 'DIRECTOR', p.key from public.permissions p
on conflict do nothing;

insert into public.role_permissions (role_key, permission_key) values
  ('CLASS_TEACHER', 'students.view'), ('CLASS_TEACHER', 'parents.view'),
  ('CLASS_TEACHER', 'teachers.view'), ('CLASS_TEACHER', 'classes.view'),
  ('CLASS_TEACHER', 'subjects.view'), ('CLASS_TEACHER', 'attendance.view'),
  ('CLASS_TEACHER', 'attendance.mark'), ('CLASS_TEACHER', 'attendance.override'),
  ('CLASS_TEACHER', 'grades.view'), ('CLASS_TEACHER', 'homework.view'),
  ('CLASS_TEACHER', 'homework.assign'), ('CLASS_TEACHER', 'homework.check'),
  ('CLASS_TEACHER', 'timetable.view'), ('CLASS_TEACHER', 'messages.send'),
  ('CLASS_TEACHER', 'announcements.send'), ('CLASS_TEACHER', 'reports.view'),
  ('CLASS_TEACHER', 'documents.view'), ('CLASS_TEACHER', 'risk.view'),
  ('CLASS_TEACHER', 'dataquality.view'), ('CLASS_TEACHER', 'search.all')
on conflict do nothing;

insert into public.role_permissions (role_key, permission_key) values
  ('TEACHER', 'students.view'), ('TEACHER', 'teachers.view'),
  ('TEACHER', 'classes.view'), ('TEACHER', 'subjects.view'),
  ('TEACHER', 'attendance.view'), ('TEACHER', 'attendance.mark'),
  ('TEACHER', 'grades.view'), ('TEACHER', 'grades.enter'),
  ('TEACHER', 'grades.publish'), ('TEACHER', 'homework.view'),
  ('TEACHER', 'homework.assign'), ('TEACHER', 'homework.check'),
  ('TEACHER', 'timetable.view'), ('TEACHER', 'messages.send'),
  ('TEACHER', 'reports.view'), ('TEACHER', 'search.all')
on conflict do nothing;

-- PARENT, STUDENT, SUPER_ADMIN: maktab-scoped permission kerak emas (RLS self-scope)

-- ---------------------------------------------------------------------------
-- 2. Maktab (DEMO), sozlamalar, feature flaglar
-- ---------------------------------------------------------------------------
insert into public.schools (id, name, school_type, address, phone, email, timezone, is_demo)
values ('00000000-0000-4000-8000-000000000001', 'Elita maktabi (DEMO)', 'PRIVATE',
        'Toshkent sh., Chilonzor tumani, Bunyodkor ko''chasi 12', '+998 71 200-00-00',
        'info@demo.school.uz', 'Asia/Tashkent', true)
on conflict (id) do nothing;

insert into public.school_settings (school_id, key, value) values
  ('00000000-0000-4000-8000-000000000001', 'attendance.lock_hours', '{"hours": 24}'),
  ('00000000-0000-4000-8000-000000000001', 'attendance.default_status', '"PRESENT"'),
  ('00000000-0000-4000-8000-000000000001', 'documents.unexcused_hours_threshold', '{"hours": 3}'),
  ('00000000-0000-4000-8000-000000000001', 'messaging.working_hours', '{"from": "08:00", "to": "20:00"}'),
  ('00000000-0000-4000-8000-000000000001', 'notifications.quiet_hours', '{"from": "22:00", "to": "07:00"}'),
  ('00000000-0000-4000-8000-000000000001', 'timetable.working_days', '{"days": [1,2,3,4,5]}'),
  ('00000000-0000-4000-8000-000000000001', 'branding.document_footer', '{"line": "Elita maktabi — Toshkent"}')
on conflict (school_id, key) do nothing;

-- D3 (telegram-first) va D7 (wallet OFF) qarorlarining aks etishi
insert into public.school_features (school_id, feature_key, enabled) values
  ('00000000-0000-4000-8000-000000000001', 'telegram', true),
  ('00000000-0000-4000-8000-000000000001', 'push', true),
  ('00000000-0000-4000-8000-000000000001', 'sms', false),
  ('00000000-0000-4000-8000-000000000001', 'email', true),
  ('00000000-0000-4000-8000-000000000001', 'wallet', false),
  ('00000000-0000-4000-8000-000000000001', 'ai', false),
  ('00000000-0000-4000-8000-000000000001', 'clubs', false)
on conflict (school_id, feature_key) do nothing;

-- ---------------------------------------------------------------------------
-- 3. O'quv yili 2026/2027 + 4 chorak + dars vaqtlari
-- ---------------------------------------------------------------------------
insert into public.academic_years (id, school_id, name, start_date, end_date, is_active)
values ('00000000-0000-4000-8000-000000000002',
        '00000000-0000-4000-8000-000000000001', '2026/2027',
        '2026-09-01', '2027-05-31', true)
on conflict (school_id, name) do nothing;

insert into public.academic_terms (id, school_id, academic_year_id, term_type, number, name, start_date, end_date) values
  ('00000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002', 'QUARTER', 1, '1-chorak', '2026-09-01', '2026-10-25'),
  ('00000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002', 'QUARTER', 2, '2-chorak', '2026-10-26', '2026-12-30'),
  ('00000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002', 'QUARTER', 3, '3-chorak', '2027-01-11', '2027-03-20'),
  ('00000000-0000-4000-8000-000000000006', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002', 'QUARTER', 4, '4-chorak', '2027-03-22', '2027-05-31')
on conflict (academic_year_id, term_type, number) do nothing;

insert into public.lesson_periods (id, school_id, shift, period_number, starts_at, ends_at) values
  ('00000000-0000-4000-8000-00000000a001', '00000000-0000-4000-8000-000000000001', 1, 1, '08:00', '08:45'),
  ('00000000-0000-4000-8000-00000000a002', '00000000-0000-4000-8000-000000000001', 1, 2, '08:55', '09:40'),
  ('00000000-0000-4000-8000-00000000a003', '00000000-0000-4000-8000-000000000001', 1, 3, '09:50', '10:35'),
  ('00000000-0000-4000-8000-00000000a004', '00000000-0000-4000-8000-000000000001', 1, 4, '10:55', '11:40'),
  ('00000000-0000-4000-8000-00000000a005', '00000000-0000-4000-8000-000000000001', 1, 5, '11:50', '12:35'),
  ('00000000-0000-4000-8000-00000000a006', '00000000-0000-4000-8000-000000000001', 1, 6, '12:45', '13:30')
on conflict (school_id, shift, period_number) do nothing;

-- Kalendar
insert into public.calendar_events (school_id, academic_year_id, event_type, title, starts_on, ends_on) values
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002', 'HOLIDAY', 'Mustaqillik kuni', '2026-09-01', '2026-09-01'),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002', 'HOLIDAY', 'Yangi yil bayrami', '2027-01-01', '2027-01-04'),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002', 'MEETING', 'Ota-onalar yig''ilishi', '2026-10-15', '2026-10-15')
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- 4. Baholash: shkalalar + turlar (10-ball kunlik, BSB, CHSB — konfiguratsion)
-- ---------------------------------------------------------------------------
insert into public.grading_scales (id, school_id, name, scale_type, min_value, max_value, step, pass_value, is_default) values
  ('00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000001', '10-ball',   'NUMERIC', 1, 10,  1, 5, true),
  ('00000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000001', '5-ball',    'NUMERIC', 1, 5,   1, 3, false),
  ('00000000-0000-4000-8000-000000000012', '00000000-0000-4000-8000-000000000001', '100-ball',  'NUMERIC', 0, 100, 1, 60, false)
on conflict (school_id, name) do nothing;

insert into public.grade_types (id, school_id, code, name, grading_scale_id, weight_percent, counts_toward_term, is_exam, sort_order) values
  ('00000000-0000-4000-8000-000000000020', '00000000-0000-4000-8000-000000000001', 'FORMATIV', 'Kunlik (formativ) baho', '00000000-0000-4000-8000-000000000010', 10,  true,  false, 1),
  ('00000000-0000-4000-8000-000000000021', '00000000-0000-4000-8000-000000000001', 'BSB',      'Bob bo''yicha summativ baholash (BSB)', '00000000-0000-4000-8000-000000000012', 50, true, true, 2),
  ('00000000-0000-4000-8000-000000000022', '00000000-0000-4000-8000-000000000001', 'CHSB',     'Chorak bo''yicha summativ baholash (CHSB)', '00000000-0000-4000-8000-000000000012', 40, true, true, 3),
  ('00000000-0000-4000-8000-000000000023', '00000000-0000-4000-8000-000000000001', 'CHORAK',   'Chorak yakuniy bahosi (hisoblanadi)', '00000000-0000-4000-8000-000000000012', 0,  false, false, 4),
  ('00000000-0000-4000-8000-000000000024', '00000000-0000-4000-8000-000000000001', 'YAKUNIY',  'Yillik yakuniy baho', '00000000-0000-4000-8000-000000000011', 0,  false, false, 5)
on conflict (school_id, code) do nothing;

-- ---------------------------------------------------------------------------
-- 5. Xonalar, sinflar, fanlar
-- ---------------------------------------------------------------------------
insert into public.rooms (id, school_id, name, number, room_type, capacity) values
  ('00000000-0000-4000-8000-000000000040', '00000000-0000-4000-8000-000000000001', '204-xona',           '204', 'CLASSROOM',    30),
  ('00000000-0000-4000-8000-000000000041', '00000000-0000-4000-8000-000000000001', '305-xona',           '305', 'CLASSROOM',    30),
  ('00000000-0000-4000-8000-000000000042', '00000000-0000-4000-8000-000000000001', '112-xona',           '112', 'CLASSROOM',    28),
  ('00000000-0000-4000-8000-000000000043', '00000000-0000-4000-8000-000000000001', 'Fizika laboratoriyasi', '301', 'LAB',        30),
  ('00000000-0000-4000-8000-000000000044', '00000000-0000-4000-8000-000000000001', 'Kimyo laboratoriyasi',  '302', 'LAB',        30),
  ('00000000-0000-4000-8000-000000000045', '00000000-0000-4000-8000-000000000001', 'Sport zali',           'SP',  'SPORTS_HALL', 60)
on conflict (school_id, name) do nothing;

insert into public.classes (id, school_id, academic_year_id, name, grade_level, capacity, homeroom_room_id) values
  ('00000000-0000-4000-8000-000000000050', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002', '10-A', 10, 30, '00000000-0000-4000-8000-000000000040'),
  ('00000000-0000-4000-8000-000000000051', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002', '10-B', 10, 30, '00000000-0000-4000-8000-000000000041'),
  ('00000000-0000-4000-8000-000000000052', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002', '7-A',   7, 28, '00000000-0000-4000-8000-000000000042')
on conflict (school_id, academic_year_id, name) do nothing;

insert into public.subjects (id, school_id, name, short_name, category, required_room_type) values
  ('00000000-0000-4000-8000-000000000030', '00000000-0000-4000-8000-000000000001', 'Matematika',   'MAT', 'Aniq fanlar',      null),
  ('00000000-0000-4000-8000-000000000031', '00000000-0000-4000-8000-000000000001', 'Ona tili',     'ONT', 'Filologiya',       null),
  ('00000000-0000-4000-8000-000000000032', '00000000-0000-4000-8000-000000000001', 'Ingliz tili',  'ING', 'Chet tillari',     null),
  ('00000000-0000-4000-8000-000000000033', '00000000-0000-4000-8000-000000000001', 'Fizika',       'FIZ', 'Aniq fanlar',      'LAB'),
  ('00000000-0000-4000-8000-000000000034', '00000000-0000-4000-8000-000000000001', 'Kimyo',        'KIM', 'Aniq fanlar',      'LAB'),
  ('00000000-0000-4000-8000-000000000035', '00000000-0000-4000-8000-000000000001', 'Biologiya',    'BIO', 'Tabiiy fanlar',    null),
  ('00000000-0000-4000-8000-000000000036', '00000000-0000-4000-8000-000000000001', 'Tarix',        'TAR', 'Ijtimoiy fanlar',  null),
  ('00000000-0000-4000-8000-000000000037', '00000000-0000-4000-8000-000000000001', 'Jismoniy tarbiya', 'JT', 'Jismoniy tarbiya', 'SPORTS_HALL')
on conflict (school_id, name) do nothing;

-- class_subjects (haftalik soatlar bilan)
insert into public.class_subjects (id, school_id, class_id, subject_id, weekly_hours, grading_scale_id) values
  -- 10-A
  ('00000000-0000-4000-8000-000000000060', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000050', '00000000-0000-4000-8000-000000000030', 5, '00000000-0000-4000-8000-000000000010'),
  ('00000000-0000-4000-8000-000000000061', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000050', '00000000-0000-4000-8000-000000000031',   4, '00000000-0000-4000-8000-000000000010'),
  ('00000000-0000-4000-8000-000000000062', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000050', '00000000-0000-4000-8000-000000000032', 4, '00000000-0000-4000-8000-000000000010'),
  ('00000000-0000-4000-8000-000000000063', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000050', '00000000-0000-4000-8000-000000000033', 4, '00000000-0000-4000-8000-000000000010'),
  ('00000000-0000-4000-8000-000000000064', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000050', '00000000-0000-4000-8000-000000000034', 3, '00000000-0000-4000-8000-000000000010'),
  -- 10-B
  ('00000000-0000-4000-8000-000000000065', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000051', '00000000-0000-4000-8000-000000000030', 5, '00000000-0000-4000-8000-000000000010'),
  ('00000000-0000-4000-8000-000000000066', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000051', '00000000-0000-4000-8000-000000000031',   4, '00000000-0000-4000-8000-000000000010'),
  ('00000000-0000-4000-8000-000000000067', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000051', '00000000-0000-4000-8000-000000000032', 4, '00000000-0000-4000-8000-000000000010'),
  ('00000000-0000-4000-8000-000000000068', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000051', '00000000-0000-4000-8000-000000000033', 4, '00000000-0000-4000-8000-000000000010'),
  ('00000000-0000-4000-8000-000000000069', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000051', '00000000-0000-4000-8000-000000000035', 3, '00000000-0000-4000-8000-000000000010'),
  -- 7-A
  ('00000000-0000-4000-8000-000000000070', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000052', '00000000-0000-4000-8000-000000000030', 5, '00000000-0000-4000-8000-000000000010'),
  ('00000000-0000-4000-8000-000000000071', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000052', '00000000-0000-4000-8000-000000000031',   4, '00000000-0000-4000-8000-000000000010'),
  ('00000000-0000-4000-8000-000000000072', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000052', '00000000-0000-4000-8000-000000000032', 4, '00000000-0000-4000-8000-000000000010'),
  ('00000000-0000-4000-8000-000000000073', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000052', '00000000-0000-4000-8000-000000000036', 4, '00000000-0000-4000-8000-000000000010'),
  ('00000000-0000-4000-8000-000000000074', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000052', '00000000-0000-4000-8000-000000000037', 3, '00000000-0000-4000-8000-000000000010')
on conflict (class_id, subject_id) do nothing;

-- Ingliz tili 10-A — 2 guruhga bo'linadi
insert into public.subject_groups (id, school_id, class_subject_id, name) values
  ('00000000-0000-4000-8000-000000000080', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000062', '1-guruh'),
  ('00000000-0000-4000-8000-000000000081', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000062', '2-guruh')
on conflict (class_subject_id, name) do nothing;

-- ---------------------------------------------------------------------------
-- 6. Test hisoblari (auth.users + profiles) — FAQAT DEV
-- ---------------------------------------------------------------------------
-- DIREKTOR
select public.dev_create_user('00000000-0000-4000-8000-000000003001', 'director@demo.school.uz',
  '$2a$10$7Mqt0UIlfZlU.afraEeBme4fqXJ6daHL.Sv00MQaepEKfKulzG98.');
-- ADMIN
select public.dev_create_user('00000000-0000-4000-8000-000000003002', 'admin@demo.school.uz',
  '$2a$10$JasLfR97XG7aDwnPsrujCepsncaEOjrqbEmvCT2cLUK.NcJyHvEnW');
-- O'QITUVCHILAR
select public.dev_create_user('00000000-0000-4000-8000-000000003011', 'hakimov@demo.school.uz',
  '$2a$10$RKu92jyLT/.KRbUDr3gCkeFy8K.Ae4gv0YXRJVvZ8Vh.WrEpc6OuC');
select public.dev_create_user('00000000-0000-4000-8000-000000003012', 'karimova@demo.school.uz',
  '$2a$10$RKu92jyLT/.KRbUDr3gCkeFy8K.Ae4gv0YXRJVvZ8Vh.WrEpc6OuC');
select public.dev_create_user('00000000-0000-4000-8000-000000003013', 'nazarova@demo.school.uz',
  '$2a$10$RKu92jyLT/.KRbUDr3gCkeFy8K.Ae4gv0YXRJVvZ8Vh.WrEpc6OuC');
select public.dev_create_user('00000000-0000-4000-8000-000000003014', 'rahimov@demo.school.uz',
  '$2a$10$RKu92jyLT/.KRbUDr3gCkeFy8K.Ae4gv0YXRJVvZ8Vh.WrEpc6OuC');
select public.dev_create_user('00000000-0000-4000-8000-000000003015', 'yusupova@demo.school.uz',
  '$2a$10$RKu92jyLT/.KRbUDr3gCkeFy8K.Ae4gv0YXRJVvZ8Vh.WrEpc6OuC');
select public.dev_create_user('00000000-0000-4000-8000-000000003016', 'tursunov@demo.school.uz',
  '$2a$10$RKu92jyLT/.KRbUDr3gCkeFy8K.Ae4gv0YXRJVvZ8Vh.WrEpc6OuC');
select public.dev_create_user('00000000-0000-4000-8000-000000003017', 'sultonova@demo.school.uz',
  '$2a$10$RKu92jyLT/.KRbUDr3gCkeFy8K.Ae4gv0YXRJVvZ8Vh.WrEpc6OuC');
-- OTA-ONA (2 farzand bilan)
select public.dev_create_user('00000000-0000-4000-8000-000000003020', 'parent1@demo.school.uz',
  '$2a$10$3aJ0Had0c9yekK5PiBQCFOyDtTZzWGidz6zuZye/S3QNBUNFIHzcm');
-- O'QUVCHI (10-A)
select public.dev_create_user('00000000-0000-4000-8000-000000003021', 'student1@demo.school.uz',
  '$2a$10$wTVQQTvn2A4NB5GWarbJN.sUcqElQhLKuGbRKF9n1ZQx2JvXcIwQa');

insert into public.profiles (id, school_id, role, full_name, phone, email) values
  ('00000000-0000-4000-8000-000000003001', '00000000-0000-4000-8000-000000000001', 'DIRECTOR',      'Qodirov Rustam Karimovich',     '+998901112201', 'director@demo.school.uz'),
  ('00000000-0000-4000-8000-000000003002', '00000000-0000-4000-8000-000000000001', 'ADMIN',         'Ahmedov Dilshod Sobirovich',    '+998901112202', 'admin@demo.school.uz'),
  ('00000000-0000-4000-8000-000000003011', '00000000-0000-4000-8000-000000000001', 'CLASS_TEACHER', 'Hakimov Hushnudbek Alisherovich','+998901112211', 'hakimov@demo.school.uz'),
  ('00000000-0000-4000-8000-000000003012', '00000000-0000-4000-8000-000000000001', 'TEACHER',       'Karimova Dilnoza Anvarovna',    '+998901112212', 'karimova@demo.school.uz'),
  ('00000000-0000-4000-8000-000000003013', '00000000-0000-4000-8000-000000000001', 'TEACHER',       'Nazarova Zulfiya Bahodirovna',  '+998901112213', 'nazarova@demo.school.uz'),
  ('00000000-0000-4000-8000-000000003014', '00000000-0000-4000-8000-000000000001', 'TEACHER',       'Rahimov Alisher To''lqinovich', '+998901112214', 'rahimov@demo.school.uz'),
  ('00000000-0000-4000-8000-000000003015', '00000000-0000-4000-8000-000000000001', 'CLASS_TEACHER', 'Yusupova Malika Shavkatovna',   '+998901112215', 'yusupova@demo.school.uz'),
  ('00000000-0000-4000-8000-000000003016', '00000000-0000-4000-8000-000000000001', 'TEACHER',       'Tursunov Bekzod Murodovich',    '+998901112216', 'tursunov@demo.school.uz'),
  ('00000000-0000-4000-8000-000000003017', '00000000-0000-4000-8000-000000000001', 'TEACHER',       'Sultonova Feruza Umidovna',     '+998901112217', 'sultonova@demo.school.uz'),
  ('00000000-0000-4000-8000-000000003020', '00000000-0000-4000-8000-000000000001', 'PARENT',        'Abdullayev Olim Raximovich',    '+998901112220', 'parent1@demo.school.uz'),
  ('00000000-0000-4000-8000-000000003021', '00000000-0000-4000-8000-000000000001', 'STUDENT',       'Abdullayev Jasur Olimovich',    '+998901112230', 'student1@demo.school.uz')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 7. O'qituvchilar + biriktirishlar
-- ---------------------------------------------------------------------------
insert into public.teachers (id, school_id, profile_id, full_name, phone, email, hired_on) values
  ('00000000-0000-4000-8000-000000001001', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000003011', 'Hakimov Hushnudbek Alisherovich', '+998901112211', 'hakimov@demo.school.uz',  '2020-09-01'),
  ('00000000-0000-4000-8000-000000001002', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000003012', 'Karimova Dilnoza Anvarovna',      '+998901112212', 'karimova@demo.school.uz', '2021-09-01'),
  ('00000000-0000-4000-8000-000000001003', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000003013', 'Nazarova Zulfiya Bahodirovna',    '+998901112213', 'nazarova@demo.school.uz', '2022-09-01'),
  ('00000000-0000-4000-8000-000000001004', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000003014', 'Rahimov Alisher To''lqinovich',   '+998901112214', 'rahimov@demo.school.uz',  '2019-09-01'),
  ('00000000-0000-4000-8000-000000001005', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000003015', 'Yusupova Malika Shavkatovna',     '+998901112215', 'yusupova@demo.school.uz', '2020-09-01'),
  ('00000000-0000-4000-8000-000000001006', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000003016', 'Tursunov Bekzod Murodovich',      '+998901112216', 'tursunov@demo.school.uz', '2018-09-01'),
  ('00000000-0000-4000-8000-000000001007', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000003017', 'Sultonova Feruza Umidovna',       '+998901112217', 'sultonova@demo.school.uz', '2023-09-01')
on conflict (id) do nothing;

-- Sinf rahbarlari
insert into public.class_teacher_assignments (id, school_id, class_id, teacher_id) values
  ('00000000-0000-4000-8000-00000000c001', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000050', '00000000-0000-4000-8000-000000001001'),
  ('00000000-0000-4000-8000-00000000c002', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000051', '00000000-0000-4000-8000-000000001005'),
  ('00000000-0000-4000-8000-00000000c003', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000052', '00000000-0000-4000-8000-000000001006')
on conflict do nothing;

-- O'qituvchi biriktirishlari (fan × sinf × guruh)
insert into public.teacher_assignments (id, school_id, teacher_id, class_subject_id, subject_group_id, academic_year_id, hours_per_week) values
  -- Hakimov: Matematika 10-A, 10-B
  ('00000000-0000-4000-8000-00000000d001', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000001001', '00000000-0000-4000-8000-000000000060', null, '00000000-0000-4000-8000-000000000002', 5),
  ('00000000-0000-4000-8000-00000000d002', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000001001', '00000000-0000-4000-8000-000000000065', null, '00000000-0000-4000-8000-000000000002', 5),
  -- Karimova: Ingliz tili 10-A 1-guruh, 10-B, 7-A
  ('00000000-0000-4000-8000-00000000d003', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000001002', '00000000-0000-4000-8000-000000000062', '00000000-0000-4000-8000-000000000080', '00000000-0000-4000-8000-000000000002', 4),
  ('00000000-0000-4000-8000-00000000d004', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000001002', '00000000-0000-4000-8000-000000000067', null, '00000000-0000-4000-8000-000000000002', 4),
  ('00000000-0000-4000-8000-00000000d005', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000001002', '00000000-0000-4000-8000-000000000072', null, '00000000-0000-4000-8000-000000000002', 4),
  -- Nazarova: Ingliz tili 10-A 2-guruh, Ona tili 10-A
  ('00000000-0000-4000-8000-00000000d006', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000001003', '00000000-0000-4000-8000-000000000062', '00000000-0000-4000-8000-000000000081', '00000000-0000-4000-8000-000000000002', 4),
  ('00000000-0000-4000-8000-00000000d007', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000001003', '00000000-0000-4000-8000-000000000061', null, '00000000-0000-4000-8000-000000000002', 4),
  -- Rahimov: Fizika 10-A, 10-B + Kimyo 10-A
  ('00000000-0000-4000-8000-00000000d008', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000001004', '00000000-0000-4000-8000-000000000063', null, '00000000-0000-4000-8000-000000000002', 4),
  ('00000000-0000-4000-8000-00000000d009', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000001004', '00000000-0000-4000-8000-000000000068', null, '00000000-0000-4000-8000-000000000002', 4),
  ('00000000-0000-4000-8000-00000000d010', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000001004', '00000000-0000-4000-8000-000000000064', null, '00000000-0000-4000-8000-000000000002', 3),
  -- Yusupova: Ona tili 10-B
  ('00000000-0000-4000-8000-00000000d011', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000001005', '00000000-0000-4000-8000-000000000066', null, '00000000-0000-4000-8000-000000000002', 4),
  -- Tursunov: JT 7-A + Tarix 7-A
  ('00000000-0000-4000-8000-00000000d012', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000001006', '00000000-0000-4000-8000-000000000074', null, '00000000-0000-4000-8000-000000000002', 3),
  ('00000000-0000-4000-8000-00000000d013', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000001006', '00000000-0000-4000-8000-000000000073', null, '00000000-0000-4000-8000-000000000002', 4),
  -- Sultonova: Matematika 7-A + Biologiya 10-B
  ('00000000-0000-4000-8000-00000000d014', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000001007', '00000000-0000-4000-8000-000000000070', null, '00000000-0000-4000-8000-000000000002', 5),
  ('00000000-0000-4000-8000-00000000d015', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000001007', '00000000-0000-4000-8000-000000000069', null, '00000000-0000-4000-8000-000000000002', 3)
on conflict do nothing;

-- Hakimov: juma 6-dars band (metodik yig'ilish)
insert into public.teacher_availability (id, school_id, teacher_id, academic_year_id, day_of_week, period_number, is_available, reason) values
  ('00000000-0000-4000-8000-00000000e001', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000001001', '00000000-0000-4000-8000-000000000002', 5, 6, false, 'Metodik yig''ilish')
on conflict do nothing;

-- Rahimov: kelasi dushanba kasal
insert into public.teacher_absences (id, school_id, teacher_id, starts_on, ends_on, reason, status, created_by) values
  ('00000000-0000-4000-8000-00000000f001', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000001004', current_date + 7, current_date + 7, 'Kasallik varaqasi', 'OPEN', '00000000-0000-4000-8000-000000003002')
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- 8. O'quvchilar (34) + qabullar
-- ---------------------------------------------------------------------------
insert into public.students (id, school_id, profile_id, full_name, birth_date, gender, status, admission_number) values
  -- 10-A (2010-yil tug'ilganlar)
  ('00000000-0000-4000-8000-000000004001', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000003021', 'Abdullayev Jasur Olimovich',        '2010-03-12', 'MALE',   'ACTIVE', 'E-2026-001'),
  ('00000000-0000-4000-8000-000000004002', '00000000-0000-4000-8000-000000000001', null, 'Azizova Madina Anvarovna',          '2010-05-21', 'FEMALE', 'ACTIVE', 'E-2026-002'),
  ('00000000-0000-4000-8000-000000004003', '00000000-0000-4000-8000-000000000001', null, 'Bekmurodov Islombek Rustamovich',   '2010-01-09', 'MALE',   'ACTIVE', 'E-2026-003'),
  ('00000000-0000-4000-8000-000000004004', '00000000-0000-4000-8000-000000000001', null, 'Esonova Nilufar Bahodirovna',       '2010-07-30', 'FEMALE', 'ACTIVE', 'E-2026-004'),
  ('00000000-0000-4000-8000-000000004005', '00000000-0000-4000-8000-000000000001', null, 'G''ulomov Sardor Ulug''bekovich',    '2010-11-02', 'MALE',   'ACTIVE', 'E-2026-005'),
  ('00000000-0000-4000-8000-000000004006', '00000000-0000-4000-8000-000000000001', null, 'Ismoilova Zuhra Shavkatovna',       '2010-09-14', 'FEMALE', 'ACTIVE', 'E-2026-006'),
  ('00000000-0000-4000-8000-000000004007', '00000000-0000-4000-8000-000000000001', null, 'Karimov Sanjar Ilhomovich',         '2010-02-25', 'MALE',   'ACTIVE', 'E-2026-007'),
  ('00000000-0000-4000-8000-000000004008', '00000000-0000-4000-8000-000000000001', null, 'Mahmudova Sevara Alisherovna',      '2010-12-08', 'FEMALE', 'ACTIVE', 'E-2026-008'),
  ('00000000-0000-4000-8000-000000004009', '00000000-0000-4000-8000-000000000001', null, 'Nurmatov Doston Bekzodovich',       '2010-04-17', 'MALE',   'ACTIVE', 'E-2026-009'),
  ('00000000-0000-4000-8000-000000004010', '00000000-0000-4000-8000-000000000001', null, 'Rashidova Kamola Nodirovna',        '2010-08-05', 'FEMALE', 'ACTIVE', 'E-2026-010'),
  ('00000000-0000-4000-8000-000000004011', '00000000-0000-4000-8000-000000000001', null, 'Toshpulatov Abbos Faxriddinovich',  '2010-06-23', 'MALE',   'ACTIVE', 'E-2026-011'),
  ('00000000-0000-4000-8000-000000004012', '00000000-0000-4000-8000-000000000001', null, 'Xolmatova Diyora Rustamovna',       '2010-10-19', 'FEMALE', 'ACTIVE', 'E-2026-012'),
  -- 10-B
  ('00000000-0000-4000-8000-000000004013', '00000000-0000-4000-8000-000000000001', null, 'Ahmedov Bunyod Sobirovich',         '2010-03-03', 'MALE',   'ACTIVE', 'E-2026-013'),
  ('00000000-0000-4000-8000-000000004014', '00000000-0000-4000-8000-000000000001', null, 'Aminova Shahzoda Ravshanovna',      '2010-05-11', 'FEMALE', 'ACTIVE', 'E-2026-014'),
  ('00000000-0000-4000-8000-000000004015', '00000000-0000-4000-8000-000000000001', null, 'Ergashev Temur Javohirovich',       '2010-01-27', 'MALE',   'ACTIVE', 'E-2026-015'),
  ('00000000-0000-4000-8000-000000004016', '00000000-0000-4000-8000-000000000001', null, 'Ibrahimova Mushtariy To''lqinovna', '2010-07-07', 'FEMALE', 'ACTIVE', 'E-2026-016'),
  ('00000000-0000-4000-8000-000000004017', '00000000-0000-4000-8000-000000000001', null, 'Jo''rayev Shohruh Alisherovich',    '2010-09-29', 'MALE',   'ACTIVE', 'E-2026-017'),
  ('00000000-0000-4000-8000-000000004018', '00000000-0000-4000-8000-000000000001', null, 'Qodirova Nargiza Umidovna',         '2010-11-15', 'FEMALE', 'ACTIVE', 'E-2026-018'),
  ('00000000-0000-4000-8000-000000004019', '00000000-0000-4000-8000-000000000001', null, 'Mirzayev Firdavs Zafarovich',       '2010-02-18', 'MALE',   'ACTIVE', 'E-2026-019'),
  ('00000000-0000-4000-8000-000000004020', '00000000-0000-4000-8000-000000000001', null, 'Saidova Dilnoza Rasulovna',         '2010-04-04', 'FEMALE', 'ACTIVE', 'E-2026-020'),
  ('00000000-0000-4000-8000-000000004021', '00000000-0000-4000-8000-000000000001', null, 'Tursunov Otabek Murodovich',        '2010-06-30', 'MALE',   'ACTIVE', 'E-2026-021'),
  ('00000000-0000-4000-8000-000000004022', '00000000-0000-4000-8000-000000000001', null, 'Umarova Mohira Suhrobovna',         '2010-08-22', 'FEMALE', 'ACTIVE', 'E-2026-022'),
  ('00000000-0000-4000-8000-000000004023', '00000000-0000-4000-8000-000000000001', null, 'Yo''ldoshev Anvar Nodirbekovich',   '2010-10-10', 'MALE',   'ACTIVE', 'E-2026-023'),
  ('00000000-0000-4000-8000-000000004024', '00000000-0000-4000-8000-000000000001', null, 'Zokirova Gulnora Bahromovna',       '2010-12-26', 'FEMALE', 'ACTIVE', 'E-2026-024'),
  -- 7-A (2013-yil tug'ilganlar)
  ('00000000-0000-4000-8000-000000004025', '00000000-0000-4000-8000-000000000001', null, 'Aliyev Bekzod Doniyorovich',        '2013-03-15', 'MALE',   'ACTIVE', 'E-2026-025'),
  ('00000000-0000-4000-8000-000000004026', '00000000-0000-4000-8000-000000000001', null, 'Asadova Malika Furqatovna',         '2013-05-06', 'FEMALE', 'ACTIVE', 'E-2026-026'),
  ('00000000-0000-4000-8000-000000004027', '00000000-0000-4000-8000-000000000001', null, 'Berdiyev Jasurbek Shuhratovich',    '2013-01-20', 'MALE',   'ACTIVE', 'E-2026-027'),
  ('00000000-0000-4000-8000-000000004028', '00000000-0000-4000-8000-000000000001', null, 'Daminova Sitora Ilhomovna',         '2013-07-12', 'FEMALE', 'ACTIVE', 'E-2026-028'),
  ('00000000-0000-4000-8000-000000004029', '00000000-0000-4000-8000-000000000001', null, 'Hasanov Umid Otabekovich',          '2013-09-09', 'MALE',   'ACTIVE', 'E-2026-029'),
  ('00000000-0000-4000-8000-000000004030', '00000000-0000-4000-8000-000000000001', null, 'Ibrohimova Rayhona Sardorovna',     '2013-11-24', 'FEMALE', 'ACTIVE', 'E-2026-030'),
  ('00000000-0000-4000-8000-000000004031', '00000000-0000-4000-8000-000000000001', null, 'Qudratov Laziz Viktorovich',        '2013-02-27', 'MALE',   'ACTIVE', 'E-2026-031'),
  ('00000000-0000-4000-8000-000000004032', '00000000-0000-4000-8000-000000000001', null, 'Nazarova Shahnoza Pulodovna',       '2013-04-13', 'FEMALE', 'ACTIVE', 'E-2026-032'),
  ('00000000-0000-4000-8000-000000004033', '00000000-0000-4000-8000-000000000001', null, 'Sultonov Aziz Bekmurodovich',       '2013-06-08', 'MALE',   'ACTIVE', 'E-2026-033'),
  ('00000000-0000-4000-8000-000000004034', '00000000-0000-4000-8000-000000000001', null, 'Yusupova Nodira Sheralievna',       '2013-08-18', 'FEMALE', 'ACTIVE', 'E-2026-034')
on conflict (id) do nothing;

-- Sinf qabullari (joriy yil)
insert into public.student_enrollments (id, school_id, student_id, class_id, academic_year_id, valid_from, reason)
select gen_random_uuid(), '00000000-0000-4000-8000-000000000001', s.id,
       case
         when s.id between '00000000-0000-4000-8000-000000004001' and '00000000-0000-4000-8000-000000004012'
           then '00000000-0000-4000-8000-000000000050'
         when s.id between '00000000-0000-4000-8000-000000004013' and '00000000-0000-4000-8000-000000004024'
           then '00000000-0000-4000-8000-000000000051'
         else '00000000-0000-4000-8000-000000000052'
       end::uuid,
       '00000000-0000-4000-8000-000000000002', '2026-09-01', 'Yangi o''quv yili'
from public.students s
where s.school_id = '00000000-0000-4000-8000-000000000001'
on conflict do nothing;

-- Ingliz tili 10-A guruhlari (1-guruh: 6 ta, 2-guruh: 6 ta)
insert into public.group_students (id, school_id, subject_group_id, student_id) values
  ('00000000-0000-4000-8000-00000000a101', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000080', '00000000-0000-4000-8000-000000004001'),
  ('00000000-0000-4000-8000-00000000a102', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000080', '00000000-0000-4000-8000-000000004002'),
  ('00000000-0000-4000-8000-00000000a103', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000080', '00000000-0000-4000-8000-000000004003'),
  ('00000000-0000-4000-8000-00000000a104', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000080', '00000000-0000-4000-8000-000000004004'),
  ('00000000-0000-4000-8000-00000000a105', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000080', '00000000-0000-4000-8000-000000004005'),
  ('00000000-0000-4000-8000-00000000a106', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000080', '00000000-0000-4000-8000-000000004006'),
  ('00000000-0000-4000-8000-00000000a107', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000081', '00000000-0000-4000-8000-000000004007'),
  ('00000000-0000-4000-8000-00000000a108', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000081', '00000000-0000-4000-8000-000000004008'),
  ('00000000-0000-4000-8000-00000000a109', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000081', '00000000-0000-4000-8000-000000004009'),
  ('00000000-0000-4000-8000-00000000a110', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000081', '00000000-0000-4000-8000-000000004010'),
  ('00000000-0000-4000-8000-00000000a111', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000081', '00000000-0000-4000-8000-000000004011'),
  ('00000000-0000-4000-8000-00000000a112', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000081', '00000000-0000-4000-8000-000000004012')
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- 9. Ota-onalar (18) + vasiylik (P5001 — 2 farzand, login bilan)
-- ---------------------------------------------------------------------------
insert into public.parents (id, school_id, profile_id, full_name, phone, address, workplace) values
  ('00000000-0000-4000-8000-000000005001', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000003020', 'Abdullayev Olim Raximovich',  '+998901112220', 'Chilonzor, 14-kvartal, 5-uy', 'Toshkent sh. hokimligi'),
  ('00000000-0000-4000-8000-000000005002', '00000000-0000-4000-8000-000000000001', null, 'Azizova Anvara Yusupovna',    '+998901112222', 'Sergeli, Yangi hayot, 12-uy', 'Uy bekasi'),
  ('00000000-0000-4000-8000-000000005003', '00000000-0000-4000-8000-000000000001', null, 'Bekmurodov Rustam Erkinovich','+998901112223', 'Chilonzor, 9-kvartal, 3-uy',  'IT kompaniya'),
  ('00000000-0000-4000-8000-000000005004', '00000000-0000-4000-8000-000000000001', null, 'Esonova Shahnoza Qodirovna',  '+998901112224', 'Yunusobod, 4-mavze, 18-uy',   'Shifokor'),
  ('00000000-0000-4000-8000-000000005005', '00000000-0000-4000-8000-000000000001', null, 'G''ulomova Nargis Sobirovna', '+998901112225', 'Mirzo Ulug''bek, 22-uy',      'O''qituvchi'),
  ('00000000-0000-4000-8000-000000005006', '00000000-0000-4000-8000-000000000001', null, 'Ismoilov Shavkat Rasulovich', '+998901112226', 'Olmazor, Farobiy, 7-uy',      'Muhandis'),
  ('00000000-0000-4000-8000-000000005007', '00000000-0000-4000-8000-000000000001', null, 'Karimova Dilnoz Ilhomovna',   '+998901112227', 'Yakkasaroy, 11-uy',           'Buxgalter'),
  ('00000000-0000-4000-8000-000000005008', '00000000-0000-4000-8000-000000000001', null, 'Mahmudov Alisher To''raevich','+998901112228', 'Shayxontohur, 21-uy',         'Tadbirkor'),
  ('00000000-0000-4000-8000-000000005009', '00000000-0000-4000-8000-000000000001', null, 'Nurmatova Gulchehra Azimovna','+998901112229', 'Chilonzor, 19-uy',            'Hamshira'),
  ('00000000-0000-4000-8000-000000005010', '00000000-0000-4000-8000-000000000001', null, 'Rashidov Nodir Baxtiyorovich','+998901112230', 'Bektemir, 3-uy',              'Haydovchi'),
  ('00000000-0000-4000-8000-000000005011', '00000000-0000-4000-8000-000000000001', null, 'Toshpulatova Mohira Kamolovna','+998901112231', 'Uchtepa, 8-uy',              'Dizayner'),
  ('00000000-0000-4000-8000-000000005012', '00000000-0000-4000-8000-000000000001', null, 'Xolmatov Rustam Nazarovich', '+998901112232', 'Sergeli, 6-uy',               'Quruvchi'),
  ('00000000-0000-4000-8000-000000005013', '00000000-0000-4000-8000-000000000001', null, 'Ahmedova Gulnora Sobirovna',  '+998901112233', 'Yunusobod, 12-uy',            'Uy bekasi'),
  ('00000000-0000-4000-8000-000000005014', '00000000-0000-4000-8000-000000000001', null, 'Aminov Ravshan Qahhorovich',  '+998901112234', 'Mirzo Ulug''bek, 9-uy',       'Advokat'),
  ('00000000-0000-4000-8000-000000005015', '00000000-0000-4000-8000-000000000001', null, 'Ergasheva Zilola Anvarovna',  '+998901112235', 'Chilonzor, 16-uy',            'Sartarosh'),
  ('00000000-0000-4000-8000-000000005016', '00000000-0000-4000-8000-000000000001', null, 'Aliyeva Munira Xolmatovna',   '+998901112236', 'Yakkasaroy, 5-uy',            'O''qituvchi'),
  ('00000000-0000-4000-8000-000000005017', '00000000-0000-4000-8000-000000000001', null, 'Asadov Furqat Sultonovich',   '+998901112237', 'Olmazor, 14-uy',              'Dasturchi'),
  ('00000000-0000-4000-8000-000000005018', '00000000-0000-4000-8000-000000000001', null, 'Berdiyeva Nilufar Ravshanovna','+998901112238', 'Shayxontohur, 17-uy',         'Shifokor')
on conflict (id) do nothing;

insert into public.parent_student (id, school_id, parent_id, student_id, relationship, is_primary_contact, can_view_documents, contract_number, contract_signed_on) values
  -- P5001: Jasur (10-A) + Bekzod (7-A) — 2 farzand, hujjatlar ruxsati bilan
  ('00000000-0000-4000-8000-00000000b101', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000005001', '00000000-0000-4000-8000-000000004001', 'FATHER',   true,  true,  'SH-2026-001', '2026-09-02'),
  ('00000000-0000-4000-8000-00000000b102', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000005001', '00000000-0000-4000-8000-000000004025', 'FATHER',   false, true,  'SH-2026-001', '2026-09-02'),
  ('00000000-0000-4000-8000-00000000b103', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000005002', '00000000-0000-4000-8000-000000004002', 'MOTHER',   true,  false, 'SH-2026-002', '2026-09-02'),
  ('00000000-0000-4000-8000-00000000b104', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000005003', '00000000-0000-4000-8000-000000004003', 'FATHER',   true,  false, 'SH-2026-003', '2026-09-03'),
  ('00000000-0000-4000-8000-00000000b105', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000005004', '00000000-0000-4000-8000-000000004004', 'MOTHER',   true,  false, 'SH-2026-004', '2026-09-03'),
  ('00000000-0000-4000-8000-00000000b106', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000005005', '00000000-0000-4000-8000-000000004005', 'MOTHER',   true,  false, 'SH-2026-005', '2026-09-04'),
  ('00000000-0000-4000-8000-00000000b107', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000005006', '00000000-0000-4000-8000-000000004006', 'FATHER',   true,  false, 'SH-2026-006', '2026-09-04'),
  ('00000000-0000-4000-8000-00000000b108', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000005007', '00000000-0000-4000-8000-000000004007', 'MOTHER',   true,  false, 'SH-2026-007', '2026-09-05'),
  ('00000000-0000-4000-8000-00000000b109', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000005008', '00000000-0000-4000-8000-000000004008', 'FATHER',   true,  false, 'SH-2026-008', '2026-09-05'),
  ('00000000-0000-4000-8000-00000000b110', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000005009', '00000000-0000-4000-8000-000000004009', 'MOTHER',   true,  false, 'SH-2026-009', '2026-09-08'),
  ('00000000-0000-4000-8000-00000000b111', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000005010', '00000000-0000-4000-8000-000000004010', 'FATHER',   true,  false, 'SH-2026-010', '2026-09-08'),
  ('00000000-0000-4000-8000-00000000b112', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000005011', '00000000-0000-4000-8000-000000004011', 'MOTHER',   true,  false, 'SH-2026-011', '2026-09-09'),
  ('00000000-0000-4000-8000-00000000b113', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000005012', '00000000-0000-4000-8000-000000004012', 'FATHER',   true,  false, 'SH-2026-012', '2026-09-09'),
  ('00000000-0000-4000-8000-00000000b114', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000005013', '00000000-0000-4000-8000-000000004013', 'MOTHER',   true,  false, 'SH-2026-013', '2026-09-10'),
  ('00000000-0000-4000-8000-00000000b115', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000005014', '00000000-0000-4000-8000-000000004014', 'FATHER',   true,  false, 'SH-2026-014', '2026-09-10'),
  ('00000000-0000-4000-8000-00000000b116', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000005015', '00000000-0000-4000-8000-000000004015', 'MOTHER',   true,  false, 'SH-2026-015', '2026-09-11'),
  ('00000000-0000-4000-8000-00000000b117', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000005016', '00000000-0000-4000-8000-000000004026', 'MOTHER',   true,  false, 'SH-2026-026', '2026-09-12'),
  ('00000000-0000-4000-8000-00000000b118', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000005017', '00000000-0000-4000-8000-000000004027', 'FATHER',   true,  false, 'SH-2026-027', '2026-09-12'),
  ('00000000-0000-4000-8000-00000000b119', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000005018', '00000000-0000-4000-8000-000000004028', 'MOTHER',   true,  false, 'SH-2026-028', '2026-09-15')
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- 10. Dars jadvali: versiya + generator (most-constrained-first, greedy)
--     Guruh darslari parallel joylashtiriladi (har guruh — alohida slot).
-- ---------------------------------------------------------------------------
insert into public.timetable_versions (id, school_id, academic_year_id, name, status, generated_by, created_at, updated_at)
values ('00000000-0000-4000-8000-000000000090', '00000000-0000-4000-8000-000000000001',
        '00000000-0000-4000-8000-000000000002', 'Asosiy jadval (DEMO)', 'DRAFT',
        '00000000-0000-4000-8000-000000003002', now(), now())
on conflict (id) do nothing;

do $$
declare
  v_school  uuid := '00000000-0000-4000-8000-000000000001';
  v_version uuid := '00000000-0000-4000-8000-000000000090';
  v_year    uuid := '00000000-0000-4000-8000-000000000002';
  v_day int; v_period int;
  r_class record; r_cs record; r_grp record;
  v_teacher uuid; v_room uuid;
begin
  create temp table tmp_hours on commit drop as
    select cs.id as class_subject_id, cs.class_id, cs.weekly_hours as remaining,
           s.required_room_type, c.homeroom_room_id, s.name as subject_name,
           (select count(*) from public.subject_groups g
            where g.class_subject_id = cs.id) as group_count
    from public.class_subjects cs
    join public.subjects s on s.id = cs.subject_id
    join public.classes c on c.id = cs.class_id
    where c.academic_year_id = v_year;

  create temp table tmp_busy (kind text, entity uuid, day int, period int) on commit drop;
  create unique index if not exists tmp_busy_uk on tmp_busy (kind, entity, day, period);

  for r_class in select distinct h.class_id from tmp_hours h order by 1 loop
    for v_day in 1..5 loop
      for v_period in 1..6 loop
        if exists (select 1 from tmp_busy b
                   where b.kind = 'class' and b.entity = r_class.class_id
                     and b.day = v_day and b.period = v_period) then
          continue;
        end if;

        select * into r_cs from tmp_hours h
        where h.class_id = r_class.class_id and h.remaining > 0
          -- guruh darsi: barcha guruh o'qituvchilari bo'sh bo'lishi kerak
          and not exists (
            select 1 from public.subject_groups g
            join public.teacher_assignments ta
              on ta.subject_group_id = g.id and ta.valid_to is null
            where g.class_subject_id = h.class_subject_id
              and exists (select 1 from tmp_busy b
                          where b.kind = 'teacher' and b.entity = ta.teacher_id
                            and b.day = v_day and b.period = v_period))
          -- guruhsiz dars: o'qituvchi bo'sh bo'lishi kerak
          and not exists (
            select 1 from public.teacher_assignments ta
            where ta.class_subject_id = h.class_subject_id
              and ta.subject_group_id is null and ta.valid_to is null
              and exists (select 1 from tmp_busy b
                          where b.kind = 'teacher' and b.entity = ta.teacher_id
                            and b.day = v_day and b.period = v_period))
        order by h.remaining desc, h.subject_name
        limit 1;

        if not found then continue; end if;

        if r_cs.group_count > 0 then
          for r_grp in
            select g.id as group_id, ta.teacher_id
            from public.subject_groups g
            join public.teacher_assignments ta
              on ta.subject_group_id = g.id and ta.valid_to is null
            where g.class_subject_id = r_cs.class_subject_id
          loop
            v_room := coalesce(
              (select rm.id from public.rooms rm
               where rm.school_id = v_school and rm.room_type = r_cs.required_room_type
                 and not exists (select 1 from tmp_busy b
                                 where b.kind = 'room' and b.entity = rm.id
                                   and b.day = v_day and b.period = v_period)
               order by rm.name limit 1),
              (select rm.id from public.rooms rm
               where rm.school_id = v_school and rm.room_type = 'CLASSROOM'
                 and not exists (select 1 from tmp_busy b
                                 where b.kind = 'room' and b.entity = rm.id
                                   and b.day = v_day and b.period = v_period)
               order by rm.name limit 1));
            insert into public.timetable_slots
              (school_id, timetable_version_id, class_id, class_subject_id,
               subject_group_id, teacher_id, room_id, day_of_week, period_number)
            values (v_school, v_version, r_class.class_id, r_cs.class_subject_id,
                    r_grp.group_id, r_grp.teacher_id, v_room, v_day, v_period);
            insert into tmp_busy values ('teacher', r_grp.teacher_id, v_day, v_period);
            if v_room is not null then
              insert into tmp_busy values ('room', v_room, v_day, v_period);
            end if;
          end loop;
        else
          select ta.teacher_id into v_teacher
          from public.teacher_assignments ta
          where ta.class_subject_id = r_cs.class_subject_id
            and ta.subject_group_id is null and ta.valid_to is null
          limit 1;

          v_room := coalesce(
            case when r_cs.required_room_type is not null then
              (select rm.id from public.rooms rm
               where rm.school_id = v_school and rm.room_type = r_cs.required_room_type
                 and not exists (select 1 from tmp_busy b
                                 where b.kind = 'room' and b.entity = rm.id
                                   and b.day = v_day and b.period = v_period)
               order by rm.name limit 1)
            end,
            (select rm.id from public.rooms rm
             where rm.school_id = v_school and rm.room_type = 'CLASSROOM'
               and not exists (select 1 from tmp_busy b
                               where b.kind = 'room' and b.entity = rm.id
                                 and b.day = v_day and b.period = v_period)
             order by rm.name limit 1));

          insert into public.timetable_slots
            (school_id, timetable_version_id, class_id, class_subject_id,
             subject_group_id, teacher_id, room_id, day_of_week, period_number)
          values (v_school, v_version, r_class.class_id, r_cs.class_subject_id,
                  null, v_teacher, v_room, v_day, v_period);
          if v_teacher is not null then
            insert into tmp_busy values ('teacher', v_teacher, v_day, v_period);
          end if;
          if v_room is not null then
            insert into tmp_busy values ('room', v_room, v_day, v_period);
          end if;
        end if;

        insert into tmp_busy values ('class', r_class.class_id, v_day, v_period);
        update tmp_hours set remaining = remaining - 1
        where class_subject_id = r_cs.class_subject_id;
      end loop;
    end loop;
  end loop;
end $$;

-- Score hisoblash va nashr etish
update public.timetable_versions v
set score = least(100, greatest(0, 100 - 5 * (
      (select coalesce(sum(cs.weekly_hours), 0) from public.class_subjects cs) -
      (select count(distinct (ts.class_id, ts.day_of_week, ts.period_number))
       from public.timetable_slots ts where ts.timetable_version_id = v.id)
    )))
where v.id = '00000000-0000-4000-8000-000000000090';

update public.timetable_versions
set status = 'PUBLISHED', published_at = now(), published_by = '00000000-0000-4000-8000-000000003002'
where id = '00000000-0000-4000-8000-000000000090';

-- ---------------------------------------------------------------------------
-- 11. Jurnal: darslar, davomat, baholar (joriy haftaning dushanbasi)
-- ---------------------------------------------------------------------------
do $$
declare
  v_school uuid := '00000000-0000-4000-8000-000000000001';
  v_monday date := date_trunc('week', current_date)::date;
  v_lesson_mat uuid; v_lesson_ont uuid;
begin
  -- Dushanba: 10-A Matematika (1-dars) va Ona tili (2-dars)
  insert into public.lessons (id, school_id, class_id, class_subject_id, teacher_id, lesson_date, period_number, topic, created_by)
  values (gen_random_uuid(), v_school,
          '00000000-0000-4000-8000-000000000050', '00000000-0000-4000-8000-000000000060',
          '00000000-0000-4000-8000-000000001001', v_monday, 1,
          'Kvadrat tenglamalar va Viyet teoremasi', '00000000-0000-4000-8000-000000003011')
  returning id into v_lesson_mat;

  insert into public.lessons (id, school_id, class_id, class_subject_id, teacher_id, lesson_date, period_number, topic, created_by)
  values (gen_random_uuid(), v_school,
          '00000000-0000-4000-8000-000000000050', '00000000-0000-4000-8000-000000000061',
          '00000000-0000-4000-8000-000000001003', v_monday, 2,
          'Alisher Navoiy g''azallari tahlili', '00000000-0000-4000-8000-000000003013')
  returning id into v_lesson_ont;

  -- Dushanba: 10-A Ingliz tili guruh darslari (3-dars, parallel)
  insert into public.lessons (id, school_id, class_id, class_subject_id, subject_group_id, teacher_id, lesson_date, period_number, topic, created_by)
  select gen_random_uuid(), v_school,
         '00000000-0000-4000-8000-000000000050', '00000000-0000-4000-8000-000000000062',
         ta.subject_group_id, ta.teacher_id, v_monday, 3, 'Past Simple: affirmative sentences', '00000000-0000-4000-8000-000000003012'
  from public.teacher_assignments ta
  where ta.class_subject_id = '00000000-0000-4000-8000-000000000062'
    and ta.subject_group_id is not null and ta.valid_to is null;

  -- Davomat: Matematika darsi — 10 PRESENT, 1 UNEXCUSED, 1 LATE
  insert into public.attendance (school_id, lesson_id, student_id, status, marked_by)
  select v_school, v_lesson_mat, s.id,
         case
           when s.id = '00000000-0000-4000-8000-000000004004' then 'UNEXCUSED'
           when s.id = '00000000-0000-4000-8000-000000004007' then 'LATE'
           else 'PRESENT'
         end::public.attendance_status,
         '00000000-0000-4000-8000-000000003011'
  from public.students s
  where s.id between '00000000-0000-4000-8000-000000004001' and '00000000-0000-4000-8000-000000004012'
  on conflict do nothing;

  -- Kunlik (formativ) baholar — 10-ball shkalada, PUBLISHED
  insert into public.grades (school_id, student_id, class_subject_id, lesson_id, grade_type_id, value, status, given_by)
  select v_school, s.id,
         '00000000-0000-4000-8000-000000000060', v_lesson_mat,
         '00000000-0000-4000-8000-000000000020',
         case s.id::text
           when '00000000-0000-4000-8000-000000004001' then 9
           when '00000000-0000-4000-8000-000000004002' then 8
           when '00000000-0000-4000-8000-000000004003' then 7
           when '00000000-0000-4000-8000-000000004004' then 5
           when '00000000-0000-4000-8000-000000004005' then 6
           when '00000000-0000-4000-8000-000000004006' then 8
           when '00000000-0000-4000-8000-000000004007' then 10
           when '00000000-0000-4000-8000-000000004008' then 9
           when '00000000-0000-4000-8000-000000004009' then 7
           when '00000000-0000-4000-8000-000000004010' then 8
           when '00000000-0000-4000-8000-000000004011' then 6
           else 9
         end,
         'PUBLISHED', '00000000-0000-4000-8000-000000003011'
  from public.students s
  where s.id between '00000000-0000-4000-8000-000000004001' and '00000000-0000-4000-8000-000000004012'
  on conflict do nothing;
end $$;

-- ---------------------------------------------------------------------------
-- 12. Uy vazifasi + topshiriqlar
-- ---------------------------------------------------------------------------
insert into public.homework (id, school_id, class_subject_id, title, description, assigned_at, due_at, target_type, created_by) values
  ('00000000-0000-4000-8000-00000000c201', '00000000-0000-4000-8000-000000000001',
   '00000000-0000-4000-8000-000000000060', 'Kvadrat tenglamalar — 20 ta misol',
   'Darslik 45-bet, 1-20 misollar. Yechimni to''liq yozing.',
   now(), date_trunc('week', current_date)::date + 2 + interval '18 hours', 'CLASS',
   '00000000-0000-4000-8000-000000003011'),
  ('00000000-0000-4000-8000-00000000c202', '00000000-0000-4000-8000-000000000001',
   '00000000-0000-4000-8000-000000000062', 'Past Simple — 15 ta gap',
   'Berilgan fe''llarni o''tgan zamonda qo''llab gaplar tuzing.',
   now(), date_trunc('week', current_date)::date + 3 + interval '18 hours', 'GROUP',
   '00000000-0000-4000-8000-000000003012')
on conflict (id) do nothing;

-- i002 — 10-A ingliz tili 1-guruhga tegishli
update public.homework
set subject_group_id = '00000000-0000-4000-8000-000000000080'
where id = '00000000-0000-4000-8000-00000000c202'
  and subject_group_id is null;

insert into public.homework_submissions (school_id, homework_id, student_id, content, submitted_at, status) values
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-00000000c201', '00000000-0000-4000-8000-000000004001', 'Barcha misollar yechildi', now() - interval '2 hours', 'SUBMITTED'),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-00000000c201', '00000000-0000-4000-8000-000000004002', '18 tasi yechildi', now() - interval '1 hour', 'SUBMITTED'),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-00000000c201', '00000000-0000-4000-8000-000000004003', 'Faylda yuborildi', now() - interval '3 hours', 'CHECKED')
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- 13. Xabar shablonlari, e'lonlar, bildirishnomalar
-- ---------------------------------------------------------------------------
insert into public.message_templates (id, school_id, name, category, body, created_by) values
  ('00000000-0000-4000-8000-00000000d201', '00000000-0000-4000-8000-000000000001', 'Kelmadi', 'ATTENDANCE', 'Assalomu alaykum! Bugun ({{date}}) farzandingiz {{student_name}} {{subject}} darsiga kelmadi. Iltimos, sababini bildiring.', '00000000-0000-4000-8000-000000003002'),
  ('00000000-0000-4000-8000-00000000d202', '00000000-0000-4000-8000-000000000001', 'Uy vazifasi topshirilmadi', 'HOMEWORK', 'Assalomu alaykum! {{student_name}} ning {{subject}} fanidan uy vazifasi ({{homework_title}}) topshirilmadi. Iltimos, nazorat qiling.', '00000000-0000-4000-8000-000000003002'),
  ('00000000-0000-4000-8000-00000000d203', '00000000-0000-4000-8000-000000000001', 'Yangi baho', 'GRADES', 'Assalomu alaykum! {{student_name}} {{subject}} fanidan {{date}} sanada {{grade}} baho oldi.', '00000000-0000-4000-8000-000000003002'),
  ('00000000-0000-4000-8000-00000000d204', '00000000-0000-4000-8000-000000000001', 'Ota-onalar yig''ilishi', 'EVENT', 'Hurmatli ota-onalar! {{date}} soat {{time}} da {{class_name}} sinfi ota-onalar yig''ilishi bo''lib o''tadi. Kelishingizni so''raymiz.', '00000000-0000-4000-8000-000000003002')
on conflict (school_id, name) do nothing;

insert into public.announcements (id, school_id, author_id, scope, class_id, title, body, scheduled_for, published_at, is_pinned) values
  ('00000000-0000-4000-8000-00000000e201', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000003001', 'SCHOOL', null,
   'Ota-onalar yig''ilishi', '15-oktabr, soat 15:00 da maktab bo''yicha ota-onalar yig''ilishi bo''lib o''tadi. Barcha ota-onalarni taklif qilamiz.',
   null, now(), true),
  ('00000000-0000-4000-8000-00000000e202', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000003011', 'CLASS', '00000000-0000-4000-8000-000000000050',
   '10-A: matematika fanidan BSB', 'Dushanba kuni matematika fanidan bob bo''yicha summativ baholash (BSB) bo''lib o''tadi. Tayyorlaning!',
   now() + interval '1 day', null, false)
on conflict (id) do nothing;

insert into public.notifications (school_id, recipient_id, event_type, title, body, priority, entity_type, entity_id) values
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000003001', 'attendance.unexcused',
   'Sababsiz qoldirish', 'Esonova Nilufar (10-A) bugun 1-darsga sababsiz kelmadi.', 'HIGH', 'students', '00000000-0000-4000-8000-000000004004'),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000003011', 'lesson.pending',
   'Bugungi jurnal', 'Bugun 5 ta darsingiz bor. 2 ta jurnal to''ldirilmagan.', 'MEDIUM', null, null),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000003020', 'grade.published',
   'Yangi baho', 'Abdullayev Jasur matematikadan 9/10 baho oldi.', 'LOW', 'students', '00000000-0000-4000-8000-000000004001')
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- 14. Risk qoidalari + namuna voqea
-- ---------------------------------------------------------------------------
insert into public.risk_rules (id, school_id, code, name, description, config, created_by) values
  ('00000000-0000-4000-8000-00000000f201', '00000000-0000-4000-8000-000000000001', 'UNEXCUSED_3X',
   'Ketma-ket 3 sababsiz', 'O''quvchi ketma-ket 3 darsni sababsiz qoldirsa — sinf rahbari va direktorga ogohlantirish',
   '{"consecutive": 3, "notify": ["CLASS_TEACHER", "ADMIN"]}', '00000000-0000-4000-8000-000000003002'),
  ('00000000-0000-4000-8000-00000000f202', '00000000-0000-4000-8000-000000000001', 'GRADE_DROP',
   'Baho pasayishi', 'Oxirgi 4 haftalik o''rtacha baho 20% dan ko''p pasaysa — signal',
   '{"window_weeks": 4, "drop_percent": 20}', '00000000-0000-4000-8000-000000003002'),
  ('00000000-0000-4000-8000-00000000f203', '00000000-0000-4000-8000-000000000001', 'HOMEWORK_MISS_4',
   'Uy vazifasi topshirilmagan', '2 hafta ichida 4+ uy vazifasi topshirilmasa — ota-onaga bildirishnoma',
   '{"window_weeks": 2, "missed": 4, "notify": ["PARENT"]}', '00000000-0000-4000-8000-000000003002')
on conflict (school_id, code) do nothing;

insert into public.risk_events (id, school_id, student_id, rule_id, severity, reasons, status) values
  ('00000000-0000-4000-8000-00000000a301', '00000000-0000-4000-8000-000000000001',
   '00000000-0000-4000-8000-000000004004', '00000000-0000-4000-8000-00000000f201', 'HIGH',
   '["Oxirgi 2 haftada 3 ta sababsiz qoldirish", "Matematika bo''yicha formativ baholar pasayib bormoqda"]'::jsonb,
   'OPEN')
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- 15. Hujjat shablonlari
-- ---------------------------------------------------------------------------
insert into public.document_templates (id, school_id, code, name, category, body, variables, created_by) values
  ('00000000-0000-4000-8000-00000000b301', '00000000-0000-4000-8000-000000000001', 'ARIZA_SABABSIZ',
   'Sababsiz qoldirish bo''yicha ariza', 'ATTENDANCE',
   '{{school.name}} direktoriga' || chr(10) || '{{student.class}} sinf o''quvchisi {{student.full_name}}ning ota-onasidan' || chr(10) || chr(10) || 'ARIZA' || chr(10) || chr(10) || '{{student.full_name}} {{date_from}}-{{date_to}} kunlarda sababsiz {{hours}} soat dars qoldirganligi uchun rasmiy ogohlantirish olganimni tasdiqlayman.',
   '["student.full_name","student.class","school.name","date_from","date_to","hours"]'::jsonb,
   '00000000-0000-4000-8000-000000003002'),
  ('00000000-0000-4000-8000-00000000b302', '00000000-0000-4000-8000-000000000001', 'MA_LUMOTNOMA_DAVOMAT',
   'Davomat ma''lumotnomasi', 'ATTENDANCE',
   'MA''LUMOTNOMA' || chr(10) || chr(10) || 'Ushbu ma''lumotnoma {{student.full_name}}ga ({{student.class}} sinf) berildi. {{term_name}} davomida davomati: {{attendance_present}}% (sababsiz qoldirishlar: {{unexcused_count}}).',
   '["student.full_name","student.class","term_name","attendance_present","unexcused_count"]'::jsonb,
   '00000000-0000-4000-8000-000000003002')
on conflict (school_id, code) do nothing;

-- ---------------------------------------------------------------------------
-- 16. Tozalash: dev yordamchi funksiyani olib tashlash
-- ---------------------------------------------------------------------------
drop function if exists public.dev_create_user(uuid, text, text);

commit;
