# SchoolOS Uzbekistan — TO'LIQ SQL YETKAZIB BERISH HISOBOTI

**Faza:** COMPLETE SQL (Phase 0 arxitektura tasdiqlangandan keyingi bosqich)
**Holat:** Lokal PostgreSQL 16 (pgserver) da to'liq validatsiya qilingan. **SUPABASE'DA HALI ISHLATILMAGAN.**
**Tartib:** `001_schema.sql` → `002_rls.sql` → `003_audit.sql` → `004_seed_dev.sql` (faqat dev/demo)

---

## 1. Fayllar

| Fayl | Hajm | Mazmuni |
|---|---|---|
| `supabase/migrations/000_reset_dev.sql` | reset | **FAQAT DEV**: universal tozalash — `drop schema public cascade` (nom ro'yxatisiz HAMMA jadvall/view/funksiya/tip), storage bucket+fayl+policylar, auth foydalanuvchilar, Supabase standart grantlari tiklanadi |
| `supabase/migrations/001_schema.sql` | 21 bo'lim | Barcha jadvallar, FK, indekslar, CHECK/UNIQUE constraintlar, triggerlar (updated_at, tarix/snapshot, hisob-kitoblar), expression indekslar (parallel guruh darslari uchun `lessons_slot_uk`), enum tiplar, `pg_trgm` guard, **§0.1 preflight guard** (eski prototip jadvallari bilan konfliktni aniq xato xabari bilan to'xtatadi) |
| `supabase/migrations/002_rls.sql` | ~30 funksiya | ~30 yordamchi/capability funksiya (`app_school_id`, `app_role`, `app_is_teacher_of_lesson`...), **har bir jadvalga to'liq RLS** (SELECT/INSERT/UPDATE/DELETE, rolga mos), 4 storage bucket + storage.objects RLS, `teachers_public` school-filtrlangan view |
| `supabase/migrations/003_audit.sql` | 36 jadval | `audit_log` (immutable: update/delete triggerlar orqali bloklangan), `audit_mask_sensitive` (parol/token maskalanadi), 36 jadvalga audit triggeri, audit'ga RLS (faqat admin ko'radi) |
| `supabase/migrations/004_seed_dev.sql` | ~700 qator | **FAQAT DEV** (guard bilan): demo maktab, 7 rol + ~55 permission, 2026/2027 o'quv yili + 4 chorak, D1 baholash konfigi (FORMATIV 10-ball / BSB / CHSB), 8 fan, 3 sinf, 7 o'qituvchi, 34 o'quvchi, 18 ota-ona, **greedy jadval generatori** (60/60 slot, score=100), jurnal/davomat/baho namunalari, risk qoidalari, test hisoblari |
| `supabase/tests/local_harness.sql` | — | **FAQAT LOKAL**: Supabase auth/storage sxemalarini emulyatsiya qiladi |
| `supabase/tests/rls_smoke_tests.sql` | 53 test | Har rol uchun ko'rish ko'lami, izolyatsiya, cross-tenant, privilege escalation, constraint testlari |
| `supabase/tests/validate_local.py` | drayver | To'liq lokal validatsiya: toza o'rnatish → 53 RLS testi → idempotensiya (`pip install --break-system-packages pgserver` kerak) |

## 2. Validatsiya natijalari (lokal PostgreSQL 16, pgserver)

- **Migrationlar:** 001→004 toza bazada `ON_ERROR_STOP=1` bilan — **HAMMASI OK**
- **RLS smoke testlar:** **53/53 PASS** (direktor, sinf rahbari, fan o'qituvchisi, ota-ona, o'quvchi, anonim, cross-tenant, konflikt/trigger testlari)
- **Idempotensiya:** 001/002/003 qayta ishga tushirish — OK; 004 guard bilan aniq xatodan to'xtaydi (duplikat oldini olish)

### Validatsiya topgan va tuzatilgan xatolar
1. `school_settings.value` (jsonb) ga oddiy string yozilgan → `"PRESENT"` (JSON string)
2. `app_has_permission`: `user_role` enum ↔ text taqqoslash → `::text` cast
3. `audit_mask_sensitive`: `'***'` text ↔ jsonb → `to_jsonb('***'::text)`
4. `audit_row_change`: `coalesce(uuid, text)` → `::uuid` cast
5. Qavs nomutanosibligi 2 funksiyada (`app_can_view_lesson`, `app_can_view_announcement`)
6. `lessons` guruh darsi insertida `subject_group_id` yo'q edi → unique index buzilardi
7. UUID idlarda hex bo'lmagan harflar (g/h/i/j/k/l/m/n) → hex sxemaga o'tkazildi
8. CASE expression → enum cast (`attendance_status`)

### Testlar aniqlagan 2 ta dizayn qarori (hujjatlashtirildi)
- **Fan o'qituvchisi sinf ro'yxatini sinf darajasida ko'radi** (guruh chegarasi faqat davomat/baho belgilashda). Real maktab amaliyotiga mos.
- **O'quvchi o'z ota-onasini ko'radi** (boshqa ota-onalar yopiq) — `app_can_view_parent` dagi `is_student_self` sharti.

## 3. Xavfsizlik xulosalari (test bilan isbotlangan)

- Cross-tenant izolyatsiya: direktor ham boshqa maktab ma'lumotini ko'rmaydi (T1.5)
- Privilege escalation: o'qituvchi o'z rolini ADMINga o'zgartira olmaydi (T2.8)
- DRAFT baholar ota-ona/o'quvchiga ko'rinmaydi (T4.3, T5.2)
- LOCKED davomatni o'qituvchi o'zgartira olmaydi (T3.2)
- `audit_log` hatto postgres uchun ham immutable (T6.3)
- Ota-ona o'quvchi ma'lumotini tahrirlay olmaydi (T4.9)
- Double-booking va davomat duplikati DB darajasida (unique index) bloklangan (T6.1, T6.2)
- Storage: hujjat fayli faqat `can_view_documents=true` bo'lgan ota-onaga ochiq (T4.7/T4.8), bucket'ga yozish faqat adminda (T3.4)
- Anonim uchun hammasi yopiq (T7.1)

## 4. Cheklovlar / keyingi qadamlar

- **Supabase'da sinildi (2026-10-07):** (1) eski prototip jadvallari 001'ni 42703 xatosi bilan to'xtatgan → 001'ga preflight guard qo'shildi; (2) ro'yxatga asoslangan reset ham yetarli bo'lmagan (bazada ro'yxatga kirmagan qoldiqlar) → `000_reset_dev.sql` **universal** qilindi: `drop schema public cascade` + storage/auth tozalash + Supabase standart grantlarini tiklash. Lokal nuke-testi: iflos holat (135 obyekt, funksiyalarga bog'langan storage policylar, eski prototip qoldiqlari, auth userlar) → nuke → hammasi 0 → qayta o'rnatish → 53/53 test OK.
- **Supabase'da o'rnatish tartibi:** `000_reset_dev.sql` (faqat eski/drift ma'lumot bo'lsa — ⚠️ hamma narsani o'chiradi!) → `001 → 002 → 003` → `004` (ixtiyoriy demo). `local_harness.sql`/`validate_local.py` Supabase'da ishlatilmaydi.
- `pg_trgm` lokal testda yo'q edi — 001'da guard bor, Supabase'da mavjud.
- JSHSHIR kolonkasi collect qilinmaydi (D5 — legal tekshiruvgacha).
- **KEYINGI: Phase 1 (Admin core)** — foydalanuvchi tasdig'idan keyin.
