"use client";

interface Subscription {
  id: string;
  name: string;
  amount: number;
  billing_date: number;
  status: string;
}

export default function SubscriptionRadar({
  subscriptions,
}: {
  subscriptions: Subscription[];
}) {
  const formatRupiah = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(value);
  };

  if (subscriptions.length === 0) {
    return (
      <div className="py-8 text-center border border-dashed border-[#2a2520] rounded-2xl">
        <p className="text-[11px] text-[#5a5248] italic">
          Tidak ada tagihan rutin aktif.
        </p>
      </div>
    );
  }

  const totalMonthly = subscriptions.reduce(
    (sum, sub) => sum + Number(sub.amount),
    0,
  );
  const today = new Date().getDate();

  return (
    <div className="space-y-3">
      {/* Summary card */}
      <div
        className="flex justify-between items-center p-4 rounded-2xl"
        style={{
          background:
            "linear-gradient(135deg, rgba(200,168,107,0.06), rgba(138,106,48,0.04))",
          border: "1px solid rgba(200,168,107,0.1)",
        }}
      >
        <div>
          <p className="text-[10px] text-[#6b6058] uppercase tracking-widest font-semibold mb-1">
            Total Beban Tetap
          </p>
          <p
            className="text-xl font-bold tracking-tight"
            style={{ color: "#c8a86b" }}
          >
            {formatRupiah(totalMonthly)}
          </p>
        </div>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-base"
          style={{
            background: "rgba(200,168,107,0.08)",
            border: "1px solid rgba(200,168,107,0.15)",
          }}
        >
          ⚡
        </div>
      </div>

      {/* List */}
      <div className="space-y-1.5">
        {subscriptions.map((sub) => {
          let daysLeft = sub.billing_date - today;
          if (daysLeft < 0) daysLeft += 30;
          const isDueSoon = daysLeft <= 5;

          return (
            <div
              key={sub.id}
              className="flex justify-between items-center px-3.5 py-3 rounded-xl transition-all duration-200"
              style={{
                background: "rgba(255,255,255,0.02)",
                border: isDueSoon
                  ? "1px solid rgba(232,115,90,0.2)"
                  : "1px solid rgba(255,255,255,0.04)",
              }}
            >
              <div className="flex items-center gap-3">
                {/* Dot indicator */}
                <div
                  className="w-1 h-7 rounded-full"
                  style={{
                    background: isDueSoon
                      ? "linear-gradient(180deg, #e8735a, #c0422a)"
                      : "rgba(255,255,255,0.08)",
                    boxShadow: isDueSoon
                      ? "0 0 6px rgba(232,115,90,0.5)"
                      : "none",
                  }}
                />
                <div>
                  <p className="text-[13px] text-[#d4c8bc] font-medium">
                    {sub.name}
                  </p>
                  <p
                    className="text-[10px] mt-0.5 uppercase tracking-wide"
                    style={{ color: isDueSoon ? "#e8735a" : "#5a5248" }}
                  >
                    {isDueSoon
                      ? `${daysLeft} hari lagi`
                      : `tgl. ${sub.billing_date}`}
                  </p>
                </div>
              </div>
              <p
                className="text-[13px] font-semibold tabular-nums"
                style={{ color: "#a89880" }}
              >
                {formatRupiah(sub.amount)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
