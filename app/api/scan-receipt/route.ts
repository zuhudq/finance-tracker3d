import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
  try {
    const { imageBase64, mimeType } = await req.json();

    if (!imageBase64) {
      return NextResponse.json(
        { error: "Gambar tidak ditemukan" },
        { status: 400 },
      );
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Prompt yang lebih cerdas dan tahan banting
    const prompt = `
      Analisis gambar struk, nota, atau tangkapan layar transaksi ini. 
      Cari 2 hal:
      1. amount: Angka total pengeluaran atau total belanja (HANYA angka bulat, hilangkan Rp, titik, atau koma).
      2. description: Nama toko, merchant, atau ringkasan barang yang dibeli (Maksimal 5 kata).
      
      Jika gambar tidak terlihat seperti struk atau tidak ada angka yang masuk akal, kembalikan amount: 0 dan description: "Tidak dapat dikenali".
    `;

    // Konfigurasi rahasia untuk memaksa output HANYA berupa JSON
    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: imageBase64,
                mimeType: mimeType || "image/jpeg",
              },
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    // Karena sudah dipaksa jadi JSON, kita tidak perlu repot-repot regex markdown lagi!
    const jsonText = result.response.text();
    const parsedData = JSON.parse(jsonText);

    return NextResponse.json(parsedData);
  } catch (error) {
    console.error("Gagal memindai struk:", error);
    return NextResponse.json(
      { error: "Gagal memproses gambar struk" },
      { status: 500 },
    );
  }
}
