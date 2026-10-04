"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowRight, BookOpen, Eye, EyeOff, GraduationCap, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { getDashboardPath, storeSession } from "@/lib/session";
import { isSupabaseConfigured } from "@/lib/supabase";
import { useAuth } from "@/store/useAuth";

export default function MainLogin() {
  const router = useRouter();
  const login = useAuth((state) => state.login);
  const loading = useAuth((state) => state.loading);
  const error = useAuth((state) => state.error);
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = await login(id, password);
    if (!result.success || !result.role) return;

    const user = useAuth.getState().user;
    storeSession(user?.id ?? id.trim().toUpperCase(), result.role, user?.full_name);
    const path = getDashboardPath(result.role);
    if (path) router.replace(path);
  };

  return (
    <main className="login-shell relative min-h-screen overflow-hidden px-4 py-8 sm:px-6 lg:px-10">
      <div className="login-orb login-orb-one" aria-hidden="true" />
      <div className="login-orb login-orb-two" aria-hidden="true" />

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl flex-col">
        <header className="flex items-center justify-between py-2">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/25">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-black tracking-[0.2em] text-slate-900">ELITA</p>
              <p className="text-xs font-semibold text-slate-500">Maktab platformasi</p>
            </div>
          </div>
          <span className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-2 text-xs font-bold text-slate-600 shadow-sm sm:inline-flex">
            <ShieldCheck className="h-4 w-4 text-emerald-600" /> Xavfsiz kirish
          </span>
        </header>

        <div className="grid flex-1 items-center gap-10 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:py-14">
          <section className="hidden lg:block">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700">
              <Sparkles className="h-4 w-4" /> Ta'lim, aloqa va yutuqlar — bir joyda
            </div>
            <h1 className="max-w-xl text-5xl font-black leading-[1.08] tracking-tight text-slate-950 xl:text-6xl">
              Maktab hayoti <span className="text-blue-600">yangi bosqichda.</span>
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-8 text-slate-600">
              ELITA orqali dars jadvalingiz, uy vazifalari, sinf reytingi va maktab hamyonini qulay boshqaring.
            </p>
            <div className="mt-10 grid max-w-lg grid-cols-2 gap-3">
              {[
                { icon: GraduationCap, label: "Ta'lim va jadval" },
                { icon: ShieldCheck, label: "Shaxsiy kabinet" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-3 rounded-2xl border border-white bg-white/75 p-4 shadow-sm backdrop-blur">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><Icon className="h-5 w-5" /></span>
                  <span className="text-sm font-bold text-slate-700">{label}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="mx-auto w-full max-w-[460px]">
            <div className="rounded-[2rem] border border-white/80 bg-white/95 p-6 shadow-[0_28px_90px_-36px_rgba(15,23,42,0.3)] backdrop-blur-xl sm:p-9">
              <div className="mb-8">
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 lg:hidden">
                  <GraduationCap className="h-7 w-7" />
                </div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-600">Xush kelibsiz</p>
                <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Tizimga kirish</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">Maktab bergan shaxsiy ID va parolingizni kiriting.</p>
              </div>

              {!isSupabaseConfigured && (
                <div role="status" className="mb-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                  <span>Platforma bazasi sozlanmagan. Administrator <code className="rounded bg-amber-100 px-1">.env.local</code> faylini to'ldirishi kerak.</span>
                </div>
              )}

              {error && (
                <div role="alert" className="mb-5 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label htmlFor="login-id" className="mb-2 block text-sm font-bold text-slate-700">Shaxsiy ID raqam</label>
                  <input
                    id="login-id"
                    name="username"
                    autoComplete="username"
                    type="text"
                    required
                    maxLength={40}
                    placeholder="Masalan: S-8392"
                    value={id}
                    onChange={(event) => setId(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 font-mono text-base font-bold uppercase text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>

                <div>
                  <label htmlFor="login-password" className="mb-2 block text-sm font-bold text-slate-700">Parol</label>
                  <div className="relative">
                    <input
                      id="login-password"
                      name="password"
                      autoComplete="current-password"
                      type={showPassword ? "text" : "password"}
                      required
                      maxLength={128}
                      placeholder="Parolingizni kiriting"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 pr-12 text-base text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? "Parolni yashirish" : "Parolni ko'rsatish"}
                      onClick={() => setShowPassword((visible) => !visible)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !isSupabaseConfigured}
                  className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-4 text-sm font-black text-white shadow-lg shadow-slate-950/10 transition hover:bg-blue-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {loading ? <><Loader2 className="h-5 w-5 animate-spin" /> Tekshirilmoqda...</> : <>Kirish <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></>}
                </button>
              </form>

              <div className="mt-7 border-t border-slate-100 pt-5 text-center text-xs leading-5 text-slate-500">
                ID yoki parolingiz esdan chiqdimi? Maktab administratori bilan bog'laning.
              </div>
            </div>
            <p className="mt-5 text-center text-xs font-medium text-slate-500">© {new Date().getFullYear()} ELITA Maktabi · Barcha huquqlar himoyalangan</p>
          </section>
        </div>
      </div>
    </main>
  );
}
