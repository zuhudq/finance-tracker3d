"use client";

interface Goal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  icon: string | null;
  deadline: string | null;
}

interface FinancialGoalsProps {
  goals: Goal[];
  onOpenTopUp: (id: string, name: string) => void; // Fungsi baru untuk trigger modal
}

export default function FinancialGoals({
  goals,
  onOpenTopUp,
}: FinancialGoalsProps) {
  const formatRupiah = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(value);
  };

  if (goals.length === 0) {
    return (
      <div className="p-6 text-center border border-dashed border-white/10 rounded-2xl bg-white/5">
        <p className="text-sm text-slate-500 italic">
          Belum ada target tabungan yang dibuat.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      {goals.map((goal) => {
        const percent = Math.min(
          Math.round(
            (Number(goal.current_amount) / Number(goal.target_amount)) * 100,
          ),
          100,
        );

        return (
          <div
            key={goal.id}
            className="p-5 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all flex flex-col justify-between gap-4"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 shrink-0 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-2xl border border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                {goal.icon || "🎯"}
              </div>
              <div className="flex-1 w-full overflow-hidden">
                <div className="flex justify-between items-start mb-1">
                  {/* Perbaikan pada truncate agar teks tidak terpotong aneh */}
                  <p
                    className="text-white font-semibold truncate pr-2"
                    title={goal.name}
                  >
                    {goal.name}
                  </p>
                  <p className="text-indigo-400 font-bold text-sm bg-indigo-500/10 px-2 py-0.5 rounded-lg shrink-0">
                    {percent}%
                  </p>
                </div>
                {goal.deadline && (
                  <p className="text-xs text-slate-400">
                    Target:{" "}
                    {new Date(goal.deadline).toLocaleDateString("id-ID", {
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2 mt-2">
              <div className="w-full h-3 bg-black/30 rounded-full overflow-hidden border border-white/5 relative">
                <div
                  className="h-full bg-linear-to-r from-indigo-600 to-indigo-400 rounded-full transition-all duration-1000 relative overflow-hidden shadow-[0_0_10px_rgba(129,140,248,0.5)]"
                  style={{ width: `${percent}%` }}
                >
                  <div className="absolute top-0 left-0 w-full h-full bg-white/20 blur-[2px] animate-pulse"></div>
                </div>
              </div>
              <div className="flex justify-between text-xs text-slate-400 font-medium">
                <p>
                  Terkumpul:{" "}
                  <span className="text-slate-200">
                    {formatRupiah(goal.current_amount)}
                  </span>
                </p>
                <p>{formatRupiah(goal.target_amount)}</p>
              </div>
            </div>

            {/* TOMBOL ISI SALDO BARU */}
            <button
              onClick={() => onOpenTopUp(goal.id, goal.name)}
              className="w-full mt-2 py-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/20 transition-all text-xs font-bold uppercase tracking-wider"
            >
              + Isi Saldo Target
            </button>
          </div>
        );
      })}
    </div>
  );
}
