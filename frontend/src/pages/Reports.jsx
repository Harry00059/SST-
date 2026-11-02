import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { api, errMsg, todayISO } from "@/lib/api";
import { PageHeader, inputCls } from "@/components/common";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SummaryStrip, DailyView, MonthlyView, SalesView, ProfitView, CategoryView, PaymentView } from "@/components/ReportViews";

const TABS = [
  ["daily", "Daily"], ["monthly", "Monthly"], ["sales", "Sales"],
  ["profit", "Profit"], ["category", "Category"], ["payment", "Payment"],
];
const VIEWS = { daily: DailyView, monthly: MonthlyView, sales: SalesView, profit: ProfitView, category: CategoryView, payment: PaymentView };

const monthRange = (m) => {
  const [y, mo] = m.split("-").map(Number);
  const last = new Date(y, mo, 0).getDate();
  return [`${m}-01`, `${m}-${String(last).padStart(2, "0")}`];
};

const DateInput = ({ label, id, ...p }) => (
  <div className="space-y-1">
    <Label htmlFor={id} className="text-[11px] uppercase tracking-wider text-slate-400">{label}</Label>
    <Input id={id} data-testid={id} className={`${inputCls} w-44`} {...p} />
  </div>
);

export default function Reports() {
  const today = todayISO();
  const [tab, setTab] = useState("daily");
  const [day, setDay] = useState(today);
  const [month, setMonth] = useState(today.slice(0, 7));
  const [range, setRange] = useState(monthRange(today.slice(0, 7)));
  const [data, setData] = useState(null);

  const [start, end] = useMemo(() => (tab === "daily" ? [day, day] : tab === "monthly" ? monthRange(month) : range), [tab, day, month, range]);

  useEffect(() => {
    if (!start || !end) return;
    api.get("/reports", { params: { start, end } }).then((r) => setData(r.data)).catch((e) => toast.error(errMsg(e)));
  }, [start, end]);

  const View = VIEWS[tab];
  return (
    <div>
      <PageHeader title="Reports" subtitle="Deleted jobs are excluded from all reports" />
      <div className="flex flex-wrap gap-1 bg-slate-900 border border-slate-800 p-1.5 rounded-xl w-fit mb-6">
        {TABS.map(([id, l]) => (
          <button key={id} data-testid={`report-tab-${id}`} onClick={() => setTab(id)} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === id ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/50"}`}>{l}</button>
        ))}
      </div>
      <div className="flex flex-wrap items-end gap-4 mb-6">
        {tab === "daily" && <DateInput label="Date" id="report-day-input" type="date" value={day} onChange={(e) => setDay(e.target.value)} />}
        {tab === "monthly" && <DateInput label="Month" id="report-month-input" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />}
        {!["daily", "monthly"].includes(tab) && (
          <>
            <DateInput label="From" id="report-start-input" type="date" value={range[0]} onChange={(e) => setRange([e.target.value, range[1]])} />
            <DateInput label="To" id="report-end-input" type="date" value={range[1]} onChange={(e) => setRange([range[0], e.target.value])} />
          </>
        )}
      </div>
      {data && (
        <div data-testid={`report-view-${tab}`}>
          <SummaryStrip s={data.summary} />
          <View data={data} />
        </div>
      )}
    </div>
  );
}
