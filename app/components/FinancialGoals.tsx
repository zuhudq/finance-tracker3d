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
  onOpenTopUp: (id: string, name: string) => void;
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
      <div className="py-10 text-center border border-dashed border-[#2a2520] rounded-2xl">
        <p className="text-[13px] text-[#5a5248] italic">
          Belum ada target tabungan yang dibuat.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3">
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
            className="p-4 rounded-2xl border border-[#2a2218] bg-[#0f0d0a] hover:border-[#3a3020] transition-all duration-300 group"
            style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.3)" }}
          >
            <div className="flex items-start gap-3 mb-4">
              {/* Icon */}
              <div
                className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center text-lg"
                style={{
                  background: "rgba(200,168,107,0.08)",
                  border: "1px solid rgba(200,168,107,0.15)",
                }}
              >
                {goal.icon || "◎"}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <p
                    className="text-[13px] font-semibold text-[#e8ddd0] truncate pr-2"
                    title={goal.name}
                  >
                    {goal.name}
                  </p>
                  <span
                    className="text-[11px] font-bold tabular-nums shrink-0 px-2 py-0.5 rounded-md"
                    style={{
                      color: "#c8a86b",
                      background: "rgba(200,168,107,0.08)",
                    }}
                  >
                    {percent}%
                  </span>
                </div>
                {goal.deadline && (
                  <p className="text-[11px] text-[#6b6058] mt-0.5">
                    {new Date(goal.deadline).toLocaleDateString("id-ID", {
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                )}
              </div>
            </div>

            {/* Progress */}
            <div className="mb-3">
              <div className="relative h-0.5 bg-[#1e1c18] rounded-full overflow-hidden mb-2.5">
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000"
                  style={{
                    width: `${percent}%`,
                    background: "linear-gradient(90deg, #8a6a30, #c8a86b)",
                    boxShadow: "0 0 8px rgba(200,168,107,0.4)",
                  }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-[#6b6058]">
                <span className="text-[#a89880]">
                  {formatRupiah(goal.current_amount)}
                </span>
                <span>{formatRupiah(goal.target_amount)}</span>
              </div>
            </div>

            {/* CTA */}
            <button
              onClick={() => onOpenTopUp(goal.id, goal.name)}
              className="w-full py-2 rounded-xl text-[11px] font-semibold uppercase tracking-widest transition-all duration-200"
              style={{
                color: "#c8a86b",
                background: "rgba(200,168,107,0.06)",
                border: "1px solid rgba(200,168,107,0.12)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  "rgba(200,168,107,0.12)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  "rgba(200,168,107,0.06)";
              }}
            >
              + Isi Saldo Target
            </button>
          </div>
        );
      })}
    </div>
  );
}
