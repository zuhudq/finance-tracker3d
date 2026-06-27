"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";

export interface Transaction {
  id: string;
  amount: number;
  description: string;
  created_at: string;
  categories: { id?: string; name: string; type: string } | null;
  accounts: { name: string } | null;
}

interface ExpenseChartProps {
  transactions: Transaction[];
}

// 1. Mendefinisikan tipe data dengan ketat agar TypeScript bahagia
interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number }>;
}

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const formattedValue = new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(payload[0].value);

    return (
      <div
        style={{
          background: "rgba(18,15,12,0.95)",
          border: "1px solid rgba(200,168,107,0.2)",
          borderRadius: "12px",
          padding: "10px 14px",
          backdropFilter: "blur(12px)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
        }}
      >
        <p
          style={{
            color: "#a89880",
            fontSize: "11px",
            marginBottom: "3px",
            fontWeight: 500,
          }}
        >
          {payload[0].name}
        </p>
        <p style={{ color: "#c8a86b", fontSize: "15px", fontWeight: 700 }}>
          {formattedValue}
        </p>
      </div>
    );
  }
  return null;
};

// 2. Tipe data khusus untuk elemen legenda Recharts
interface LegendItem {
  value: string;
  color: string;
}

interface CustomLegendProps {
  payload?: LegendItem[];
}

const renderCustomLegend = (props: CustomLegendProps) => {
  const { payload } = props;
  if (!payload) return null;
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "8px 16px",
        justifyContent: "center",
        marginTop: "4px",
      }}
    >
      {/* Parameter entry dan index sekarang otomatis dikenali tipe datanya */}
      {payload.map((entry: LegendItem, index: number) => (
        <div
          key={index}
          style={{ display: "flex", alignItems: "center", gap: 6 }}
        >
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: entry.color,
              boxShadow: `0 0 6px ${entry.color}80`,
            }}
          />
          <span style={{ color: "#6b6058", fontSize: "11px", fontWeight: 500 }}>
            {entry.value}
          </span>
        </div>
      ))}
    </div>
  );
};

export default function ExpenseChart({ transactions }: ExpenseChartProps) {
  const expenses = transactions.filter(
    (tx) => tx.categories?.type === "expense",
  );

  if (expenses.length === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center gap-2">
        <div className="w-16 h-16 rounded-full border border-dashed border-[#2a2520] flex items-center justify-center">
          <span className="text-2xl opacity-30">◎</span>
        </div>
        <p className="text-[13px] text-[#5a5248] italic">
          Belum ada data pengeluaran.
        </p>
      </div>
    );
  }

  const dataMap: Record<string, number> = {};
  expenses.forEach((tx) => {
    const catName = tx.categories?.name || "Lainnya";
    if (!dataMap[catName]) {
      dataMap[catName] = 0;
    }
    dataMap[catName] += tx.amount;
  });

  const data = Object.keys(dataMap).map((key) => ({
    name: key,
    value: dataMap[key],
  }));

  const COLORS = [
    "#c8a86b",
    "#e8735a",
    "#8a7060",
    "#a89050",
    "#c07858",
    "#907850",
  ];

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="48%"
            innerRadius={62}
            outerRadius={82}
            paddingAngle={4}
            dataKey="value"
            stroke="none"
            startAngle={90}
            endAngle={-270}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>
          {/* Menggunakan @ts-expect-error agar linter mengabaikan aturan internal Recharts dengan aman */}
          <Tooltip content={<CustomTooltip />} />
          {/* @ts-expect-error : Recharts internal type mismatch */}
          <Legend content={renderCustomLegend} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
