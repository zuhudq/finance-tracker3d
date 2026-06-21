"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation"; // 1. Tambahkan router untuk redirect
import { supabase } from "@/lib/supabase";
import ExpenseChart from "../components/ExpenseChart";
import BudgetProgress from "../components/BudgetProgress";

interface Account {
  id: string;
  name: string;
  type: string;
  current_balance: number;
}
interface Category {
  id: string;
  name: string;
  type: string;
}
interface Budget {
  id: string;
  category_id: string;
  amount_limit: number;
  month_year: string;
  categories: { name: string } | null;
}
export interface Transaction {
  id: string;
  amount: number;
  description: string;
  created_at: string;
  categories: { id?: string; name: string; type: string } | null;
  accounts: { name: string } | null;
}

export default function DashboardPage() {
  const router = useRouter();

  // State Data Utama
  const [userEmail, setUserEmail] = useState<string>("Memuat..."); // 2. State untuk identitas user
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalBalance, setTotalBalance] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // State Modal
  const [isAccountModalOpen, setIsAccountModalOpen] = useState<boolean>(false);
  const [newName, setNewName] = useState<string>("");
  const [newType, setNewType] = useState<string>("debit");
  const [newBalance, setNewBalance] = useState<string>("");

  const [isTxModalOpen, setIsTxModalOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [txType, setTxType] = useState<string>("expense");
  const [txAccountId, setTxAccountId] = useState<string>("");
  const [txCategoryId, setTxCategoryId] = useState<string>("");
  const [txAmount, setTxAmount] = useState<string>("");
  const [txDesc, setTxDesc] = useState<string>("");

  const fetchData = useCallback(async () => {
    try {
      // 3. Cek Sesi Autentikasi User Saat Ini
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email || "Pengguna");
      } else {
        // Jika tidak ada sesi (belum login), tendang ke landing page
        router.push("/");
        return;
      }

      const { data: accData, error: accError } = await supabase
        .from("accounts")
        .select("*")
        .order("created_at", { ascending: true });
      if (accError) throw accError;
      if (accData) {
        setAccounts(accData);
        setTotalBalance(
          accData.reduce((sum, item) => sum + Number(item.current_balance), 0),
        );
        if (accData.length > 0 && !txAccountId) setTxAccountId(accData[0].id);
      }

      const { data: catData, error: catError } = await supabase
        .from("categories")
        .select("*");
      if (catError) throw catError;
      if (catData) setCategories(catData);

      const { data: budgetData, error: budgetError } = await supabase
        .from("budgets")
        .select(`id, category_id, amount_limit, month_year, categories (name)`);
      if (budgetError) throw budgetError;
      if (budgetData) setBudgets(budgetData as unknown as Budget[]);

      const { data: txData, error: txError } = await supabase
        .from("transactions")
        .select(
          `id, amount, description, created_at, categories (id, name, type), accounts (name)`,
        )
        .order("created_at", { ascending: false });
      if (txError) throw txError;
      if (txData) setTransactions(txData as unknown as Transaction[]);
    } catch (error) {
      console.error("Gagal mengambil data:", error);
    }
  }, [txAccountId, router]);

  useEffect(() => {
    const initLoad = async () => {
      await fetchData();
      setIsLoading(false);
    };
    initLoad();
  }, [fetchData]);

  // 4. Fungsi Keluar (Logout) yang Aman
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const handleAddAccount = async (e: React.FormEvent) => {
    /* ... (Tetap sama) ... */
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("accounts")
        .insert([
          { name: newName, type: newType, current_balance: Number(newBalance) },
        ]);
      if (error) throw error;
      setNewName("");
      setNewType("debit");
      setNewBalance("");
      setIsAccountModalOpen(false);
      await fetchData();
    } catch (error) {
      console.error(error);
      alert("Gagal menambahkan akun.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    /* ... (Tetap sama) ... */
    e.preventDefault();
    if (!txAccountId || !txCategoryId)
      return alert("Pilih dompet dan kategori terlebih dahulu!");
    setIsSubmitting(true);
    try {
      const numericAmount = Number(txAmount);
      const { error: txError } = await supabase
        .from("transactions")
        .insert([
          {
            account_id: txAccountId,
            category_id: txCategoryId,
            amount: numericAmount,
            description: txDesc,
          },
        ]);
      if (txError) throw txError;

      const selectedAccount = accounts.find((a) => a.id === txAccountId);
      if (selectedAccount) {
        const newBalance =
          txType === "income"
            ? Number(selectedAccount.current_balance) + numericAmount
            : Number(selectedAccount.current_balance) - numericAmount;
        const { error: accUpdateError } = await supabase
          .from("accounts")
          .update({ current_balance: newBalance })
          .eq("id", txAccountId);
        if (accUpdateError) throw accUpdateError;
      }
      setTxAmount("");
      setTxDesc("");
      setIsTxModalOpen(false);
      await fetchData();
    } catch (error) {
      console.error(error);
      alert("Gagal mencatat transaksi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatRupiah = (value: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(value);

  if (isLoading)
    return (
      <div className="min-h-screen bg-chill-bg flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-neon-cyan border-t-transparent rounded-full animate-spin"></div>
      </div>
    );

  if (accounts.length === 0) {
    return (
      <main className="min-h-screen bg-chill-bg flex flex-col items-center justify-center p-6 relative">
        <div className="absolute top-0 left-[-10%] w-100 h-100 rounded-full bg-neon-cyan/10 blur-[100px] pointer-events-none"></div>
        <div className="w-full max-w-lg z-10 bg-white/5 backdrop-blur-xl border border-white/10 p-10 rounded-3xl shadow-2xl text-center">
          <h1 className="text-3xl font-bold text-white mb-3 tracking-tight">
            Langkah Pertama
          </h1>
          <p className="text-slate-400 mb-8">
            Mari buat dompet atau rekening pertamamu.
          </p>
          <form onSubmit={handleAddAccount} className="space-y-5 text-left">
            <input
              type="text"
              required
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-neon-cyan transition-all"
              placeholder="Nama Rekening"
            />
            <input
              type="number"
              required
              value={newBalance}
              onChange={(e) => setNewBalance(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-neon-cyan transition-all"
              placeholder="Saldo Awal"
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 rounded-xl bg-neon-cyan text-chill-bg font-bold text-lg hover:bg-cyan-300 transition-all shadow-[0_0_15px_rgba(34,211,238,0.3)]"
            >
              {isSubmitting ? "Membangun..." : "Mulai Perjalanan"}
            </button>
          </form>
        </div>
      </main>
    );
  }

  const filteredCategories = categories.filter((c) => c.type === txType);

  return (
    // 5. Ubah struktur main agar Header berada di atas semuanya
    <main className="min-h-screen p-8 flex flex-col relative bg-chill-bg">
      <div className="absolute top-[-10%] left-[-5%] w-100 h-100 rounded-full bg-neon-cyan/5 blur-[120px] pointer-events-none z-0"></div>

      {/* HEADER NAVIGASI BARU */}
      <header className="w-full max-w-7xl mx-auto flex justify-between items-center mb-8 z-10 px-4 py-4 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-neon-cyan/20 flex items-center justify-center border border-neon-cyan/30 text-neon-cyan font-bold">
            {userEmail.charAt(0).toUpperCase()}
          </div>
          <div className="hidden sm:block">
            <p className="text-xs text-slate-400">Selamat datang kembali,</p>
            <p className="text-sm font-semibold text-white">{userEmail}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="px-6 py-2 rounded-xl border border-neon-coral/30 text-neon-coral hover:bg-neon-coral/10 transition-all text-sm font-medium"
        >
          Keluar
        </button>
      </header>

      {/* KONTEN UTAMA (KIRI & KANAN) */}
      <div className="w-full max-w-7xl mx-auto flex flex-col lg:flex-row gap-8 items-start">
        {/* PANEL KIRI */}
        <section className="w-full lg:w-1/3 z-10 sticky top-8">
          <div className="p-8 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl">
            <h1 className="text-3xl font-bold mb-2 tracking-tight text-white">
              Finance<span className="text-neon-cyan">Tracker.</span>
            </h1>
            <p className="text-slate-400 mb-8 text-sm">
              Peta arus kas harianmu.
            </p>
            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-white/5 border border-white/5">
                <p className="text-sm text-slate-400 mb-1">
                  Total Saldo Terkonsolidasi
                </p>
                <h2 className="text-4xl font-semibold text-white tracking-tight">
                  {formatRupiah(totalBalance)}
                </h2>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center px-1">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Daftar Akun
                  </p>
                  <button
                    onClick={() => setIsAccountModalOpen(true)}
                    className="text-xs font-medium text-neon-cyan hover:text-cyan-300 transition-colors"
                  >
                    + Tambah
                  </button>
                </div>
                {accounts.map((acc) => (
                  <div
                    key={acc.id}
                    className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all"
                  >
                    <div>
                      <p className="text-sm font-medium text-white">
                        {acc.name}
                      </p>
                      <p className="text-xs text-slate-400 capitalize">
                        {acc.type}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-slate-200">
                      {formatRupiah(acc.current_balance)}
                    </p>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setIsTxModalOpen(true)}
                className="w-full py-4 rounded-2xl bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30 hover:bg-neon-cyan/30 transition-all font-medium pt-4"
              >
                + Catat Transaksi
              </button>
            </div>
          </div>
        </section>

        {/* PANEL KANAN */}
        <section className="w-full lg:w-2/3 flex flex-col gap-8 z-10">
          <div className="p-8 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl">
            <h2 className="text-xl font-bold text-white tracking-tight mb-6">
              Analisis Pengeluaran
            </h2>
            <ExpenseChart transactions={transactions} />
          </div>

          <div className="p-8 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl">
            <h2 className="text-xl font-bold text-white tracking-tight mb-6">
              Target Batas Anggaran Bulan Ini
            </h2>
            <BudgetProgress budgets={budgets} transactions={transactions} />
          </div>

          <div className="p-8 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl flex-1 flex flex-col min-h-100">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl font-bold text-white tracking-tight">
                Riwayat Transaksi
              </h2>
              <button className="text-sm text-slate-400 hover:text-white transition-colors">
                Lihat Semua →
              </button>
            </div>
            {transactions.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center opacity-60">
                <div className="w-16 h-16 mb-4 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                  <span className="text-2xl">💸</span>
                </div>
                <p className="text-slate-300 font-medium">
                  Belum ada pergerakan kas
                </p>
              </div>
            ) : (
              <div className="space-y-4 overflow-y-auto pr-2">
                {transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center border ${tx.categories?.type === "income" ? "bg-neon-cyan/10 border-neon-cyan/20 text-neon-cyan" : "bg-neon-coral/10 border-neon-coral/20 text-neon-coral"}`}
                      >
                        {tx.categories?.type === "income" ? "↓" : "↑"}
                      </div>
                      <div>
                        <p className="text-white font-medium">
                          {tx.description || tx.categories?.name}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          {tx.accounts?.name} •{" "}
                          {new Date(tx.created_at).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                          })}
                        </p>
                      </div>
                    </div>
                    <p
                      className={`font-semibold ${tx.categories?.type === "income" ? "text-neon-cyan" : "text-neon-coral"}`}
                    >
                      {tx.categories?.type === "income" ? "+" : "-"}
                      {formatRupiah(tx.amount)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* MODAL CATAT TRANSAKSI */}
      {isTxModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-chill-bg border border-white/10 rounded-3xl p-8 shadow-2xl relative">
            <button
              onClick={() => setIsTxModalOpen(false)}
              className="absolute top-6 right-6 text-slate-400 hover:text-white transition-colors"
            >
              ✕
            </button>
            <h2 className="text-2xl font-bold text-white mb-6">
              Catat Transaksi
            </h2>
            <form onSubmit={handleAddTransaction} className="space-y-5">
              <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setTxType("expense");
                    setTxCategoryId("");
                  }}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${txType === "expense" ? "bg-neon-coral text-white shadow-md" : "text-slate-400 hover:text-white"}`}
                >
                  Pengeluaran
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTxType("income");
                    setTxCategoryId("");
                  }}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${txType === "income" ? "bg-neon-cyan text-chill-bg shadow-md" : "text-slate-400 hover:text-white"}`}
                >
                  Pemasukan
                </button>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">
                  Pilih Dompet
                </label>
                <select
                  required
                  value={txAccountId}
                  onChange={(e) => setTxAccountId(e.target.value)}
                  className="w-full bg-chill-bg border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-neon-cyan appearance-none"
                >
                  <option value="" disabled>
                    Pilih dompet...
                  </option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({formatRupiah(a.current_balance)})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">
                  Kategori
                </label>
                <select
                  required
                  value={txCategoryId}
                  onChange={(e) => setTxCategoryId(e.target.value)}
                  className="w-full bg-chill-bg border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-neon-cyan appearance-none"
                >
                  <option value="" disabled>
                    Pilih kategori...
                  </option>
                  {filteredCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">
                  Nominal (Rp)
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={txAmount}
                  onChange={(e) => setTxAmount(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-neon-cyan"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">
                  Catatan (Opsional)
                </label>
                <input
                  type="text"
                  value={txDesc}
                  onChange={(e) => setTxDesc(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-neon-cyan"
                  placeholder="Misal: Makan siang"
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-4 rounded-xl font-bold text-md transition-all mt-4 ${txType === "income" ? "bg-neon-cyan text-chill-bg hover:bg-cyan-300" : "bg-neon-coral text-white hover:bg-rose-400"} disabled:opacity-50`}
              >
                {isSubmitting ? "Menyimpan..." : "Simpan Transaksi"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL TAMBAH AKUN */}
      {isAccountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-chill-bg border border-white/10 rounded-3xl p-8 shadow-2xl relative">
            <button
              onClick={() => setIsAccountModalOpen(false)}
              className="absolute top-6 right-6 text-slate-400 hover:text-white transition-colors"
            >
              ✕
            </button>
            <h2 className="text-2xl font-bold text-white mb-6">
              Tambah Rekening Baru
            </h2>
            <form onSubmit={handleAddAccount} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">
                  Nama Rekening
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-neon-cyan transition-all"
                  placeholder="Misal: Bank BCA"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">
                  Tipe
                </label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  className="w-full bg-chill-bg border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-neon-cyan transition-all appearance-none"
                >
                  <option value="debit">Debit / Bank</option>
                  <option value="e-wallet">E-Wallet</option>
                  <option value="cash">Tunai</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">
                  Saldo Awal (Rp)
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={newBalance}
                  onChange={(e) => setNewBalance(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-neon-cyan transition-all"
                  placeholder="0"
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 rounded-xl bg-neon-cyan text-chill-bg font-bold mt-4 hover:bg-cyan-300 transition-all disabled:opacity-50"
              >
                {isSubmitting ? "Menyimpan..." : "Simpan Rekening"}
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
