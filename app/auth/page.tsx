"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function AuthPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");

    try {
      if (isLogin) {
        // Proses Login
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;

        // Jika sukses, lempar ke dashboard
        router.push("/dashboard");
      } else {
        // Proses Daftar (Register)
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;

        alert("Pendaftaran berhasil! Silakan masuk dengan akun barumu.");
        setIsLogin(true); // Ubah tampilan kembali ke form login
        setPassword(""); // Kosongkan password demi keamanan
      }
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Terjadi kesalahan sistem.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-chill-bg flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Ambient (Senada dengan Landing Page) */}
      <div className="absolute top-0 left-[-10%] w-[400px] h-[400px] rounded-full bg-neon-cyan/5 blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-md z-10">
        {/* Tombol Kembali */}
        <Link
          href="/"
          className="text-slate-400 hover:text-neon-cyan flex items-center gap-2 mb-8 transition-colors text-sm font-medium w-fit"
        >
          <span>←</span> Kembali ke Beranda
        </Link>

        {/* Card Glassmorphism */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl">
          <h2 className="text-3xl font-bold text-white mb-2">
            {isLogin ? "Selamat Datang" : "Mulai Perjalanan"}
          </h2>
          <p className="text-slate-400 mb-8 text-sm">
            {isLogin
              ? "Masuk ke akun untuk melihat arus kas harianmu."
              : "Buat akun baru untuk mengelola finansialmu dengan elegan."}
          </p>

          {/* Pesan Error */}
          {errorMessage && (
            <div className="mb-6 p-3 rounded-xl bg-neon-coral/10 border border-neon-coral/20 text-neon-coral text-sm">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan transition-all"
                placeholder="nama@email.com"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Kata Sandi
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan transition-all"
                placeholder="Minimal 6 karakter"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 rounded-xl bg-neon-cyan text-chill-bg font-bold text-md hover:bg-cyan-300 transition-all shadow-[0_0_15px_rgba(34,211,238,0.3)] disabled:opacity-50 mt-4"
            >
              {isLoading ? "Memproses..." : isLogin ? "Masuk" : "Daftar Akun"}
            </button>
          </form>

          {/* Toggle Login/Register */}
          <div className="mt-8 text-center">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setErrorMessage(""); // Bersihkan error saat ganti mode
              }}
              className="text-sm text-slate-400 hover:text-white transition-colors"
            >
              {isLogin ? "Belum punya akun? " : "Sudah punya akun? "}
              <span className="text-neon-cyan font-medium underline underline-offset-4 decoration-neon-cyan/30">
                {isLogin ? "Daftar di sini" : "Masuk sekarang"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
