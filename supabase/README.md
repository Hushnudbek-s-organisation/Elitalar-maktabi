# Supabase setup — SchoolOS Uzbekistan

## To'liq o'rnatish (yangi yoki tozalanadigan DEV loyiha)

Supabase Dashboard → **SQL Editor**da **shu tartibda** ishga tushiring:

| # | Fayl | Nima qiladi |
|---|---|---|
| 1 | `migrations/000_reset_dev.sql` | ⚠️ **FAQAT agar bazada eski/drift ma'lumot bo'lsa.** Butun `public` sxemasini, barcha storage bucket/fayllarini va auth foydalanuvchilarini o'chiradi (nom ro'yxatisiz — hamma narsani). Qaytarib bo'lmaydi! |
| 2 | `migrations/001_schema.sql` | Barcha jadvallar, indekslar, triggerlar, tarix (temporal) sxemasi |
| 3 | `migrations/002_rls.sql` | RLS siyosatlari (har rol uchun), capability funksiyalari, storage bucketlar |
| 4 | `migrations/003_audit.sql` | Immutable audit log + 36 jadvalga audit triggerlari |
| 5 | `migrations/004_seed_dev.sql` | **Ixtiyoriy** (demo): demo maktab, jadval, jurnal namunalari, test hisoblari |

**Toza yangi loyihada** 1-qadam (reset) kerak emas — to'g'ridan-to'g'ri 001'dan boshlang.

**Xatolik bo'lsa:** 001'dagi preflight guard aniq o'zbekcha xato beradi (eski prototip jadvallari bilan konflikt bo'lsa) — u ko'rsatganidek avval `000_reset_dev.sql` ni ishga tushiring.

## Demo test hisoblari (004'dan keyin)

| Rol | Email | Parol |
|---|---|---|
| Direktor | `director@demo.school.uz` | `DirectorDemo#2026` |
| Admin | `admin@demo.school.uz` | `AdminDemo#2026` |
| O'qituvchi (10-A rahbari) | `hakimov@demo.school.uz` | `TeacherDemo#2026` |
| Ota-ona (2 farzand) | `parent1@demo.school.uz` | `ParentDemo#2026` |
| O'quvchi | `student1@demo.school.uz` | `StudentDemo#2026` |

Barcha o'qituvchilar: `TeacherDemo#2026`. Bu hisoblar FAQAT dev uchun (`is_demo=true` maktab).

## Lokal validatsiya (Supabasesiz)

```bash
pip install --break-system-packages pgserver
python3 supabase/tests/validate_local.py
```

Natija: migrationlar toza bazada OK + **53/53 RLS smoke test** + idempotensiya tekshiruvi.

## ESKI (legacy) fayllar — FAQAT TARIX UCHUN

- `DEMO_SETUP.sql` — eski prototip bootstrap'i (plain-text parollar, anon'ga ochiq RLS). **Yangi o'rnatishda ISHLATMANG**; bazada qolgan bo'lsa `000_reset_dev.sql` bilan tozalanadi.
- `migrations/202610040001_wallet_transfer_rpc.sql` — eski prototipning wallet funksiyasi (D7: wallet OFF flag bilan, yangi sxemada yo'q).
