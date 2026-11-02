import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Printer, Trash2, RotateCcw, ArrowLeft, AlertTriangle } from "lucide-react";
import { api, errMsg, CATEGORY_LABEL, fmtDate } from "@/lib/api";
import { PageHeader, Panel, JobChip, StatusBadge } from "@/components/common";
import { StatusSelect } from "@/components/StatusSelect";
import { WeddingForm } from "@/components/WeddingForm";
import { OtherForm } from "@/components/OtherForm";
import { CostPanel } from "@/components/CostPanel";
import { HistoryTable } from "@/components/HistoryTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const DeleteButton = ({ job, onConfirm }) => (
  <AlertDialog>
    <AlertDialogTrigger asChild>
      <Button variant="outline" data-testid="job-delete-button" className="border-red-500/40 text-red-300 bg-transparent hover:bg-red-500/10 hover:text-red-200"><Trash2 className="h-4 w-4 mr-2" />Delete</Button>
    </AlertDialogTrigger>
    <AlertDialogContent className="bg-slate-900 border-slate-800 text-slate-100">
      <AlertDialogHeader>
        <AlertDialogTitle>Move {job.job_number} to Recycle Bin?</AlertDialogTitle>
        <AlertDialogDescription className="text-slate-400">The job keeps its number and history and can be restored anytime.</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel data-testid="job-delete-cancel" className="bg-transparent border-slate-700 text-slate-200 hover:bg-slate-800 hover:text-white">Cancel</AlertDialogCancel>
        <AlertDialogAction data-testid="job-delete-confirm" onClick={onConfirm} className="bg-red-600 hover:bg-red-700">Move to Recycle Bin</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

export default function JobDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [job, setJob] = useState(null);
  const [saving, setSaving] = useState(false);
  const [ver, setVer] = useState(0);

  const load = useCallback(() => {
    api.get(`/jobs/${id}`).then((r) => setJob(r.data)).catch((e) => toast.error(errMsg(e)));
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const update = async (payload, msg = "Changes saved") => {
    setSaving(true);
    try {
      const { category, ...rest } = payload;
      const { data } = await api.put(`/jobs/${id}`, rest);
      setJob(data);
      setVer((v) => v + 1);
      toast.success(msg);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    try { await api.delete(`/jobs/${id}`); toast.success(`${job.job_number} moved to Recycle Bin`); nav("/work"); }
    catch (e) { toast.error(errMsg(e)); }
  };
  const restore = async () => {
    try { await api.post(`/jobs/${id}/restore`); toast.success(`${job.job_number} restored`); load(); }
    catch (e) { toast.error(errMsg(e)); }
  };

  if (!job) return <div className="text-slate-500" data-testid="job-loading">Loading job...</div>;
  const deleted = job.is_deleted;
  const Form = job.category === "wedding" ? WeddingForm : OtherForm;

  return (
    <div>
      <Link to={deleted ? "/recycle-bin" : "/work"} className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200 mb-4" data-testid="job-back-link"><ArrowLeft className="h-4 w-4" />Back</Link>
      <PageHeader title={job.customer_name} subtitle={<span className="inline-flex flex-wrap items-center gap-2"><JobChip number={job.job_number} testid="job-number" /> {CATEGORY_LABEL[job.category]} · {fmtDate(job.date)}</span>}>
        {deleted ? (
          <Button onClick={restore} data-testid="job-restore-button" className="bg-blue-600 hover:bg-blue-700"><RotateCcw className="h-4 w-4 mr-2" />Restore</Button>
        ) : (
          <>
            <StatusSelect value={job.status} onChange={(s) => update({ status: s }, `Status changed to ${s}`)} testid="job-status-select" className="w-40" />
            <Link to={`/jobs/${job.id}/print`} data-testid="job-print-button" className="inline-flex items-center h-10 px-4 rounded-md border border-slate-700 text-slate-200 hover:bg-slate-800 text-sm font-medium"><Printer className="h-4 w-4 mr-2" />Print / PDF</Link>
            <DeleteButton job={job} onConfirm={remove} />
          </>
        )}
      </PageHeader>
      {deleted && <div data-testid="job-deleted-banner" className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 text-red-200 text-sm px-4 py-3">This job is in the Recycle Bin. Restore it to edit.</div>}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <StatusBadge status={job.status} testid="job-status-badge" />
        {job.overdue && <span data-testid="job-overdue-badge" className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-red-500/10 text-red-300 border border-red-500/30"><AlertTriangle className="h-3 w-3" />Overdue</span>}
      </div>
      <Tabs defaultValue="details">
        <TabsList className="bg-slate-900 border border-slate-800 mb-5">
          <TabsTrigger value="details" data-testid="tab-details" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">Job Details</TabsTrigger>
          <TabsTrigger value="costs" data-testid="tab-costs" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">Cost Management</TabsTrigger>
          <TabsTrigger value="history" data-testid="tab-history" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">Edit History ({job.history?.length || 0})</TabsTrigger>
        </TabsList>
        <TabsContent value="details">
          <Panel className="p-6 md:p-8">
            <fieldset disabled={deleted}><Form key={`f-${ver}`} initial={job} onSubmit={(p) => update(p)} submitLabel="Save Changes" submitting={saving} /></fieldset>
          </Panel>
        </TabsContent>
        <TabsContent value="costs">
          <Panel className="p-6 md:p-8"><CostPanel key={`c-${ver}`} job={job} onSave={(p) => update(p, "Costs saved")} saving={saving} readOnly={deleted} /></Panel>
        </TabsContent>
        <TabsContent value="history">
          <HistoryTable history={job.history} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
