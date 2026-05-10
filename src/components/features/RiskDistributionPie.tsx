import { memo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface PieDatum {
  name: string;
  value: number;
  color: string;
}

interface Props {
  pieData: PieDatum[];
  total: number;
}

function RiskDistributionPieInner({ pieData, total }: Props) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <defs>
          <linearGradient id="grad-high" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="hsl(var(--destructive))" stopOpacity={1} />
            <stop offset="100%" stopColor="hsl(var(--destructive))" stopOpacity={0.65} />
          </linearGradient>
          <linearGradient id="grad-medium" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="hsl(var(--warning))" stopOpacity={1} />
            <stop offset="100%" stopColor="hsl(var(--warning))" stopOpacity={0.65} />
          </linearGradient>
          <linearGradient id="grad-low" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity={1} />
            <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity={0.65} />
          </linearGradient>
        </defs>
        <Pie
          data={pieData}
          cx="50%"
          cy="50%"
          innerRadius={62}
          outerRadius={92}
          paddingAngle={4}
          dataKey="value"
          stroke="hsl(var(--background))"
          strokeWidth={3}
          startAngle={90}
          endAngle={-270}
          isAnimationActive={false}
        >
          {pieData.map((entry, i) => {
            const gradId = entry.color.includes("destructive")
              ? "grad-high"
              : entry.color.includes("warning")
                ? "grad-medium"
                : "grad-low";
            return <Cell key={i} fill={`url(#${gradId})`} />;
          })}
        </Pie>
        <Tooltip
          contentStyle={{
            borderRadius: 10,
            fontSize: 12,
            border: "1px solid hsl(var(--border))",
            background: "hsl(var(--popover) / 0.95)",
            boxShadow: "0 8px 24px hsl(var(--foreground) / 0.08)",
          }}
          formatter={(value: number, name: string) => {
            const pct = total > 0 ? ((value / total) * 100).toFixed(0) : 0;
            return [`${value} (${pct}%)`, name];
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

const RiskDistributionPie = memo(RiskDistributionPieInner);
export default RiskDistributionPie;
