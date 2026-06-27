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
      <div className="py-10 text-center border border-dashed border-[#2a2520] rounded-2xl">
        <p className="text-[13px] text-[#5a5248] italic">
          Belum ada batas anggaran yang diatur bulan ini.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
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

        return (
          <div key={budget.id} className="group">
            <div className="flex justify-between items-end mb-2.5">
              <div>
                <p className="text-[13px] font-semibold text-[#e8ddd0] tracking-wide">
                  {budget.categories?.name || "Kategori"}
                </p>
                <p className="text-[11px] text-[#6b6058] mt-0.5">
                  Terpakai{" "}
                  <span className="text-[#a89880] font-medium">
                    {formatRupiah(totalSpent)}
                  </span>
                </p>
              </div>
              <div className="text-right">
                <p
                  className={`text-xs font-bold tabular-nums ${isUrgent ? "text-[#e8735a]" : "text-[#c8a86b]"}`}
                >
                  {percentUsed}%
                </p>
                <p className="text-[11px] text-[#6b6058] mt-0.5">
                  dari {formatRupiah(budget.amount_limit)}
                </p>
              </div>
            </div>

            {/* Track */}
            <div className="relative h-0.75 bg-[#1e1c18] rounded-full overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${percentUsed}%`,
                  background: isUrgent
                    ? "linear-gradient(90deg, #c0422a, #e8735a)"
                    : "linear-gradient(90deg, #8a6a30, #c8a86b)",
                  boxShadow: isUrgent
                    ? "0 0 8px rgba(232,115,90,0.5)"
                    : "0 0 8px rgba(200,168,107,0.4)",
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
