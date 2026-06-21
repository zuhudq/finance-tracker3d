"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
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

// Struktur data utama untuk grafik (Tetap dipertahankan agar tidak error)
export interface Transaction {
  id: string;
  amount: number;
  description: string;
  created_at: string;
  categories: { id?: string; name: string; type: string } | null;
  accounts: { name: string } | null;
}

// Struktur data baru khusus untuk Modul Transfer
interface TransferRecord {
  id: string;
  amount: number;
  description: string;
  created_at: string;
  source_account_id: string;
  destination_account_id: string;
}

// Struktur gabungan untuk UI Riwayat Transaksi
interface HistoryItem {
  id: string;
  amount: number;
  description: string;
  created_at: string;
  type: "income" | "expense" | "transfer";
  accountName: string;
  categoryName: string;
}

export default function DashboardPage() {
  const router = useRouter();

  const [userEmail, setUserEmail] = useState<string>("Memuat...");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);

  // State Data Mentah
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transfers, setTransfers] = useState<TransferRecord[]>([]);
  // State Data Gabungan untuk UI Riwayat
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);

  const [totalBalance, setTotalBalance] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // State Modal Rekening
  const [isAccountModalOpen, setIsAccountModalOpen] = useState<boolean>(false);
  const [newName, setNewName] = useState<string>("");
  const [newType, setNewType] = useState<string>("debit");
  const [newBalance, setNewBalance] = useState<string>("");

  // State Modal Catat Transaksi (Ditambah Fitur Transfer)
  const [isTxModalOpen, setIsTxModalOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [txType, setTxType] = useState<string>("expense"); // expense | income | transfer
  const [txAccountId, setTxAccountId] = useState<string>("");
  const [txDestinationAccountId, setTxDestinationAccountId] =
    useState<string>(""); // Khusus transfer
  const [txCategoryId, setTxCategoryId] = useState<string>("");
  const [txAmount, setTxAmount] = useState<string>("");
  const [txDesc, setTxDesc] = useState<string>("");

  const fetchData = useCallback(async () => {
    try {
      // 1. Cek Sesi Autentikasi
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) setUserEmail(user.email || "Pengguna");
      else {
        router.push("/");
        return;
      }

      // 2. Ambil Akun
      const { data: accData, error: accError } = await supabase
        .from("accounts")
        .select("*")
        .order("created_at", { ascending: true });
      if (accError) throw accError;
      let fetchedAccounts: Account[] = [];
      if (accData) {
        fetchedAccounts = accData;
        setAccounts(accData);
        setTotalBalance(
          accData.reduce((sum, item) => sum + Number(item.current_balance), 0),
        );
        if (accData.length > 0 && !txAccountId) setTxAccountId(accData[0].id);
      }

      // 3. Ambil Kategori & Anggaran
      const { data: catData } = await supabase.from("categories").select("*");
      if (catData) setCategories(catData);
      const { data: budgetData } = await supabase
        .from("budgets")
        .select(`id, category_id, amount_limit, month_year, categories (name)`);
      if (budgetData) setBudgets(budgetData as unknown as Budget[]);

      // 4. Ambil Transaksi & Transfer Mentah
      const { data: txData } = await supabase
        .from("transactions")
        .select(
          `id, amount, description, created_at, categories (id, name, type), accounts (name)`,
        )
        .order("created_at", { ascending: false });
      const { data: tfData } = await supabase
        .from("transfers")
        .select(`*`)
        .order("created_at", { ascending: false });

      if (txData) setTransactions(txData as unknown as Transaction[]);
      if (tfData) setTransfers(tfData as TransferRecord[]);

      // 5. GABUNGKAN RIWAYAT TRANSAKSI & TRANSFER KE DALAM SATU DAFTAR
      const combinedHistory: HistoryItem[] = [];

      if (txData) {
        (txData as unknown as Transaction[]).forEach((tx) => {
          combinedHistory.push({
            id: tx.id,
            amount: tx.amount,
            description: tx.description || tx.categories?.name || "Transaksi",
            created_at: tx.created_at,
            type: tx.categories?.type as "income" | "expense",
            accountName: tx.accounts?.name || "Dompet",
            categoryName: tx.categories?.name || "",
          });
        });
      }

      if (tfData) {
        (tfData as TransferRecord[]).forEach((tf) => {
          // Cari nama akun sumber dan tujuan dari array accounts
          const sourceAcc =
            fetchedAccounts.find((a) => a.id === tf.source_account_id)?.name ||
            "Sumber";
          const destAcc =
            fetchedAccounts.find((a) => a.id === tf.destination_account_id)
              ?.name || "Tujuan";

          combinedHistory.push({
            id: tf.id,
            amount: tf.amount,
            description: tf.description || "Transfer Internal",
            created_at: tf.created_at,
            type: "transfer",
            accountName: `${sourceAcc} → ${destAcc}`,
            categoryName: "Transfer",
          });
        });
      }

      // Urutkan berdasarkan waktu terbaru
      combinedHistory.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
      setHistoryItems(combinedHistory);
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await supabase
        .from("accounts")
        .insert([
          { name: newName, type: newType, current_balance: Number(newBalance) },
        ]);
      setNewName("");
      setNewType("debit");
      setNewBalance("");
      setIsAccountModalOpen(false);
      await fetchData();
    } catch (error) {
      alert("Gagal menambahkan akun.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const numericAmount = Number(txAmount);

      // LOGIKA TRANSFER INTERNAL
      if (txType === "transfer") {
        if (!txAccountId || !txDestinationAccountId) {
          alert("Pilih dompet asal dan tujuan!");
          setIsSubmitting(false);
          return;
        }
        if (txAccountId === txDestinationAccountId) {
          alert("Dompet asal dan tujuan tidak boleh sama!");
          setIsSubmitting(false);
          return;
        }

        // 1. Catat di tabel transfers
        const { error: tfError } = await supabase.from("transfers").insert([
          {
            source_account_id: txAccountId,
            destination_account_id: txDestinationAccountId,
            amount: numericAmount,
            description: txDesc || "Transfer Dana",
          },
        ]);
        if (tfError) throw tfError;

        // 2. Kurangi saldo asal & Tambah saldo tujuan
        const sourceAcc = accounts.find((a) => a.id === txAccountId);
        const destAcc = accounts.find((a) => a.id === txDestinationAccountId);
        if (sourceAcc && destAcc) {
          await supabase
            .from("accounts")
            .update({
              current_balance:
                Number(sourceAcc.current_balance) - numericAmount,
            })
            .eq("id", txAccountId);
          await supabase
            .from("accounts")
            .update({
              current_balance: Number(destAcc.current_balance) + numericAmount,
            })
            .eq("id", txDestinationAccountId);
        }
      }
      // LOGIKA PEMASUKAN & PENGELUARAN BIASA
      else {
        if (!txAccountId || !txCategoryId) {
          alert("Pilih dompet dan kategori!");
          setIsSubmitting(false);
          return;
        }

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
          await supabase
            .from("accounts")
            .update({ current_balance: newBalance })
            .eq("id", txAccountId);
        }
      }

      setTxAmount("");
      setTxDesc("");
      setTxDestinationAccountId("");
      setIsTxModalOpen(false);
      await fetchData();
    } catch (error) {
      console.error(error);
      alert("Gagal mencatat data.");
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
    /* Onboarding UI Tetap */ return (
      <main className="min-h-screen bg-chill-bg flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-lg bg-white/5 backdrop-blur-xl border border-white/10 p-10 rounded-3xl text-center">
          <h1 className="text-3xl font-bold text-white mb-3">
            Langkah Pertama
          </h1>
          <form onSubmit={handleAddAccount} className="space-y-5">
            <input
              type="text"
              required
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-neon-cyan transition-all"
              placeholder="Nama Rekening"
            />
            <input
              type="number"
              required
              value={newBalance}
              onChange={(e) => setNewBalance(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-neon-cyan transition-all"
              placeholder="Saldo Awal"
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 rounded-xl bg-neon-cyan text-chill-bg font-bold text-lg hover:bg-cyan-300"
            >
              {isSubmitting ? "Menyimpan..." : "Mulai Perjalanan"}
            </button>
          </form>
        </div>
      </main>
    );
  }

  const filteredCategories = categories.filter((c) => c.type === txType);

  return (
    <main className="min-h-screen p-8 flex flex-col relative bg-chill-bg">
      <div className="absolute top-[-10%] left-[-5%] w-100 h-100 rounded-full bg-neon-cyan/5 blur-[120px] pointer-events-none z-0"></div>

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

      <div className="w-full max-w-7xl mx-auto flex flex-col lg:flex-row gap-8 items-start">
        {/* PANEL KIRI */}
        <section className="w-full lg:w-1/3 z-10 sticky top-8">
          <div className="p-8 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl">
            <h1 className="text-3xl font-bold mb-2 text-white">
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
                <h2 className="text-4xl font-semibold text-white">
                  {formatRupiah(totalBalance)}
                </h2>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center px-1">
                  <p className="text-xs font-semibold text-slate-400 uppercase">
                    Daftar Akun
                  </p>
                  <button
                    onClick={() => setIsAccountModalOpen(true)}
                    className="text-xs font-medium text-neon-cyan hover:text-cyan-300"
                  >
                    + Tambah
                  </button>
                </div>
                {accounts.map((acc) => (
                  <div
                    key={acc.id}
                    className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/5"
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
                className="w-full py-4 rounded-2xl bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30 hover:bg-neon-cyan/30 font-medium pt-4"
              >
                + Catat Transaksi
              </button>
            </div>
          </div>
        </section>

        {/* PANEL KANAN */}
        <section className="w-full lg:w-2/3 flex flex-col gap-8 z-10">
          <div className="p-8 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-6">
              Analisis Pengeluaran
            </h2>
            <ExpenseChart transactions={transactions} />
          </div>

          <div className="p-8 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-6">
              Target Batas Anggaran Bulan Ini
            </h2>
            <BudgetProgress budgets={budgets} transactions={transactions} />
          </div>

          <div className="p-8 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl flex-1 flex flex-col min-h-100">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl font-bold text-white">
                Riwayat Pergerakan Kas
              </h2>
            </div>
            {historyItems.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center opacity-60">
                <p className="text-slate-300 font-medium">
                  Belum ada pergerakan kas
                </p>
              </div>
            ) : (
              <div className="space-y-4 overflow-y-auto pr-2">
                {historyItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      {/* Indikator Ikon Berdasarkan Tipe */}
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center border 
                        ${
                          item.type === "income"
                            ? "bg-neon-cyan/10 border-neon-cyan/20 text-neon-cyan"
                            : item.type === "expense"
                              ? "bg-neon-coral/10 border-neon-coral/20 text-neon-coral"
                              : "bg-[#818cf8]/10 border-[#818cf8]/20 text-[#818cf8]"
                        }`}
                      >
                        {item.type === "income"
                          ? "↓"
                          : item.type === "expense"
                            ? "↑"
                            : "⇄"}
                      </div>
                      <div>
                        <p className="text-white font-medium">
                          {item.description}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          {item.accountName} •{" "}
                          {new Date(item.created_at).toLocaleDateString(
                            "id-ID",
                            { day: "numeric", month: "short" },
                          )}
                        </p>
                      </div>
                    </div>
                    {/* Format Nominal */}
                    <p
                      className={`font-semibold 
                      ${
                        item.type === "income"
                          ? "text-neon-cyan"
                          : item.type === "expense"
                            ? "text-neon-coral"
                            : "text-[#818cf8]"
                      }`}
                    >
                      {item.type === "income"
                        ? "+"
                        : item.type === "expense"
                          ? "-"
                          : ""}
                      {formatRupiah(item.amount)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* MODAL CATAT TRANSAKSI (3-WAY TOGGLE) */}
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
              {/* Toggle 3 Arah: Pengeluaran, Pemasukan, Transfer */}
              <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setTxType("expense");
                    setTxCategoryId("");
                    setTxDestinationAccountId("");
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
                    setTxDestinationAccountId("");
                  }}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${txType === "income" ? "bg-neon-cyan text-chill-bg shadow-md" : "text-slate-400 hover:text-white"}`}
                >
                  Pemasukan
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTxType("transfer");
                    setTxCategoryId("");
                  }}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${txType === "transfer" ? "bg-[#818cf8] text-white shadow-md" : "text-slate-400 hover:text-white"}`}
                >
                  Transfer
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">
                  {txType === "transfer"
                    ? "Dari Dompet (Sumber)"
                    : "Pilih Dompet"}
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

              {/* Tampilkan Pilihan Dompet Tujuan JIKA tipe adalah Transfer */}
              {txType === "transfer" ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">
                    Ke Dompet (Tujuan)
                  </label>
                  <select
                    required
                    value={txDestinationAccountId}
                    onChange={(e) => setTxDestinationAccountId(e.target.value)}
                    className="w-full bg-chill-bg border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#818cf8] appearance-none"
                  >
                    <option value="" disabled>
                      Pilih dompet tujuan...
                    </option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                /* Tampilkan Kategori JIKA tipe BUKAN Transfer */
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
              )}

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
                  placeholder="Misal: Pindah dana darurat"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-4 rounded-xl font-bold text-md transition-all mt-4 
                ${
                  txType === "income"
                    ? "bg-neon-cyan text-chill-bg hover:bg-cyan-300"
                    : txType === "expense"
                      ? "bg-neon-coral text-white hover:bg-rose-400"
                      : "bg-[#818cf8] text-white hover:bg-indigo-400"
                } disabled:opacity-50`}
              >
                {isSubmitting
                  ? "Menyimpan..."
                  : txType === "transfer"
                    ? "Proses Transfer"
                    : "Simpan Transaksi"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL TAMBAH AKUN (Disembunyikan kodenya untuk keterbacaan, logikanya tetap aktif di state) */}
      {isAccountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          {/* ... UI Modal Tambah Akun (Sama persis seperti sebelumnya) ... */}
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
