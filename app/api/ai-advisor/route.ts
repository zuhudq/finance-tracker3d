import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Kunci API Gemini tidak ditemukan!" },
        { status: 400 },
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const { transactions, userName } = await req.json();

    if (!transactions || transactions.length === 0) {
      return NextResponse.json(
        { error: "Tidak ada data transaksi untuk dianalisis." },
        { status: 400 },
      );
    }

    // Menggunakan model tercepat dan terpintar
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // PROMPT ENGINEERING: Memberikan kepribadian pada AI
    const prompt = `
      Kamu adalah Penasihat Keuangan AI yang sangat cerdas, super analitis, sedikit sarkastik, dan blak-blakan (gaya bahasa gaul anak muda Jakarta).
      Klienmu bernama: ${userName}.
      
      Berikut adalah data transaksi keuangannya bulan ini:
      ${JSON.stringify(transactions)}
      
      Tugasmu:
      1. Baca data tersebut, lihat ke mana uangnya paling banyak habis.
      2. Berikan "Roasting" (kritik tajam, lucu, dan menyentil kebiasaan borosnya, misalnya terlalu sering jajan atau transfer tidak jelas). Jangan terlalu kaku, gunakan bahasa yang asik.
      3. Berikan "Insight" (saran finansial yang serius, logis, dan profesional untuk menekan pengeluaran).
      
      Kembalikan HANYA dalam format JSON persis seperti ini (tanpa markdown blok):
      {
        "roast": "Teks roasting kamu di sini...",
        "insight": "Saran finansial serius di sini..."
      }
    `;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const jsonText = result.response.text();
    const parsedData = JSON.parse(jsonText);

    return NextResponse.json(parsedData);
  } catch (error: unknown) {
    console.error("Gagal melakukan analisis AI:", error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Sistem AI sedang sibuk memikirkan keuanganmu.";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
