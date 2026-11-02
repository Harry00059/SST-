import { Link } from "react-router-dom";
import { AlertTriangle, Phone, CalendarDays, Printer, ArrowUpRight } from "lucide-react";
import { JobChip } from "@/components/common";
import { StatusSelect } from "@/components/StatusSelect";
import { CATEGORY_LABEL, inr, fmtDate } from "@/lib/api";

const Money = ({ label, value, tone = "text-slate-100" }) => (
  <div>
    <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
    <div className={`font-mono text-sm font-semibold ${tone}`}>{inr(value)}</div>
  </div>
);

export const JobCard = ({ job, onStatus }) => {
  const t = `job-card-${job.job_number}`;
  return (
    <div data-testid={t} className="bg-slate-900/85 border border-slate-800 hover:border-blue-500/40 rounded-xl p-5 transition-colors duration-200 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1.5">
          <JobChip number={job.job_number} testid={`${t}-number`} />
          <div className="text-[11px] uppercase tracking-wider text-slate-500">{CATEGORY_LABEL[job.category]}{job.job_type ? ` · ${job.job_type}` : ""}</div>
        </div>
        {job.overdue && (
          <span data-testid={`${t}-overdue`} className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded bg-red-500/10 text-red-300 border border-red-500/30">
            <AlertTriangle className="h-3 w-3" /> Overdue
          </span>
        )}
      </div>
      <div>
        <div className="text-lg font-semibold text-slate-50 truncate" data-testid={`${t}-customer`}>{job.customer_name}</div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400 mt-1">
          <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{job.contact_number}</span>
          <span className="inline-flex items-center gap-1"><CalendarDays className="h-3 w-3" />{fmtDate(job.date)}</span>
          <span>Qty {job.quantity}</span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3 bg-slate-950/60 border border-slate-800 rounded-lg p-3">
        <Money label="Total" value={job.total_amount} />
        <Money label="Advance" value={job.advance} tone="text-emerald-300" />
        <Money label="Balance" value={job.balance} tone={job.balance > 0 ? "text-red-300" : "text-slate-300"} />
      </div>
      <div className="text-xs" data-testid={`${t}-profit`}>
        {job.costs_recorded ? (
          <span className="font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
            Profit {inr(job.actual_profit)} · {job.profit_margin}%
          </span>
        ) : (
          <span className="text-slate-500">Actual costs not entered</span>
        )}
      </div>
      <div className="flex items-center gap-2 mt-auto">
        <StatusSelect value={job.status} onChange={(s) => onStatus(job, s)} testid={`${t}-status`} className="flex-1" />
        <Link to={`/jobs/${job.id}/print`} data-testid={`${t}-print`} className="h-9 w-9 inline-flex items-center justify-center rounded-md border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800">
          <Printer className="h-4 w-4" />
        </Link>
        <Link to={`/jobs/${job.id}`} data-testid={`${t}-open`} className="h-9 px-3 inline-flex items-center gap-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium">
          Open <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
};
