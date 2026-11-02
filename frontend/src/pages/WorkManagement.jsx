import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Search, KanbanSquare } from "lucide-react";
import { api, errMsg, STATUSES, slug } from "@/lib/api";
import { PageHeader, Empty, inputCls } from "@/components/common";
import { Input } from "@/components/ui/input";
import { JobCard } from "@/components/JobCard";

const Pill = ({ active, onClick, children, testid }) => (
  <button data-testid={testid} onClick={onClick} className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${active ? "bg-blue-600 text-white border-blue-500" : "text-slate-400 border-slate-800 hover:text-slate-100 hover:border-slate-700"}`}>
    {children}
  </button>
);

export default function WorkManagement() {
  const [jobs, setJobs] = useState(null);
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");

  const load = useCallback((signal) => {
    api.get("/jobs", { signal, params: { search: search || undefined, category: category || undefined } })
      .then((r) => setJobs(r.data))
      .catch((e) => { if (e.code !== "ERR_CANCELED") toast.error(errMsg(e)); });
  }, [search, category]);

  useEffect(() => {
    const ctrl = new AbortController();
    const t = setTimeout(() => load(ctrl.signal), 250);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [load]);

  const changeStatus = async (job, s) => {
    try {
      const { data } = await api.put(`/jobs/${job.id}`, { status: s });
      setJobs((js) => js.map((j) => (j.id === job.id ? { ...j, ...data } : j)));
      toast.success(`${job.job_number} → ${s}`);
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  const shown = (jobs || []).filter((j) => !status || (status === "Overdue" ? j.overdue : j.status === status));
  const count = (s) => (jobs || []).filter((j) => (s === "Overdue" ? j.overdue : j.status === s)).length;

  return (
    <div>
      <PageHeader title="Work Management" subtitle="Every saved job appears here. Update status, costs and details.">
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <Input data-testid="work-search-input" placeholder="Search name, job no, contact" value={search} onChange={(e) => setSearch(e.target.value)} className={`${inputCls} pl-9 w-72`} />
        </div>
      </PageHeader>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <Pill testid="filter-status-all" active={!status} onClick={() => setStatus("")}>All ({jobs?.length ?? 0})</Pill>
        {[...STATUSES, "Overdue"].map((s) => (
          <Pill key={s} testid={`filter-status-${slug(s)}`} active={status === s} onClick={() => setStatus(s)}>{s} ({count(s)})</Pill>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 mb-6">
        {[["", "All Categories"], ["wedding", "Wedding Card"], ["other", "Other Printing"]].map(([v, l]) => (
          <Pill key={v || "all"} testid={`filter-category-${v || "all"}`} active={category === v} onClick={() => setCategory(v)}>{l}</Pill>
        ))}
      </div>
      {jobs === null ? (
        <div className="text-slate-500">Loading jobs...</div>
      ) : shown.length === 0 ? (
        <Empty testid="work-empty" icon={KanbanSquare} title="No jobs found" text="Saved job sheets appear here automatically.">
          <Link to="/create" className="text-blue-400 hover:text-blue-300 text-sm font-semibold" data-testid="work-empty-create">Create a job sheet</Link>
        </Empty>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-5" data-testid="work-grid">
          {shown.map((j) => <JobCard key={j.id} job={j} onStatus={changeStatus} />)}
        </div>
      )}
    </div>
  );
}
