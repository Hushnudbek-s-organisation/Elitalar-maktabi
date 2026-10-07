-- ============================================================================
-- SchoolOS Uzbekistan — 000: SUPABASE LOYIHASINI TO'LIQ TOZALASH (NUKE)
-- ----------------------------------------------------------------------------
-- ⚠️⚠️⚠️ FAQAT DEV / DEMO LOYIHA UCHUN! QAYTARIB BO'LMAYDIGAN O'CHIRISH! ⚠️⚠️⚠️
--
-- BU NIMALARNI O'CHIRADI (nomlar ro'yxatisiz, HAMMASINI):
--   • public sxemasi BUTUNLAY: eski prototip (DEMO_SETUP.sql) jadvallari,
--     SchoolOS jadvallari, boshqa har qanday jadvallar, view, funksiya,
--     trigger, enum tiplar, sequencelar, RLS siyosatlar — hammasi
--   • pg_trgm extensioni (001 qayta yaratadi)
--   • storage: BARCHA bucketlar va ulardagi BARCHA fayllar
--   • auth: BARCHA foydalanuvchilar (auth.users va bog'liq yozuvlar)
--
-- NIMALARGA TEGMAYDI:
--   • auth/storage sxemalarining TUZILISHI (faqat yozuvlar o'chadi —
--     Supabase o'zi boshqaradi)
--   • extensions sxemasi va boshqa Supabase ichki sxemalari (graphql, cron...)
--
-- ISHLATISH (Supabase Dashboard → SQL Editor, ketma-ket):
--   1. SHU FAYL (000_reset_dev.sql)
--   2. 001_schema.sql
--   3. 002_rls.sql
--   4. 003_audit.sql
--   5. 004_seed_dev.sql   (demo ma'lumot/test hisoblar — ixtiyoriy)
--
-- NIMA UCHUN "drop schema public cascade"? Oddiy ro'yxat bilan drop qilish
-- (eski usul) ro'yxatga kirmagan obyektlarni qoldirib qo'yadi va yarim
-- o'rnatilgan holatlarda yana xato beradi. Sxemani butunlay yo'q qilish esa
-- nimadir qolib ketishini IMKONSIZ qiladi. Keyin Supabase standart
-- huquqlarini (grant/default privileges) tiklaymiz — aks holda API
-- (anon/authenticated) yangi jadvallarni ko'rmaydi.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. pg_trgm extensioni (agar u public sxemasiga o'rnatilgan bo'lsa, drop
--    schema bilan konflikt bermasligi uchun avval toza olib tashlaymiz;
--    extensions sxemasida bo'lsa — bu faqat qayta o'rnatiladi, zarari yo'q)
-- ---------------------------------------------------------------------------
do $$
begin
  drop extension if exists pg_trgm cascade;
exception when others then
  raise notice 'pg_trgm olib tashlanmadi (muammo emas): %', sqlerrm;
end $$;

-- ---------------------------------------------------------------------------
-- 2. STORAGE siyosatlari (schoolos_*/demo_* hammasi).
--    MUHIM: bu policylar public funksiyalariga bog'liq bo'lishi mumkin —
--    ularni AVVAL tushiramiz, aks holda "drop schema public cascade"
--    bog'liqlik tufayli to'xtashi mumkin.
-- ---------------------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'storage'
  loop
    begin
      execute format('drop policy if exists %I on %I.%I',
                     r.policyname, r.schemaname, r.tablename);
    exception
      when insufficient_privilege then
        raise notice 'policy tushirilmadi (ruxsat yo''q): %.%', r.tablename, r.policyname;
    end;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 3. public sxemasini BUTUNLAY yo'q qilish va qayta yaratish
--    (jadvallar, view, funksiya, trigger, tiplar — nimadir qolib ketishi
--    imkonsiz)
-- ---------------------------------------------------------------------------
do $$
begin
  execute 'drop schema public cascade';
  execute 'create schema public';
exception
  when insufficient_privilege then
    raise exception using
      message = 'public sxemani o''chirishga ruxsat yetmadi: ' || sqlerrm,
      hint = 'Storage → Policies bo''limida qolgan siyosatlarni qo''lda o''chiring va skriptni qayta ishga tushiring.';
  when others then
    raise exception 'public sxemasini o''chirishda xato: %', sqlerrm;
end $$;

-- ---------------------------------------------------------------------------
-- 4. Supabase standart huquqlarini tiklash.
--    MUHIM: sxema yo'q qilinganda default privileges ham yo'qoladi —
--    tiklamasak, yangi jadvallar anon/authenticated uchun API orqali
--    ko''rinmaydi (permission denied).
-- ---------------------------------------------------------------------------
grant usage on schema public to postgres, anon, authenticated, service_role;

alter default privileges for role postgres in schema public
  grant all on tables to postgres, anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  grant all on functions to postgres, anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  grant all on sequences to postgres, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 5. STORAGE: barcha fayllar va bucketlar (yozuvlar; bucketlarni 002 qayta
--    yaratadi)
-- ---------------------------------------------------------------------------
do $$ begin
  delete from storage.objects;
exception when others then
  raise notice 'storage.objects tozalanmadi: %', sqlerrm;
end $$;

do $$ begin
  delete from storage.buckets;
exception when others then
  raise notice 'storage.buckets tozalanmadi: %', sqlerrm;
end $$;

-- ---------------------------------------------------------------------------
-- 6. AUTH: barcha foydalanuvchilar (tuzilish qoladi, yozuvlar ochadi).
--    Har biri alohida guard bilan — Supabase versiyasida jadval bo'lmasa
--    xato bermaydi.
-- ---------------------------------------------------------------------------
do $$ begin delete from auth.mfa_amr_claims;    exception when undefined_table then null; when others then raise notice 'mfa_amr_claims: %', sqlerrm; end $$;
do $$ begin delete from auth.mfa_challenges;    exception when undefined_table then null; when others then raise notice 'mfa_challenges: %', sqlerrm; end $$;
do $$ begin delete from auth.mfa_factors;       exception when undefined_table then null; when others then raise notice 'mfa_factors: %', sqlerrm; end $$;
do $$ begin delete from auth.one_time_tokens;   exception when undefined_table then null; when others then raise notice 'one_time_tokens: %', sqlerrm; end $$;
do $$ begin delete from auth.flow_state;        exception when undefined_table then null; when others then raise notice 'flow_state: %', sqlerrm; end $$;
do $$ begin delete from auth.saml_relay_states; exception when undefined_table then null; when others then raise notice 'saml_relay_states: %', sqlerrm; end $$;
do $$ begin delete from auth.sessions;          exception when undefined_table then null; when others then raise notice 'sessions: %', sqlerrm; end $$;
do $$ begin delete from auth.refresh_tokens;    exception when undefined_table then null; when others then raise notice 'refresh_tokens: %', sqlerrm; end $$;
do $$ begin delete from auth.identities;        exception when undefined_table then null; when others then raise notice 'identities: %', sqlerrm; end $$;
do $$ begin delete from auth.users;             exception when undefined_table then null; when others then raise notice 'users: %', sqlerrm; end $$;
do $$ begin delete from auth.audit_log_entries; exception when undefined_table then null; when others then raise notice 'audit_log_entries: %', sqlerrm; end $$;

-- ---------------------------------------------------------------------------
-- 7. API schema cache'ni yangilash (PostgREST)
-- ---------------------------------------------------------------------------
notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------------
-- 8. TEKSHIRUV — natija xulosasi
-- ---------------------------------------------------------------------------
do $$
declare
  v_tables   int;
  v_buckets  int;
  v_users    int;
  v_policies int;
  v_funcs    int;
begin
  select count(*) into v_tables from information_schema.tables
   where table_schema = 'public' and table_type = 'BASE TABLE';
  select count(*) into v_funcs from pg_proc p
   join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public';
  select count(*) into v_buckets from storage.buckets;
  select count(*) into v_users from auth.users;
  select count(*) into v_policies from pg_policies where schemaname = 'storage';

  if v_tables = 0 then raise notice 'public jadvallari: 0 — OK'; end if;
  if v_funcs  = 0 then raise notice 'public funksiyalari: 0 — OK'; end if;
  if v_buckets = 0 then raise notice 'storage bucketlar: 0 — OK'; end if;
  if v_users  = 0 then raise notice 'auth foydalanuvchilar: 0 — OK'; end if;
  if v_policies = 0 then raise notice 'storage siyosatlar: 0 — OK'; end if;

  if v_tables > 0 or v_funcs > 0 or v_buckets > 0 or v_users > 0 or v_policies > 0 then
    raise warning 'QOLDIQLAR: jadval=%, funksiya=%, bucket=%, user=%, storage-policy=%',
      v_tables, v_funcs, v_buckets, v_users, v_policies;
  else
    raise notice 'TOZALASH TUGADI ✓ Endi tartib bilan ishga tushiring: 001_schema → 002_rls → 003_audit → 004_seed_dev';
  end if;
end $$;
