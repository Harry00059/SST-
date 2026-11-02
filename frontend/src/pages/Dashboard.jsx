import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FilePlus2, AlertTriangle } from "lucide-react";
import { api, inr, fmtDate, errMsg, CATEGORY_LABEL } from "@/lib/api";
import { PageHeader, Kpi, Panel, JobChip, StatusBadge } from "@/components/common";
import { toast } from "sonner";

const MiniList = ({ title, jobs, testid, empty }) => (
  <Panel className="p-5" data-testid={testid}>
    <div className="text-sm font-semibold text-slate-200 mb-4">{title}</div>
    {jobs.length === 0 ? (
      <div className="text-sm text-slate-500 py-6">{empty}</div>
    ) : (
      <div className="divide-y divide-slate-800">
        {jobs.map((j) => (
          <Link key={j.id} to={`/jobs/${j.id}`} className="flex items-center justify-between py-3 hover:bg-slate-800/30 -mx-2 px-2 rounded" data-testid={`${testid}-${j.job_number}`}>
            <div className="min-w-0">
              <div className="flex items-center gap-2"><JobChip number={j.job_number} /><span className="text-sm text-slate-200 truncate">{j.customer_name}</span></div>
              <div className="text-xs text-slate-500 mt-1">{CATEGORY_LABEL[j.category]} · {fmtDate(j.date)}</div>
            </div>
            <div className="text-right shrink-0 pl-3">
              <div className="font-mono text-sm">{inr(j.total_amount)}</div>
              <div className="mt-1"><StatusBadge status={j.status} /></div>
            </div>
          </Link>
        ))}
      </div>
    )}
  </Panel>
);

export default function Dashboard() {
  const [d, setD] = useState(null);
  useEffect(() => {
    api.get("/dashboard").then((r) => setD(r.data)).catch((e) => toast.error(errMsg(e)));
  }, []);
  if (!d) return <div className="text-slate-500" data-testid="dashboard-loading">Loading dashboard...</div>;
  const sc = d.status_counts;
  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Overview of all active jobs and finances">
        <Link to="/create" data-testid="dashboard-create-job" className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold">
          <FilePlus2 className="h-4 w-4" /> New Job Sheet
        </Link>
      </PageHeader>
      <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 mb-3">Jobs</div>
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-4 mb-8">
        <Kpi testid="kpi-total-jobs" label="Total Jobs" value={d.total_jobs} />
        <Kpi testid="kpi-pending" label="Pending" value={sc.Pending} accent="from-amber-400 to-amber-600" />
        <Kpi testid="kpi-in-progress" label="In Progress" value={sc["In Progress"]} accent="from-blue-400 to-blue-600" />
        <Kpi testid="kpi-on-hold" label="On Hold" value={sc["On Hold"]} accent="from-purple-400 to-purple-600" />
        <Kpi testid="kpi-completed" label="Completed" value={sc.Completed} accent="from-emerald-400 to-emerald-600" />
        <Kpi testid="kpi-delivered" label="Delivered" value={sc.Delivered} accent="from-teal-300 to-teal-500" />
        <Kpi testid="kpi-overdue" label="Overdue" value={d.overdue_jobs} accent="from-red-400 to-red-600" hint={`> ${d.overdue_days} days, not done`} />
      </div>
      <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 mb-3">Finance</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
        <Kpi testid="kpi-total-sales" label="Total Sales" value={inr(d.sales)} />
        <Kpi testid="kpi-advance" label="Advance Received" value={inr(d.advance)} accent="from-emerald-400 to-emerald-600" />
        <Kpi testid="kpi-outstanding" label="Outstanding Balance" value={inr(d.balance)} accent="from-red-400 to-red-600" />
        <Kpi testid="kpi-production-cost" label="Production Cost" value={inr(d.production_cost)} accent="from-amber-400 to-amber-600" hint={`${d.costed_jobs} job(s) with actual costs`} />
        <Kpi testid="kpi-profit" label="Actual Profit" value={inr(d.profit)} accent="from-emerald-400 to-teal-500" hint={`On sales of ${inr(d.costed_sales)}`} />
        <Kpi testid="kpi-margin" label="Profit Margin" value={`${d.margin}%`} accent="from-cyan-400 to-blue-500" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <MiniList title="Recent Jobs" jobs={d.recent} testid="dashboard-recent" empty="No jobs yet. Create your first job sheet." />
        <MiniList title={<span className="inline-flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-red-400" />Overdue Jobs</span>} jobs={d.overdue_list} testid="dashboard-overdue" empty="No overdue jobs." />
      </div>
    </div>
  );
}
