import { useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BS_MONTHS, BS_YEAR_MIN, BS_YEAR_MAX, daysInBsMonth } from "@/lib/calendar-bs";

interface BSDatePickerProps {
  year: number | null;
  month: number | null;
  day: number | null;
  onChange: (next: { year: number | null; month: number | null; day: number | null }) => void;
}

/**
 * Year / Month / Day dropdown trio for Bikram Sambat input.
 * Day count clamps dynamically to the selected month's actual length (29–32).
 */
export default function BSDatePicker({ year, month, day, onChange }: BSDatePickerProps) {
  const years = useMemo(() => {
    const arr: number[] = [];
    for (let y = BS_YEAR_MAX; y >= BS_YEAR_MIN; y--) arr.push(y);
    return arr;
  }, []);

  const maxDay = useMemo(() => {
    if (!year || !month) return 32;
    return daysInBsMonth(year, month);
  }, [year, month]);

  const days = useMemo(() => {
    const arr: number[] = [];
    for (let d = 1; d <= maxDay; d++) arr.push(d);
    return arr;
  }, [maxDay]);

  // Clamp day if month/year change shrinks the valid range
  const handleYear = (v: string) => {
    const y = parseInt(v);
    const newDay = day && month ? Math.min(day, daysInBsMonth(y, month)) : day;
    onChange({ year: y, month, day: newDay });
  };
  const handleMonth = (v: string) => {
    const m = parseInt(v);
    const newDay = day && year ? Math.min(day, daysInBsMonth(year, m)) : day;
    onChange({ year, month: m, day: newDay });
  };
  const handleDay = (v: string) => {
    onChange({ year, month, day: parseInt(v) });
  };

  return (
    <div className="grid grid-cols-3 gap-2">
      <Select value={year?.toString() ?? ""} onValueChange={handleYear}>
        <SelectTrigger className="bg-card">
          <SelectValue placeholder="Year" />
        </SelectTrigger>
        <SelectContent className="max-h-72">
          {years.map(y => (
            <SelectItem key={y} value={y.toString()}>{y} BS</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={month?.toString() ?? ""} onValueChange={handleMonth}>
        <SelectTrigger className="bg-card">
          <SelectValue placeholder="Month" />
        </SelectTrigger>
        <SelectContent className="max-h-72">
          {BS_MONTHS.map(m => (
            <SelectItem key={m.value} value={m.value.toString()}>
              {m.en} <span className="text-muted-foreground ml-1">({m.np})</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={day?.toString() ?? ""} onValueChange={handleDay} disabled={!year || !month}>
        <SelectTrigger className="bg-card">
          <SelectValue placeholder="Day" />
        </SelectTrigger>
        <SelectContent className="max-h-72">
          {days.map(d => (
            <SelectItem key={d} value={d.toString()}>{d}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
