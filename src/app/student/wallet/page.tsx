"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck, Wallet as WalletIcon } from "lucide-react";
import PinModal from "@/components/wallet/PinModal";
import TransactionTable from "@/components/wallet/TransactionTable";
import TransferForm from "@/components/wallet/TransferForm";
import { getStoredSession } from "@/lib/session";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { formatPP } from "@/lib/utils";
import { useWallet } from "@/store/useWallet";
import type { Profile, Transaction } from "@/types";

export default function WalletPage() {
  const router = useRouter();
  const walletBalance = useWallet((state) => state.balance);
  const transactions = useWallet((state) => state.transactions);
  const setWallet = useWallet((state) => state.setWallet);
  const setBalance = useWallet((state) => state.setBalance);
  const setTransactions = useWallet((state) => state.setTransactions);
  const [student, setStudent] = useState<Profile | null>(null);
  const [recipientId, setRecipientId] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const loadTransactions = useCallback(async (userId: string) => {
    const { data, error: queryError } = await supabase
      .from("transactions")
      .select("id, sender_id, receiver_id, amount, created_at")
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order("created_at", { ascending: false })
      .limit(50);
    if (queryError) {
      console.error("Tranzaksiyalarni yuklashda xatolik:", queryError.message);
      return;
    }
    setTransactions((data ?? []) as Transaction[]);
  }, [setTransactions]);

  useEffect(() => {
    const session = getStoredSession();
    if (!session.id || session.role !== "student") {
      router.replace("/");
      return;
    }
    if (!isSupabaseConfigured) {
      setError("Supabase sozlanmagan.");
      setLoading(false);
      return;
    }

    let active = true;
    const load = async () => {
      const { data, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, role, class_name, pp_balance, cp_score, avatar_url")
        .eq("id", session.id)
        .maybeSingle();
      if (!active) return;
      if (profileError || !data || data.role !== "student") {
        setError("Hamyon profilini yuklab bo'lmadi.");
        setLoading(false);
        return;
      }
      const profile = data as Profile;
      setStudent(profile);
      const { data: rows, error: transactionsError } = await supabase
        .from("transactions")
        .select("id, sender_id, receiver_id, amount, created_at")
        .or(`sender_id.eq.${session.id},receiver_id.eq.${session.id}`)
        .order("created_at", { ascending: false })
        .limit(50);
      if (!active) return;
      if (transactionsError) console.error("Tranzaksiyalarni yuklashda xatolik:", transactionsError.message);
      const history = (rows ?? []) as Transaction[];
      setWallet(Number(profile.pp_balance ?? 0), history);
      setLoading(false);
    };
    void load().catch((loadError) => {
      console.error(loadError);
      if (active) {
        setError("Hamyon ma'lumotlarini yuklashda xatolik yuz berdi.");
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, [router, setWallet]);

  const handleTransferInit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    const transferAmount = Number(amount);
    const targetId = recipientId.trim().toUpperCase();
    if (!Number.isSafeInteger(transferAmount) || transferAmount < 1) {
      setError("Miqdor 1 PP dan katta butun son bo'lishi kerak.");
      return;
    }
    if (transferAmount > (student?.pp_balance ?? walletBalance)) {
      setError("Hisobingizda mablag' yetarli emas.");
      return;
    }
    if (!/^S-[A-Z0-9-]+$/i.test(targetId)) {
      setError("O'quvchi ID raqamini to'g'ri kiriting (masalan: S-8393).");
      return;
    }
    if (targetId === student?.id) {
      setError("O'zingizga PP o'tkaza olmaysiz.");
      return;
    }
    setRecipientId(targetId);
    setModalOpen(true);
  };

  const handlePinSubmit = async () => {
    if (!student || isProcessing) return;
    const transferAmount = Number(amount);
    if (!pin) return;
    setError("");
    setIsProcessing(true);
    try {
      const { data, error: transferError } = await supabase.rpc("transfer_pp", {
        p_sender_id: student.id,
        p_receiver_id: recipientId.trim().toUpperCase(),
        p_amount: transferAmount,
        p_pin: pin,
      });
      if (transferError) {
        const message = transferError.message || "";
        if (transferError.code === "PGRST202" || transferError.code === "42883" || message.toLowerCase().includes("transfer_pp")) {
          setError("Xavfsiz o'tkazma xizmati hali yoqilmagan. Administrator README dagi Supabase migratsiyasini qo'llashi kerak.");
        } else if (message.toLowerCase().includes("parol")) {
          setError("Parol noto'g'ri. Qaytadan urinib ko'ring.");
        } else if (message.toLowerCase().includes("yetarli emas")) {
          setError("Hisobingizda mablag' yetarli emas.");
        } else if (message.toLowerCase().includes("qabul qiluvchi")) {
          setError("Qabul qiluvchi o'quvchi ID raqami topilmadi.");
        } else {
          setError("O'tkazma amalga oshmadi. Birozdan so'ng qayta urinib ko'ring.");
        }
        return;
      }

      const newBalance = Number((data as { balance?: number | string } | null)?.balance);
      if (!Number.isFinite(newBalance)) {
        setError("O'tkazma natijasi tasdiqlanmadi. Balansni qayta tekshiring.");
        return;
      }
      setBalance(newBalance);
      setStudent({ ...student, pp_balance: newBalance });
      setSuccess(`${formatPP(transferAmount)} PP muvaffaqiyatli o'tkazildi.`);
      setModalOpen(false);
      setPin("");
      setRecipientId("");
      setAmount("");
      await loadTransactions(student.id);
    } catch (transferError) {
      console.error("PP transfer error:", transferError);
      setError("O'tkazma vaqtida aloqa xatosi yuz berdi. Balansni tekshirib, qayta urinib ko'ring.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-9 w-9 animate-spin text-blue-600" /></div>;
  if (!student) return <div className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-8 text-center"><p className="font-bold text-slate-900">Hamyonni ochib bo'lmadi</p><p className="mt-2 text-sm text-slate-500">{error || "Qayta kirib ko'ring."}</p></div>;

  const balance = Number(student.pp_balance ?? walletBalance ?? 0);
  return (
    <div className="mx-auto max-w-6xl space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-blue-950 to-blue-800 p-6 text-white shadow-xl shadow-blue-950/10 sm:p-8">
        <div className="absolute -right-8 -top-12 h-56 w-56 rounded-full border-[32px] border-white/5" />
        <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div><p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-black uppercase tracking-wide text-blue-100"><WalletIcon className="h-4 w-4" /> ELITA hamyon</p><p className="mt-5 text-sm font-semibold text-blue-100">Shaxsiy ballaringiz</p><p className="mt-1 text-4xl font-black sm:text-5xl">{formatPP(balance)} <span className="text-xl text-blue-200">PP</span></p><p className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-emerald-200"><ShieldCheck className="h-4 w-4" /> O'tkazmalar ma'lumotlar bazasida atomar tasdiqlanadi</p></div>
          <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur"><p className="text-xs font-semibold text-blue-100">Shaxsiy ID</p><p className="mt-1 font-mono text-xl font-black tracking-wider">{student.id}</p></div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <TransferForm recipientId={recipientId} amount={amount} balance={balance} error={!modalOpen ? error : ""} success={success} disabled={!student} onRecipientChange={setRecipientId} onAmountChange={setAmount} onSubmit={handleTransferInit} />
        <TransactionTable transactions={transactions} userId={student.id} />
      </div>
      <PinModal open={modalOpen} amount={Number(amount) || 0} pin={pin} error={error} processing={isProcessing} onPinChange={setPin} onSubmit={handlePinSubmit} onClose={() => { if (isProcessing) return; setModalOpen(false); setPin(""); setError(""); }} />
    </div>
  );
}
