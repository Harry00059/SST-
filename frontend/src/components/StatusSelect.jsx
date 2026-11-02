import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { STATUSES, slug } from "@/lib/api";

export const StatusSelect = ({ value, onChange, testid, className = "" }) => (
  <Select value={value} onValueChange={onChange}>
    <SelectTrigger data-testid={testid} className={`h-9 bg-slate-950/80 border-slate-800 text-slate-100 text-sm ${className}`}>
      <SelectValue />
    </SelectTrigger>
    <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
      {STATUSES.map((s) => (
        <SelectItem key={s} value={s} data-testid={`${testid}-option-${slug(s)}`}>{s}</SelectItem>
      ))}
    </SelectContent>
  </Select>
);
