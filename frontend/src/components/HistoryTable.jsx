import { History } from "lucide-react";
import { Empty } from "@/components/common";
import { fmtDateTime, fmtDate } from "@/lib/api";

const MONEY = new Set(["card_cost", "printing_cost", "discount", "amount", "total_amount", "advance", "balance", "actual_card_cost", "actual_printing_cost", "actual_production_cost"]);

const show = (field, v) => {
  if (v === null || v === undefined || v === "") return "—";
  if (MONEY.has(field)) return `₹${Number(v).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
  if (field === "date") return fmtDate(v);
  return String(v);
};

export const HistoryTable = ({ history }) => {
  if (!history?.length) return <Empty testid="history-empty" icon={History} title="No changes yet" text="Every edit will be recorded here with old and new values." />;
  const rows = [...history].reverse();
  return (
    <div className="border border-slate-800 rounded-xl overflow-x-auto" data-testid="history-table">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-950/70 text-slate-400 text-[11px] uppercase tracking-wider">
            <th className="p-3 text-left">Date & Time</th><th className="p-3 text-left">Field</th>
            <th className="p-3 text-left">Previous Value</th><th className="p-3 text-left">New Value</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((h) => (
            <tr key={h.id} className="border-t border-slate-800/60" data-testid={`history-row-${h.field}`}>
              <td className="p-3 text-slate-400 font-mono text-xs whitespace-nowrap">{fmtDateTime(h.changed_at)}</td>
              <td className="p-3 text-slate-200 font-medium">{h.field_label}</td>
              <td className="p-3 text-red-300/90 font-mono text-xs">{show(h.field, h.old_value)}</td>
              <td className="p-3 text-emerald-300 font-mono text-xs">{show(h.field, h.new_value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
