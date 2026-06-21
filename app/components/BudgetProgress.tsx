"use client";

// STRUKTUR DATA KEMBAR IDENTIK
export interface Transaction {
  id: string;
  amount: number;
  description: string;
  created_at: string;
  categories: { id?: string; name: string; type: string } | null;
  accounts: { name: string } | null;
}

interface Budget {
  id: string;
  category_id: string;
  amount_limit: number;
  categories: { name: string } | null;
}

interface BudgetProgressProps {
  budgets: Budget[];
  transactions: Transaction[];
}

export default function BudgetProgress({
  budgets,
  transactions,
}: BudgetProgressProps) {
  const formatRupiah = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(value);
  };

  if (budgets.length === 0) {
    return (
      <div className="p-6 text-center border border-dashed border-white/10 rounded-2xl bg-white/5">
        <p className="text-sm text-slate-500 italic">
          Belum ada batas anggaran yang diatur bulan ini.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {budgets.map((budget) => {
        const totalSpent = transactions
          .filter(
            (tx) =>
              tx.categories?.type === "expense" &&
              tx.categories?.id === budget.category_id,
          )
          .reduce((sum, tx) => sum + Number(tx.amount), 0);

        const percentUsed = Math.min(
          Math.round((totalSpent / Number(budget.amount_limit)) * 100),
          100,
        );
        const isUrgent = percentUsed >= 80;
        const barColor = isUrgent ? "bg-neon-coral" : "bg-neon-cyan";
        const textColor = isUrgent ? "text-neon-coral" : "text-neon-cyan";

        return (
          <div key={budget.id} className="space-y-2">
            <div className="flex justify-between items-end text-sm">
              <div>
                <p className="text-white font-medium">
                  {budget.categories?.name || "Kategori"}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Terpakai:{" "}
                  <span className="font-semibold text-slate-200">
                    {formatRupiah(totalSpent)}
                  </span>
                </p>
              </div>
              <div className="text-right">
                <p className={`text-xs font-bold ${textColor}`}>
                  {percentUsed}%
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Batas: {formatRupiah(budget.amount_limit)}
                </p>
              </div>
            </div>
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden border border-white/5 relative">
              <div
                className={`h-full ${barColor} rounded-full transition-all duration-500`}
                style={{ width: `${percentUsed}%` }}
              ></div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
