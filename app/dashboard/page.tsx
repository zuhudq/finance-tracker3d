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
  workspace: string;
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
  workspace?: string;
}

interface ToastMessage {
  title: string;
  message: string;
  type: "success" | "error";
}

// ─── Shared style tokens ────────────────────────────────────────────────────
const BG = "#0a0906";
const SURFACE = "#0f0d0a";
const SURFACE2 = "#141210";
const BORDER = "rgba(255,255,255,0.05)";
const GOLD = "#c8a86b";
const GOLD_MUTED = "#8a6a30";
const TEXT_PRIMARY = "#e8ddd0";
const TEXT_SECONDARY = "#a89880";
const TEXT_MUTED = "#6b6058";
const CORAL = "#e8735a";
const EMERALD = "#10b981";

// ─── Input / Select shared className ────────────────────────────────────────
const inputCls =
  "w-full rounded-xl px-4 py-3 text-[13px] text-[#e8ddd0] placeholder-[#4a4238] outline-none transition-all duration-150 focus:ring-0";
const inputStyle = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.07)",
};
const inputFocusStyle = {
  borderColor: "rgba(200,168,107,0.3)",
  boxShadow: "0 0 0 3px rgba(200,168,107,0.05)",
};

function GoldInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      {...props}
      className={inputCls + " " + (props.className || "")}
      style={{
        ...inputStyle,
        ...(focused ? inputFocusStyle : {}),
        ...props.style,
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  );
}

function GoldSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const [focused, setFocused] = useState(false);
  return (
    <select
      {...props}
      className={
        inputCls + " appearance-none cursor-pointer " + (props.className || "")
      }
      style={{
        ...inputStyle,
        ...(focused ? inputFocusStyle : {}),
        background: SURFACE2,
        ...props.style,
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label
      className="block text-[10px] font-semibold uppercase tracking-[0.12em] mb-2"
      style={{ color: TEXT_MUTED }}
    >
      {children}
    </label>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 mb-5">
      <div className="w-0.5 h-4 rounded-full" style={{ background: GOLD }} />
      <h2
        className="text-[13px] font-semibold tracking-[0.06em] uppercase"
        style={{ color: TEXT_MUTED }}
      >
        {children}
      </h2>
    </div>
  );
}

function Card({
  children,
  className = "",
  style = {},
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`rounded-2xl ${className}`}
      style={{ background: SURFACE, border: `1px solid ${BORDER}`, ...style }}
    >
      {children}
    </div>
  );
}

function Modal({
  onClose,
  children,
  maxWidth = "max-w-md",
}: {
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`w-full ${maxWidth} rounded-2xl p-7 relative animate-[fadeIn_0.3s_ease-out]`}
        style={{
          background: "#100e0b",
          border: `1px solid rgba(255,255,255,0.08)`,
          boxShadow: "0 32px 80px rgba(0,0,0,0.8)",
        }}
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-7 h-7 rounded-full flex items-center justify-center text-[12px] transition-all hover:bg-white/10"
          style={{
            color: TEXT_MUTED,
            background: "rgba(255,255,255,0.04)",
            border: BORDER,
          }}
        >
          ✕
        </button>
        {children}
      </div>
    </div>
  );
}

const typeLabel: Record<string, string> = {
  debit: "Bank",
  "e-wallet": "E-Wallet",
  cash: "Tunai",
};

export default function DashboardPage() {
  const router = useRouter();

  const [activeWorkspace, setActiveWorkspace] = useState<
    "personal" | "business"
  >("personal");
  const [showBizTutorial, setShowBizTutorial] = useState<boolean>(false);

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

  const [isAccountModalOpen, setIsAccountModalOpen] = useState<boolean>(false);
  const [newName, setNewName] = useState<string>("");
  const [newType, setNewType] = useState<string>("debit");
  const [newBalance, setNewBalance] = useState<string>("");

  const [isTxModalOpen, setIsTxModalOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isScanning, setIsScanning] = useState<boolean>(false);

  // STATE BARU UNTUK AI ADVISOR
  const [isAiModalOpen, setIsAiModalOpen] = useState<boolean>(false);
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [aiResponse, setAiResponse] = useState<{
    roast: string;
    insight: string;
  } | null>(null);

  const [txType, setTxType] = useState<string>("expense");
  const [txAccountId, setTxAccountId] = useState<string>("");
  const [txDestinationAccountId, setTxDestinationAccountId] =
    useState<string>("");
  const [txCategoryId, setTxCategoryId] = useState<string>("");
  const [txAmount, setTxAmount] = useState<string>("");
  const [txDesc, setTxDesc] = useState<string>("");

  const [isGoalModalOpen, setIsGoalModalOpen] = useState<boolean>(false);
  const [selectedGoalId, setSelectedGoalId] = useState<string>("");
  const [selectedGoalName, setSelectedGoalName] = useState<string>("");
  const [goalTopUpAmount, setGoalTopUpAmount] = useState<string>("");

  const [toast, setToast] = useState<ToastMessage | null>(null);

  const showToast = (
    title: string,
    message: string,
    type: "success" | "error" = "success",
  ) => {
    setToast({ title, message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleSwitchWorkspace = (mode: "personal" | "business") => {
    if (mode === "business") {
      const hasSeenTutorial = localStorage.getItem("hasSeenBizTutorial");
      if (!hasSeenTutorial) {
        setShowBizTutorial(true);
      }
    }
    setActiveWorkspace(mode);
  };

  const closeBizTutorial = () => {
    localStorage.setItem("hasSeenBizTutorial", "true");
    setShowBizTutorial(false);
  };

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
          `id, amount, description, created_at, workspace, categories (id, name, type), accounts (name)`,
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
            workspace: tx.workspace || "personal",
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

  // FUNGSI BARU UNTUK MENGHUBUNGI AI ADVISOR
  const handleAskAI = async () => {
    const activeTransactions = transactions.filter(
      (tx) => tx.workspace === activeWorkspace,
    );

    if (activeTransactions.length === 0) {
      showToast(
        "Data Kosong",
        "Belum ada transaksi untuk dianalisis oleh AI.",
        "error",
      );
      return;
    }

    setIsAiModalOpen(true);
    setIsAiLoading(true);
    setAiResponse(null);

    try {
      // Menyederhanakan data agar ringan dikirim ke Google API
      const simplifiedTx = activeTransactions.map((tx) => ({
        amount: tx.amount,
        desc: tx.description,
        type: tx.categories?.type,
        date: new Date(tx.created_at).toLocaleDateString("id-ID"),
      }));

      const userName = userEmail.split("@")[0]; // Ambil nama depan dari email

      const response = await fetch("/api/ai-advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactions: simplifiedTx, userName }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal menghubungi AI.");

      setAiResponse(data);
    } catch (error: unknown) {
      console.error(error);
      const errorMessage =
        error instanceof Error ? error.message : "AI sedang error.";
      showToast("Gagal", errorMessage, "error");
      setIsAiModalOpen(false);
    } finally {
      setIsAiLoading(false);
    }
  };

  const compressImage = (
    file: File,
  ): Promise<{ base64: string; mimeType: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 800;
          const scaleSize = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scaleSize;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
          const base64Data = canvas.toDataURL("image/jpeg", 0.7);
          const base64String = base64Data.split(",")[1];
          resolve({ base64: base64String, mimeType: "image/jpeg" });
        };
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleScanReceipt = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    try {
      const { base64, mimeType } = await compressImage(file);
      const response = await fetch("/api/scan-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mimeType }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal memindai struk");

      if (data.amount && data.amount > 0) {
        const finalAmount = Number(data.amount);
        const finalDesc = data.description || "Auto-scan Transaksi";
        const finalAccId =
          txAccountId || (accounts.length > 0 ? accounts[0].id : "");
        const expenseCategories = categories.filter(
          (c) => c.type === "expense",
        );
        const finalCatId =
          txCategoryId ||
          (expenseCategories.length > 0 ? expenseCategories[0].id : "");

        if (!finalAccId || !finalCatId) {
          showToast(
            "Data Tidak Lengkap",
            "Buat dompet & kategori terlebih dahulu.",
            "error",
          );
          return;
        }

        const { error: txError } = await supabase
          .from("transactions")
          .insert([
            {
              account_id: finalAccId,
              category_id: finalCatId,
              amount: finalAmount,
              description: finalDesc,
              workspace: activeWorkspace,
            },
          ]);

        if (txError) throw txError;

        const selectedAccount = accounts.find((a) => a.id === finalAccId);
        if (selectedAccount) {
          const newBal = Number(selectedAccount.current_balance) - finalAmount;
          await supabase
            .from("accounts")
            .update({ current_balance: newBal })
            .eq("id", finalAccId);
        }

        setTxAmount("");
        setTxDesc("");
        setIsTxModalOpen(false);
        await fetchData();
        showToast(
          "Auto-Scan Berhasil",
          "Data transaksi dari struk telah dicatat secara otomatis.",
          "success",
        );
      } else {
        showToast(
          "Gagal Membaca",
          "Struk tidak dikenali atau nominal kosong.",
          "error",
        );
      }
    } catch (error: unknown) {
      console.error(error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan tidak dikenal";
      showToast("Error Sistem", errorMessage, "error");
    } finally {
      setIsScanning(false);
      e.target.value = "";
    }
  };

  const handleTopUpGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const numericAmount = Number(goalTopUpAmount);
      if (!txAccountId) {
        showToast("Peringatan", "Pilih dompet sumber dana!", "error");
        setIsSubmitting(false);
        return;
      }
      const sourceAcc = accounts.find((a) => a.id === txAccountId);
      if (sourceAcc) {
        if (Number(sourceAcc.current_balance) < numericAmount) {
          showToast("Gagal", "Saldo dompet tidak mencukupi!", "error");
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
      const targetGoal = goals.find((g) => g.id === selectedGoalId);
      if (targetGoal) {
        await supabase
          .from("goals")
          .update({
            current_amount: Number(targetGoal.current_amount) + numericAmount,
          })
          .eq("id", selectedGoalId);
      }
      setGoalTopUpAmount("");
      setIsGoalModalOpen(false);
      await fetchData();
      showToast(
        "Alokasi Berhasil",
        "Dana telah ditambahkan ke target finansialmu.",
        "success",
      );
    } catch (error) {
      console.error(error);
      showToast("Gagal", "Sistem gagal mengisi saldo target.", "error");
    } finally {
      setIsSubmitting(false);
    }
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
      showToast("Dompet Baru", "Rekening berhasil ditambahkan.", "success");
    } catch (error) {
      console.error(error);
      showToast("Gagal", "Sistem gagal menambahkan akun.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const numericAmount = Number(txAmount);
      if (txType === "transfer") {
        if (!txAccountId || !txDestinationAccountId) {
          showToast("Peringatan", "Pilih dompet asal dan tujuan!", "error");
          setIsSubmitting(false);
          return;
        }
        if (txAccountId === txDestinationAccountId) {
          showToast(
            "Peringatan",
            "Dompet asal dan tujuan tidak boleh sama!",
            "error",
          );
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
          showToast("Peringatan", "Pilih dompet dan kategori!", "error");
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
              workspace: activeWorkspace,
            },
          ]);
        const selectedAccount = accounts.find((a) => a.id === txAccountId);
        if (selectedAccount) {
          const newBal =
            txType === "income"
              ? Number(selectedAccount.current_balance) + numericAmount
              : Number(selectedAccount.current_balance) - numericAmount;
          await supabase
            .from("accounts")
            .update({ current_balance: newBal })
            .eq("id", txAccountId);
        }
      }
      setTxAmount("");
      setTxDesc("");
      setTxDestinationAccountId("");
      setIsTxModalOpen(false);
      await fetchData();
      showToast(
        "Transaksi Tercatat",
        "Data pergerakan kas telah diperbarui.",
        "success",
      );
    } catch (error) {
      console.error(error);
      showToast("Gagal", "Sistem gagal mencatat data.", "error");
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
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: BG }}
      >
        <div
          className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: `${GOLD} transparent ${GOLD} ${GOLD}` }}
        />
      </div>
    );
  if (accounts.length === 0) {
    return (
      <main
        className="min-h-screen flex items-center justify-center p-6"
        style={{ background: BG }}
      >
        <div
          className="w-full max-w-md rounded-2xl p-8"
          style={{
            background: SURFACE,
            border: `1px solid ${BORDER}`,
            boxShadow: "0 40px 100px rgba(0,0,0,0.6)",
          }}
        >
          <div className="mb-8">
            <p
              className="text-[10px] font-semibold uppercase tracking-[0.15em] mb-3"
              style={{ color: GOLD }}
            >
              Langkah Pertama
            </p>
            <h1 className="text-2xl font-bold" style={{ color: TEXT_PRIMARY }}>
              Tambah Rekening
            </h1>
            <p className="text-[13px] mt-1" style={{ color: TEXT_MUTED }}>
              Mulai pantau keuanganmu dari sini.
            </p>
          </div>
          <form onSubmit={handleAddAccount} className="space-y-4">
            <div>
              <FieldLabel>Nama Rekening</FieldLabel>
              <GoldInput
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="cth. BCA Utama"
              />
            </div>
            <div>
              <FieldLabel>Saldo Awal</FieldLabel>
              <GoldInput
                type="number"
                required
                value={newBalance}
                onChange={(e) => setNewBalance(e.target.value)}
                placeholder="0"
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-xl text-[13px] font-semibold mt-2 transition-all"
              style={{
                background: `linear-gradient(135deg, ${GOLD_MUTED}, ${GOLD})`,
                color: "#0a0906",
                opacity: isSubmitting ? 0.6 : 1,
              }}
            >
              {isSubmitting ? "Menyimpan..." : "Mulai Perjalanan"}
            </button>
          </form>
        </div>
      </main>
    );
  }

  const activeTransactions = transactions.filter(
    (tx) => tx.workspace === activeWorkspace,
  );
  const activeHistoryItems = historyItems.filter(
    (item) => item.type === "transfer" || item.workspace === activeWorkspace,
  );

  const bizIncome = activeTransactions
    .filter((tx) => tx.categories?.type === "income")
    .reduce((sum, tx) => sum + tx.amount, 0);
  const bizExpense = activeTransactions
    .filter((tx) => tx.categories?.type === "expense")
    .reduce((sum, tx) => sum + tx.amount, 0);
  const netProfit = bizIncome - bizExpense;
  const profitMargin =
    bizIncome > 0 ? Math.round((netProfit / bizIncome) * 100) : 0;

  return (
    <main
      className="min-h-screen relative"
      style={{ background: BG, color: TEXT_PRIMARY }}
    >
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 20% 0%, rgba(200,168,107,0.04) 0%, transparent 70%), radial-gradient(ellipse 40% 40% at 80% 100%, rgba(232,115,90,0.03) 0%, transparent 70%)",
        }}
      />

      {toast && (
        <div
          className="fixed bottom-6 right-6 z-100 flex items-center gap-3.5 px-5 py-3.5 rounded-2xl"
          style={{
            background: "rgba(12,10,8,0.95)",
            border: `1px solid ${toast.type === "success" ? "rgba(200,168,107,0.2)" : "rgba(232,115,90,0.2)"}`,
            boxShadow: "0 20px 60px rgba(0,0,0,0.7)",
            backdropFilter: "blur(20px)",
          }}
        >
          <div
            className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-[12px]"
            style={{
              background:
                toast.type === "success"
                  ? "rgba(200,168,107,0.1)"
                  : "rgba(232,115,90,0.1)",
              color: toast.type === "success" ? GOLD : CORAL,
              border: `1px solid ${toast.type === "success" ? "rgba(200,168,107,0.2)" : "rgba(232,115,90,0.2)"}`,
            }}
          >
            {toast.type === "success" ? "✓" : "✕"}
          </div>
          <div>
            <p
              className="text-[13px] font-semibold"
              style={{ color: TEXT_PRIMARY }}
            >
              {toast.title}
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: TEXT_MUTED }}>
              {toast.message}
            </p>
          </div>
        </div>
      )}

      {showBizTutorial && (
        <Modal onClose={closeBizTutorial} maxWidth="max-w-lg">
          <div className="text-center mb-6">
            <div
              className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center text-3xl mb-4 shadow-[0_0_30px_rgba(200,168,107,0.2)]"
              style={{
                background: `linear-gradient(135deg, ${GOLD_MUTED}, ${GOLD})`,
              }}
            >
              🚀
            </div>
            <h2
              className="text-2xl font-bold tracking-tight mb-2"
              style={{ color: TEXT_PRIMARY }}
            >
              Selamat Datang di Mode Bisnis
            </h2>
            <p
              className="text-[13px] leading-relaxed"
              style={{ color: TEXT_MUTED }}
            >
              Pantau arus kas proyek sampingan atau usahamu secara terpisah.
              Mulai dari margin profit hingga beban operasional, semuanya
              terekam jelas.
            </p>
          </div>
          <div className="space-y-4 mb-8">
            <div className="flex gap-4 items-start p-4 rounded-xl bg-white/5 border border-white/5">
              <span className="text-xl shrink-0">💼</span>
              <div>
                <h4
                  className="text-[13px] font-semibold mb-1"
                  style={{ color: TEXT_PRIMARY }}
                >
                  Pemisahan Buku Kas
                </h4>
                <p className="text-[11px]" style={{ color: TEXT_MUTED }}>
                  Transaksi bisnis tidak akan merusak grafik pengeluaran pribadi
                  atau uang jajanmu.
                </p>
              </div>
            </div>
            <div className="flex gap-4 items-start p-4 rounded-xl bg-white/5 border border-white/5">
              <span className="text-xl shrink-0">📊</span>
              <div>
                <h4
                  className="text-[13px] font-semibold mb-1"
                  style={{ color: TEXT_PRIMARY }}
                >
                  Dashboard Laba Rugi
                </h4>
                <p className="text-[11px]" style={{ color: TEXT_MUTED }}>
                  Tinggalkan &apos;Batas Anggaran&apos;. Mode bisnis fokus
                  melacak total Omzet, Beban, dan Laba Bersih harian.
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={closeBizTutorial}
            className="w-full py-4 rounded-xl text-[13px] font-bold tracking-wide hover:opacity-90 transition-all"
            style={{
              background: `linear-gradient(135deg, ${GOLD_MUTED}, ${GOLD})`,
              color: "#0a0906",
            }}
          >
            Mengerti, Mulai Berbisnis
          </button>
        </Modal>
      )}

      <div className="relative z-10 max-w-350 mx-auto px-5 py-5 lg:px-8 lg:py-6">
        <header className="flex justify-between items-center mb-7">
          <div className="flex items-center gap-4">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center text-[11px] font-bold"
              style={{
                background: `linear-gradient(135deg, ${GOLD_MUTED}, ${GOLD})`,
                color: "#0a0906",
              }}
            >
              ₹
            </div>
            <div
              className="hidden sm:flex p-1 rounded-xl ml-4"
              style={{ background: SURFACE2, border: `1px solid ${BORDER}` }}
            >
              <button
                onClick={() => handleSwitchWorkspace("personal")}
                className="px-5 py-1.5 rounded-lg text-[11px] font-semibold tracking-wide transition-all duration-300"
                style={{
                  background:
                    activeWorkspace === "personal"
                      ? "rgba(255,255,255,0.05)"
                      : "transparent",
                  color: activeWorkspace === "personal" ? GOLD : TEXT_MUTED,
                  boxShadow:
                    activeWorkspace === "personal"
                      ? "0 2px 8px rgba(0,0,0,0.2)"
                      : "none",
                }}
              >
                💼 Pribadi
              </button>
              <button
                onClick={() => handleSwitchWorkspace("business")}
                className="px-5 py-1.5 rounded-lg text-[11px] font-semibold tracking-wide transition-all duration-300"
                style={{
                  background:
                    activeWorkspace === "business"
                      ? "rgba(255,255,255,0.05)"
                      : "transparent",
                  color: activeWorkspace === "business" ? GOLD : TEXT_MUTED,
                  boxShadow:
                    activeWorkspace === "business"
                      ? "0 2px 8px rgba(0,0,0,0.2)"
                      : "none",
                }}
              >
                🚀 Bisnis
              </button>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <p
              className="text-[12px] font-medium hidden md:block"
              style={{ color: TEXT_MUTED }}
            >
              {userEmail}
            </p>
            <button
              onClick={handleLogout}
              className="px-4 py-2 rounded-xl text-[12px] font-medium transition-all hover:bg-white/5"
              style={{
                color: TEXT_MUTED,
                background: "rgba(255,255,255,0.03)",
                border: `1px solid ${BORDER}`,
              }}
            >
              Keluar
            </button>
          </div>
        </header>

        <div
          className="flex sm:hidden mb-6 p-1 rounded-xl w-full"
          style={{ background: SURFACE2, border: `1px solid ${BORDER}` }}
        >
          <button
            onClick={() => handleSwitchWorkspace("personal")}
            className="flex-1 py-2 rounded-lg text-[11px] font-semibold tracking-wide transition-all"
            style={{
              background:
                activeWorkspace === "personal"
                  ? "rgba(255,255,255,0.05)"
                  : "transparent",
              color: activeWorkspace === "personal" ? GOLD : TEXT_MUTED,
            }}
          >
            💼 Pribadi
          </button>
          <button
            onClick={() => handleSwitchWorkspace("business")}
            className="flex-1 py-2 rounded-lg text-[11px] font-semibold tracking-wide transition-all"
            style={{
              background:
                activeWorkspace === "business"
                  ? "rgba(255,255,255,0.05)"
                  : "transparent",
              color: activeWorkspace === "business" ? GOLD : TEXT_MUTED,
            }}
          >
            🚀 Bisnis
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-5 items-start">
          <aside className="w-full lg:w-[320px] shrink-0 flex flex-col gap-4 lg:sticky lg:top-6">
            <Card
              className="p-6 relative overflow-hidden"
              style={{ background: SURFACE }}
            >
              <div
                className="absolute inset-0 opacity-20 transition-all duration-700 pointer-events-none"
                style={{
                  background:
                    activeWorkspace === "business"
                      ? "linear-gradient(135deg, rgba(200,168,107,0.2) 0%, transparent 100%)"
                      : "transparent",
                }}
              />

              <div className="relative z-10">
                <p
                  className="text-[10px] font-semibold uppercase tracking-[0.14em] mb-1.5"
                  style={{ color: TEXT_MUTED }}
                >
                  Total Saldo{" "}
                  {activeWorkspace === "business" ? "Bisnis" : "Pribadi"}
                </p>
                <h2
                  className="text-3xl font-bold tracking-tight mb-0.5 tabular-nums"
                  style={{ color: TEXT_PRIMARY }}
                >
                  {formatRupiah(totalBalance)}
                </h2>
                <p className="text-[11px]" style={{ color: TEXT_MUTED }}>
                  {accounts.length} rekening terkonsolidasi
                </p>

                <div className="mt-5 space-y-1.5">
                  {accounts.map((acc) => (
                    <div
                      key={acc.id}
                      className="flex justify-between items-center px-3.5 py-2.5 rounded-xl transition-colors"
                      style={{
                        background: "rgba(255,255,255,0.02)",
                        border: `1px solid ${BORDER}`,
                      }}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ background: GOLD_MUTED }}
                        />
                        <div>
                          <p
                            className="text-[12px] font-medium"
                            style={{ color: TEXT_PRIMARY }}
                          >
                            {acc.name}
                          </p>
                          <p
                            className="text-[10px]"
                            style={{ color: TEXT_MUTED }}
                          >
                            {typeLabel[acc.type] || acc.type}
                          </p>
                        </div>
                      </div>
                      <p
                        className="text-[12px] font-semibold tabular-nums"
                        style={{ color: TEXT_SECONDARY }}
                      >
                        {formatRupiah(acc.current_balance)}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => setIsAccountModalOpen(true)}
                    className="flex-1 py-2.5 rounded-xl text-[11px] font-semibold uppercase tracking-widest transition-all hover:bg-white/5"
                    style={{
                      color: TEXT_MUTED,
                      background: "rgba(255,255,255,0.03)",
                      border: `1px solid ${BORDER}`,
                    }}
                  >
                    + Rekening
                  </button>
                  <button
                    onClick={() => setIsTxModalOpen(true)}
                    className="flex-2 py-2.5 rounded-xl text-[12px] font-semibold transition-all hover:opacity-90"
                    style={{
                      background: `linear-gradient(135deg, ${GOLD_MUTED}, ${GOLD})`,
                      color: "#0a0906",
                    }}
                  >
                    Catat Transaksi
                  </button>
                </div>

                {/* TOMBOL AI ADVISOR BARU */}
                <button
                  onClick={handleAskAI}
                  className="w-full mt-2 py-2.5 rounded-xl text-[12px] font-semibold transition-all hover:bg-white/5 border border-[rgba(200,168,107,0.3)] flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(200,168,107,0.1)]"
                  style={{ color: GOLD }}
                >
                  <span className="text-[14px]">🤖</span> Analisis AI
                </button>
              </div>
            </Card>

            {activeWorkspace === "personal" && (
              <Card className="p-5 animate-[fadeIn_0.5s_ease-out]">
                <SectionHeading>Tagihan Berulang</SectionHeading>
                <SubscriptionRadar subscriptions={subscriptions} />
              </Card>
            )}
          </aside>

          <div className="flex-1 flex flex-col gap-4 min-w-0">
            {activeWorkspace === "business" && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-[fadeIn_0.5s_ease-out]">
                <Card className="p-5 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-linear-to-bl from-emerald-500/10 to-transparent rounded-bl-full pointer-events-none" />
                  <p
                    className="text-[10px] font-semibold uppercase tracking-widest mb-1"
                    style={{ color: TEXT_MUTED }}
                  >
                    Total Omzet
                  </p>
                  <h3
                    className="text-xl font-bold tabular-nums"
                    style={{ color: EMERALD }}
                  >
                    {formatRupiah(bizIncome)}
                  </h3>
                </Card>
                <Card className="p-5 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-linear-to-bl from-rose-500/10 to-transparent rounded-bl-full pointer-events-none" />
                  <p
                    className="text-[10px] font-semibold uppercase tracking-widest mb-1"
                    style={{ color: TEXT_MUTED }}
                  >
                    Total Beban
                  </p>
                  <h3
                    className="text-xl font-bold tabular-nums"
                    style={{ color: CORAL }}
                  >
                    {formatRupiah(bizExpense)}
                  </h3>
                </Card>
                <Card className="p-5 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-linear-to-bl from-amber-500/10 to-transparent rounded-bl-full pointer-events-none" />
                  <div className="flex justify-between items-start">
                    <div>
                      <p
                        className="text-[10px] font-semibold uppercase tracking-widest mb-1"
                        style={{ color: TEXT_MUTED }}
                      >
                        Laba Bersih
                      </p>
                      <h3
                        className="text-xl font-bold tabular-nums"
                        style={{ color: netProfit >= 0 ? GOLD : CORAL }}
                      >
                        {formatRupiah(netProfit)}
                      </h3>
                    </div>
                    <div
                      className="px-2 py-1 rounded-lg text-[10px] font-bold"
                      style={{
                        background: "rgba(200,168,107,0.1)",
                        color: GOLD,
                      }}
                    >
                      Margin {profitMargin}%
                    </div>
                  </div>
                </Card>
              </div>
            )}

            <Card className="p-6">
              <SectionHeading>
                Distribusi Pengeluaran{" "}
                {activeWorkspace === "business" ? "Bisnis" : "Pribadi"}
              </SectionHeading>
              <ExpenseChart transactions={activeTransactions} />
            </Card>

            {activeWorkspace === "personal" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-[fadeIn_0.5s_ease-out]">
                <Card className="p-6">
                  <SectionHeading>Batas Anggaran</SectionHeading>
                  <BudgetProgress
                    budgets={budgets}
                    transactions={activeTransactions}
                  />
                </Card>
                <Card className="p-6">
                  <SectionHeading>Target Finansial</SectionHeading>
                  <FinancialGoals
                    goals={goals}
                    onOpenTopUp={(id, name) => {
                      setSelectedGoalId(id);
                      setSelectedGoalName(name);
                      setIsGoalModalOpen(true);
                    }}
                  />
                </Card>
              </div>
            )}

            <Card className="p-6 flex flex-col" style={{ minHeight: "320px" }}>
              <SectionHeading>Riwayat Pergerakan Kas</SectionHeading>
              {activeHistoryItems.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-[13px]" style={{ color: TEXT_MUTED }}>
                    Belum ada pergerakan kas di workspace ini.
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5 overflow-y-auto">
                  {activeHistoryItems.map((item) => {
                    const isIncome = item.type === "income";
                    const isTransfer = item.type === "transfer";
                    const dotColor = isIncome
                      ? GOLD
                      : isTransfer
                        ? "#a89880"
                        : CORAL;
                    const amountColor = isIncome
                      ? GOLD
                      : isTransfer
                        ? TEXT_SECONDARY
                        : CORAL;
                    const icon = isIncome ? "↓" : isTransfer ? "⇄" : "↑";

                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between px-4 py-3 rounded-xl transition-all"
                        style={{
                          background: "rgba(255,255,255,0.015)",
                          border: `1px solid transparent`,
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLDivElement).style.background =
                            "rgba(255,255,255,0.03)";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLDivElement).style.background =
                            "rgba(255,255,255,0.015)";
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-xl flex items-center justify-center text-[12px] font-bold shrink-0"
                            style={{
                              background: `${dotColor}10`,
                              color: dotColor,
                              border: `1px solid ${dotColor}20`,
                            }}
                          >
                            {icon}
                          </div>
                          <div>
                            <p
                              className="text-[13px] font-medium"
                              style={{ color: TEXT_PRIMARY }}
                            >
                              {item.description}
                            </p>
                            <p
                              className="text-[11px] mt-0.5"
                              style={{ color: TEXT_MUTED }}
                            >
                              {item.accountName} {" · "}{" "}
                              {new Date(item.created_at).toLocaleDateString(
                                "id-ID",
                                { day: "numeric", month: "short" },
                              )}
                            </p>
                          </div>
                        </div>
                        <p
                          className="text-[13px] font-semibold tabular-nums shrink-0 ml-4"
                          style={{ color: amountColor }}
                        >
                          {isIncome ? "+" : isTransfer ? "" : "−"}
                          {formatRupiah(item.amount)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>

      {/* ─── MODAL AI ADVISOR ────────────────────────────────────────────────── */}
      {isAiModalOpen && (
        <Modal onClose={() => setIsAiModalOpen(false)} maxWidth="max-w-xl">
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-[0_0_15px_rgba(200,168,107,0.2)]"
                style={{
                  background: `linear-gradient(135deg, ${GOLD_MUTED}, ${GOLD})`,
                }}
              >
                🤖
              </div>
              <div>
                <p
                  className="text-[10px] font-semibold uppercase tracking-[0.14em]"
                  style={{ color: GOLD }}
                >
                  AI Financial Advisor
                </p>
                <h2
                  className="text-xl font-bold"
                  style={{ color: TEXT_PRIMARY }}
                >
                  Hasil Analisis
                </h2>
              </div>
            </div>
          </div>

          {isAiLoading ? (
            <div className="py-10 flex flex-col items-center justify-center gap-4">
              <div
                className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
                style={{ borderColor: `${GOLD} transparent ${GOLD} ${GOLD}` }}
              />
              <p
                className="text-[12px] animate-pulse"
                style={{ color: TEXT_MUTED }}
              >
                AI sedang membaca buku kasmu...
              </p>
            </div>
          ) : aiResponse ? (
            <div className="space-y-4">
              {/* Box Roasting */}
              <div
                className="p-5 rounded-xl relative overflow-hidden group"
                style={{
                  background: "rgba(232,115,90,0.05)",
                  border: `1px solid rgba(232,115,90,0.2)`,
                }}
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-linear-to-bl from-rose-500/10 to-transparent rounded-bl-full pointer-events-none" />
                <h3
                  className="text-[12px] font-bold uppercase tracking-widest mb-2 flex items-center gap-2"
                  style={{ color: CORAL }}
                >
                  <span>🔥</span> Roasting Session
                </h3>
                <p
                  className="text-[13px] leading-relaxed italic"
                  style={{ color: TEXT_PRIMARY }}
                >
                  &quot;{aiResponse.roast}&quot;
                </p>
              </div>

              {/* Box Insight */}
              <div
                className="p-5 rounded-xl relative overflow-hidden group"
                style={{
                  background: "rgba(200,168,107,0.05)",
                  border: `1px solid rgba(200,168,107,0.2)`,
                }}
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-linear-to-bl from-amber-500/10 to-transparent rounded-bl-full pointer-events-none" />
                <h3
                  className="text-[12px] font-bold uppercase tracking-widest mb-2 flex items-center gap-2"
                  style={{ color: GOLD }}
                >
                  <span>💡</span> Executive Insight
                </h3>
                <p
                  className="text-[13px] leading-relaxed"
                  style={{ color: TEXT_PRIMARY }}
                >
                  {aiResponse.insight}
                </p>
              </div>
            </div>
          ) : null}
        </Modal>
      )}

      {/* ─── SISA MODAL LAINNYA ─────────────────────────────────────────────── */}
      {isGoalModalOpen && (
        <Modal onClose={() => setIsGoalModalOpen(false)}>
          <div className="mb-6">
            <p
              className="text-[10px] font-semibold uppercase tracking-[0.14em] mb-2"
              style={{ color: GOLD }}
            >
              Isi Saldo Target
            </p>
            <h2 className="text-xl font-bold" style={{ color: TEXT_PRIMARY }}>
              {selectedGoalName}
            </h2>
          </div>
          <form onSubmit={handleTopUpGoal} className="space-y-4">
            <div>
              <FieldLabel>Ambil dari Dompet</FieldLabel>
              <GoldSelect
                required
                value={txAccountId}
                onChange={(e) => setTxAccountId(e.target.value)}
              >
                <option value="" disabled>
                  Pilih sumber dana...
                </option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({formatRupiah(a.current_balance)})
                  </option>
                ))}
              </GoldSelect>
            </div>
            <div>
              <FieldLabel>Nominal Disisihkan (Rp)</FieldLabel>
              <GoldInput
                type="number"
                required
                min="1"
                value={goalTopUpAmount}
                onChange={(e) => setGoalTopUpAmount(e.target.value)}
                placeholder="0"
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-xl text-[13px] font-semibold mt-2 transition-all hover:opacity-90"
              style={{
                background: `linear-gradient(135deg, ${GOLD_MUTED}, ${GOLD})`,
                color: "#0a0906",
                opacity: isSubmitting ? 0.6 : 1,
              }}
            >
              {isSubmitting ? "Memproses..." : "Tambahkan ke Tabungan"}
            </button>
          </form>
        </Modal>
      )}

      {isTxModalOpen && (
        <Modal onClose={() => setIsTxModalOpen(false)}>
          <div className="mb-6">
            <p
              className="text-[10px] font-semibold uppercase tracking-[0.14em] mb-2"
              style={{ color: GOLD }}
            >
              Catat Transaksi{" "}
              {activeWorkspace === "business" ? "Bisnis" : "Pribadi"}
            </p>
            <h2 className="text-xl font-bold" style={{ color: TEXT_PRIMARY }}>
              Tambah Baru
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-5">
            {(["camera", "gallery"] as const).map((mode) => (
              <label
                key={mode}
                className="flex flex-col items-center justify-center gap-1 py-3 rounded-xl cursor-pointer transition-all"
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: `1px solid rgba(255,255,255,0.07)`,
                  color: TEXT_MUTED,
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLLabelElement).style.borderColor =
                    "rgba(200,168,107,0.2)";
                  (e.currentTarget as HTMLLabelElement).style.color = GOLD;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLLabelElement).style.borderColor =
                    "rgba(255,255,255,0.07)";
                  (e.currentTarget as HTMLLabelElement).style.color =
                    TEXT_MUTED;
                }}
              >
                {isScanning ? (
                  <>
                    <div
                      className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin mb-1"
                      style={{
                        borderColor: `${GOLD} transparent ${GOLD} ${GOLD}`,
                      }}
                    />
                    <span className="text-[9px] uppercase tracking-widest">
                      Memproses...
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-lg">
                      {mode === "camera" ? "📷" : "📁"}
                    </span>
                    <span className="text-[9px] font-semibold uppercase tracking-widest">
                      {mode === "camera" ? "Kamera" : "Galeri"}
                    </span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  {...(mode === "camera" ? { capture: "environment" } : {})}
                  className="hidden"
                  onChange={handleScanReceipt}
                  disabled={isScanning}
                />
              </label>
            ))}
          </div>
          <form onSubmit={handleAddTransaction} className="space-y-4">
            <div
              className="flex p-0.5 rounded-xl"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: `1px solid ${BORDER}`,
              }}
            >
              {(["expense", "income", "transfer"] as const).map((t) => {
                const cfg = {
                  expense: {
                    label: "Pengeluaran",
                    color: CORAL,
                    bg: `${CORAL}15`,
                  },
                  income: { label: "Pemasukan", color: GOLD, bg: `${GOLD}15` },
                  transfer: {
                    label: "Transfer",
                    color: "#a89880",
                    bg: "rgba(168,152,128,0.1)",
                  },
                }[t];
                const active = txType === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setTxType(t);
                      setTxCategoryId("");
                      setTxDestinationAccountId("");
                    }}
                    className="flex-1 py-2 text-[11px] font-semibold rounded-xl transition-all"
                    style={{
                      background: active ? cfg.bg : "transparent",
                      color: active ? cfg.color : TEXT_MUTED,
                      border: active
                        ? `1px solid ${cfg.color}30`
                        : "1px solid transparent",
                    }}
                  >
                    {cfg.label}
                  </button>
                );
              })}
            </div>
            <div>
              <FieldLabel>
                {txType === "transfer" ? "Dari Dompet" : "Pilih Dompet"}
              </FieldLabel>
              <GoldSelect
                required
                value={txAccountId}
                onChange={(e) => setTxAccountId(e.target.value)}
              >
                <option value="" disabled>
                  Pilih dompet...
                </option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </GoldSelect>
            </div>
            {txType === "transfer" ? (
              <div>
                <FieldLabel>Ke Dompet</FieldLabel>
                <GoldSelect
                  required
                  value={txDestinationAccountId}
                  onChange={(e) => setTxDestinationAccountId(e.target.value)}
                >
                  <option value="" disabled>
                    Pilih tujuan...
                  </option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </GoldSelect>
              </div>
            ) : (
              <div>
                <FieldLabel>Kategori</FieldLabel>
                <GoldSelect
                  required
                  value={txCategoryId}
                  onChange={(e) => setTxCategoryId(e.target.value)}
                >
                  <option value="" disabled>
                    Pilih kategori...
                  </option>
                  {categories
                    .filter((c) => c.type === txType)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </GoldSelect>
              </div>
            )}
            <div>
              <FieldLabel>Nominal (Rp)</FieldLabel>
              <GoldInput
                type="number"
                required
                min="1"
                value={txAmount}
                onChange={(e) => setTxAmount(e.target.value)}
                placeholder="0"
              />
            </div>
            <div>
              <FieldLabel>Catatan</FieldLabel>
              <GoldInput
                type="text"
                value={txDesc}
                onChange={(e) => setTxDesc(e.target.value)}
                placeholder="Opsional..."
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-xl text-[13px] font-semibold transition-all hover:opacity-90"
              style={{
                background:
                  txType === "income"
                    ? `linear-gradient(135deg, ${GOLD_MUTED}, ${GOLD})`
                    : txType === "expense"
                      ? `linear-gradient(135deg, #a03520, ${CORAL})`
                      : "linear-gradient(135deg, #5a5248, #a89880)",
                color: txType === "income" ? "#0a0906" : "#fff",
                opacity: isSubmitting ? 0.6 : 1,
              }}
            >
              {isSubmitting ? "Menyimpan..." : "Simpan"}
            </button>
          </form>
        </Modal>
      )}

      {isAccountModalOpen && (
        <Modal onClose={() => setIsAccountModalOpen(false)}>
          <div className="mb-6">
            <p
              className="text-[10px] font-semibold uppercase tracking-[0.14em] mb-2"
              style={{ color: GOLD }}
            >
              Kelola Dompet
            </p>
            <h2 className="text-xl font-bold" style={{ color: TEXT_PRIMARY }}>
              Rekening Baru
            </h2>
          </div>
          <form onSubmit={handleAddAccount} className="space-y-4">
            <div>
              <FieldLabel>Nama Rekening</FieldLabel>
              <GoldInput
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="cth. Mandiri Utama"
              />
            </div>
            <div>
              <FieldLabel>Tipe</FieldLabel>
              <GoldSelect
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
              >
                <option value="debit">Debit / Bank</option>
                <option value="e-wallet">E-Wallet</option>
                <option value="cash">Tunai</option>
              </GoldSelect>
            </div>
            <div>
              <FieldLabel>Saldo Awal</FieldLabel>
              <GoldInput
                type="number"
                required
                min="0"
                value={newBalance}
                onChange={(e) => setNewBalance(e.target.value)}
                placeholder="0"
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-xl text-[13px] font-semibold mt-2 transition-all hover:opacity-90"
              style={{
                background: `linear-gradient(135deg, ${GOLD_MUTED}, ${GOLD})`,
                color: "#0a0906",
                opacity: isSubmitting ? 0.6 : 1,
              }}
            >
              {isSubmitting ? "Menyimpan..." : "Simpan Rekening"}
            </button>
          </form>
        </Modal>
      )}
    </main>
  );
}
