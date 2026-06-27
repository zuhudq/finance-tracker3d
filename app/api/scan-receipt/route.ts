import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "Kunci API Gemini tidak ditemukan! Pastikan file .env.local sudah dibuat dan server di-restart.",
        },
        { status: 400 },
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const { imageBase64, mimeType } = await req.json();

    if (!imageBase64) {
      return NextResponse.json(
        { error: "Data gambar kosong saat sampai di server." },
        { status: 400 },
      );
    }

    // PERBAIKAN: Format ID Model ditulis dengan huruf kecil dan tanda strip tanpa spasi
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
      Analisis gambar struk, nota, atau tangkapan layar transaksi ini. 
      Cari 2 hal:
      1. amount: Angka total pengeluaran atau total belanja (HANYA angka bulat, hilangkan Rp, titik, atau koma).
      2. description: Nama toko, merchant, atau ringkasan barang yang dibeli (Maksimal 5 kata).
      
      Kembalikan HANYA format JSON murni.
    `;

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

    const jsonText = result.response.text();
    const parsedData = JSON.parse(jsonText);

    return NextResponse.json(parsedData);
  } catch (error: unknown) {
    console.error("Gagal memindai struk secara sistem:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Gangguan server tidak dikenal";

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
