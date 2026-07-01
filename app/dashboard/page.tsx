"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
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
interface Project {
  id: string;
  name: string;
  budget_limit: number;
  workspace: string;
}
interface Debt {
  id: string;
  person_name: string;
  amount: number;
  type: "payable" | "receivable";
  status: "unpaid" | "paid";
  due_date: string | null;
  workspace: string;
}
interface Product {
  id: string;
  name: string;
  cogs: number;
  selling_price: number;
  workspace: string;
}

// INTERFACE BARU: Invoices & Tax Reserves
interface Invoice {
  id: string;
  client_name: string;
  amount: number;
  status: "unpaid" | "paid";
  due_date: string | null;
  items: string | null;
  workspace: string;
  created_at: string;
}
interface TaxReserve {
  id: string;
  platform_name: string;
  amount_held: number;
  description: string | null;
  workspace: string;
}

export interface Transaction {
  id: string;
  amount: number;
  description: string;
  created_at: string;
  workspace: string;
  project_id?: string;
  quantity?: number;
  products?: {
    id: string;
    name: string;
    cogs: number;
    selling_price: number;
  } | null;
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
        className={`w-full ${maxWidth} rounded-2xl p-7 relative animate-[fadeIn_0.3s_ease-out] max-h-[90vh] overflow-y-auto`}
        style={{
          background: "#100e0b",
          border: `1px solid rgba(255,255,255,0.08)`,
          boxShadow: "0 32px 80px rgba(0,0,0,0.8)",
        }}
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-7 h-7 rounded-full flex items-center justify-center text-[12px] transition-all hover:bg-white/10 z-50"
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

  // 1. Deklarasi Seluruh State
  const [activeWorkspace, setActiveWorkspace] = useState<
    "personal" | "business"
  >("personal");
  const [showBizTutorial, setShowBizTutorial] = useState<boolean>(false);
  const [userEmail, setUserEmail] = useState<string>("Memuat...");

  // States Data Utama
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]); // NEW: Invoices
  const [taxReserves, setTaxReserves] = useState<TaxReserve[]>([]); // NEW: Tax Reserves
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);

  const [totalBalance, setTotalBalance] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // States Modal Standard
  const [isAccountModalOpen, setIsAccountModalOpen] = useState<boolean>(false);
  const [newName, setNewName] = useState<string>("");
  const [newType, setNewType] = useState<string>("debit");
  const [newBalance, setNewBalance] = useState<string>("");

  const [isTxModalOpen, setIsTxModalOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isScanning, setIsScanning] = useState<boolean>(false);

  const [isAiModalOpen, setIsAiModalOpen] = useState<boolean>(false);
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [aiResponse, setAiResponse] = useState<{
    roast: string;
    insight: string;
  } | null>(null);

  const [isProjectModalOpen, setIsProjectModalOpen] = useState<boolean>(false);
  const [newProjectName, setNewProjectName] = useState<string>("");
  const [newProjectBudget, setNewProjectBudget] = useState<string>("");

  const [isDebtModalOpen, setIsDebtModalOpen] = useState<boolean>(false);
  const [debtType, setDebtType] = useState<"payable" | "receivable">("payable");
  const [debtPerson, setDebtPerson] = useState<string>("");
  const [debtAmount, setDebtAmount] = useState<string>("");
  const [debtDueDate, setDebtDueDate] = useState<string>("");

  const [isProductModalOpen, setIsProductModalOpen] = useState<boolean>(false);
  const [newProductName, setNewProductName] = useState<string>("");
  const [newProductCOGS, setNewProductCOGS] = useState<string>("");
  const [newProductPrice, setNewProductPrice] = useState<string>("");

  // States NEW Modals (Invoice & Tax)
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState<boolean>(false);
  const [invClient, setInvClient] = useState<string>("");
  const [invAmount, setInvAmount] = useState<string>("");
  const [invItems, setInvItems] = useState<string>("");
  const [invDueDate, setInvDueDate] = useState<string>("");

  const [isTaxModalOpen, setIsTaxModalOpen] = useState<boolean>(false);
  const [taxPlatform, setTaxPlatform] = useState<string>("");
  const [taxAmountInput, setTaxAmountInput] = useState<string>("");
  const [taxDesc, setTaxDesc] = useState<string>("");

  const [txType, setTxType] = useState<string>("expense");
  const [txAccountId, setTxAccountId] = useState<string>("");
  const [txDestinationAccountId, setTxDestinationAccountId] =
    useState<string>("");
  const [txCategoryId, setTxCategoryId] = useState<string>("");
  const [txProjectId, setTxProjectId] = useState<string>("");
  const [txAmount, setTxAmount] = useState<string>("");
  const [txDesc, setTxDesc] = useState<string>("");
  const [isProductSale, setIsProductSale] = useState<boolean>(false);
  const [txProductId, setTxProductId] = useState<string>("");
  const [txQuantity, setTxQuantity] = useState<string>("1");

  const [isGoalModalOpen, setIsGoalModalOpen] = useState<boolean>(false);
  const [selectedGoalId, setSelectedGoalId] = useState<string>("");
  const [selectedGoalName, setSelectedGoalName] = useState<string>("");
  const [goalTopUpAmount, setGoalTopUpAmount] = useState<string>("");
  const [toast, setToast] = useState<ToastMessage | null>(null);

  // 2. Kalkulasi Logika & Matematika Eksekutif
  const activeTransactions = transactions.filter(
    (tx) => tx.workspace === activeWorkspace,
  );
  const activeHistoryItems = historyItems.filter(
    (item) => item.type === "transfer" || item.workspace === activeWorkspace,
  );
  const activeProjects = projects.filter(
    (p) => p.workspace === activeWorkspace,
  );
  const activeDebts = debts.filter(
    (d) => d.workspace === activeWorkspace && d.status === "unpaid",
  );
  const activeProducts = products.filter(
    (p) => p.workspace === activeWorkspace,
  );

  // Filter Invoice & Tax untuk Business Mode
  const activeInvoices = invoices.filter(
    (i) => i.workspace === activeWorkspace && i.status === "unpaid",
  );
  const activeTaxReserves = taxReserves.filter(
    (t) => t.workspace === activeWorkspace,
  );

  const bizIncomeTxs = activeTransactions.filter(
    (tx) => tx.categories?.type === "income",
  );
  const bizExpenseTxs = activeTransactions.filter(
    (tx) => tx.categories?.type === "expense",
  );

  const bizIncome = bizIncomeTxs.reduce((sum, tx) => sum + tx.amount, 0);
  const bizExpense = bizExpenseTxs.reduce((sum, tx) => sum + tx.amount, 0);

  const totalHPP = bizIncomeTxs.reduce((sum, tx) => {
    if (tx.products && tx.quantity) {
      return sum + tx.products.cogs * tx.quantity;
    }
    return sum;
  }, 0);

  const totalTaxHeld = activeTaxReserves.reduce(
    (sum, t) => sum + t.amount_held,
    0,
  );

  const grossProfit = bizIncome - totalHPP;
  const netProfit = grossProfit - bizExpense;
  const profitMargin =
    bizIncome > 0 ? Math.round((netProfit / bizIncome) * 100) : 0;
  const runwayMonths =
    bizExpense > 0 ? (totalBalance / bizExpense).toFixed(1) : "∞";

  const savingsRatio =
    bizIncome > 0 ? ((bizIncome - bizExpense) / bizIncome) * 100 : 0;
  let healthScore = 50;
  if (savingsRatio >= 20) healthScore += 30;
  else if (savingsRatio > 0) healthScore += 15;
  else if (savingsRatio < 0) healthScore -= 20;
  const goalsAvg =
    goals.length > 0
      ? goals.reduce(
          (sum, g) =>
            sum + Math.min((g.current_amount / g.target_amount) * 100, 100),
          0,
        ) / goals.length
      : 0;
  healthScore += goalsAvg * 0.2;
  healthScore = Math.min(Math.max(Math.round(healthScore), 0), 100);

  let rankLabel = "Bronze Saver";
  let rankColor = "#a89880";
  if (healthScore >= 80) {
    rankLabel = "Diamond Investor 💎";
    rankColor = "#10b981";
  } else if (healthScore >= 60) {
    rankLabel = "Gold Manager 🥇";
    rankColor = "#c8a86b";
  } else if (healthScore >= 40) {
    rankLabel = "Silver Spender 🥈";
    rankColor = "#94a3b8";
  } else {
    rankLabel = "Iron Spender ⚠️";
    rankColor = "#e8735a";
  }

  // 3. Handlers Utama
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
      if (!hasSeenTutorial) setShowBizTutorial(true);
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
      const { data: projData } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });
      if (projData) setProjects(projData as Project[]);
      const { data: debtData } = await supabase
        .from("debts")
        .select("*")
        .order("created_at", { ascending: false });
      if (debtData) setDebts(debtData as Debt[]);
      const { data: prodData } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });
      if (prodData) setProducts(prodData as Product[]);

      // FETCH DATA INVOICE & TAX RESERVE
      const { data: invData } = await supabase
        .from("invoices")
        .select("*")
        .order("created_at", { ascending: false });
      if (invData) setInvoices(invData as Invoice[]);
      const { data: taxData } = await supabase
        .from("tax_reserves")
        .select("*")
        .order("created_at", { ascending: false });
      if (taxData) setTaxReserves(taxData as TaxReserve[]);

      const { data: txData } = await supabase
        .from("transactions")
        .select(
          `id, amount, description, created_at, workspace, project_id, quantity, products(id, name, cogs, selling_price), categories (id, name, type), accounts (name)`,
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
          const desc = tx.products
            ? `Penjualan: ${tx.products.name} (x${tx.quantity})`
            : tx.description || tx.categories?.name || "Transaksi";
          combinedHistory.push({
            id: tx.id,
            amount: tx.amount,
            description: desc,
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

  // EXPORT PDF LOGIC
  const handleExportPDF = () => {
    showToast(
      "Menyusun Laporan...",
      "Membangun dokumen PDF profesional.",
      "success",
    );
    try {
      const doc = new jsPDF("p", "mm", "a4");
      doc.setFontSize(22);
      doc.setTextColor(200, 168, 107);
      doc.setFont("helvetica", "bold");
      doc.text("FINANCE TRACKER ERP", 14, 20);

      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.setFont("helvetica", "normal");
      doc.text(
        `Laporan Eksekutif - Workspace: ${activeWorkspace.toUpperCase()}`,
        14,
        27,
      );
      doc.text(
        `Dicetak oleh: ${userEmail} | Tanggal: ${new Date().toLocaleDateString("id-ID")}`,
        14,
        32,
      );

      doc.setDrawColor(200, 168, 107);
      doc.setLineWidth(0.5);
      doc.line(14, 36, 196, 36);

      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "bold");
      doc.text("Ringkasan Metrik", 14, 46);

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(
        `Total Saldo Terkonsolidasi : ${formatRupiah(totalBalance)}`,
        14,
        54,
      );
      doc.text(
        `Total Arus Kas Masuk       : ${formatRupiah(bizIncome)}`,
        14,
        60,
      );
      doc.text(
        `Total Arus Kas Keluar      : ${formatRupiah(bizExpense)}`,
        14,
        66,
      );

      if (activeWorkspace === "business") {
        doc.text(
          `Laba Bersih Operasional    : ${formatRupiah(netProfit)} (Margin: ${profitMargin}%)`,
          14,
          72,
        );
      } else {
        doc.text(
          `Rasio Kesehatan Tabungan   : ${savingsRatio.toFixed(1)}%`,
          14,
          72,
        );
        doc.text(`Estimasi Survival Runway   : ${runwayMonths} Bulan`, 14, 78);
      }

      const startYTable = activeWorkspace === "business" ? 85 : 90;
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Rincian Pergerakan Kas", 14, startYTable - 5);

      const tableColumn = [
        "Tanggal",
        "Deskripsi",
        "Kategori",
        "Tipe",
        "Nominal",
      ];
      const tableRows = activeHistoryItems.map((item) => [
        new Date(item.created_at).toLocaleDateString("id-ID"),
        item.description,
        item.categoryName || "-",
        item.type === "income"
          ? "Pemasukan"
          : item.type === "expense"
            ? "Pengeluaran"
            : "Transfer",
        (item.type === "income" ? "+" : item.type === "expense" ? "-" : "") +
          formatRupiah(item.amount),
      ]);

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: startYTable,
        theme: "striped",
        headStyles: { fillColor: [200, 168, 107], textColor: [10, 9, 6] },
        styles: { fontSize: 9, cellPadding: 3 },
        alternateRowStyles: { fillColor: [250, 250, 250] },
      });

      // @ts-expect-error : Ignore internal jsPDF types
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(
          `Laporan dicetak otomatis oleh Finance Tracker ERP - Halaman ${i} dari ${pageCount}`,
          14,
          285,
        );
      }

      doc.save(
        `Laporan_Keuangan_${activeWorkspace}_${new Date().toISOString().split("T")[0]}.pdf`,
      );
      showToast(
        "Laporan Selesai",
        "PDF Profesional berhasil diunduh.",
        "success",
      );
    } catch (err) {
      console.error(err);
      showToast("Gagal", "Sistem gagal menyusun struktur PDF.", "error");
    }
  };

  // INVOICE PDF GENERATOR (B2B)
  const handlePrintInvoice = (inv: Invoice) => {
    try {
      const doc = new jsPDF("p", "mm", "a4");
      doc.setFontSize(24);
      doc.setTextColor(200, 168, 107);
      doc.setFont("helvetica", "bold");
      doc.text("INVOICE", 14, 25);

      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.setFont("helvetica", "normal");
      doc.text(
        `No. Tagihan: #INV-${inv.id.substring(0, 6).toUpperCase()}`,
        14,
        34,
      );
      doc.text(
        `Tanggal Cetak: ${new Date().toLocaleDateString("id-ID")}`,
        14,
        39,
      );
      doc.text(
        `Tenggat Waktu: ${inv.due_date ? new Date(inv.due_date).toLocaleDateString("id-ID") : "-"}`,
        14,
        44,
      );

      doc.setTextColor(0);
      doc.setFont("helvetica", "bold");
      doc.text("Ditagihkan Kepada:", 14, 55);
      doc.setFont("helvetica", "normal");
      doc.text(inv.client_name, 14, 60);

      autoTable(doc, {
        startY: 70,
        head: [["Deskripsi / Item Layanan", "Total Tagihan"]],
        body: [[inv.items || "Layanan / Produk B2B", formatRupiah(inv.amount)]],
        theme: "striped",
        headStyles: { fillColor: [200, 168, 107], textColor: [10, 9, 6] },
      });

      // @ts-expect-error : Ignore internal
      const finalY = doc.lastAutoTable.finalY || 90;
      doc.setFont("helvetica", "bold");
      doc.text(
        `TOTAL HARUS DIBAYAR: ${formatRupiah(inv.amount)}`,
        14,
        finalY + 15,
      );

      doc.setFontSize(9);
      doc.setTextColor(150);
      doc.setFont("helvetica", "normal");
      doc.text(
        "Mohon lakukan pembayaran sesuai dengan nominal di atas.",
        14,
        finalY + 30,
      );
      doc.text("Terima kasih atas kerja sama bisnis Anda.", 14, finalY + 35);

      doc.save(`Invoice_${inv.client_name.replace(/\s+/g, "_")}.pdf`);
      showToast(
        "Invoice Siap",
        "File PDF Tagihan berhasil dicetak.",
        "success",
      );
    } catch (err) {
      console.error(err);
      showToast("Gagal", "Gagal mencetak Invoice.", "error");
    }
  };

  // HANDLERS UNTUK INVOICE & TAX
  const handleAddInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await supabase
        .from("invoices")
        .insert([
          {
            client_name: invClient,
            amount: Number(invAmount),
            items: invItems,
            due_date: invDueDate || null,
            workspace: activeWorkspace,
          },
        ]);
      setInvClient("");
      setInvAmount("");
      setInvItems("");
      setInvDueDate("");
      setIsInvoiceModalOpen(false);
      await fetchData();
      showToast(
        "Invoice Dibuat",
        "Tagihan B2B siap dikirim ke klien.",
        "success",
      );
    } catch (error) {
      console.error(error);
      showToast("Gagal", "Gagal membuat invoice.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkInvoicePaid = async (inv: Invoice) => {
    const confirmAction = window.confirm(
      `Klien ${inv.client_name} sudah membayar? Dana akan otomatis masuk ke saldo utama.`,
    );
    if (!confirmAction) return;
    try {
      await supabase
        .from("invoices")
        .update({ status: "paid" })
        .eq("id", inv.id);
      // Auto-catat sebagai pemasukan ke rekening pertama
      const targetAccId = accounts[0]?.id;
      if (targetAccId) {
        await supabase
          .from("transactions")
          .insert([
            {
              account_id: targetAccId,
              amount: inv.amount,
              description: `Pembayaran Invoice: ${inv.client_name}`,
              workspace: activeWorkspace,
            },
          ]);
        const acc = accounts.find((a) => a.id === targetAccId);
        if (acc)
          await supabase
            .from("accounts")
            .update({
              current_balance: Number(acc.current_balance) + inv.amount,
            })
            .eq("id", targetAccId);
      }
      await fetchData();
      showToast("Invoice Lunas", "Dana berhasil masuk ke saldo.", "success");
    } catch (error) {
      console.error(error);
      showToast("Gagal", "Gagal memperbarui status invoice.", "error");
    }
  };

  const handleAddTaxReserve = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await supabase
        .from("tax_reserves")
        .insert([
          {
            platform_name: taxPlatform,
            amount_held: Number(taxAmountInput),
            description: taxDesc,
            workspace: activeWorkspace,
          },
        ]);
      setTaxPlatform("");
      setTaxAmountInput("");
      setTaxDesc("");
      setIsTaxModalOpen(false);
      await fetchData();
      showToast(
        "Brankas Aman",
        "Potongan platform / pajak berhasil dicatat.",
        "success",
      );
    } catch (error) {
      console.error(error);
      showToast("Gagal", "Gagal mencatat pajak.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAskAI = async () => {
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
      const simplifiedTx = activeTransactions.map((tx) => ({
        amount: tx.amount,
        desc: tx.description,
        type: tx.categories?.type,
        date: new Date(tx.created_at).toLocaleDateString("id-ID"),
      }));
      const userName = userEmail.split("@")[0];
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
              project_id: txProjectId || null,
            },
          ]);
        if (txError) throw txError;
        const selectedAccount = accounts.find((a) => a.id === finalAccId);
        if (selectedAccount) {
          await supabase
            .from("accounts")
            .update({
              current_balance:
                Number(selectedAccount.current_balance) - finalAmount,
            })
            .eq("id", finalAccId);
        }
        setTxAmount("");
        setTxDesc("");
        setTxProjectId("");
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

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await supabase
        .from("projects")
        .insert([
          {
            name: newProjectName,
            budget_limit: Number(newProjectBudget),
            workspace: activeWorkspace,
          },
        ]);
      setNewProjectName("");
      setNewProjectBudget("");
      setIsProjectModalOpen(false);
      await fetchData();
      showToast("Proyek Baru", "Proyek berhasil dibuat.", "success");
    } catch (error) {
      console.error(error);
      showToast("Gagal", "Sistem gagal menambahkan proyek.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await supabase
        .from("debts")
        .insert([
          {
            person_name: debtPerson,
            amount: Number(debtAmount),
            type: debtType,
            due_date: debtDueDate || null,
            workspace: activeWorkspace,
          },
        ]);
      setDebtPerson("");
      setDebtAmount("");
      setDebtDueDate("");
      setIsDebtModalOpen(false);
      await fetchData();
      showToast(
        "Tercatat",
        "Data hutang/piutang berhasil ditambahkan.",
        "success",
      );
    } catch (error) {
      console.error(error);
      showToast("Gagal", "Sistem gagal mencatat.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkDebtPaid = async (debtId: string) => {
    const confirmAction = window.confirm(
      "Tandai hutang/piutang ini sebagai Lunas?",
    );
    if (!confirmAction) return;
    try {
      await supabase.from("debts").update({ status: "paid" }).eq("id", debtId);
      await fetchData();
      showToast("Lunas", "Status berhasil diperbarui.", "success");
    } catch (error) {
      console.error(error);
      showToast("Gagal", "Gagal memperbarui status.", "error");
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await supabase
        .from("products")
        .insert([
          {
            name: newProductName,
            cogs: Number(newProductCOGS),
            selling_price: Number(newProductPrice),
            workspace: activeWorkspace,
          },
        ]);
      setNewProductName("");
      setNewProductCOGS("");
      setNewProductPrice("");
      setIsProductModalOpen(false);
      await fetchData();
      showToast(
        "Katalog Diperbarui",
        "SKU Produk baru berhasil ditambahkan.",
        "success",
      );
    } catch (error) {
      console.error(error);
      showToast("Gagal", "Sistem gagal menyimpan produk.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      let finalAmount = Number(txAmount);
      let finalDesc = txDesc;
      let finalQty = 1;
      let finalProdId = null;

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
              amount: finalAmount,
              description: txDesc || "Transfer Dana",
            },
          ]);
        const sourceAcc = accounts.find((a) => a.id === txAccountId);
        const destAcc = accounts.find((a) => a.id === txDestinationAccountId);
        if (sourceAcc && destAcc) {
          await supabase
            .from("accounts")
            .update({
              current_balance: Number(sourceAcc.current_balance) - finalAmount,
            })
            .eq("id", txAccountId);
          await supabase
            .from("accounts")
            .update({
              current_balance: Number(destAcc.current_balance) + finalAmount,
            })
            .eq("id", txDestinationAccountId);
        }
      } else {
        if (!txAccountId || !txCategoryId) {
          showToast("Peringatan", "Pilih dompet dan kategori!", "error");
          setIsSubmitting(false);
          return;
        }
        if (txType === "income" && isProductSale && txProductId) {
          const prod = products.find((p) => p.id === txProductId);
          if (prod) {
            finalQty = Number(txQuantity);
            finalAmount = prod.selling_price * finalQty;
            finalDesc = txDesc || `Penjualan: ${prod.name} (x${finalQty})`;
            finalProdId = prod.id;
          }
        }
        await supabase
          .from("transactions")
          .insert([
            {
              account_id: txAccountId,
              category_id: txCategoryId,
              amount: finalAmount,
              description: finalDesc,
              workspace: activeWorkspace,
              project_id: txProjectId || null,
              product_id: finalProdId,
              quantity: finalQty,
            },
          ]);
        const selectedAccount = accounts.find((a) => a.id === txAccountId);
        if (selectedAccount) {
          const newBal =
            txType === "income"
              ? Number(selectedAccount.current_balance) + finalAmount
              : Number(selectedAccount.current_balance) - finalAmount;
          await supabase
            .from("accounts")
            .update({ current_balance: newBal })
            .eq("id", txAccountId);
        }
      }
      setTxAmount("");
      setTxDesc("");
      setTxProjectId("");
      setTxProductId("");
      setTxQuantity("1");
      setTxDestinationAccountId("");
      setIsTxModalOpen(false);
      setIsProductSale(false);
      await fetchData();
      showToast("Transaksi Tercatat", "Buku kas telah diperbarui.", "success");
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

  // 4. Proses Render (Early returns)
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

  // 5. Render Utama
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
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3.5 px-5 py-3.5 rounded-2xl animate-[fadeIn_0.3s_ease-out]"
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

      <div
        id="dashboard-content"
        className="relative z-10 max-w-[1400px] mx-auto px-5 py-5 lg:px-8 lg:py-6 bg-[#0a0906]"
      >
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
              onClick={handleExportPDF}
              className="hidden md:flex px-4 py-2 rounded-xl text-[12px] font-bold transition-all hover:opacity-80 items-center gap-2"
              style={{
                color: "#0a0906",
                background: `linear-gradient(135deg, ${GOLD_MUTED}, ${GOLD})`,
              }}
            >
              📥 Export Laporan
            </button>
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
          {/* LEFT SIDEBAR */}
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
                <div className="flex justify-between items-start mb-1.5">
                  <p
                    className="text-[10px] font-semibold uppercase tracking-[0.14em]"
                    style={{ color: TEXT_MUTED }}
                  >
                    Total Saldo{" "}
                    {activeWorkspace === "business" ? "Bisnis" : "Pribadi"}
                  </p>
                </div>
                <h2
                  className="text-3xl font-bold tracking-tight mb-0.5 tabular-nums"
                  style={{ color: TEXT_PRIMARY }}
                >
                  {formatRupiah(totalBalance)}
                </h2>

                <div
                  className="mt-3 px-3 py-2 rounded-lg"
                  style={{
                    background: "rgba(200,168,107,0.05)",
                    border: `1px solid rgba(200,168,107,0.15)`,
                  }}
                >
                  <p className="text-[10px] uppercase tracking-widest text-[#a89880]">
                    Survival Runway
                  </p>
                  <p className="text-[13px] font-bold" style={{ color: GOLD }}>
                    {runwayMonths} Bulan
                  </p>
                </div>

                <p className="text-[11px] mt-2" style={{ color: TEXT_MUTED }}>
                  {accounts.length} rekening terkonsolidasi
                </p>

                <div className="mt-4 space-y-1.5">
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
                    className="flex-[2] py-2.5 rounded-xl text-[12px] font-semibold transition-all hover:opacity-90"
                    style={{
                      background: `linear-gradient(135deg, ${GOLD_MUTED}, ${GOLD})`,
                      color: "#0a0906",
                    }}
                  >
                    Catat Transaksi
                  </button>
                </div>

                <button
                  onClick={handleAskAI}
                  className="w-full mt-2 py-2.5 rounded-xl text-[12px] font-semibold transition-all hover:bg-white/5 border border-[rgba(200,168,107,0.3)] flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(200,168,107,0.1)]"
                  style={{ color: GOLD }}
                >
                  <span className="text-[14px]">🤖</span> Analisis AI
                </button>
              </div>
            </Card>

            {/* MODUL BARU: BRANKAS PAJAK / POTONGAN (TAX RESERVE) */}
            {activeWorkspace === "business" && (
              <Card className="p-5">
                <div className="flex justify-between items-center mb-4">
                  <SectionHeading>Brankas Pajak & Potongan</SectionHeading>
                  <button
                    onClick={() => setIsTaxModalOpen(true)}
                    className="text-[14px] mb-4 hover:opacity-80"
                    style={{ color: GOLD }}
                  >
                    +
                  </button>
                </div>

                <div
                  className="p-3 mb-4 rounded-xl flex justify-between items-center"
                  style={{
                    background: `${CORAL}10`,
                    border: `1px solid ${CORAL}30`,
                  }}
                >
                  <span className="text-[11px] font-bold text-rose-300">
                    Total Ditahan:
                  </span>
                  <span className="text-[13px] font-bold text-white">
                    {formatRupiah(totalTaxHeld)}
                  </span>
                </div>

                {activeTaxReserves.length === 0 ? (
                  <div className="text-center py-4 border border-dashed border-[#2a2520] rounded-xl">
                    <p className="text-[11px] text-[#5a5248] italic">
                      Aman. Tidak ada dana ditahan.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {activeTaxReserves.map((tax) => (
                      <div
                        key={tax.id}
                        className="p-3 rounded-xl flex justify-between items-center"
                        style={{
                          background: "rgba(255,255,255,0.02)",
                          border: `1px solid ${BORDER}`,
                        }}
                      >
                        <div>
                          <p className="text-[12px] font-semibold text-white">
                            {tax.platform_name}
                          </p>
                          <p className="text-[9px] text-[#6b6058] mt-0.5">
                            {tax.description || "Alokasi Otomatis"}
                          </p>
                        </div>
                        <p className="text-[12px] font-bold tabular-nums text-rose-400">
                          {formatRupiah(tax.amount_held)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}

            <Card className="p-5">
              <div className="flex justify-between items-center mb-4">
                <SectionHeading>Hutang & Piutang</SectionHeading>
                <button
                  onClick={() => setIsDebtModalOpen(true)}
                  className="text-[14px] mb-4 hover:opacity-80"
                  style={{ color: GOLD }}
                >
                  +
                </button>
              </div>

              {activeDebts.length === 0 ? (
                <div className="text-center py-4 border border-dashed border-[#2a2520] rounded-xl">
                  <p className="text-[11px] text-[#5a5248] italic">
                    Buku bon bersih.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {activeDebts.map((debt) => {
                    const isPayable = debt.type === "payable";
                    return (
                      <div
                        key={debt.id}
                        className="p-3 rounded-xl flex justify-between items-center"
                        style={{
                          background: "rgba(255,255,255,0.02)",
                          border: `1px solid ${isPayable ? "rgba(232,115,90,0.2)" : "rgba(16,185,129,0.2)"}`,
                        }}
                      >
                        <div>
                          <p
                            className="text-[10px] uppercase font-bold tracking-widest"
                            style={{ color: isPayable ? CORAL : EMERALD }}
                          >
                            {isPayable ? "Hutang ke:" : "Piutang dari:"}
                          </p>
                          <p className="text-[13px] font-semibold mt-0.5 text-white">
                            {debt.person_name}
                          </p>
                          {debt.due_date && (
                            <p className="text-[9px] text-[#6b6058] mt-1">
                              Tempo:{" "}
                              {new Date(debt.due_date).toLocaleDateString(
                                "id-ID",
                              )}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p
                            className="text-[13px] font-bold tabular-nums mb-2"
                            style={{ color: TEXT_SECONDARY }}
                          >
                            {formatRupiah(debt.amount)}
                          </p>
                          <button
                            onClick={() => handleMarkDebtPaid(debt.id)}
                            className="px-3 py-1 rounded-md text-[10px] font-bold transition-all hover:bg-white/10"
                            style={{
                              background: "rgba(255,255,255,0.05)",
                              color: TEXT_MUTED,
                            }}
                          >
                            Lunas ✓
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            {activeWorkspace === "personal" && (
              <Card className="p-5 animate-[fadeIn_0.5s_ease-out]">
                <SectionHeading>Tagihan Berulang</SectionHeading>
                <SubscriptionRadar subscriptions={subscriptions} />
              </Card>
            )}
          </aside>

          {/* MAIN CONTENT */}
          <div className="flex-1 flex flex-col gap-4 min-w-0">
            {activeWorkspace === "personal" && (
              <Card className="p-6 relative overflow-hidden group animate-[fadeIn_0.5s_ease-out]">
                <div className="absolute top-0 right-0 w-32 h-32 bg-linear-to-bl from-white/5 to-transparent rounded-bl-full pointer-events-none" />
                <SectionHeading>Kesehatan Finansial</SectionHeading>
                <div className="flex justify-between items-end mb-3">
                  <div>
                    <p
                      className="text-3xl font-bold tabular-nums"
                      style={{ color: rankColor }}
                    >
                      {healthScore}
                      <span className="text-sm text-[#6b6058]">/100</span>
                    </p>
                    <p
                      className="text-[12px] font-semibold tracking-wide mt-1"
                      style={{ color: rankColor }}
                    >
                      {rankLabel}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-[#6b6058] uppercase tracking-widest">
                      Rasio Tabungan
                    </p>
                    <p
                      className="text-[13px] font-bold"
                      style={{ color: TEXT_PRIMARY }}
                    >
                      {savingsRatio > 0 ? "+" : ""}
                      {savingsRatio.toFixed(1)}%
                    </p>
                  </div>
                </div>
                <div className="relative h-1.5 bg-[#1e1c18] rounded-full overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000"
                    style={{
                      width: `${healthScore}%`,
                      background: rankColor,
                      boxShadow: `0 0 10px ${rankColor}80`,
                    }}
                  />
                </div>
              </Card>
            )}

            {activeWorkspace === "business" && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 animate-[fadeIn_0.5s_ease-out]">
                <Card className="p-5 relative overflow-hidden group col-span-2 sm:col-span-1">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-linear-to-bl from-emerald-500/10 to-transparent rounded-bl-full pointer-events-none" />
                  <p
                    className="text-[10px] font-semibold uppercase tracking-widest mb-1"
                    style={{ color: TEXT_MUTED }}
                  >
                    Total Omzet
                  </p>
                  <h3
                    className="text-lg font-bold tabular-nums"
                    style={{ color: EMERALD }}
                  >
                    {formatRupiah(bizIncome)}
                  </h3>
                </Card>
                <Card className="p-5 relative overflow-hidden group col-span-2 sm:col-span-1">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-linear-to-bl from-rose-500/10 to-transparent rounded-bl-full pointer-events-none" />
                  <p
                    className="text-[10px] font-semibold uppercase tracking-widest mb-1"
                    style={{ color: TEXT_MUTED }}
                  >
                    HPP (Modal)
                  </p>
                  <h3
                    className="text-lg font-bold tabular-nums"
                    style={{ color: CORAL }}
                  >
                    {formatRupiah(totalHPP)}
                  </h3>
                </Card>
                <Card className="p-5 relative overflow-hidden group col-span-2 sm:col-span-1">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-linear-to-bl from-amber-500/10 to-transparent rounded-bl-full pointer-events-none" />
                  <p
                    className="text-[10px] font-semibold uppercase tracking-widest mb-1"
                    style={{ color: TEXT_MUTED }}
                  >
                    Beban Ops.
                  </p>
                  <h3
                    className="text-lg font-bold tabular-nums"
                    style={{ color: CORAL }}
                  >
                    {formatRupiah(bizExpense)}
                  </h3>
                </Card>
                <Card
                  className="p-5 relative overflow-hidden group col-span-2 sm:col-span-1"
                  style={{
                    border: `1px solid ${GOLD}40`,
                    background: `${GOLD}05`,
                  }}
                >
                  <p
                    className="text-[10px] font-semibold uppercase tracking-widest mb-1"
                    style={{ color: GOLD }}
                  >
                    Laba Bersih
                  </p>
                  <h3
                    className="text-lg font-bold tabular-nums"
                    style={{ color: GOLD }}
                  >
                    {formatRupiah(netProfit)}
                  </h3>
                  <div
                    className="mt-2 text-[9px] font-bold px-2 py-0.5 rounded-md w-fit inline-block"
                    style={{ background: "rgba(200,168,107,0.1)", color: GOLD }}
                  >
                    Net Mgn: {profitMargin}%
                  </div>
                </Card>
              </div>
            )}

            {/* MODUL BARU: PENAGIHAN INVOICE B2B */}
            {activeWorkspace === "business" && (
              <Card className="p-6">
                <div className="flex justify-between items-center mb-5">
                  <SectionHeading>Penagihan B2B (Invoices)</SectionHeading>
                  <button
                    onClick={() => setIsInvoiceModalOpen(true)}
                    className="text-[10px] font-bold uppercase tracking-widest hover:opacity-80 transition-all"
                    style={{ color: GOLD }}
                  >
                    + Buat Invoice
                  </button>
                </div>

                {activeInvoices.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center py-8 border border-dashed border-[#2a2520] rounded-2xl">
                    <p className="text-[11px] text-[#5a5248] italic">
                      Semua tagihan sudah dibayar klien.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {activeInvoices.map((inv) => (
                      <div
                        key={inv.id}
                        className="p-4 rounded-xl flex justify-between items-center"
                        style={{
                          background: "rgba(255,255,255,0.02)",
                          border: `1px solid ${BORDER}`,
                        }}
                      >
                        <div>
                          <p className="text-[13px] font-bold text-white mb-0.5">
                            {inv.client_name}
                          </p>
                          <p className="text-[10px] text-[#a89880]">
                            ID: {inv.id.split("-")[0].toUpperCase()} • Tempo:{" "}
                            {inv.due_date
                              ? new Date(inv.due_date).toLocaleDateString(
                                  "id-ID",
                                )
                              : "-"}
                          </p>
                          <p className="text-[10px] text-[#6b6058] mt-1 line-clamp-1">
                            {inv.items}
                          </p>
                        </div>
                        <div className="text-right flex flex-col items-end">
                          <span className="text-[14px] font-bold text-white mb-2">
                            {formatRupiah(inv.amount)}
                          </span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handlePrintInvoice(inv)}
                              className="px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border border-[#c8a86b] text-[#c8a86b] hover:bg-[#c8a86b] hover:text-black"
                            >
                              Cetak PDF
                            </button>
                            <button
                              onClick={() => handleMarkInvoicePaid(inv)}
                              className="px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all bg-[#10b981] text-black hover:opacity-90"
                            >
                              Tandai Lunas
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}

            {activeWorkspace === "business" && (
              <Card className="p-6">
                <div className="flex justify-between items-center mb-5">
                  <SectionHeading>Katalog & Unit Economics</SectionHeading>
                  <button
                    onClick={() => setIsProductModalOpen(true)}
                    className="text-[10px] font-bold uppercase tracking-widest hover:opacity-80 transition-all"
                    style={{ color: GOLD }}
                  >
                    + Tambah SKU
                  </button>
                </div>

                {activeProducts.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center py-8 border border-dashed border-[#2a2520] rounded-2xl">
                    <p className="text-[11px] text-[#5a5248] italic">
                      Katalog produk masih kosong.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {activeProducts.map((p) => {
                      const itemMargin = Math.round(
                        ((p.selling_price - p.cogs) / p.selling_price) * 100,
                      );
                      return (
                        <div
                          key={p.id}
                          className="p-4 rounded-xl"
                          style={{
                            background: "rgba(255,255,255,0.02)",
                            border: `1px solid ${BORDER}`,
                          }}
                        >
                          <div className="flex justify-between items-start mb-3">
                            <p className="text-[13px] font-bold text-white">
                              {p.name}
                            </p>
                            <span
                              className="text-[10px] font-bold px-2 py-0.5 rounded-md"
                              style={{
                                background: `${EMERALD}15`,
                                color: EMERALD,
                              }}
                            >
                              Margin {itemMargin}%
                            </span>
                          </div>
                          <div className="flex justify-between text-[11px] mb-1">
                            <span className="text-[#6b6058]">Harga Jual:</span>
                            <span className="font-semibold text-white">
                              {formatRupiah(p.selling_price)}
                            </span>
                          </div>
                          <div className="flex justify-between text-[11px]">
                            <span className="text-[#6b6058]">
                              COGS (Modal):
                            </span>
                            <span className="font-semibold text-rose-400">
                              {formatRupiah(p.cogs)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            )}

            <Card className="p-6">
              <SectionHeading>
                Distribusi Pengeluaran{" "}
                {activeWorkspace === "business" ? "Bisnis" : "Pribadi"}
              </SectionHeading>
              <ExpenseChart transactions={activeTransactions} />
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="p-6 flex flex-col">
                <div className="flex justify-between items-center mb-5">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-0.5 h-4 rounded-full"
                      style={{ background: GOLD }}
                    />
                    <h2
                      className="text-[13px] font-semibold tracking-[0.06em] uppercase"
                      style={{ color: TEXT_MUTED }}
                    >
                      Project Costing
                    </h2>
                  </div>
                  <button
                    onClick={() => setIsProjectModalOpen(true)}
                    className="text-[10px] font-bold uppercase tracking-widest hover:opacity-80 transition-all"
                    style={{ color: GOLD }}
                  >
                    + Buat Proyek
                  </button>
                </div>

                {activeProjects.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center py-8 border border-dashed border-[#2a2520] rounded-2xl">
                    <p className="text-[11px] text-[#5a5248] italic">
                      Belum ada proyek aktif.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-5 flex-1">
                    {activeProjects.map((p) => {
                      const spent = activeTransactions
                        .filter(
                          (t) =>
                            t.project_id === p.id &&
                            t.categories?.type === "expense",
                        )
                        .reduce((s, t) => s + t.amount, 0);
                      const limit = Number(p.budget_limit) || 1;
                      const percent = Math.min(
                        Math.round((spent / limit) * 100),
                        100,
                      );
                      const isWarning = percent >= 85;

                      return (
                        <div key={p.id} className="group">
                          <div className="flex justify-between items-end mb-2.5">
                            <div>
                              <p className="text-[13px] font-semibold text-[#e8ddd0]">
                                {p.name}
                              </p>
                              <p className="text-[11px] text-[#6b6058] mt-0.5">
                                Terpakai{" "}
                                <span className="text-[#a89880] font-medium">
                                  {formatRupiah(spent)}
                                </span>
                              </p>
                            </div>
                            <div className="text-right">
                              <p
                                className="text-xs font-bold tabular-nums"
                                style={{ color: isWarning ? CORAL : GOLD }}
                              >
                                {percent}%
                              </p>
                              <p className="text-[11px] text-[#6b6058] mt-0.5">
                                dari {formatRupiah(p.budget_limit)}
                              </p>
                            </div>
                          </div>
                          <div className="relative h-[3px] bg-[#1e1c18] rounded-full overflow-hidden">
                            <div
                              className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
                              style={{
                                width: `${percent}%`,
                                background: isWarning ? CORAL : GOLD,
                                boxShadow: isWarning
                                  ? `0 0 8px ${CORAL}80`
                                  : `0 0 8px ${GOLD}80`,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>

              {activeWorkspace === "personal" && (
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
              )}
              {activeWorkspace === "business" && (
                <Card className="p-6">
                  <SectionHeading>Batas Anggaran Operasional</SectionHeading>
                  <BudgetProgress
                    budgets={budgets}
                    transactions={activeTransactions}
                  />
                </Card>
              )}
            </div>

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

      {/* ─── MODAL INVOICE B2B BARU ─────────────────────────────────────────────── */}
      {isInvoiceModalOpen && (
        <Modal onClose={() => setIsInvoiceModalOpen(false)}>
          <div className="mb-6">
            <p
              className="text-[10px] font-semibold uppercase tracking-[0.14em] mb-2"
              style={{ color: GOLD }}
            >
              B2B Penagihan
            </p>
            <h2 className="text-xl font-bold" style={{ color: TEXT_PRIMARY }}>
              Buat Invoice Klien
            </h2>
          </div>
          <form onSubmit={handleAddInvoice} className="space-y-4">
            <div>
              <FieldLabel>Nama Klien / Perusahaan</FieldLabel>
              <GoldInput
                type="text"
                required
                value={invClient}
                onChange={(e) => setInvClient(e.target.value)}
                placeholder="cth. PT. Makmur Jaya / BEM Kampus"
              />
            </div>
            <div>
              <FieldLabel>Nominal Tagihan (Rp)</FieldLabel>
              <GoldInput
                type="number"
                required
                min="1"
                value={invAmount}
                onChange={(e) => setInvAmount(e.target.value)}
                placeholder="0"
              />
            </div>
            <div>
              <FieldLabel>Deskripsi / Item Pesanan</FieldLabel>
              <GoldInput
                type="text"
                value={invItems}
                onChange={(e) => setInvItems(e.target.value)}
                placeholder="cth. 50pcs Snack KressPedia"
              />
            </div>
            <div>
              <FieldLabel>Tenggat Waktu Bayar</FieldLabel>
              <GoldInput
                type="date"
                value={invDueDate}
                onChange={(e) => setInvDueDate(e.target.value)}
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
              {isSubmitting ? "Memproses..." : "Buat Tagihan"}
            </button>
          </form>
        </Modal>
      )}

      {/* ─── MODAL BRANKAS PAJAK (TAX RESERVE) ────────────────────────────────── */}
      {isTaxModalOpen && (
        <Modal onClose={() => setIsTaxModalOpen(false)}>
          <div className="mb-6">
            <p
              className="text-[10px] font-semibold uppercase tracking-[0.14em] mb-2"
              style={{ color: GOLD }}
            >
              Manajemen Risiko
            </p>
            <h2 className="text-xl font-bold" style={{ color: TEXT_PRIMARY }}>
              Catat Potongan Pajak
            </h2>
          </div>
          <form onSubmit={handleAddTaxReserve} className="space-y-4">
            <div>
              <FieldLabel>Nama Platform / Penahan Dana</FieldLabel>
              <GoldInput
                type="text"
                required
                value={taxPlatform}
                onChange={(e) => setTaxPlatform(e.target.value)}
                placeholder="cth. Shutterstock / Google"
              />
            </div>
            <div>
              <FieldLabel>Nominal Ditahan / Dipotong (Rp)</FieldLabel>
              <GoldInput
                type="number"
                required
                min="1"
                value={taxAmountInput}
                onChange={(e) => setTaxAmountInput(e.target.value)}
                placeholder="0"
              />
            </div>
            <div>
              <FieldLabel>Keterangan Tambahan</FieldLabel>
              <GoldInput
                type="text"
                value={taxDesc}
                onChange={(e) => setTaxDesc(e.target.value)}
                placeholder="cth. Potongan otomatis 30%"
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-xl text-[13px] font-semibold mt-2 transition-all hover:opacity-90"
              style={{
                background: `linear-gradient(135deg, #a03520, ${CORAL})`,
                color: "#fff",
                opacity: isSubmitting ? 0.6 : 1,
              }}
            >
              {isSubmitting ? "Menyimpan..." : "Amankan Catatan"}
            </button>
          </form>
        </Modal>
      )}

      {/* ─── MODAL LAINNYA ────────────────────────────────────────────────────── */}
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
              <div
                className="p-5 rounded-xl relative overflow-hidden group"
                style={{
                  background: "rgba(232,115,90,0.05)",
                  border: `1px solid rgba(232,115,90,0.2)`,
                }}
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-rose-500/10 to-transparent rounded-bl-full pointer-events-none" />
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
              <div
                className="p-5 rounded-xl relative overflow-hidden group"
                style={{
                  background: "rgba(200,168,107,0.05)",
                  border: `1px solid rgba(200,168,107,0.2)`,
                }}
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-amber-500/10 to-transparent rounded-bl-full pointer-events-none" />
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

      {isProductModalOpen && (
        <Modal onClose={() => setIsProductModalOpen(false)}>
          <div className="mb-6">
            <p
              className="text-[10px] font-semibold uppercase tracking-[0.14em] mb-2"
              style={{ color: GOLD }}
            >
              Katalog Bisnis
            </p>
            <h2 className="text-xl font-bold" style={{ color: TEXT_PRIMARY }}>
              Tambah SKU Produk
            </h2>
          </div>
          <form onSubmit={handleAddProduct} className="space-y-4">
            <div>
              <FieldLabel>Nama Produk / Varian</FieldLabel>
              <GoldInput
                type="text"
                required
                value={newProductName}
                onChange={(e) => setNewProductName(e.target.value)}
                placeholder="cth. Snack Varian Pedas"
              />
            </div>
            <div>
              <FieldLabel>COGS / Harga Pokok Produksi (Rp)</FieldLabel>
              <GoldInput
                type="number"
                required
                min="0"
                value={newProductCOGS}
                onChange={(e) => setNewProductCOGS(e.target.value)}
                placeholder="0"
              />
            </div>
            <div>
              <FieldLabel>Harga Jual Konsumen (Rp)</FieldLabel>
              <GoldInput
                type="number"
                required
                min="1"
                value={newProductPrice}
                onChange={(e) => setNewProductPrice(e.target.value)}
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
              {isSubmitting ? "Menyimpan..." : "Simpan Produk"}
            </button>
          </form>
        </Modal>
      )}

      {isProjectModalOpen && (
        <Modal onClose={() => setIsProjectModalOpen(false)}>
          <div className="mb-6">
            <p
              className="text-[10px] font-semibold uppercase tracking-[0.14em] mb-2"
              style={{ color: GOLD }}
            >
              Project Costing
            </p>
            <h2 className="text-xl font-bold" style={{ color: TEXT_PRIMARY }}>
              Buat Proyek Baru
            </h2>
          </div>
          <form onSubmit={handleAddProject} className="space-y-4">
            <div>
              <FieldLabel>Nama Proyek / Acara</FieldLabel>
              <GoldInput
                type="text"
                required
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="cth. Modal Awal Usaha"
              />
            </div>
            <div>
              <FieldLabel>Batas Anggaran Proyek (Rp)</FieldLabel>
              <GoldInput
                type="number"
                required
                min="1"
                value={newProjectBudget}
                onChange={(e) => setNewProjectBudget(e.target.value)}
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
              {isSubmitting ? "Menyimpan..." : "Buat Proyek"}
            </button>
          </form>
        </Modal>
      )}

      {isDebtModalOpen && (
        <Modal onClose={() => setIsDebtModalOpen(false)}>
          <div className="mb-6">
            <p
              className="text-[10px] font-semibold uppercase tracking-[0.14em] mb-2"
              style={{ color: GOLD }}
            >
              Hutang & Piutang
            </p>
            <h2 className="text-xl font-bold" style={{ color: TEXT_PRIMARY }}>
              Catat Bon Baru
            </h2>
          </div>
          <form onSubmit={handleAddDebt} className="space-y-4">
            <div
              className="flex p-0.5 rounded-xl"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: `1px solid ${BORDER}`,
              }}
            >
              <button
                type="button"
                onClick={() => setDebtType("payable")}
                className="flex-1 py-2 text-[11px] font-semibold rounded-xl transition-all"
                style={{
                  background:
                    debtType === "payable" ? `${CORAL}15` : "transparent",
                  color: debtType === "payable" ? CORAL : TEXT_MUTED,
                  border:
                    debtType === "payable"
                      ? `1px solid ${CORAL}30`
                      : "1px solid transparent",
                }}
              >
                Hutang (Saya Pinjam)
              </button>
              <button
                type="button"
                onClick={() => setDebtType("receivable")}
                className="flex-1 py-2 text-[11px] font-semibold rounded-xl transition-all"
                style={{
                  background:
                    debtType === "receivable" ? `${EMERALD}15` : "transparent",
                  color: debtType === "receivable" ? EMERALD : TEXT_MUTED,
                  border:
                    debtType === "receivable"
                      ? `1px solid ${EMERALD}30`
                      : "1px solid transparent",
                }}
              >
                Piutang (Teman Pinjam)
              </button>
            </div>
            <div>
              <FieldLabel>Nama Pihak Terkait</FieldLabel>
              <GoldInput
                type="text"
                required
                value={debtPerson}
                onChange={(e) => setDebtPerson(e.target.value)}
                placeholder="cth. Budi / Vendor Spanduk"
              />
            </div>
            <div>
              <FieldLabel>Nominal (Rp)</FieldLabel>
              <GoldInput
                type="number"
                required
                min="1"
                value={debtAmount}
                onChange={(e) => setDebtAmount(e.target.value)}
                placeholder="0"
              />
            </div>
            <div>
              <FieldLabel>Tenggat Waktu (Opsional)</FieldLabel>
              <GoldInput
                type="date"
                value={debtDueDate}
                onChange={(e) => setDebtDueDate(e.target.value)}
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
              {isSubmitting ? "Menyimpan..." : "Catat"}
            </button>
          </form>
        </Modal>
      )}

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
                      setTxProjectId("");
                      setIsProductSale(false);
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

            {txType === "income" && activeWorkspace === "business" && (
              <div
                className="flex p-0.5 rounded-xl mb-4"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: `1px solid ${BORDER}`,
                }}
              >
                <button
                  type="button"
                  onClick={() => setIsProductSale(false)}
                  className="flex-1 py-2 text-[11px] font-semibold rounded-xl transition-all"
                  style={{
                    background: !isProductSale ? `${GOLD}15` : "transparent",
                    color: !isProductSale ? GOLD : TEXT_MUTED,
                  }}
                >
                  Pemasukan Lain
                </button>
                <button
                  type="button"
                  onClick={() => setIsProductSale(true)}
                  className="flex-1 py-2 text-[11px] font-semibold rounded-xl transition-all"
                  style={{
                    background: isProductSale ? `${EMERALD}15` : "transparent",
                    color: isProductSale ? EMERALD : TEXT_MUTED,
                  }}
                >
                  Penjualan Produk
                </button>
              </div>
            )}

            <div>
              <FieldLabel>
                {txType === "transfer" ? "Dari Dompet" : "Pilih Dompet Masuk"}
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
            ) : isProductSale ? (
              <>
                <div>
                  <FieldLabel>Pilih Produk / SKU</FieldLabel>
                  <GoldSelect
                    required
                    value={txProductId}
                    onChange={(e) => setTxProductId(e.target.value)}
                  >
                    <option value="" disabled>
                      -- Pilih dari Katalog --
                    </option>
                    {activeProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (Rp {p.selling_price})
                      </option>
                    ))}
                  </GoldSelect>
                </div>
                <div>
                  <FieldLabel>Kategori (Otomatis: Penjualan)</FieldLabel>
                  <GoldSelect
                    required
                    value={txCategoryId}
                    onChange={(e) => setTxCategoryId(e.target.value)}
                  >
                    <option value="" disabled>
                      Pilih kategori...
                    </option>
                    {categories
                      .filter((c) => c.type === "income")
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </GoldSelect>
                </div>
                <div>
                  <FieldLabel>Kuantitas Terjual</FieldLabel>
                  <GoldInput
                    type="number"
                    required
                    min="1"
                    value={txQuantity}
                    onChange={(e) => setTxQuantity(e.target.value)}
                    placeholder="1"
                  />
                </div>
              </>
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

            {!isProductSale && (
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
            )}

            <div>
              <FieldLabel>Catatan (Opsional)</FieldLabel>
              <GoldInput
                type="text"
                value={txDesc}
                onChange={(e) => setTxDesc(e.target.value)}
                placeholder={
                  isProductSale ? "cth. Pesanan GrabFood" : "Opsional..."
                }
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-xl text-[13px] font-semibold transition-all hover:opacity-90 mt-4"
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
              {isSubmitting
                ? "Menyimpan..."
                : isProductSale
                  ? "Simpan Penjualan"
                  : "Simpan"}
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
