"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import ExpenseChart from "../components/ExpenseChart";
import BudgetProgress from "../components/BudgetProgress";
import FinancialGoals from "../components/FinancialGoals";
import SubscriptionRadar from "../components/SubscriptionRadar";

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
interface Goal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  icon: string | null;
  deadline: string | null;
}
interface Subscription {
  id: string;
  name: string;
  amount: number;
  billing_date: number;
  status: string;
}

export interface Transaction {
  id: string;
  amount: number;
  description: string;
  created_at: string;
  categories: { id?: string; name: string; type: string } | null;
  accounts: { name: string } | null;
}
interface TransferRecord {
  id: string;
  amount: number;
  description: string;
  created_at: string;
  source_account_id: string;
  destination_account_id: string;
}
interface HistoryItem {
  id: string;
  amount: number;
  description: string;
  created_at: string;
  type: "income" | "expense" | "transfer" | "goal_topup";
  accountName: string;
  categoryName: string;
}

export default function DashboardPage() {
  const router = useRouter();

  const [userEmail, setUserEmail] = useState<string>("Memuat...");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [totalBalance, setTotalBalance] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // States untuk berbagai Modal
  const [isAccountModalOpen, setIsAccountModalOpen] = useState<boolean>(false);
  const [newName, setNewName] = useState<string>("");
  const [newType, setNewType] = useState<string>("debit");
  const [newBalance, setNewBalance] = useState<string>("");

  const [isTxModalOpen, setIsTxModalOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [txType, setTxType] = useState<string>("expense");
  const [txAccountId, setTxAccountId] = useState<string>("");
  const [txDestinationAccountId, setTxDestinationAccountId] =
    useState<string>("");
  const [txCategoryId, setTxCategoryId] = useState<string>("");
  const [txAmount, setTxAmount] = useState<string>("");
  const [txDesc, setTxDesc] = useState<string>("");

  // STATE MODAL BARU: Isi Saldo Target
  const [isGoalModalOpen, setIsGoalModalOpen] = useState<boolean>(false);
  const [selectedGoalId, setSelectedGoalId] = useState<string>("");
  const [selectedGoalName, setSelectedGoalName] = useState<string>("");
  const [goalTopUpAmount, setGoalTopUpAmount] = useState<string>("");

  const fetchData = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) setUserEmail(user.email || "Pengguna");
      else {
        router.push("/");
        return;
      }

      const { data: accData } = await supabase
        .from("accounts")
        .select("*")
        .order("created_at", { ascending: true });
      let fetchedAccounts: Account[] = [];
      if (accData) {
        fetchedAccounts = accData;
        setAccounts(accData);
        setTotalBalance(
          accData.reduce((sum, item) => sum + Number(item.current_balance), 0),
        );
        if (accData.length > 0 && !txAccountId) setTxAccountId(accData[0].id);
      }

      const { data: catData } = await supabase.from("categories").select("*");
      if (catData) setCategories(catData);

      const { data: budgetData } = await supabase
        .from("budgets")
        .select(`id, category_id, amount_limit, month_year, categories (name)`);
      if (budgetData) setBudgets(budgetData as unknown as Budget[]);

      const { data: goalData } = await supabase
        .from("goals")
        .select("*")
        .order("created_at", { ascending: true });
      if (goalData) setGoals(goalData as Goal[]);

      const { data: subData } = await supabase
        .from("subscriptions")
        .select("*")
        .order("billing_date", { ascending: true });
      if (subData) setSubscriptions(subData as Subscription[]);

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

      const combinedHistory: HistoryItem[] = [];
      if (txData) {
        setTransactions(txData as unknown as Transaction[]);
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

      combinedHistory.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
      setHistoryItems(combinedHistory);
    } catch (error) {
      console.error("Gagal:", error);
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

  // FUNGSI BARU: Proses Isi Saldo Target
  const handleTopUpGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const numericAmount = Number(goalTopUpAmount);
      if (!txAccountId) {
        alert("Pilih dompet sumber dana!");
        setIsSubmitting(false);
        return;
      }

      // 1. Cek & Kurangi saldo rekening utama
      const sourceAcc = accounts.find((a) => a.id === txAccountId);
      if (sourceAcc) {
        if (Number(sourceAcc.current_balance) < numericAmount) {
          alert("Saldo dompet tidak mencukupi untuk top-up ini!");
          setIsSubmitting(false);
          return;
        }
        await supabase
          .from("accounts")
          .update({
            current_balance: Number(sourceAcc.current_balance) - numericAmount,
          })
          .eq("id", txAccountId);
      }

      // 2. Tambah saldo di tabel goals
      const targetGoal = goals.find((g) => g.id === selectedGoalId);
      if (targetGoal) {
        await supabase
          .from("goals")
          .update({
            current_amount: Number(targetGoal.current_amount) + numericAmount,
          })
          .eq("id", selectedGoalId);
      }

      // Reset form dan ambil data terbaru
      setGoalTopUpAmount("");
      setIsGoalModalOpen(false);
      await fetchData();
    } catch (error) {
      console.error(error);
      alert("Gagal mengisi saldo target.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddAccount = async (e: React.FormEvent) => {
    /* ... Sama ... */
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
      console.error(error);
      alert("Gagal menambahkan akun.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    /* ... Sama ... */
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const numericAmount = Number(txAmount);
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
        await supabase
          .from("transfers")
          .insert([
            {
              source_account_id: txAccountId,
              destination_account_id: txDestinationAccountId,
              amount: numericAmount,
              description: txDesc || "Transfer Dana",
            },
          ]);
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
      } else {
        if (!txAccountId || !txCategoryId) {
          alert("Pilih dompet dan kategori!");
          setIsSubmitting(false);
          return;
        }
        await supabase
          .from("transactions")
          .insert([
            {
              account_id: txAccountId,
              category_id: txCategoryId,
              amount: numericAmount,
              description: txDesc,
            },
          ]);
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
    return (
      <main className="min-h-screen bg-chill-bg flex items-center justify-center p-6">
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
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-neon-cyan"
              placeholder="Nama Rekening"
            />
            <input
              type="number"
              required
              value={newBalance}
              onChange={(e) => setNewBalance(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-neon-cyan"
              placeholder="Saldo Awal"
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 rounded-xl bg-neon-cyan text-chill-bg font-bold"
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
          className="px-6 py-2 rounded-xl border border-neon-coral/30 text-neon-coral hover:bg-neon-coral/10 text-sm font-medium"
        >
          Keluar
        </button>
      </header>

      <div className="w-full max-w-7xl mx-auto flex flex-col lg:flex-row gap-8 items-start">
        <section className="w-full lg:w-1/3 z-10 sticky top-8 flex flex-col gap-6">
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
                    className="text-xs font-medium text-neon-cyan"
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
                className="w-full py-4 rounded-2xl bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30 font-medium pt-4"
              >
                + Catat Transaksi
              </button>
            </div>
          </div>
          <div className="p-8 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-6">
              Radar Tagihan Berulang
            </h2>
            <SubscriptionRadar subscriptions={subscriptions} />
          </div>
        </section>

        <section className="w-full lg:w-2/3 flex flex-col gap-8 z-10">
          <div className="p-8 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-6">
              Analisis Pengeluaran
            </h2>
            <ExpenseChart transactions={transactions} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="p-8 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl">
              <h2 className="text-lg font-bold text-white mb-6">
                Batas Anggaran
              </h2>
              <BudgetProgress budgets={budgets} transactions={transactions} />
            </div>
            <div className="p-8 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl">
              <h2 className="text-lg font-bold text-white mb-6">
                Target Finansial
              </h2>
              {/* PENYAMBUNGAN PROPS MODAL KE KOMPONEN */}
              <FinancialGoals
                goals={goals}
                onOpenTopUp={(id, name) => {
                  setSelectedGoalId(id);
                  setSelectedGoalName(name);
                  setIsGoalModalOpen(true);
                }}
              />
            </div>
          </div>

          <div className="p-8 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl flex-1 flex flex-col min-h-100">
            <h2 className="text-xl font-bold text-white mb-8">
              Riwayat Pergerakan Kas
            </h2>
            {historyItems.length === 0 ? (
              <div className="flex-1 flex items-center justify-center opacity-60">
                <p className="text-slate-300">Belum ada pergerakan kas</p>
              </div>
            ) : (
              <div className="space-y-4 overflow-y-auto pr-2">
                {historyItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center border ${item.type === "income" ? "bg-neon-cyan/10 border-neon-cyan/20 text-neon-cyan" : item.type === "expense" ? "bg-neon-coral/10 border-neon-coral/20 text-neon-coral" : "bg-[#818cf8]/10 border-[#818cf8]/20 text-[#818cf8]"}`}
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
                    <p
                      className={`font-semibold ${item.type === "income" ? "text-neon-cyan" : item.type === "expense" ? "text-neon-coral" : "text-[#818cf8]"}`}
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

      {/* MODAL ISI SALDO TARGET BARU */}
      {isGoalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-chill-bg border border-white/10 rounded-3xl p-8 shadow-2xl relative">
            <button
              onClick={() => setIsGoalModalOpen(false)}
              className="absolute top-6 right-6 text-slate-400 hover:text-white"
            >
              ✕
            </button>
            <h2 className="text-2xl font-bold text-white mb-2">
              Isi Saldo Target
            </h2>
            <p className="text-indigo-400 font-medium mb-6">
              {selectedGoalName}
            </p>

            <form onSubmit={handleTopUpGoal} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase">
                  Ambil dari Dompet
                </label>
                <select
                  required
                  value={txAccountId}
                  onChange={(e) => setTxAccountId(e.target.value)}
                  className="w-full bg-chill-bg border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 appearance-none"
                >
                  <option value="" disabled>
                    Pilih sumber dana...
                  </option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({formatRupiah(a.current_balance)})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase">
                  Nominal Disisihkan (Rp)
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={goalTopUpAmount}
                  onChange={(e) => setGoalTopUpAmount(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                  placeholder="Misal: 50000"
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 rounded-xl font-bold mt-4 bg-indigo-500 text-white hover:bg-indigo-400 transition-all disabled:opacity-50"
              >
                {isSubmitting ? "Memproses..." : "Tambahkan ke Tabungan"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL TRANSAKSI TETAP SAMA */}
      {isTxModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-chill-bg border border-white/10 rounded-3xl p-8 shadow-2xl relative">
            <button
              onClick={() => setIsTxModalOpen(false)}
              className="absolute top-6 right-6 text-slate-400 hover:text-white"
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
                    setTxDestinationAccountId("");
                  }}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${txType === "expense" ? "bg-neon-coral text-white" : "text-slate-400"}`}
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
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${txType === "income" ? "bg-neon-cyan text-chill-bg" : "text-slate-400"}`}
                >
                  Pemasukan
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTxType("transfer");
                    setTxCategoryId("");
                  }}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${txType === "transfer" ? "bg-[#818cf8] text-white" : "text-slate-400"}`}
                >
                  Transfer
                </button>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2">
                  {txType === "transfer" ? "Dari Dompet" : "Pilih Dompet"}
                </label>
                <select
                  required
                  value={txAccountId}
                  onChange={(e) => setTxAccountId(e.target.value)}
                  className="w-full bg-chill-bg border border-white/10 rounded-xl px-4 py-3 text-white"
                >
                  <option value="" disabled>
                    Pilih dompet...
                  </option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
              {txType === "transfer" ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-2">
                    Ke Dompet
                  </label>
                  <select
                    required
                    value={txDestinationAccountId}
                    onChange={(e) => setTxDestinationAccountId(e.target.value)}
                    className="w-full bg-chill-bg border border-white/10 rounded-xl px-4 py-3 text-white"
                  >
                    <option value="" disabled>
                      Pilih dompet...
                    </option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-2">
                    Kategori
                  </label>
                  <select
                    required
                    value={txCategoryId}
                    onChange={(e) => setTxCategoryId(e.target.value)}
                    className="w-full bg-chill-bg border border-white/10 rounded-xl px-4 py-3 text-white"
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
                <label className="block text-xs font-semibold text-slate-400 mb-2">
                  Nominal (Rp)
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={txAmount}
                  onChange={(e) => setTxAmount(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2">
                  Catatan
                </label>
                <input
                  type="text"
                  value={txDesc}
                  onChange={(e) => setTxDesc(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white"
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-4 rounded-xl font-bold mt-4 ${txType === "income" ? "bg-neon-cyan text-chill-bg" : txType === "expense" ? "bg-neon-coral text-white" : "bg-[#818cf8] text-white"} disabled:opacity-50`}
              >
                {isSubmitting ? "Menyimpan..." : "Simpan"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL TAMBAH AKUN TETAP SAMA */}
      {isAccountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-chill-bg border border-white/10 rounded-3xl p-8 shadow-2xl relative">
            <button
              onClick={() => setIsAccountModalOpen(false)}
              className="absolute top-6 right-6 text-slate-400"
            >
              ✕
            </button>
            <h2 className="text-2xl font-bold text-white mb-6">
              Tambah Rekening Baru
            </h2>
            <form onSubmit={handleAddAccount} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2">
                  Nama Rekening
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2">
                  Tipe
                </label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  className="w-full bg-chill-bg border border-white/10 rounded-xl px-4 py-3 text-white"
                >
                  <option value="debit">Debit / Bank</option>
                  <option value="e-wallet">E-Wallet</option>
                  <option value="cash">Tunai</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2">
                  Saldo Awal
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={newBalance}
                  onChange={(e) => setNewBalance(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white"
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 rounded-xl bg-neon-cyan text-chill-bg font-bold mt-4 disabled:opacity-50"
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
