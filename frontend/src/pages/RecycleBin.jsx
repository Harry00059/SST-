import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { RotateCcw, Trash2 } from "lucide-react";
import { api, errMsg, inr, fmtDate, fmtDateTime, CATEGORY_LABEL } from "@/lib/api";
import { PageHeader, Empty, JobChip, StatusBadge } from "@/components/common";
import { Button } from "@/components/ui/button";

export default function RecycleBin() {
  const [jobs, setJobs] = useState(null);
  const load = () => api.get("/jobs", { params: { deleted: true } }).then((r) => setJobs(r.data)).catch((e) => toast.error(errMsg(e)));
  useEffect(() => { load(); }, []);

  const restore = async (j) => {
    try {
      await api.post(`/jobs/${j.id}/restore`);
      toast.success(`${j.job_number} restored to Work Management`);
      setJobs((js) => js.filter((x) => x.id !== j.id));
    } catch (e) { toast.error(errMsg(e)); }
  };

  return (
    <div>
      <PageHeader title="Recycle Bin" subtitle="Deleted jobs keep their job number and edit history. Restore anytime." />
      {jobs === null ? <div className="text-slate-500">Loading...</div> : jobs.length === 0 ? (
        <Empty testid="recycle-empty" icon={Trash2} title="Recycle Bin is empty" text="Deleted jobs will appear here." />
      ) : (
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-x-auto" data-testid="recycle-table">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-950/70 text-slate-400 text-[11px] uppercase tracking-wider">
                {["Job No", "Customer", "Category", "Job Date", "Total", "Status", "Deleted On", ""].map((h) => <th key={h} className="p-3.5 text-left">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {jobs.map((j) => (
                <tr key={j.id} className="border-t border-slate-800/60 hover:bg-slate-800/30" data-testid={`recycle-row-${j.job_number}`}>
                  <td className="p-3.5"><Link to={`/jobs/${j.id}`}><JobChip number={j.job_number} /></Link></td>
                  <td className="p-3.5 text-slate-100">{j.customer_name}</td>
                  <td className="p-3.5 text-slate-400">{CATEGORY_LABEL[j.category]}</td>
                  <td className="p-3.5 text-slate-400">{fmtDate(j.date)}</td>
                  <td className="p-3.5 font-mono">{inr(j.total_amount)}</td>
                  <td className="p-3.5"><StatusBadge status={j.status} /></td>
                  <td className="p-3.5 text-slate-400 font-mono text-xs">{fmtDateTime(j.deleted_at)}</td>
                  <td className="p-3.5 text-right">
                    <Button size="sm" onClick={() => restore(j)} data-testid={`recycle-restore-${j.job_number}`} className="bg-blue-600 hover:bg-blue-700"><RotateCcw className="h-3.5 w-3.5 mr-1.5" />Restore</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
