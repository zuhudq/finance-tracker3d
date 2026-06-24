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
      <div className="p-4 text-center border border-dashed border-white/10 rounded-2xl bg-white/5">
        <p className="text-xs text-slate-500 italic">
          Bebas dari beban tagihan rutin.
        </p>
      </div>
    );
  }

  // Hitung total beban bulanan
  const totalMonthly = subscriptions.reduce(
    (sum, sub) => sum + Number(sub.amount),
    0,
  );
  // Dapatkan tanggal hari ini (1-31)
  const today = new Date().getDate();

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-end mb-4 bg-white/5 p-4 rounded-2xl border border-white/5">
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
            Total Beban Tetap
          </p>
          <p className="text-2xl font-bold text-white mt-1">
            {formatRupiah(totalMonthly)}
          </p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center border border-amber-500/30 text-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
          ⚡
        </div>
      </div>

      <div className="space-y-3">
        {subscriptions.map((sub) => {
          // Logika sederhana untuk menghitung sisa hari
          let daysLeft = sub.billing_date - today;
          if (daysLeft < 0) daysLeft += 30; // Jika sudah lewat bulan ini, hitung untuk bulan depan

          // Peringatan jika tagihan kurang dari atau sama dengan 5 hari
          const isDueSoon = daysLeft <= 5;

          return (
            <div
              key={sub.id}
              className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all"
            >
              <div className="flex items-center gap-3">
                {/* Indikator Status */}
                <div
                  className={`w-1.5 h-8 rounded-full ${isDueSoon ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]" : "bg-slate-600"}`}
                ></div>
                <div>
                  <p className="text-sm text-white font-medium">{sub.name}</p>
                  <p
                    className={`text-[10px] mt-0.5 uppercase tracking-wide ${isDueSoon ? "text-amber-400 font-bold animate-pulse" : "text-slate-400"}`}
                  >
                    {isDueSoon
                      ? `Jatuh tempo dalam ${daysLeft} hari`
                      : `Tgl tagihan: ${sub.billing_date}`}
                  </p>
                </div>
              </div>
              <p className="font-semibold text-slate-200 text-sm">
                {formatRupiah(sub.amount)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
