import { useLanguage } from "@/hooks/useLanguage";

interface DateInputSeparateProps {
  value: string; // "YYYY-MM-DD" or ""
  onChange: (value: string) => void;
  yearRange?: [number, number];
}

export function DateInputSeparate({ value, onChange, yearRange }: DateInputSeparateProps) {
  const { t } = useLanguage();
  const parts = value ? value.split("-") : ["", "", ""];
  const year = parts[0] || "";
  const month = parts[1] || "";
  const day = parts[2] || "";

  const currentYear = new Date().getFullYear();
  const [startYear, endYear] = yearRange || [1940, currentYear];

  const years = Array.from({ length: endYear - startYear + 1 }, (_, i) => endYear - i);
  const months = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
  const daysInMonth = year && month ? new Date(Number(year), Number(month), 0).getDate() : 31;
  const days = Array.from({ length: daysInMonth }, (_, i) => String(i + 1).padStart(2, "0"));

  const update = (y: string, m: string, d: string) => {
    if (y && m && d) {
      onChange(`${y}-${m}-${d}`);
    } else if (y || m || d) {
      onChange(`${y || "____"}-${m || "__"}-${d || "__"}`);
    } else {
      onChange("");
    }
  };

  const selectClass =
    "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none cursor-pointer";

  return (
    <div className="grid grid-cols-3 gap-2">
      <select
        className={selectClass}
        value={year}
        onChange={(e) => update(e.target.value, month, day)}
      >
        <option value="">{t("date.year")}</option>
        {years.map((y) => (
          <option key={y} value={String(y)}>{y}</option>
        ))}
      </select>
      <select
        className={selectClass}
        value={month}
        onChange={(e) => update(year, e.target.value, day)}
      >
        <option value="">{t("date.month")}</option>
        {months.map((m) => (
          <option key={m} value={m}>{Number(m)}-{t("date.monthSuffix")}</option>
        ))}
      </select>
      <select
        className={selectClass}
        value={day}
        onChange={(e) => update(year, month, e.target.value)}
      >
        <option value="">{t("date.day")}</option>
        {days.map((d) => (
          <option key={d} value={d}>{Number(d)}</option>
        ))}
      </select>
    </div>
  );
}
