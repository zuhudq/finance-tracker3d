"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";

// STRUKTUR DATA KEMBAR IDENTIK
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

const CustomTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { name: string; value: number }[];
}) => {
  if (active && payload && payload.length) {
    const formattedValue = new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(payload[0].value);

    return (
      <div className="bg-chill-bg/90 backdrop-blur-md border border-white/10 p-3 rounded-xl shadow-xl">
        <p className="text-white font-medium text-sm">{payload[0].name}</p>
        <p className="text-neon-coral font-bold mt-1">{formattedValue}</p>
      </div>
    );
  }
  return null;
};

export default function ExpenseChart({ transactions }: ExpenseChartProps) {
  const expenses = transactions.filter(
    (tx) => tx.categories?.type === "expense",
  );

  if (expenses.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center border border-dashed border-white/10 rounded-2xl bg-white/5">
        <p className="text-sm text-slate-500 italic">
          Belum ada data pengeluaran untuk dianalisis.
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

  const COLORS = ["#f43f5e", "#fb923c", "#facc15", "#2dd4bf", "#818cf8"];

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="bottom"
            height={36}
            iconType="circle"
            wrapperStyle={{ fontSize: "12px", color: "#94a3b8" }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
