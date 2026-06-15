import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-chill-bg flex flex-col items-center justify-center relative overflow-hidden">
      {/* Efek Cahaya Ambient di Background */}
      <div className="absolute top-[-20%] left-[-10%] w-125 h-125 rounded-full bg-neon-cyan/10 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-100 h-100 rounded-full bg-neon-coral/10 blur-[120px] pointer-events-none"></div>

      {/* Konten Utama */}
      <div className="z-10 flex flex-col items-center text-center px-6 max-w-4xl">
        {/* Badge Intro */}
        <div className="px-4 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-md mb-8">
          <span className="text-xs font-medium text-neon-cyan tracking-widest uppercase">
            Sistem Pencatatan Generasi Baru
          </span>
        </div>

        {/* Headline */}
        <h1 className="text-5xl md:text-7xl font-bold text-white tracking-tight leading-tight mb-6">
          Peta Arus Kas Harianmu, <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-cyan to-blue-500">
            Kini Lebih Terang.
          </span>
        </h1>

        {/* Sub-headline */}
        <p className="text-lg md:text-xl text-slate-400 mb-12 max-w-2xl leading-relaxed">
          Tinggalkan spreadsheet yang membosankan. Lacak ribuan transaksi
          harian, petakan kategori keuanganmu, dan kendalikan masa depan
          finansialmu dalam satu antarmuka yang elegan.
        </p>

        {/* Call to Action (CTA) Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <Link
            href="/auth?mode=register"
            className="px-8 py-4 rounded-2xl bg-neon-cyan text-chill-bg font-semibold text-lg hover:bg-cyan-300 transition-all shadow-[0_0_20px_rgba(34,211,238,0.4)]"
          >
            Mulai Sekarang
          </Link>
          <Link
            href="/auth?mode=login"
            className="px-8 py-4 rounded-2xl bg-white/5 text-white border border-white/10 font-medium text-lg hover:bg-white/10 transition-all backdrop-blur-md"
          >
            Masuk ke Akun
          </Link>
        </div>
      </div>
    </main>
  );
}
