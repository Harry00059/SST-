import { Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { inr, fmtDate, CATEGORY_LABEL } from "@/lib/api";
import { Kpi, JobChip, StatusBadge, Panel } from "@/components/common";

export const SummaryStrip = ({ s }) => (
  <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3 mb-6" data-testid="report-summary">
    <Kpi testid="rpt-jobs" label="Jobs" value={s.jobs} />
    <Kpi testid="rpt-sales" label="Sales" value={inr(s.sales)} />
    <Kpi testid="rpt-advance" label="Advance" value={inr(s.advance)} accent="from-emerald-400 to-emerald-600" />
    <Kpi testid="rpt-balance" label="Outstanding" value={inr(s.balance)} accent="from-red-400 to-red-600" />
    <Kpi testid="rpt-cost" label="Production Cost" value={inr(s.production_cost)} accent="from-amber-400 to-amber-600" />
    <Kpi testid="rpt-profit" label="Profit" value={inr(s.profit)} accent="from-emerald-400 to-teal-500" hint={`${s.costed_jobs} costed job(s)`} />
    <Kpi testid="rpt-margin" label="Margin" value={`${s.margin}%`} accent="from-cyan-400 to-blue-500" />
  </div>
);

const Table = ({ cols, rows, testid, empty = "No data for this period." }) => (
  <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-x-auto" data-testid={testid}>
    <table className="w-full text-sm">
      <thead><tr className="bg-slate-950/70 text-slate-400 text-[11px] uppercase tracking-wider">{cols.map((c) => <th key={c} className="p-3.5 text-left whitespace-nowrap">{c}</th>)}</tr></thead>
      <tbody>
        {rows.length === 0 ? <tr><td colSpan={cols.length} className="p-6 text-center text-slate-500">{empty}</td></tr> :
          rows.map((r, i) => <tr key={i} className="border-t border-slate-800/60 hover:bg-slate-800/30">{r.map((c, k) => <td key={k} className="p-3.5 text-slate-200 whitespace-nowrap">{c}</td>)}</tr>)}
      </tbody>
    </table>
  </div>
);

const M = ({ v, tone = "" }) => <span className={`font-mono ${tone}`}>{inr(v)}</span>;
const jobLink = (j) => <Link to={`/jobs/${j.id}`}><JobChip number={j.job_number} /></Link>;

const jobRows = (jobs) => jobs.map((j) => [jobLink(j), j.customer_name, CATEGORY_LABEL[j.category], fmtDate(j.date), <M v={j.total_amount} />, <M v={j.advance} tone="text-emerald-300" />, <M v={j.balance} tone="text-red-300" />, <StatusBadge status={j.status} />]);
const JOB_COLS = ["Job No", "Customer", "Category", "Date", "Total", "Advance", "Balance", "Status"];
const aggRows = (list, label) => list.map((g) => [label(g.key), g.jobs, <M v={g.sales} />, <M v={g.advance} tone="text-emerald-300" />, <M v={g.balance} tone="text-red-300" />, <M v={g.production_cost} tone="text-amber-300" />, <M v={g.profit} tone="text-emerald-300" />, `${g.margin}%`]);
const AGG_COLS = (first) => [first, "Jobs", "Sales", "Advance", "Outstanding", "Prod. Cost", "Profit", "Margin"];

export const DailyView = ({ data }) => <Table testid="report-daily-table" cols={JOB_COLS} rows={jobRows(data.jobs)} empty="No jobs on this date." />;

export const MonthlyView = ({ data }) => <Table testid="report-monthly-table" cols={AGG_COLS("Date")} rows={aggRows(data.daily, fmtDate)} empty="No jobs in this month." />;

export const SalesView = ({ data }) => (
  <div className="space-y-6">
    <Panel className="p-5 h-72" data-testid="report-sales-chart">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data.daily.map((d) => ({ name: fmtDate(d.key).slice(0, 6), Sales: d.sales, Advance: d.advance }))}>
          <CartesianGrid stroke="#1e293b" vertical={false} />
          <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
          <YAxis stroke="#64748b" fontSize={11} />
          <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8 }} formatter={(v) => inr(v)} />
          <Bar dataKey="Sales" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Advance" fill="#10b981" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Panel>
    <Table testid="report-sales-table" cols={["Date", "Jobs", "Sales", "Advance", "Outstanding"]} rows={data.daily.map((d) => [fmtDate(d.key), d.jobs, <M v={d.sales} />, <M v={d.advance} tone="text-emerald-300" />, <M v={d.balance} tone="text-red-300" />])} />
  </div>
);

export const ProfitView = ({ data }) => {
  const costed = data.jobs.filter((j) => j.costs_recorded);
  const missing = data.jobs.length - costed.length;
  return (
    <div className="space-y-3">
      {missing > 0 && <div className="text-xs text-amber-300" data-testid="report-profit-missing">{missing} job(s) in this period have no actual costs entered and are excluded from profit.</div>}
      <Table testid="report-profit-table" cols={["Job No", "Customer", "Category", "Date", "Total", "Prod. Cost", "Profit", "Margin"]}
        rows={costed.map((j) => [jobLink(j), j.customer_name, CATEGORY_LABEL[j.category], fmtDate(j.date), <M v={j.total_amount} />, <M v={j.total_production_cost} tone="text-amber-300" />, <M v={j.actual_profit} tone={j.actual_profit < 0 ? "text-red-300" : "text-emerald-300"} />, `${j.profit_margin}%`])}
        empty="No jobs with actual costs in this period." />
    </div>
  );
};

export const CategoryView = ({ data }) => <Table testid="report-category-table" cols={AGG_COLS("Category")} rows={aggRows(data.categories, (k) => CATEGORY_LABEL[k])} />;

const PayCard = ({ title, count, lines, testid, accent }) => (
  <Panel className="p-5 relative overflow-hidden" data-testid={testid}>
    <div className={`absolute top-0 left-0 w-full h-[3px] ${accent}`} />
    <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{title}</div>
    <div className="text-2xl font-bold font-mono mt-2" data-testid={`${testid}-count`}>{count} jobs</div>
    {lines.map(([l, v]) => <div key={l} className="text-sm text-slate-400 mt-1">{l}: <span className="font-mono text-slate-200">{inr(v)}</span></div>)}
  </Panel>
);

export const PaymentView = ({ data }) => {
  const p = data.payments;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <PayCard testid="pay-paid" title="Fully Paid" count={p.paid.count} lines={[["Collected", p.paid.amount]]} accent="bg-emerald-500" />
        <PayCard testid="pay-partial" title="Partially Paid" count={p.partial.count} lines={[["Advance", p.partial.advance], ["Balance", p.partial.balance]]} accent="bg-amber-500" />
        <PayCard testid="pay-unpaid" title="No Advance" count={p.unpaid.count} lines={[["Balance", p.unpaid.balance]]} accent="bg-red-500" />
      </div>
      <div className="text-sm font-semibold text-slate-200">Outstanding Balances</div>
      <Table testid="report-payment-table" cols={JOB_COLS} rows={jobRows(data.jobs.filter((j) => j.balance > 0))} empty="No outstanding balances." />
    </div>
  );
};
