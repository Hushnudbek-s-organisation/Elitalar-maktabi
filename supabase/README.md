# Supabase setup

## Isolated demo / local test only

`DEMO_SETUP.sql` creates all tables currently used by the app, indexes, the `transfer_pp` wallet RPC, Storage buckets, Realtime subscriptions, and four example accounts. Run it from the Supabase Dashboard → **SQL Editor** in a **new, empty, isolated project**, then add that project's URL and anon key to the local `.env.local` file and restart Next.js.

**Do not run this setup against production or use real student data.** The current app still has a legacy browser-only sign-in (`profiles.password` is plain text and roles are stored in localStorage). For the legacy UI to work without Supabase Auth, the demo script intentionally installs permissive anon RLS policies and public demo uploads. This means anyone with the public project URL/key can read and modify demo data. A production release requires Supabase Auth, server-side account provisioning, and user-/role-scoped RLS first.

### Example accounts

| Role | ID | Password |
|---|---|---|
| Director | `D-100001` | `DirectorDemo#2026` |
| Teacher | `T-100001` | `TeacherDemo#2026` |
| Student | `S-100001` | `StudentOne#2026` |
| Student | `S-100002` | `StudentTwo#2026` |

The two students belong to `7-A`, with sample timetable, homework, contacts, and a group chat seeded for UI testing. Re-running the script resets these four demo profiles to the listed credentials and restores the sample class/schedule.

Never put a Supabase **service-role** key in `.env.local` variables prefixed with `NEXT_PUBLIC_` or in browser code. The app only needs the public anon key for this demo setup.

## Existing migration

`migrations/202610040001_wallet_transfer_rpc.sql` contains the wallet transfer function by itself for projects that already have the matching tables. `DEMO_SETUP.sql` also creates that function, so a fresh demo install does not need the separate migration. Supabase must actually execute one of these SQL files; a migration file in Git is not automatically applied to the hosted database.
