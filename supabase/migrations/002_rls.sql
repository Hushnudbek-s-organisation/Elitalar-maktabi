-- ============================================================================
-- SchoolOS Uzbekistan — Migration 002: ROW LEVEL SECURITY
-- ----------------------------------------------------------------------------
-- 001_schema dan keyin bajariladi.
-- Prinsip: FRONTEND HECH QACHON XAVFSIZLIK CHEGARASI EMAS.
-- Har school-owned jadvalda RLS yoqilgan; school_id server kontekstidan
-- (profiles) aniqlanadi — foydalanuvchi yuborgan school_id ishlatilmaydi.
-- Yordamchi funksiyalar SECURITY DEFINER: policy ichidagi subquery'larda
-- RLS rekursiyasi bo'lmasligi uchun (definer = postgres, RLS bypass).
-- ============================================================================

begin;

-- ===========================================================================
-- 1. YORDAMCHI FUNKSIYALAR (tenant/rol konteksti)
-- ===========================================================================

create or replace function public.app_school_id()
returns uuid language sql stable security definer
set search_path = public, auth as $$
  select p.school_id from public.profiles p where p.id = auth.uid()
$$;

create or replace function public.app_role()
returns public.user_role language sql stable security definer
set search_path = public, auth as $$
  select p.role from public.profiles p where p.id = auth.uid()
$$;

create or replace function public.app_is_super_admin()
returns boolean language sql stable security definer
set search_path = public, auth as $$
  select coalesce((select p.role = 'SUPER_ADMIN' and p.is_active
                   from public.profiles p where p.id = auth.uid()), false)
$$;

create or replace function public.app_is_school_admin()  -- ADMIN yoki DIREKTOR
returns boolean language sql stable security definer
set search_path = public, auth as $$
  select coalesce((select p.role in ('ADMIN','DIRECTOR') and p.is_active
                   from public.profiles p where p.id = auth.uid()), false)
$$;

create or replace function public.app_is_staff()  -- maktab xodimi
returns boolean language sql stable security definer
set search_path = public, auth as $$
  select coalesce((select p.role in ('ADMIN','DIRECTOR','CLASS_TEACHER','TEACHER') and p.is_active
                   from public.profiles p where p.id = auth.uid()), false)
$$;

create or replace function public.app_is_school_member()  -- maktab a'zosi (har qanday rol)
returns boolean language sql stable security definer
set search_path = public, auth as $$
  select coalesce((select p.school_id is not null and p.is_active
                   from public.profiles p where p.id = auth.uid()), false)
$$;

-- Permission: rol bundle + shaxsiy override (school darajasida sozlash uchun)
create or replace function public.app_has_permission(p_permission text)
returns boolean language sql stable security definer
set search_path = public, auth as $$
  select coalesce(
    (select o.allowed from public.user_permission_overrides o
     where o.profile_id = auth.uid() and o.permission_key = p_permission),
    (select count(*) > 0 from public.role_permissions rp
     where rp.role_key = (select p.role::text from public.profiles p where p.id = auth.uid())
       and rp.permission_key = p_permission),
    false)
$$;

-- Person-identity resolver'lar
create or replace function public.app_teacher_id()
returns uuid language sql stable security definer
set search_path = public, auth as $$
  select t.id from public.teachers t where t.profile_id = auth.uid() limit 1
$$;

create or replace function public.app_student_id()
returns uuid language sql stable security definer
set search_path = public, auth as $$
  select s.id from public.students s where s.profile_id = auth.uid() limit 1
$$;

create or replace function public.app_parent_id()
returns uuid language sql stable security definer
set search_path = public, auth as $$
  select pr.id from public.parents pr where pr.profile_id = auth.uid() limit 1
$$;

-- ===========================================================================
-- 2. SCOPED CHECK FUNKSIYALARI
-- ===========================================================================

create or replace function public.app_is_teacher_of_class(p_class uuid)
returns boolean language sql stable security definer
set search_path = public, auth as $$
  select exists (
    select 1 from public.teacher_assignments ta
    join public.class_subjects cs on cs.id = ta.class_subject_id
    where ta.teacher_id = public.app_teacher_id()
      and cs.class_id = p_class and ta.valid_to is null)
$$;

create or replace function public.app_is_class_teacher_of(p_class uuid)
returns boolean language sql stable security definer
set search_path = public, auth as $$
  select exists (
    select 1 from public.class_teacher_assignments cta
    where cta.class_id = p_class and cta.teacher_id = public.app_teacher_id()
      and cta.valid_to is null)
$$;

create or replace function public.app_is_teacher_of_class_subject(p_cs uuid)
returns boolean language sql stable security definer
set search_path = public, auth as $$
  select exists (
    select 1 from public.teacher_assignments ta
    where ta.class_subject_id = p_cs and ta.teacher_id = public.app_teacher_id()
      and ta.valid_to is null)
$$;

create or replace function public.app_is_class_teacher_of_class_subject(p_cs uuid)
returns boolean language sql stable security definer
set search_path = public, auth as $$
  select exists (
    select 1 from public.class_subjects cs
    where cs.id = p_cs and public.app_is_class_teacher_of(cs.class_id))
$$;

create or replace function public.app_is_teacher_of_lesson(p_lesson uuid)
returns boolean language sql stable security definer
set search_path = public, auth as $$
  select exists (
    select 1 from public.lessons l
    where l.id = p_lesson
      and (l.teacher_id = public.app_teacher_id()
           or public.app_is_teacher_of_class_subject(l.class_subject_id)))
$$;

create or replace function public.app_is_class_teacher_of_lesson(p_lesson uuid)
returns boolean language sql stable security definer
set search_path = public, auth as $$
  select exists (
    select 1 from public.lessons l
    where l.id = p_lesson
      and public.app_is_class_teacher_of_class_subject(l.class_subject_id))
$$;

create or replace function public.app_is_parent_of_student(p_student uuid)
returns boolean language sql stable security definer
set search_path = public, auth as $$
  select exists (
    select 1 from public.parent_student ps
    where ps.student_id = p_student and ps.parent_id = public.app_parent_id()
      and ps.valid_to is null)
$$;

create or replace function public.app_is_student_self(p_student uuid)
returns boolean language sql stable security definer
set search_path = public, auth as $$
  select coalesce(public.app_student_id() = p_student, false)
$$;

create or replace function public.app_is_teacher_of_student(p_student uuid)
returns boolean language sql stable security definer
set search_path = public, auth as $$
  select exists (
    select 1 from public.student_enrollments se
    where se.student_id = p_student and se.valid_to is null
      and public.app_is_teacher_of_class(se.class_id))
$$;

create or replace function public.app_is_class_teacher_of_student(p_student uuid)
returns boolean language sql stable security definer
set search_path = public, auth as $$
  select exists (
    select 1 from public.student_enrollments se
    where se.student_id = p_student and se.valid_to is null
      and public.app_is_class_teacher_of(se.class_id))
$$;

-- ===========================================================================
-- 3. VIEW-CAPABILITY FUNKSIYALARI (har jadval uchun bitta kirish nuqtasi)
-- ===========================================================================

create or replace function public.app_can_view_profile(p_profile uuid)
returns boolean language sql stable security definer
set search_path = public, auth as $$
  select exists (
    select 1 from public.profiles p
    where p.id = p_profile and (
         p.id = auth.uid()
      or public.app_is_super_admin()
      or (p.school_id = public.app_school_id() and (
            public.app_is_staff()
            or (public.app_is_school_member()
                and p.role in ('ADMIN','DIRECTOR','CLASS_TEACHER','TEACHER'))))))
$$;

create or replace function public.app_can_view_parent(p_parent uuid)
returns boolean language sql stable security definer
set search_path = public, auth as $$
  select exists (
    select 1 from public.parents pr
    where pr.id = p_parent and (
         public.app_is_school_admin()
      or pr.id = public.app_parent_id()
      -- o'z farzandining ota-onasi (ikkinchi ota-ona)
      or exists (select 1 from public.parent_student ps
                 where ps.parent_id = pr.id and public.app_is_student_self(ps.student_id))
      -- sinf rahbari / o'z darsi o'quvchisining ota-onasi (muloqot uchun kerak)
      or exists (select 1 from public.parent_student ps
                 where ps.parent_id = pr.id
                   and (public.app_is_class_teacher_of_student(ps.student_id)
                        or public.app_is_teacher_of_student(ps.student_id)))))
$$;

create or replace function public.app_can_view_lesson(p_lesson uuid)
returns boolean language sql stable security definer
set search_path = public, auth as $$
  select exists (
    select 1 from public.lessons l
    where l.id = p_lesson and (
         public.app_is_school_admin()
      or public.app_is_teacher_of_lesson(l.id)
      or public.app_is_class_teacher_of_lesson(l.id)
      or exists (select 1 from public.student_enrollments se
                 where se.class_id = l.class_id and se.valid_to is null
                   and (public.app_is_student_self(se.student_id)
                        or public.app_is_parent_of_student(se.student_id)))))
$$;

create or replace function public.app_can_view_attendance(p_att uuid)
returns boolean language sql stable security definer
set search_path = public, auth as $$
  select exists (
    select 1 from public.attendance a
    where a.id = p_att and (
         public.app_is_school_admin()
      or public.app_is_teacher_of_student(a.student_id)
      or public.app_is_class_teacher_of_student(a.student_id)
      or public.app_is_parent_of_student(a.student_id)
      or public.app_is_student_self(a.student_id)))
$$;

create or replace function public.app_can_view_grade(p_grade uuid)
returns boolean language sql stable security definer
set search_path = public, auth as $$
  select exists (
    select 1 from public.grades g
    where g.id = p_grade and (
         public.app_is_school_admin()
      or public.app_is_teacher_of_student(g.student_id)
      or public.app_is_class_teacher_of_student(g.student_id)
      -- ota-ona/o'quvchi faqat PUBLISHED/LOCKED baholarni ko'radi (DRAFT emas)
      or (g.status in ('PUBLISHED','LOCKED')
          and (public.app_is_parent_of_student(g.student_id)
               or public.app_is_student_self(g.student_id)))))
$$;

create or replace function public.app_can_view_homework(p_hw uuid)
returns boolean language sql stable security definer
set search_path = public, auth as $$
  select exists (
    select 1 from public.homework h
    where h.id = p_hw and (
         public.app_is_school_admin()
      or public.app_is_teacher_of_class_subject(h.class_subject_id)
      or public.app_is_class_teacher_of_class_subject(h.class_subject_id)
      or (h.is_published and (
           (h.target_type = 'CLASS' and exists (
              select 1 from public.student_enrollments se
              where se.class_id = (select cs.class_id from public.class_subjects cs
                                   where cs.id = h.class_subject_id)
                and se.valid_to is null
                and (public.app_is_student_self(se.student_id)
                     or public.app_is_parent_of_student(se.student_id))))
           or (h.target_type = 'GROUP' and exists (
              select 1 from public.group_students gs
              where gs.subject_group_id = h.subject_group_id and gs.valid_to is null
                and (public.app_is_student_self(gs.student_id)
                     or public.app_is_parent_of_student(gs.student_id))))
           or (h.target_type = 'STUDENTS' and exists (
              select 1 from public.homework_targets ht
              where ht.homework_id = h.id
                and (public.app_is_student_self(ht.student_id)
                     or public.app_is_parent_of_student(ht.student_id))))))))
$$;

create or replace function public.app_teacher_owns_homework(p_hw uuid)
returns boolean language sql stable security definer
set search_path = public, auth as $$
  select exists (
    select 1 from public.homework h
    where h.id = p_hw
      and (public.app_is_teacher_of_class_subject(h.class_subject_id)
           or public.app_is_class_teacher_of_class_subject(h.class_subject_id)))
$$;

create or replace function public.app_can_view_submission(p_sub uuid)
returns boolean language sql stable security definer
set search_path = public, auth as $$
  select exists (
    select 1 from public.homework_submissions hs
    where hs.id = p_sub and (
         public.app_is_school_admin()
      or public.app_teacher_owns_homework(hs.homework_id)
      or public.app_is_student_self(hs.student_id)
      or public.app_is_parent_of_student(hs.student_id)))
$$;

create or replace function public.app_owns_message(p_msg uuid)
returns boolean language sql stable security definer
set search_path = public, auth as $$
  select exists (select 1 from public.messages m
                 where m.id = p_msg and m.sender_id = auth.uid())
$$;

create or replace function public.app_can_view_message(p_msg uuid)
returns boolean language sql stable security definer
set search_path = public, auth as $$
  select exists (
    select 1 from public.messages m
    where m.id = p_msg and (
         m.sender_id = auth.uid()
      or public.app_is_school_admin()
      or exists (select 1 from public.message_recipients mr
                 where mr.message_id = m.id and mr.recipient_id = auth.uid())))
$$;

create or replace function public.app_can_view_announcement(p_ann uuid)
returns boolean language sql stable security definer
set search_path = public, auth as $$
  select exists (
    select 1 from public.announcements a
    where a.id = p_ann and (
         public.app_is_school_admin()
      or a.author_id = auth.uid()
      or (a.published_at is not null and a.published_at <= now() and (
           (a.scope = 'SCHOOL' and public.app_is_school_member())
           or (a.scope = 'TEACHERS' and public.app_is_staff())
           or (a.scope = 'CLASS_TEACHERS' and public.app_role() in ('CLASS_TEACHER','ADMIN','DIRECTOR'))
           or (a.scope = 'CLASS' and (
                public.app_is_class_teacher_of(a.class_id)
                or exists (select 1 from public.teacher_assignments ta
                           join public.class_subjects cs on cs.id = ta.class_subject_id
                           where cs.class_id = a.class_id
                             and ta.teacher_id = public.app_teacher_id()
                             and ta.valid_to is null)
                or exists (select 1 from public.student_enrollments se
                           where se.class_id = a.class_id and se.valid_to is null
                             and (public.app_is_student_self(se.student_id)
                                  or public.app_is_parent_of_student(se.student_id)))))))))
$$;

create or replace function public.app_owns_announcement(p_ann uuid)
returns boolean language sql stable security definer
set search_path = public, auth as $$
  select exists (
    select 1 from public.announcements a
    where a.id = p_ann and (a.author_id = auth.uid() or public.app_is_school_admin()))
$$;

create or replace function public.app_can_view_document(p_doc uuid)
returns boolean language sql stable security definer
set search_path = public, auth as $$
  select exists (
    select 1 from public.documents d
    where d.id = p_doc and (
         public.app_is_school_admin()
      or (d.student_id is not null and (
           public.app_is_student_self(d.student_id)
           or (public.app_is_parent_of_student(d.student_id) and exists (
                select 1 from public.parent_student ps
                where ps.student_id = d.student_id
                  and ps.parent_id = public.app_parent_id()
                  and ps.can_view_documents and ps.valid_to is null))
           or public.app_is_class_teacher_of_student(d.student_id)))
      or (d.parent_id is not null and d.parent_id = public.app_parent_id())))
$$;

-- Storage: bucket'dagi fayl yo'lidan school_id ajratish (yo'l: school_id/...)
create or replace function public.app_storage_school(p_path text)
returns uuid language sql stable security definer
set search_path = public as $$
  select case when p_path ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}'
         then split_part(p_path, '/', 1)::uuid
         else null end
$$;

-- student-documents bucket: metadata (documents) orqali tekshiruv
create or replace function public.app_can_read_document_object(p_path text)
returns boolean language sql stable security definer
set search_path = public, auth as $$
  select exists (
    select 1 from public.documents d
    where d.bucket = 'student-documents' and d.storage_path = p_path
      and (
         public.app_is_school_admin()
      or (d.student_id is not null and (
           public.app_is_student_self(d.student_id)
           or (public.app_is_parent_of_student(d.student_id) and exists (
                select 1 from public.parent_student ps
                where ps.student_id = d.student_id
                  and ps.parent_id = public.app_parent_id()
                  and ps.can_view_documents and ps.valid_to is null))
           or public.app_is_class_teacher_of_student(d.student_id)))
      or (d.parent_id is not null and d.parent_id = public.app_parent_id())))
$$;

create or replace function public.app_can_view_delivery(p_del uuid)
returns boolean language sql stable security definer
set search_path = public, auth as $$
  select exists (
    select 1 from public.notification_deliveries nd
    where nd.id = p_del and (
         public.app_is_school_admin()
      or exists (select 1 from public.notifications n
                 where n.id = nd.notification_id and n.recipient_id = auth.uid())))
$$;

create or replace function public.app_can_view_import_job(p_job uuid)
returns boolean language sql stable security definer
set search_path = public, auth as $$
  select exists (
    select 1 from public.import_jobs j
    where j.id = p_job and (j.created_by = auth.uid() or public.app_is_school_admin()))
$$;

-- ===========================================================================
-- 4. RLS: PLATFORMA YADROSI
-- ===========================================================================

alter table public.schools enable row level security;

drop policy if exists schools_select on public.schools;
create policy schools_select on public.schools for select to authenticated
  using (id = public.app_school_id() or public.app_is_super_admin());

drop policy if exists schools_update on public.schools;
create policy schools_update on public.schools for update to authenticated
  using (public.app_is_super_admin() or (public.app_is_school_admin() and id = public.app_school_id()))
  with check (public.app_is_super_admin() or (public.app_is_school_admin() and id = public.app_school_id()));

drop policy if exists schools_insert_delete on public.schools;
create policy schools_insert_delete on public.schools for all to authenticated
  using (public.app_is_super_admin())
  with check (public.app_is_super_admin());

alter table public.school_settings enable row level security;

drop policy if exists school_settings_select on public.school_settings;
create policy school_settings_select on public.school_settings for select to authenticated
  using (public.app_is_school_member() and school_id = public.app_school_id());

drop policy if exists school_settings_write on public.school_settings;
create policy school_settings_write on public.school_settings for all to authenticated
  using (public.app_is_school_admin() and school_id = public.app_school_id())
  with check (public.app_is_school_admin() and school_id = public.app_school_id());

alter table public.school_features enable row level security;

drop policy if exists school_features_select on public.school_features;
create policy school_features_select on public.school_features for select to authenticated
  using (public.app_is_school_member() and school_id = public.app_school_id());

drop policy if exists school_features_write on public.school_features;
create policy school_features_write on public.school_features for all to authenticated
  using (public.app_is_school_admin() and school_id = public.app_school_id())
  with check (public.app_is_school_admin() and school_id = public.app_school_id());

-- ===========================================================================
-- 5. RLS: O'QUV YILI / DARS VAQTLARI / KALENDAR (member read, admin write)
-- ===========================================================================

alter table public.academic_years enable row level security;
drop policy if exists academic_years_select on public.academic_years;
create policy academic_years_select on public.academic_years for select to authenticated
  using (public.app_is_school_member() and school_id = public.app_school_id());
drop policy if exists academic_years_write on public.academic_years;
create policy academic_years_write on public.academic_years for all to authenticated
  using (public.app_is_school_admin() and school_id = public.app_school_id())
  with check (public.app_is_school_admin() and school_id = public.app_school_id());

alter table public.academic_terms enable row level security;
drop policy if exists academic_terms_select on public.academic_terms;
create policy academic_terms_select on public.academic_terms for select to authenticated
  using (public.app_is_school_member() and school_id = public.app_school_id());
drop policy if exists academic_terms_write on public.academic_terms;
create policy academic_terms_write on public.academic_terms for all to authenticated
  using (public.app_is_school_admin() and school_id = public.app_school_id())
  with check (public.app_is_school_admin() and school_id = public.app_school_id());

alter table public.lesson_periods enable row level security;
drop policy if exists lesson_periods_select on public.lesson_periods;
create policy lesson_periods_select on public.lesson_periods for select to authenticated
  using (public.app_is_school_member() and school_id = public.app_school_id());
drop policy if exists lesson_periods_write on public.lesson_periods;
create policy lesson_periods_write on public.lesson_periods for all to authenticated
  using (public.app_is_school_admin() and school_id = public.app_school_id())
  with check (public.app_is_school_admin() and school_id = public.app_school_id());

alter table public.calendar_events enable row level security;
drop policy if exists calendar_events_select on public.calendar_events;
create policy calendar_events_select on public.calendar_events for select to authenticated
  using (public.app_is_school_member() and school_id = public.app_school_id());
drop policy if exists calendar_events_write on public.calendar_events;
create policy calendar_events_write on public.calendar_events for all to authenticated
  using (public.app_is_school_admin() and school_id = public.app_school_id())
  with check (public.app_is_school_admin() and school_id = public.app_school_id());

-- ===========================================================================
-- 6. RLS: PROFILLAR VA PERMISSIONLAR
--    profiles'ga authenticated INSERT yo'q — profil server tomonida
--    (service role) yaratiladi. O'z rolini o'zgartirish (escalation) bloklangan.
-- ===========================================================================

alter table public.profiles enable row level security;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (public.app_can_view_profile(id));

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = auth.uid())
  -- rol va maktabni o'zgartirish MUMKIN EMAS (privilege escalation himoyasi)
  with check (id = auth.uid() and role = public.app_role()
              and school_id = public.app_school_id());

drop policy if exists profiles_update_admin on public.profiles;
create policy profiles_update_admin on public.profiles for update to authenticated
  using (public.app_is_school_admin() and school_id = public.app_school_id())
  -- admin SUPER_ADMIN roliga o'zgartira olmaydi
  with check (public.app_is_school_admin() and school_id = public.app_school_id()
              and role <> 'SUPER_ADMIN');

alter table public.roles enable row level security;
drop policy if exists roles_select on public.roles;
create policy roles_select on public.roles for select to authenticated using (true);

alter table public.permissions enable row level security;
drop policy if exists permissions_select on public.permissions;
create policy permissions_select on public.permissions for select to authenticated using (true);

alter table public.role_permissions enable row level security;
drop policy if exists role_permissions_select on public.role_permissions;
create policy role_permissions_select on public.role_permissions for select to authenticated using (true);

alter table public.user_permission_overrides enable row level security;
drop policy if exists user_permission_overrides_select on public.user_permission_overrides;
create policy user_permission_overrides_select on public.user_permission_overrides for select to authenticated
  using (profile_id = auth.uid()
         or (public.app_is_school_admin() and school_id = public.app_school_id()));
drop policy if exists user_permission_overrides_write on public.user_permission_overrides;
create policy user_permission_overrides_write on public.user_permission_overrides for all to authenticated
  using (public.app_is_school_admin() and school_id = public.app_school_id())
  with check (public.app_is_school_admin() and school_id = public.app_school_id());

alter table public.user_sessions enable row level security;
drop policy if exists user_sessions_self on public.user_sessions;
create policy user_sessions_self on public.user_sessions for all to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

-- ===========================================================================
-- 7. RLS: XONALAR, SINFLAR, FANLAR, BAHOLASH KONFIGURATSIYASI
-- ===========================================================================

alter table public.rooms enable row level security;
drop policy if exists rooms_select on public.rooms;
create policy rooms_select on public.rooms for select to authenticated
  using (public.app_is_school_member() and school_id = public.app_school_id());
drop policy if exists rooms_write on public.rooms;
create policy rooms_write on public.rooms for all to authenticated
  using (public.app_is_school_admin() and school_id = public.app_school_id())
  with check (public.app_is_school_admin() and school_id = public.app_school_id());

alter table public.classes enable row level security;
drop policy if exists classes_select on public.classes;
create policy classes_select on public.classes for select to authenticated
  using (public.app_is_school_member() and school_id = public.app_school_id());
drop policy if exists classes_write on public.classes;
create policy classes_write on public.classes for all to authenticated
  using (public.app_is_school_admin() and school_id = public.app_school_id())
  with check (public.app_is_school_admin() and school_id = public.app_school_id());

alter table public.subjects enable row level security;
drop policy if exists subjects_select on public.subjects;
create policy subjects_select on public.subjects for select to authenticated
  using (public.app_is_school_member() and school_id = public.app_school_id());
drop policy if exists subjects_write on public.subjects;
create policy subjects_write on public.subjects for all to authenticated
  using (public.app_is_school_admin() and school_id = public.app_school_id())
  with check (public.app_is_school_admin() and school_id = public.app_school_id());

alter table public.grading_scales enable row level security;
drop policy if exists grading_scales_select on public.grading_scales;
create policy grading_scales_select on public.grading_scales for select to authenticated
  using (public.app_is_school_member() and school_id = public.app_school_id());
drop policy if exists grading_scales_write on public.grading_scales;
create policy grading_scales_write on public.grading_scales for all to authenticated
  using (public.app_is_school_admin() and school_id = public.app_school_id())
  with check (public.app_is_school_admin() and school_id = public.app_school_id());

alter table public.grade_types enable row level security;
drop policy if exists grade_types_select on public.grade_types;
create policy grade_types_select on public.grade_types for select to authenticated
  using (public.app_is_school_member() and school_id = public.app_school_id());
drop policy if exists grade_types_write on public.grade_types;
create policy grade_types_write on public.grade_types for all to authenticated
  using (public.app_is_school_admin() and school_id = public.app_school_id())
  with check (public.app_is_school_admin() and school_id = public.app_school_id());

alter table public.class_subjects enable row level security;
drop policy if exists class_subjects_select on public.class_subjects;
create policy class_subjects_select on public.class_subjects for select to authenticated
  using (public.app_is_school_member() and school_id = public.app_school_id());
drop policy if exists class_subjects_write on public.class_subjects;
create policy class_subjects_write on public.class_subjects for all to authenticated
  using (public.app_is_school_admin() and school_id = public.app_school_id())
  with check (public.app_is_school_admin() and school_id = public.app_school_id());

alter table public.subject_groups enable row level security;
drop policy if exists subject_groups_select on public.subject_groups;
create policy subject_groups_select on public.subject_groups for select to authenticated
  using (public.app_is_school_member() and school_id = public.app_school_id());
drop policy if exists subject_groups_write on public.subject_groups;
create policy subject_groups_write on public.subject_groups for all to authenticated
  using (public.app_is_school_admin() and school_id = public.app_school_id())
  with check (public.app_is_school_admin() and school_id = public.app_school_id());

alter table public.group_students enable row level security;
drop policy if exists group_students_select on public.group_students;
create policy group_students_select on public.group_students for select to authenticated
  using (public.app_is_school_member() and school_id = public.app_school_id());
drop policy if exists group_students_write on public.group_students;
create policy group_students_write on public.group_students for all to authenticated
  using (public.app_is_school_admin() and school_id = public.app_school_id())
  with check (public.app_is_school_admin() and school_id = public.app_school_id());

-- ===========================================================================
-- 8. RLS: O'QUVCHILAR / OTA-ONALAR / O'QITUVCHILAR
--    O'qituvchiga PII minimizatsiya: ota-ona manzili/shartnomasi
--    students/parents jadvallarida emas, alohida (app_can_view_parent,
--    parent_student) nazorat ostida.
-- ===========================================================================

alter table public.students enable row level security;

drop policy if exists students_select on public.students;
create policy students_select on public.students for select to authenticated
  using (school_id = public.app_school_id() and (
         public.app_is_school_admin()
      or public.app_is_teacher_of_student(id)
      or public.app_is_class_teacher_of_student(id)
      or public.app_is_parent_of_student(id)
      or public.app_is_student_self(id)));

drop policy if exists students_write on public.students;
create policy students_write on public.students for all to authenticated
  using (public.app_is_school_admin() and school_id = public.app_school_id())
  with check (public.app_is_school_admin() and school_id = public.app_school_id());

alter table public.student_enrollments enable row level security;

drop policy if exists student_enrollments_select on public.student_enrollments;
create policy student_enrollments_select on public.student_enrollments for select to authenticated
  using (school_id = public.app_school_id() and (
         public.app_is_school_admin()
      or public.app_is_teacher_of_student(student_id)
      or public.app_is_class_teacher_of_student(student_id)
      or public.app_is_parent_of_student(student_id)
      or public.app_is_student_self(student_id)));

drop policy if exists student_enrollments_write on public.student_enrollments;
create policy student_enrollments_write on public.student_enrollments for all to authenticated
  using (public.app_is_school_admin() and school_id = public.app_school_id())
  with check (public.app_is_school_admin() and school_id = public.app_school_id());

alter table public.parents enable row level security;

drop policy if exists parents_select on public.parents;
create policy parents_select on public.parents for select to authenticated
  using (public.app_can_view_parent(id));

drop policy if exists parents_write on public.parents;
create policy parents_write on public.parents for all to authenticated
  using (public.app_is_school_admin() and school_id = public.app_school_id())
  with check (public.app_is_school_admin() and school_id = public.app_school_id());

alter table public.parent_student enable row level security;

drop policy if exists parent_student_select on public.parent_student;
create policy parent_student_select on public.parent_student for select to authenticated
  using (school_id = public.app_school_id() and (
         public.app_is_school_admin()
      or parent_id = public.app_parent_id()
      or public.app_is_student_self(student_id)
      or public.app_is_class_teacher_of_student(student_id)
      or public.app_is_teacher_of_student(student_id)));

drop policy if exists parent_student_write on public.parent_student;
create policy parent_student_write on public.parent_student for all to authenticated
  using (public.app_is_school_admin() and school_id = public.app_school_id())
  with check (public.app_is_school_admin() and school_id = public.app_school_id());

alter table public.teachers enable row level security;

drop policy if exists teachers_select on public.teachers;
create policy teachers_select on public.teachers for select to authenticated
  using (public.app_is_school_member() and school_id = public.app_school_id());
-- ESLATMA: talon telefon raqami talaba/ota-ona UI'ga server tomonida
-- `teachers_public` proyeksiyasi orqali beriladi (faqat id, full_name).

drop policy if exists teachers_write on public.teachers;
create policy teachers_write on public.teachers for all to authenticated
  using (public.app_is_school_admin() and school_id = public.app_school_id())
  with check (public.app_is_school_admin() and school_id = public.app_school_id());

-- Talaba/ota-ona uchun o'qituvchining umumiy (PII-siz) proyeksiyasi
create or replace view public.teachers_public as
  select t.id, t.school_id, t.full_name, t.status
  from public.teachers t
  where t.school_id = public.app_school_id();
grant select on public.teachers_public to authenticated;

alter table public.teacher_assignments enable row level security;

drop policy if exists teacher_assignments_select on public.teacher_assignments;
create policy teacher_assignments_select on public.teacher_assignments for select to authenticated
  using (public.app_is_school_member() and school_id = public.app_school_id());

drop policy if exists teacher_assignments_write on public.teacher_assignments;
create policy teacher_assignments_write on public.teacher_assignments for all to authenticated
  using (public.app_is_school_admin() and school_id = public.app_school_id())
  with check (public.app_is_school_admin() and school_id = public.app_school_id());

alter table public.teacher_availability enable row level security;

drop policy if exists teacher_availability_select on public.teacher_availability;
create policy teacher_availability_select on public.teacher_availability for select to authenticated
  using (public.app_is_school_member() and school_id = public.app_school_id());

drop policy if exists teacher_availability_write on public.teacher_availability;
create policy teacher_availability_write on public.teacher_availability for all to authenticated
  using ((public.app_is_school_admin() or teacher_id = public.app_teacher_id())
         and school_id = public.app_school_id())
  with check ((public.app_is_school_admin() or teacher_id = public.app_teacher_id())
              and school_id = public.app_school_id());

alter table public.teacher_absences enable row level security;
drop policy if exists teacher_absences_select on public.teacher_absences;
create policy teacher_absences_select on public.teacher_absences for select to authenticated
  using (public.app_is_staff() and school_id = public.app_school_id());
drop policy if exists teacher_absences_write on public.teacher_absences;
create policy teacher_absences_write on public.teacher_absences for all to authenticated
  using (public.app_is_school_admin() and school_id = public.app_school_id())
  with check (public.app_is_school_admin() and school_id = public.app_school_id());

alter table public.substitute_assignments enable row level security;
drop policy if exists substitute_assignments_select on public.substitute_assignments;
create policy substitute_assignments_select on public.substitute_assignments for select to authenticated
  using (public.app_is_staff() and school_id = public.app_school_id());
drop policy if exists substitute_assignments_write on public.substitute_assignments;
create policy substitute_assignments_write on public.substitute_assignments for all to authenticated
  using (public.app_is_school_admin() and school_id = public.app_school_id())
  with check (public.app_is_school_admin() and school_id = public.app_school_id());

alter table public.class_teacher_assignments enable row level security;
drop policy if exists class_teacher_assignments_select on public.class_teacher_assignments;
create policy class_teacher_assignments_select on public.class_teacher_assignments for select to authenticated
  using (public.app_is_school_member() and school_id = public.app_school_id());
drop policy if exists class_teacher_assignments_write on public.class_teacher_assignments;
create policy class_teacher_assignments_write on public.class_teacher_assignments for all to authenticated
  using (public.app_is_school_admin() and school_id = public.app_school_id())
  with check (public.app_is_school_admin() and school_id = public.app_school_id());

-- ===========================================================================
-- 9. RLS: DARS JADVALI
-- ===========================================================================

alter table public.timetable_versions enable row level security;
drop policy if exists timetable_versions_select on public.timetable_versions;
create policy timetable_versions_select on public.timetable_versions for select to authenticated
  using (public.app_is_school_member() and school_id = public.app_school_id());
drop policy if exists timetable_versions_write on public.timetable_versions;
create policy timetable_versions_write on public.timetable_versions for all to authenticated
  using (public.app_is_school_admin() and school_id = public.app_school_id())
  with check (public.app_is_school_admin() and school_id = public.app_school_id());

alter table public.timetable_slots enable row level security;
drop policy if exists timetable_slots_select on public.timetable_slots;
create policy timetable_slots_select on public.timetable_slots for select to authenticated
  using (public.app_is_school_member() and school_id = public.app_school_id());
drop policy if exists timetable_slots_write on public.timetable_slots;
create policy timetable_slots_write on public.timetable_slots for all to authenticated
  using (public.app_is_school_admin() and school_id = public.app_school_id())
  with check (public.app_is_school_admin() and school_id = public.app_school_id());

alter table public.timetable_exceptions enable row level security;
drop policy if exists timetable_exceptions_select on public.timetable_exceptions;
create policy timetable_exceptions_select on public.timetable_exceptions for select to authenticated
  using (public.app_is_school_member() and school_id = public.app_school_id());
drop policy if exists timetable_exceptions_write on public.timetable_exceptions;
create policy timetable_exceptions_write on public.timetable_exceptions for all to authenticated
  using (public.app_is_school_admin() and school_id = public.app_school_id())
  with check (public.app_is_school_admin() and school_id = public.app_school_id());

-- ===========================================================================
-- 10. RLS: JURNAL (darslar, davomat, baholar)
-- ===========================================================================

alter table public.lessons enable row level security;

drop policy if exists lessons_select on public.lessons;
create policy lessons_select on public.lessons for select to authenticated
  using (public.app_can_view_lesson(id));

drop policy if exists lessons_insert on public.lessons;
create policy lessons_insert on public.lessons for insert to authenticated
  with check (school_id = public.app_school_id() and (
         public.app_is_school_admin()
      or public.app_is_teacher_of_class_subject(class_subject_id)));

drop policy if exists lessons_update on public.lessons;
create policy lessons_update on public.lessons for update to authenticated
  using (school_id = public.app_school_id() and (
         public.app_is_school_admin() or public.app_is_teacher_of_lesson(id)))
  with check (school_id = public.app_school_id() and (
         public.app_is_school_admin() or public.app_is_teacher_of_lesson(id)));

drop policy if exists lessons_delete on public.lessons;
create policy lessons_delete on public.lessons for delete to authenticated
  using (public.app_is_school_admin() and school_id = public.app_school_id());

alter table public.attendance enable row level security;

drop policy if exists attendance_select on public.attendance;
create policy attendance_select on public.attendance for select to authenticated
  using (public.app_can_view_attendance(id));

drop policy if exists attendance_insert on public.attendance;
create policy attendance_insert on public.attendance for insert to authenticated
  with check (school_id = public.app_school_id() and (
         public.app_is_school_admin()
      or (public.app_is_teacher_of_lesson(lesson_id) and not is_locked)
      or (public.app_is_class_teacher_of_lesson(lesson_id) and not is_locked)));

drop policy if exists attendance_update on public.attendance;
create policy attendance_update on public.attendance for update to authenticated
  using (school_id = public.app_school_id() and (
         public.app_is_school_admin()
      or public.app_is_class_teacher_of_lesson(lesson_id)
      or (public.app_is_teacher_of_lesson(lesson_id) and not is_locked)))
  with check (school_id = public.app_school_id() and (
         public.app_is_school_admin()
      or public.app_is_class_teacher_of_lesson(lesson_id)
      or (public.app_is_teacher_of_lesson(lesson_id) and not is_locked)));

drop policy if exists attendance_delete on public.attendance;
create policy attendance_delete on public.attendance for delete to authenticated
  using (public.app_is_school_admin() and school_id = public.app_school_id());

alter table public.grades enable row level security;

drop policy if exists grades_select on public.grades;
create policy grades_select on public.grades for select to authenticated
  using (public.app_can_view_grade(id));

drop policy if exists grades_insert on public.grades;
create policy grades_insert on public.grades for insert to authenticated
  with check (school_id = public.app_school_id() and (
         public.app_is_school_admin()
      or public.app_is_teacher_of_class_subject(class_subject_id)));

drop policy if exists grades_update on public.grades;
create policy grades_update on public.grades for update to authenticated
  using (school_id = public.app_school_id() and (
         public.app_is_school_admin()
      or (public.app_is_teacher_of_class_subject(class_subject_id)
          and status <> 'LOCKED')))
  with check (school_id = public.app_school_id() and (
         public.app_is_school_admin()
      or (public.app_is_teacher_of_class_subject(class_subject_id)
          and status <> 'LOCKED')));

drop policy if exists grades_delete on public.grades;
create policy grades_delete on public.grades for delete to authenticated
  using (public.app_is_school_admin() and school_id = public.app_school_id());

-- ===========================================================================
-- 11. RLS: UY VAZIFALARI
-- ===========================================================================

alter table public.homework enable row level security;

drop policy if exists homework_select on public.homework;
create policy homework_select on public.homework for select to authenticated
  using (public.app_can_view_homework(id));

drop policy if exists homework_insert on public.homework;
create policy homework_insert on public.homework for insert to authenticated
  with check (school_id = public.app_school_id() and (
         public.app_is_school_admin()
      or public.app_is_teacher_of_class_subject(class_subject_id)));

drop policy if exists homework_update on public.homework;
create policy homework_update on public.homework for update to authenticated
  using (school_id = public.app_school_id() and (
         public.app_is_school_admin() or public.app_teacher_owns_homework(id)))
  with check (school_id = public.app_school_id() and (
         public.app_is_school_admin() or public.app_teacher_owns_homework(id)));

drop policy if exists homework_delete on public.homework;
create policy homework_delete on public.homework for delete to authenticated
  using (public.app_is_school_admin() and school_id = public.app_school_id());

alter table public.homework_targets enable row level security;
drop policy if exists homework_targets_select on public.homework_targets;
create policy homework_targets_select on public.homework_targets for select to authenticated
  using (school_id = public.app_school_id() and (
         public.app_is_school_admin()
      or public.app_teacher_owns_homework(homework_id)
      or public.app_is_student_self(student_id)
      or public.app_is_parent_of_student(student_id)));
drop policy if exists homework_targets_write on public.homework_targets;
create policy homework_targets_write on public.homework_targets for all to authenticated
  using (school_id = public.app_school_id() and (
         public.app_is_school_admin() or public.app_teacher_owns_homework(homework_id)))
  with check (school_id = public.app_school_id() and (
         public.app_is_school_admin() or public.app_teacher_owns_homework(homework_id)));

alter table public.homework_submissions enable row level security;
drop policy if exists homework_submissions_select on public.homework_submissions;
create policy homework_submissions_select on public.homework_submissions for select to authenticated
  using (public.app_can_view_submission(id));
-- O'quvchi o'zi topshiradi; tekshirish/o'zgartirish — o'qituvchi yoki admin
drop policy if exists homework_submissions_insert on public.homework_submissions;
create policy homework_submissions_insert on public.homework_submissions for insert to authenticated
  with check (school_id = public.app_school_id()
              and student_id = public.app_student_id());
drop policy if exists homework_submissions_update on public.homework_submissions;
create policy homework_submissions_update on public.homework_submissions for update to authenticated
  using (school_id = public.app_school_id() and (
         public.app_is_school_admin()
      or public.app_teacher_owns_homework(homework_id)
      or student_id = public.app_student_id()))
  with check (school_id = public.app_school_id() and (
         public.app_is_school_admin()
      or public.app_teacher_owns_homework(homework_id)
      or student_id = public.app_student_id()));
drop policy if exists homework_submissions_delete on public.homework_submissions;
create policy homework_submissions_delete on public.homework_submissions for delete to authenticated
  using (public.app_is_school_admin() and school_id = public.app_school_id());

-- ===========================================================================
-- 12. RLS: XABARLAR VA E'LONLAR
-- ===========================================================================

alter table public.message_templates enable row level security;
drop policy if exists message_templates_select on public.message_templates;
create policy message_templates_select on public.message_templates for select to authenticated
  using (public.app_is_staff() and school_id = public.app_school_id());
drop policy if exists message_templates_write on public.message_templates;
create policy message_templates_write on public.message_templates for all to authenticated
  using (public.app_is_school_admin() and school_id = public.app_school_id())
  with check (public.app_is_school_admin() and school_id = public.app_school_id());

alter table public.messages enable row level security;
drop policy if exists messages_select on public.messages;
create policy messages_select on public.messages for select to authenticated
  using (public.app_can_view_message(id));
drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages for insert to authenticated
  with check (school_id = public.app_school_id() and sender_id = auth.uid());
drop policy if exists messages_update on public.messages;
create policy messages_update on public.messages for update to authenticated
  using (sender_id = auth.uid())
  with check (sender_id = auth.uid());
drop policy if exists messages_delete on public.messages;
create policy messages_delete on public.messages for delete to authenticated
  using (sender_id = auth.uid() or public.app_is_school_admin());

alter table public.message_recipients enable row level security;
drop policy if exists message_recipients_select on public.message_recipients;
create policy message_recipients_select on public.message_recipients for select to authenticated
  using (school_id = public.app_school_id() and (
         recipient_id = auth.uid()
      or public.app_owns_message(message_id)
      or public.app_is_school_admin()));
drop policy if exists message_recipients_insert on public.message_recipients;
create policy message_recipients_insert on public.message_recipients for insert to authenticated
  with check (school_id = public.app_school_id()
              and (public.app_owns_message(message_id) or public.app_is_school_admin()));
drop policy if exists message_recipients_update on public.message_recipients;
create policy message_recipients_update on public.message_recipients for update to authenticated
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

alter table public.announcements enable row level security;
drop policy if exists announcements_select on public.announcements;
create policy announcements_select on public.announcements for select to authenticated
  using (public.app_can_view_announcement(id));
drop policy if exists announcements_insert on public.announcements;
create policy announcements_insert on public.announcements for insert to authenticated
  with check (school_id = public.app_school_id() and (
         public.app_is_school_admin()
      or (public.app_role() = 'CLASS_TEACHER' and scope = 'CLASS'
          and public.app_is_class_teacher_of(class_id))));
drop policy if exists announcements_update on public.announcements;
create policy announcements_update on public.announcements for update to authenticated
  using (school_id = public.app_school_id()
         and (public.app_owns_announcement(id)))
  with check (school_id = public.app_school_id()
              and (public.app_owns_announcement(id)));
drop policy if exists announcements_delete on public.announcements;
create policy announcements_delete on public.announcements for delete to authenticated
  using (school_id = public.app_school_id() and public.app_owns_announcement(id));

alter table public.announcement_recipients enable row level security;
drop policy if exists announcement_recipients_select on public.announcement_recipients;
create policy announcement_recipients_select on public.announcement_recipients for select to authenticated
  using (school_id = public.app_school_id() and (
         profile_id = auth.uid()
      or public.app_owns_announcement(announcement_id)));
drop policy if exists announcement_recipients_update on public.announcement_recipients;
create policy announcement_recipients_update on public.announcement_recipients for update to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());
drop policy if exists announcement_recipients_insert on public.announcement_recipients;
create policy announcement_recipients_insert on public.announcement_recipients for insert to authenticated
  with check (school_id = public.app_school_id()
              and public.app_owns_announcement(announcement_id));

-- ===========================================================================
-- 13. RLS: BILDIRISHNOMALAR
-- ===========================================================================

alter table public.notifications enable row level security;
drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications for select to authenticated
  using (recipient_id = auth.uid());
drop policy if exists notifications_update on public.notifications;
create policy notifications_update on public.notifications for update to authenticated
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());
drop policy if exists notifications_insert on public.notifications;
create policy notifications_insert on public.notifications for insert to authenticated
  with check (school_id = public.app_school_id() and public.app_is_school_admin());
drop policy if exists notifications_delete on public.notifications;
create policy notifications_delete on public.notifications for delete to authenticated
  using (recipient_id = auth.uid());

alter table public.notification_preferences enable row level security;
drop policy if exists notification_preferences_self on public.notification_preferences;
create policy notification_preferences_self on public.notification_preferences for all to authenticated
  using (profile_id = auth.uid() and school_id = public.app_school_id())
  with check (profile_id = auth.uid() and school_id = public.app_school_id());

alter table public.notification_deliveries enable row level security;
drop policy if exists notification_deliveries_select on public.notification_deliveries;
create policy notification_deliveries_select on public.notification_deliveries for select to authenticated
  using (public.app_can_view_delivery(id));
-- INSERT/UPDATE: faqat service role (delivery worker) — authenticated policy yo'q

alter table public.push_subscriptions enable row level security;
drop policy if exists push_subscriptions_self on public.push_subscriptions;
create policy push_subscriptions_self on public.push_subscriptions for all to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

alter table public.telegram_accounts enable row level security;
drop policy if exists telegram_accounts_self on public.telegram_accounts;
create policy telegram_accounts_self on public.telegram_accounts for all to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

-- ===========================================================================
-- 14. RLS: RISK, DATA QUALITY, AGREGATLAR
-- ===========================================================================

alter table public.risk_rules enable row level security;
drop policy if exists risk_rules_select on public.risk_rules;
create policy risk_rules_select on public.risk_rules for select to authenticated
  using (public.app_is_staff() and school_id = public.app_school_id());
drop policy if exists risk_rules_write on public.risk_rules;
create policy risk_rules_write on public.risk_rules for all to authenticated
  using (public.app_is_school_admin() and school_id = public.app_school_id())
  with check (public.app_is_school_admin() and school_id = public.app_school_id());

alter table public.risk_events enable row level security;
drop policy if exists risk_events_select on public.risk_events;
create policy risk_events_select on public.risk_events for select to authenticated
  using (school_id = public.app_school_id() and (
         public.app_is_school_admin()
      or public.app_is_class_teacher_of_student(student_id)));
drop policy if exists risk_events_update on public.risk_events;
create policy risk_events_update on public.risk_events for update to authenticated
  using (school_id = public.app_school_id() and (
         public.app_is_school_admin()
      or public.app_is_class_teacher_of_student(student_id)))
  with check (school_id = public.app_school_id() and (
         public.app_is_school_admin()
      or public.app_is_class_teacher_of_student(student_id)));
drop policy if exists risk_events_insert on public.risk_events;
create policy risk_events_insert on public.risk_events for insert to authenticated
  with check (school_id = public.app_school_id() and public.app_is_school_admin());
-- risk_events DELETE: faqat service role

alter table public.data_quality_issues enable row level security;
drop policy if exists data_quality_issues_select on public.data_quality_issues;
create policy data_quality_issues_select on public.data_quality_issues for select to authenticated
  using (public.app_is_school_admin() and school_id = public.app_school_id());
drop policy if exists data_quality_issues_update on public.data_quality_issues;
create policy data_quality_issues_update on public.data_quality_issues for update to authenticated
  using (public.app_is_school_admin() and school_id = public.app_school_id())
  with check (public.app_is_school_admin() and school_id = public.app_school_id());
-- INSERT/DELETE: service role (scanner)

alter table public.daily_summaries enable row level security;
drop policy if exists daily_summaries_select on public.daily_summaries;
create policy daily_summaries_select on public.daily_summaries for select to authenticated
  using (school_id = public.app_school_id() and (
         public.app_is_school_admin()
      or (class_id is null and public.app_is_staff())
      or (class_id is not null and public.app_is_class_teacher_of(class_id))));
-- yozish: service role (trigger/cron)

-- ===========================================================================
-- 15. RLS: HUJJATLAR
-- ===========================================================================

alter table public.document_templates enable row level security;
drop policy if exists document_templates_select on public.document_templates;
create policy document_templates_select on public.document_templates for select to authenticated
  using (public.app_is_staff() and school_id = public.app_school_id());
drop policy if exists document_templates_write on public.document_templates;
create policy document_templates_write on public.document_templates for all to authenticated
  using (public.app_is_school_admin() and school_id = public.app_school_id())
  with check (public.app_is_school_admin() and school_id = public.app_school_id());

alter table public.documents enable row level security;
drop policy if exists documents_select on public.documents;
create policy documents_select on public.documents for select to authenticated
  using (public.app_can_view_document(id));
drop policy if exists documents_write on public.documents;
create policy documents_write on public.documents for all to authenticated
  using (public.app_is_school_admin() and school_id = public.app_school_id())
  with check (public.app_is_school_admin() and school_id = public.app_school_id());

-- ===========================================================================
-- 16. RLS: IMPORT / EKSPORT
-- ===========================================================================

alter table public.import_jobs enable row level security;
drop policy if exists import_jobs_select on public.import_jobs;
create policy import_jobs_select on public.import_jobs for select to authenticated
  using (school_id = public.app_school_id() and (
         created_by = auth.uid() or public.app_is_school_admin()));
drop policy if exists import_jobs_insert on public.import_jobs;
create policy import_jobs_insert on public.import_jobs for insert to authenticated
  with check (school_id = public.app_school_id() and created_by = auth.uid()
              and public.app_has_permission('import.run'));
drop policy if exists import_jobs_update on public.import_jobs;
create policy import_jobs_update on public.import_jobs for update to authenticated
  using (school_id = public.app_school_id() and (
         created_by = auth.uid() or public.app_is_school_admin()))
  with check (school_id = public.app_school_id() and (
         created_by = auth.uid() or public.app_is_school_admin()));
drop policy if exists import_jobs_delete on public.import_jobs;
create policy import_jobs_delete on public.import_jobs for delete to authenticated
  using (public.app_is_school_admin() and school_id = public.app_school_id());

alter table public.import_errors enable row level security;
drop policy if exists import_errors_select on public.import_errors;
create policy import_errors_select on public.import_errors for select to authenticated
  using (school_id = public.app_school_id() and public.app_can_view_import_job(import_job_id));
-- INSERT/UPDATE/DELETE: service role (import worker)

alter table public.export_jobs enable row level security;
drop policy if exists export_jobs_select on public.export_jobs;
create policy export_jobs_select on public.export_jobs for select to authenticated
  using (school_id = public.app_school_id() and (
         created_by = auth.uid() or public.app_is_school_admin()));
drop policy if exists export_jobs_insert on public.export_jobs;
create policy export_jobs_insert on public.export_jobs for insert to authenticated
  with check (school_id = public.app_school_id() and created_by = auth.uid()
              and public.app_has_permission('export.run'));
drop policy if exists export_jobs_update on public.export_jobs;
create policy export_jobs_update on public.export_jobs for update to authenticated
  using (school_id = public.app_school_id() and (
         created_by = auth.uid() or public.app_is_school_admin()))
  with check (school_id = public.app_school_id() and (
         created_by = auth.uid() or public.app_is_school_admin()));
drop policy if exists export_jobs_delete on public.export_jobs;
create policy export_jobs_delete on public.export_jobs for delete to authenticated
  using (public.app_is_school_admin() and school_id = public.app_school_id());

-- ===========================================================================
-- 17. RLS: TARIX JADVALLARI (o'qish — faqat admin; yozish — trigger/definer)
-- ===========================================================================

alter table public.student_enrollments_history enable row level security;
drop policy if exists student_enrollments_history_select on public.student_enrollments_history;
create policy student_enrollments_history_select on public.student_enrollments_history
  for select to authenticated
  using (school_id = public.app_school_id() and public.app_is_school_admin());

alter table public.parent_student_history enable row level security;
drop policy if exists parent_student_history_select on public.parent_student_history;
create policy parent_student_history_select on public.parent_student_history
  for select to authenticated
  using (school_id = public.app_school_id() and public.app_is_school_admin());

alter table public.teacher_assignments_history enable row level security;
drop policy if exists teacher_assignments_history_select on public.teacher_assignments_history;
create policy teacher_assignments_history_select on public.teacher_assignments_history
  for select to authenticated
  using (school_id = public.app_school_id() and public.app_is_school_admin());

alter table public.class_teacher_assignments_history enable row level security;
drop policy if exists class_teacher_assignments_history_select on public.class_teacher_assignments_history;
create policy class_teacher_assignments_history_select on public.class_teacher_assignments_history
  for select to authenticated
  using (school_id = public.app_school_id() and public.app_is_school_admin());

alter table public.group_students_history enable row level security;
drop policy if exists group_students_history_select on public.group_students_history;
create policy group_students_history_select on public.group_students_history
  for select to authenticated
  using (school_id = public.app_school_id() and public.app_is_school_admin());

alter table public.parent_contact_history enable row level security;
drop policy if exists parent_contact_history_select on public.parent_contact_history;
create policy parent_contact_history_select on public.parent_contact_history
  for select to authenticated
  using (school_id = public.app_school_id() and public.app_is_school_admin());

-- ===========================================================================
-- 18. STORAGE: private bucketlar + signed URL modeli
--     Bucket yo'li: {school_id}/... — tenant ajratish path orqali.
-- ===========================================================================

insert into storage.buckets (id, name, public)
values
  ('student-documents', 'student-documents', false),
  ('homework',          'homework',          false),
  ('school-files',      'school-files',      false),
  ('avatars',           'avatars',           false)
on conflict (id) do update set public = excluded.public;

alter table storage.objects enable row level security;

-- --- student-documents: metadata (documents) orqali aniq ruxsat ---
drop policy if exists "schoolos_docs_select" on storage.objects;
create policy "schoolos_docs_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'student-documents'
         and public.app_can_read_document_object(name));

drop policy if exists "schoolos_docs_insert" on storage.objects;
create policy "schoolos_docs_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'student-documents'
              and public.app_is_school_admin()
              and public.app_storage_school(name) = public.app_school_id());

drop policy if exists "schoolos_docs_update" on storage.objects;
create policy "schoolos_docs_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'student-documents'
         and public.app_is_school_admin()
         and public.app_storage_school(name) = public.app_school_id())
  with check (bucket_id = 'student-documents'
              and public.app_is_school_admin()
              and public.app_storage_school(name) = public.app_school_id());

drop policy if exists "schoolos_docs_delete" on storage.objects;
create policy "schoolos_docs_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'student-documents'
         and public.app_is_school_admin()
         and public.app_storage_school(name) = public.app_school_id());

-- --- homework: o'qish — maktab a'zolari (o'z maktabi path'i); yozish — xodimlar ---
drop policy if exists "schoolos_hw_select" on storage.objects;
create policy "schoolos_hw_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'homework'
         and public.app_is_school_member()
         and public.app_storage_school(name) = public.app_school_id());

drop policy if exists "schoolos_hw_write" on storage.objects;
create policy "schoolos_hw_write" on storage.objects
  for all to authenticated
  using (bucket_id = 'homework'
         and public.app_is_staff()
         and public.app_storage_school(name) = public.app_school_id())
  with check (bucket_id = 'homework'
              and public.app_is_staff()
              and public.app_storage_school(name) = public.app_school_id());

-- --- school-files: faqat admin ---
drop policy if exists "schoolos_files" on storage.objects;
create policy "schoolos_files" on storage.objects
  for all to authenticated
  using (bucket_id = 'school-files'
         and public.app_is_school_admin()
         and public.app_storage_school(name) = public.app_school_id())
  with check (bucket_id = 'school-files'
              and public.app_is_school_admin()
              and public.app_storage_school(name) = public.app_school_id());

-- --- avatars: o'qish — maktab a'zolari; yozish — faqat o'z papkasi ---
drop policy if exists "schoolos_avatars_select" on storage.objects;
create policy "schoolos_avatars_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars'
         and public.app_is_school_member()
         and public.app_storage_school(name) = public.app_school_id());

drop policy if exists "schoolos_avatars_write" on storage.objects;
create policy "schoolos_avatars_write" on storage.objects
  for all to authenticated
  using (bucket_id = 'avatars'
         and name like public.app_school_id()::text || '/' || auth.uid()::text || '/%')
  with check (bucket_id = 'avatars'
              and name like public.app_school_id()::text || '/' || auth.uid()::text || '/%');

commit;
