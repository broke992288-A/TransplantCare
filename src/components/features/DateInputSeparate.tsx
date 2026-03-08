import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

  return (
    <div className="grid grid-cols-3 gap-2">
      <Select value={year} onValueChange={(v) => update(v, month, day)}>
        <SelectTrigger><SelectValue placeholder={t("date.year")} /></SelectTrigger>
        <SelectContent className="max-h-60">
          {years.map((y) => (
            <SelectItem key={y} value={String(y)}>{y}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={month} onValueChange={(v) => update(year, v, day)}>
        <SelectTrigger><SelectValue placeholder={t("date.month")} /></SelectTrigger>
        <SelectContent>
          {months.map((m) => (
            <SelectItem key={m} value={m}>{Number(m)}-{t("date.monthSuffix")}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={day} onValueChange={(v) => update(year, month, v)}>
        <SelectTrigger><SelectValue placeholder={t("date.day")} /></SelectTrigger>
        <SelectContent className="max-h-60">
          {days.map((d) => (
            <SelectItem key={d} value={d}>{Number(d)}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
