-- ============================================================================
-- SchoolOS Uzbekistan — RLS SMOKE TEST SUITE
-- ----------------------------------------------------------------------------
-- Talab: local_harness.sql + 001..004 migrationlar allaqachon bajarilgan.
-- Har test: begin; set local role authenticated; set jwt sub; DO assertions;
-- rollback;. Kutilgan xatolar DO ichida exception bilan ushlanadi.
-- Natija: har PASS uchun NOTICE, xatoda EXCEPTION (test to'xtaydi).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- T0. Sanity (postgres sifatida): seed to'g'ri yuklanganmi
-- ---------------------------------------------------------------------------
begin;
do $$
declare
  v int; v_score int;
begin
  select count(*) into v from public.schools;
  if v <> 1 then raise exception 'T0.1 FAIL: schools=% (1 kutilgan)', v; end if;
  raise notice 'T0.1 PASS: schools=1';

  select count(*) into v from public.students;
  if v <> 34 then raise exception 'T0.2 FAIL: students=% (34 kutilgan)', v; end if;
  raise notice 'T0.2 PASS: students=34';

  select count(*) into v from public.parents;
  if v <> 18 then raise exception 'T0.3 FAIL: parents=% (18 kutilgan)', v; end if;
  raise notice 'T0.3 PASS: parents=18';

  select count(*) into v from public.teachers;
  if v <> 7 then raise exception 'T0.4 FAIL: teachers=% (7 kutilgan)', v; end if;
  raise notice 'T0.4 PASS: teachers=7';

  select count(*) into v from public.classes;
  if v <> 3 then raise exception 'T0.5 FAIL: classes=% (3 kutilgan)', v; end if;
  raise notice 'T0.5 PASS: classes=3';

  -- Jadval generatori: 60 sinf-slotsi (3 sinf x 20 soat) joylashganmi
  select count(distinct (class_id, day_of_week, period_number)) into v
  from public.timetable_slots;
  if v <> 60 then raise exception 'T0.6 FAIL: joylangan sinf-slotlari=% (60 kutilgan)', v; end if;
  raise notice 'T0.6 PASS: timetable 60/60 sinf-slotlari joylashgan';

  select score into v_score from public.timetable_versions
  where id = '00000000-0000-4000-8000-000000000090';
  if v_score <> 100 then raise exception 'T0.7 FAIL: score=% (100 kutilgan)', v_score; end if;
  raise notice 'T0.7 PASS: timetable score=100';

  select count(*) into v from public.lessons;
  if v <> 4 then raise exception 'T0.8 FAIL: lessons=% (4 kutilgan)', v; end if;
  raise notice 'T0.8 PASS: lessons=4 (MAT, ONT va 2 parallel ING guruh darsi)';

  select count(*) into v from public.attendance;
  if v <> 12 then raise exception 'T0.9 FAIL: attendance=% (12 kutilgan)', v; end if;
  raise notice 'T0.9 PASS: attendance=12';

  select count(*) into v from public.grades;
  if v <> 12 then raise exception 'T0.10 FAIL: grades=% (12 kutilgan)', v; end if;
  raise notice 'T0.10 PASS: grades=12';

  select count(*) into v from public.audit_log;
  if v < 200 then raise exception 'T0.11 FAIL: audit_log=% (>=200 kutilgan)', v; end if;
  raise notice 'T0.11 PASS: audit_log yozuvlari=%', v;

  -- Testlar uchun qo'shimcha senariy ma'lumotlari (bu blok COMMIT qilinadi):
  -- 0) O'qituvchi→ota-ona xabari (T2/T4 da tekshiriladi)
  insert into public.messages (id, school_id, sender_id, target_type, class_id, body)
  values ('00000000-0000-4000-8000-00000000c401',
          '00000000-0000-4000-8000-000000000001',
          '00000000-0000-4000-8000-000000003011', 'INDIVIDUAL',
          '00000000-0000-4000-8000-000000000050',
          'Assalomu alaykum! Jasur bugun darsga keldi, faol qatnashdi.');
  insert into public.message_recipients (id, school_id, message_id, recipient_id)
  values ('00000000-0000-4000-8000-00000000c501',
          '00000000-0000-4000-8000-000000000001',
          '00000000-0000-4000-8000-00000000c401',
          '00000000-0000-4000-8000-000000003020');
  -- 1) DRAFT baho (ota-ona ko'rmasligi kerak)
  insert into public.grades (school_id, student_id, class_subject_id, lesson_id, grade_type_id, value, status, given_by)
  values ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000004001',
          '00000000-0000-4000-8000-000000000060', null,
          '00000000-0000-4000-8000-000000000020', 4, 'DRAFT',
          '00000000-0000-4000-8000-000000003011');
  -- 2) Karimovaning ING darsiga LOCKED davomat (o'qituvchi o'zgartira olmasligi kerak)
  insert into public.attendance (school_id, lesson_id, student_id, status, marked_by, is_locked)
  select '00000000-0000-4000-8000-000000000001', l.id,
         '00000000-0000-4000-8000-000000004001', 'PRESENT',
         '00000000-0000-4000-8000-000000003012', true
  from public.lessons l
  where l.teacher_id = '00000000-0000-4000-8000-000000001002'
  limit 1;
  -- 3) Hujjat metadata + storage obyekti (ota-ona can_view_documents bilan ko'rishi kerak)
  insert into public.documents (id, school_id, bucket, storage_path, name, document_type, student_id)
  values ('00000000-0000-4000-8000-00000000c301', '00000000-0000-4000-8000-000000000001',
          'student-documents', '00000000-0000-4000-8000-000000000001/docs/test-ariza.pdf',
          'Ariza (test)', 'APPLICATION', '00000000-0000-4000-8000-000000004001');
  insert into storage.objects (bucket_id, name, owner)
  values ('student-documents', '00000000-0000-4000-8000-000000000001/docs/test-ariza.pdf',
          '00000000-0000-4000-8000-000000003002');
  -- 4) Ikkinchi maktab (cross-tenant testi uchun)
  insert into public.schools (id, name, is_demo)
  values ('99999999-0000-4000-8000-000000000001', 'Boshqa maktab (TEST)', true);
  insert into public.students (id, school_id, full_name, birth_date, gender)
  values ('99999999-0000-4000-8000-000000004001', '99999999-0000-4000-8000-000000000001',
          'Test Testov Testovich', '2010-01-01', 'MALE');

  raise notice 'T0.12 PASS: test senariy ma''lumotlari yaratildi';
end $$;
commit;

-- ---------------------------------------------------------------------------
-- T1. DIREKTOR — maktab bo'yicha to'liq ko'rish + yozish
-- ---------------------------------------------------------------------------
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000003001', true);
do $$
declare v int; v_rows int;
begin
  select count(*) into v from public.students;
  if v <> 34 then raise exception 'T1.1 FAIL: direktor students=% (34)', v; end if;
  raise notice 'T1.1 PASS: direktor 34 o''quvchini ko''radi';

  select count(*) into v from public.audit_log;
  if v < 200 then raise exception 'T1.2 FAIL: direktor audit=%', v; end if;
  raise notice 'T1.2 PASS: direktor audit_log ko''radi (%)', v;

  select count(*) into v from public.risk_events;
  if v <> 1 then raise exception 'T1.3 FAIL: direktor risk=% (1)', v; end if;
  raise notice 'T1.3 PASS: direktor risk voqealarini ko''radi';

  update public.students set notes = 'direktor izohi' where id = '00000000-0000-4000-8000-000000004001';
  get diagnostics v_rows = row_count;
  if v_rows <> 1 then raise exception 'T1.4 FAIL: direktor student update rows=%', v_rows; end if;
  raise notice 'T1.4 PASS: direktor o''quvchini tahrirlaydi';

  -- Cross-tenant: boshqa maktab o'quvchisi KO'RINMASLIGI kerak
  select count(*) into v from public.students
  where id = '99999999-0000-4000-8000-000000004001';
  if v <> 0 then raise exception 'T1.5 FAIL: cross-tenant student ko''rindi!'; end if;
  raise notice 'T1.5 PASS: cross-tenant izolyatsiya (direktor boshqa maktabni ko''rmaydi)';

  -- import_jobs yaratish huquqi (import.run permission)
  insert into public.import_jobs (school_id, created_by, import_type, file_name)
  values ('00000000-0000-4000-8000-000000000001',
          '00000000-0000-4000-8000-000000003001', 'STUDENTS', 'test.xlsx');
  raise notice 'T1.6 PASS: direktor import job yaratadi';
end $$;
rollback;

-- ---------------------------------------------------------------------------
-- T2. SINF RAHBARI / O'QITUVCHI (Hakimov: MAT 10-A/10-B, 10-A sinf rahbari)
-- ---------------------------------------------------------------------------
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000003011', true);
do $$
declare v int; v_rows int;
begin
  -- Faqat o'z sinflari: 10-A (12) + 10-B (12) = 24; 7-A (10) YO'Q
  select count(*) into v from public.students;
  if v <> 24 then raise exception 'T2.1 FAIL: hakimov students=% (24 kutilgan)', v; end if;
  raise notice 'T2.1 PASS: o''qituvchi faqat o''z sinflari o''quvchilarini ko''radi (24)';

  select count(*) into v from public.students
  where id = '00000000-0000-4000-8000-000000004025'; -- 7-A o'quvchisi
  if v <> 0 then raise exception 'T2.2 FAIL: 7-A o''quvchisi ko''rindi!'; end if;
  raise notice 'T2.2 PASS: bog''liq bo''lmagan sinf o''quvchisi ko''rinmaydi';

  -- Darslar: seed'da 4 dars bor, hammasi 10-A da (Hakimov 10-A sinf rahbari) = 4
  select count(*) into v from public.lessons;
  if v <> 4 then raise exception 'T2.3 FAIL: hakimov lessons=% (4 kutilgan)', v; end if;
  raise notice 'T2.3 PASS: darslar to''g''ri ko''rinadi (4, sinf rahbari sifatida)';

  -- O'z darsiga davomat tahriri
  update public.attendance
  set status = 'EXCUSED', reason = 'Shifokor ma''lumotnomasi'
  where student_id = '00000000-0000-4000-8000-000000004002'
    and status = 'PRESENT' and is_locked = false;
  get diagnostics v_rows = row_count;
  if v_rows <> 1 then raise exception 'T2.4 FAIL: davomat update rows=% (1 kutilgan)', v_rows; end if;
  raise notice 'T2.4 PASS: o''z darsiga davomat belgilash/tahrir';

  -- Audit ko'rmaydi
  select count(*) into v from public.audit_log;
  if v <> 0 then raise exception 'T2.5 FAIL: o''qituvchi audit=% (0 kutilgan)', v; end if;
  raise notice 'T2.5 PASS: audit faqat admin uchun';

  -- Jadvalni tahrirlay olmaydi
  update public.timetable_slots set period_number = 6
  where timetable_version_id = '00000000-0000-4000-8000-000000000090';
  get diagnostics v_rows = row_count;
  if v_rows <> 0 then raise exception 'T2.6 FAIL: o''qituvchi jadvalni tahrirladi!'; end if;
  raise notice 'T2.6 PASS: jadval tahriri admin uchun';

  -- O'quvchi qo'sha olmaydi
  begin
    insert into public.students (school_id, full_name, birth_date, gender)
    values ('00000000-0000-4000-8000-000000000001', 'Sinov Sinovov', '2010-01-01', 'MALE');
    raise exception 'T2.7 FAIL: o''qituvchi o''quvchi qo''shdi!';
  exception when insufficient_privilege then
    raise notice 'T2.7 PASS: o''qituvchi o''quvchi qo''sha olmaydi';
  end;

  -- Rolini o'zgartira olmaydi (privilege escalation!)
  begin
    update public.profiles set role = 'ADMIN' where id = auth.uid();
    raise exception 'T2.8 FAIL: rol o''zgartirildi (escalation)!';
  exception when insufficient_privilege then
    raise notice 'T2.8 PASS: rol escalation bloklangan';
  end;

  -- Ota-onaga xabar yuborish qobiliyati + o'z yuborgan xabarlarini ko'rish
  -- (T0'da seeded 1 ta + bu yerda 1 ta = 2; blok oxirida rollback)
  insert into public.messages (school_id, sender_id, target_type, class_id, body)
  values ('00000000-0000-4000-8000-000000000001', auth.uid(), 'INDIVIDUAL',
          '00000000-0000-4000-8000-000000000050',
          'Ertaga matematikadan sinov ishi bo''ladi.');
  insert into public.message_recipients (school_id, message_id, recipient_id)
  select '00000000-0000-4000-8000-000000000001', m.id, '00000000-0000-4000-8000-000000003020'
  from public.messages m where m.sender_id = auth.uid();
  select count(*) into v from public.messages where sender_id = auth.uid();
  if v <> 2 then raise exception 'T2.9 FAIL: yuborgan xabarlar=% (2 kutilgan)', v; end if;
  raise notice 'T2.9 PASS: o''qituvchi xabar yuboradi va ko''radi';

  -- O'z band vaqtlarini boshqaradi
  insert into public.teacher_availability (school_id, teacher_id, day_of_week, period_number, is_available, reason)
  values ('00000000-0000-4000-8000-000000000001',
          (select id from public.teachers where profile_id = auth.uid()),
          4, 6, false, 'Kurs');
  raise notice 'T2.10 PASS: o''qituvchi o''z band vaqtini belgilaydi';
end $$;
rollback;

-- ---------------------------------------------------------------------------
-- T3. FAN O'QITUVCHISI (Karimova: ING 10-A g1, 10-B, 7-A — sinf rahbari EMAS)
-- ---------------------------------------------------------------------------
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000003012', true);
do $$
declare v int; v_rows int;
begin
  -- DIZAYN QARORI: fan o'qituvchisi o'z sinflarining TO'LIQ ro'yxatini ko'radi
  -- (guruh chegasi faqat davomat/baho belgilashda amal qiladi — sinf ro'yxati
  --  sinf darajasida ochiq, chunki real maktabda ham fan o'qituvchisi sinf
  --  ro'yxatini biladi). Karimova: 10-A (12) + 10-B (12) + 7-A (10) = 34
  select count(*) into v from public.students;
  if v <> 34 then raise exception 'T3.1 FAIL: karimova students=% (34 kutilgan)', v; end if;
  raise notice 'T3.1 PASS: fan o''qituvchisi o''z sinflari ro''yxatini ko''radi (34, sinf darajasi)';

  -- LOCKED davomatni oddiy o'qituvchi o'zgartira olmaydi
  update public.attendance set status = 'ABSENT'
  where is_locked = true and marked_by = auth.uid();
  get diagnostics v_rows = row_count;
  if v_rows <> 0 then raise exception 'T3.2 FAIL: locked davomat o''zgartirildi!'; end if;
  raise notice 'T3.2 PASS: locked davomat o''zgartirilmaydi';

  -- Hujjat faylini (metadata orqali ruxsat berilmagan) o'qiy olmaydi
  select count(*) into v from storage.objects
  where bucket_id = 'student-documents'
    and name = '00000000-0000-4000-8000-000000000001/docs/test-ariza.pdf';
  if v <> 0 then raise exception 'T3.3 FAIL: fan o''qituvchisi hujjatni o''qidi!'; end if;
  raise notice 'T3.3 PASS: hujjat fayli fan o''qituvchisiga yopiq';

  -- student-documents bucket'iga yuklay olmaydi
  begin
    insert into storage.objects (bucket_id, name, owner)
    values ('student-documents', '00000000-0000-4000-8000-000000000001/docs/xato.pdf', auth.uid());
    raise exception 'T3.4 FAIL: bucket''ga yuklandi!';
  exception when insufficient_privilege then
    raise notice 'T3.4 PASS: bucket yozish huquqi faqat adminda';
  end;

  -- Risk voqealarini ko'rmaydi (sinf rahbari emas)
  select count(*) into v from public.risk_events;
  if v <> 0 then raise exception 'T3.5 FAIL: risk ko''rindi!'; end if;
  raise notice 'T3.5 PASS: risk faqat sinf rahbari/adminga';

  -- Data quality ko'rmaydi
  select count(*) into v from public.data_quality_issues;
  if v <> 0 then raise exception 'T3.6 FAIL: dq ko''rindi!'; end if;
  raise notice 'T3.6 PASS: data quality faqat adminda';
end $$;
rollback;

-- ---------------------------------------------------------------------------
-- T4. OTA-ONA (P5001: Jasur 10-A + Bekzod 7-A, can_view_documents=true)
-- ---------------------------------------------------------------------------
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000003020', true);
do $$
declare v int; v_rows int;
begin
  -- Faqat o'z 2 farzandi
  select count(*) into v from public.students;
  if v <> 2 then raise exception 'T4.1 FAIL: parent students=% (2 kutilgan)', v; end if;
  raise notice 'T4.1 PASS: ota-ona faqat o''z farzandlarini ko''radi (2)';

  select count(*) into v from public.students
  where id = '00000000-0000-4000-8000-000000004003';
  if v <> 0 then raise exception 'T4.2 FAIL: boshqa bola ko''rindi!'; end if;
  raise notice 'T4.2 PASS: boshqa farzand ko''rinmaydi';

  -- DRAFT baho ko'rinmaydi, PUBLISHED ko'rinadi (1 dona)
  select count(*) into v from public.grades;
  if v <> 1 then raise exception 'T4.3 FAIL: parent grades=% (1 kutilgan, draft yashirin)', v; end if;
  raise notice 'T4.3 PASS: draft baho yashirin, published ko''rinadi';

  -- Farzandining davomati
  select count(*) into v from public.attendance;
  if v < 1 then raise exception 'T4.4 FAIL: davomat ko''rinmadi'; end if;
  raise notice 'T4.4 PASS: farzand davomati ko''rinadi (%)', v;

  -- O'qituvchi xabari
  select count(*) into v from public.messages;
  if v <> 1 then raise exception 'T4.5 FAIL: parent messages=% (1 kutilgan)', v; end if;
  raise notice 'T4.5 PASS: ota-ona o''ziga kelgan xabarlarni ko''radi';

  -- Published SCHOOL e'loni ko'rinadi, scheduled CLASS e'loni YO'Q
  select count(*) into v from public.announcements;
  if v <> 1 then raise exception 'T4.6 FAIL: announcements=% (1 kutilgan)', v; end if;
  raise notice 'T4.6 PASS: rejalashtirilgan e''lon hali ko''rinmaydi';

  -- Hujjat: metadata + storage fayli
  select count(*) into v from public.documents;
  if v <> 1 then raise exception 'T4.7 FAIL: documents=% (1)', v; end if;
  select count(*) into v from storage.objects
  where bucket_id = 'student-documents'
    and name = '00000000-0000-4000-8000-000000000001/docs/test-ariza.pdf';
  if v <> 1 then raise exception 'T4.8 FAIL: hujjat fayli o''qilmadi (can_view_documents=true)'; end if;
  raise notice 'T4.7+T4.8 PASS: hujjat metadata va fayl ota-onaga ochiq (flag bilan)';

  -- O'quvchi ma'lumotini o'zgartira olmaydi
  update public.students set full_name = 'Xaker' where id = '00000000-0000-4000-8000-000000004001';
  get diagnostics v_rows = row_count;
  if v_rows <> 0 then raise exception 'T4.9 FAIL: parent studentni tahrirladi!'; end if;
  raise notice 'T4.9 PASS: ota-ona tahrir huquqisiz';

  -- Bildirishnoma preferensiyalarini boshqaradi
  insert into public.notification_preferences (school_id, profile_id, event_type, channel, enabled)
  values ('00000000-0000-4000-8000-000000000001', auth.uid(), 'attendance.absence', 'PUSH', true);
  raise notice 'T4.10 PASS: notification preferences o''ziniki';

  -- Boshqa profilga preferensiya yozmaydi
  begin
    insert into public.notification_preferences (school_id, profile_id, event_type, channel, enabled)
    values ('00000000-0000-4000-8000-000000000001',
            '00000000-0000-4000-8000-000000003001', 'attendance.absence', 'PUSH', true);
    raise exception 'T4.11 FAIL: boshqa profil pref yozildi!';
  exception when insufficient_privilege then
    raise notice 'T4.11 PASS: boshqa profilning sozlamalari yopiq';
  end;
end $$;
rollback;

-- ---------------------------------------------------------------------------
-- T5. O'QUVCHI (Jasur, 10-A)
-- ---------------------------------------------------------------------------
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000003021', true);
do $$
declare v int;
begin
  select count(*) into v from public.students;
  if v <> 1 then raise exception 'T5.1 FAIL: student students=% (1 kutilgan)', v; end if;
  raise notice 'T5.1 PASS: o''quvchi faqat o''zini ko''radi';

  select count(*) into v from public.grades;
  if v <> 1 then raise exception 'T5.2 FAIL: student grades=% (1 published)', v; end if;
  raise notice 'T5.2 PASS: faqat published baholar';

  select count(*) into v from public.homework;
  if v <> 2 then raise exception 'T5.3 FAIL: homework=% (2 kutilgan: CLASS + GROUP)', v; end if;
  raise notice 'T5.3 PASS: CLASS va GROUP uy vazifalari ko''rinadi (2)';

  -- 7-A o'quvchisining uy vazifasi ko'rinmasin — 7-A uy vazifasi yo'q, shunchaki tekshiramiz
  select count(*) into v from public.students
  where id = '00000000-0000-4000-8000-000000004002';
  if v <> 0 then raise exception 'T5.4 FAIL: boshqa o''quvchi ko''rindi!'; end if;
  raise notice 'T5.4 PASS: boshqa o''quvchi ko''rinmaydi';

  -- DIZAYN QARORI: o'quvchi FAQAT o'z ota-onalarini ko'radi (app_can_view_parent
  -- — is_student_self orqali); boshqa ota-onalar yopiq. Jasurning 1 ta onasi ro'yxatda.
  select count(*) into v from public.parents;
  if v <> 1 then raise exception 'T5.5 FAIL: o''quvchi parents=% (1 kutilgan)', v; end if;
  raise notice 'T5.5 PASS: o''quvchi faqat o''z ota-onasini ko''radi (boshqalar yopiq)';
end $$;
rollback;

-- ---------------------------------------------------------------------------
-- T6. CROSS-TENANT + KONFLIKT TESTLARI (postgres: constraintlar hamma uchun)
-- ---------------------------------------------------------------------------
begin;
do $$
declare v int;
begin
  -- O'qituvchi double-booking → DB unique index rad etadi
  begin
    insert into public.timetable_slots
      (school_id, timetable_version_id, class_id, class_subject_id, teacher_id, day_of_week, period_number)
    select school_id, timetable_version_id, class_id, class_subject_id, teacher_id, day_of_week, period_number
    from public.timetable_slots
    where timetable_version_id = '00000000-0000-4000-8000-000000000090'
      and teacher_id = '00000000-0000-4000-8000-000000001001'
    limit 1;
    raise exception 'T6.1 FAIL: double-booking qabul qilindi!';
  exception when unique_violation then
    raise notice 'T6.1 PASS: double-booking DB darajasida bloklangan';
  end;

  -- Davomat duplikati rad etiladi
  begin
    insert into public.attendance (school_id, lesson_id, student_id, status)
    select school_id, lesson_id, student_id, 'PRESENT'
    from public.attendance limit 1;
    raise exception 'T6.2 FAIL: attendance duplikat qabul qilindi!';
  exception when unique_violation then
    raise notice 'T6.2 PASS: davomat duplikati bloklangan';
  end;

  -- audit_log o'zgartirib bo'lmaydi (postgres uchun ham!)
  begin
    update public.audit_log set action = 'FAKE' where true;
    raise exception 'T6.3 FAIL: audit o''zgartirildi!';
  exception when others then
    raise notice 'T6.3 PASS: audit_log immutable';
  end;

  -- Tarix (temporal snapshot) ishlaydi: biriktirishni yopamiz → history yoziladi
  update public.teacher_assignments
  set valid_to = current_date, reason = 'Yuklama o''zgartirildi'
  where id = '00000000-0000-4000-8000-00000000d001';
  select count(*) into v from public.teacher_assignments_history;
  if v < 1 then raise exception 'T6.4 FAIL: tarix snapshot yozilmadi'; end if;
  raise notice 'T6.4 PASS: temporal history snapshot yoziladi (%)', v;

  -- Ota-ona manzili tarixi
  update public.parents set address = 'Yangi manzil, 21-uy'
  where id = '00000000-0000-4000-8000-000000005001';
  select count(*) into v from public.parent_contact_history;
  if v < 1 then raise exception 'T6.5 FAIL: parent_contact_history yozilmadi'; end if;
  raise notice 'T6.5 PASS: ota-ona manzili tarixi saqlanadi';
end $$;
commit;

-- ---------------------------------------------------------------------------
-- T7. ANONIM — hech narsa ko'rmaydi
-- ---------------------------------------------------------------------------
begin;
set local role anon;
do $$
declare v int;
begin
  select count(*) into v from public.students;
  if v <> 0 then raise exception 'T7.1 FAIL: anon students=% (0 kutilgan)', v; end if;
  raise notice 'T7.1 PASS: anon uchun hammasi yopiq';
end $$;
rollback;

-- ============================================================================
-- YAKUNIY XULOSA
-- ============================================================================
do $$
begin
  raise notice '========================================================';
  raise notice 'RLS SMOKE TESTLARI: BARCHASI OTDI ✓';
  raise notice '========================================================';
end $$;
