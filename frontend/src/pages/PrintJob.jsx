import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Printer } from "lucide-react";
import { api, errMsg, inr, fmtDate } from "@/lib/api";

const Row = ({ label, value, testid, bold }) => (
  <tr className="border-b border-slate-200">
    <td className="py-2.5 pr-4 text-slate-500 text-[13px] w-1/2">{label}</td>
    <td data-testid={testid} className={`py-2.5 text-right text-[14px] ${bold ? "font-bold text-slate-900" : "text-slate-800"}`}>{value}</td>
  </tr>
);

const Section = ({ title, children }) => (
  <div className="mt-7">
    <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-700 mb-2">{title}</div>
    {children}
  </div>
);

const SheetHeader = ({ s, job }) => (
  <div className="flex items-start justify-between border-b-[3px] border-slate-900 pb-5">
    <div>
      <div className="text-[26px] font-extrabold tracking-tight text-slate-900" data-testid="print-shop-name">{s.shop_name}</div>
      {s.address && <div className="text-[12px] text-slate-600 mt-1 whitespace-pre-line">{s.address}</div>}
      <div className="text-[12px] text-slate-600">{[s.phone, s.email].filter(Boolean).join(" · ")}</div>
    </div>
    <div className="text-right">
      <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Job Sheet</div>
      <div className="font-mono text-[18px] font-bold text-slate-900 mt-1" data-testid="print-job-number">{job.job_number}</div>
      <div className="text-[12px] text-slate-600 mt-1">Date: {fmtDate(job.date)}</div>
    </div>
  </div>
);

export default function PrintJob() {
  const { id } = useParams();
  const nav = useNavigate();
  const [job, setJob] = useState(null);
  const [s, setS] = useState(null);
  useEffect(() => {
    Promise.all([api.get(`/jobs/${id}`), api.get("/settings")])
      .then(([j, st]) => { setJob(j.data); setS(st.data); })
      .catch((e) => toast.error(errMsg(e)));
  }, [id]);
  if (!job || !s) return <div className="p-8 text-slate-500">Loading job sheet...</div>;
  const wedding = job.category === "wedding";

  return (
    <div className="print-wrap min-h-screen bg-slate-800 py-8 px-4">
      <div className="no-print max-w-[210mm] mx-auto flex items-center justify-between mb-5">
        <button onClick={() => nav(-1)} data-testid="print-back-button" className="inline-flex items-center gap-1 text-sm text-slate-300 hover:text-white"><ArrowLeft className="h-4 w-4" />Back</button>
        <button onClick={() => window.print()} data-testid="print-now-button" className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold"><Printer className="h-4 w-4" />Print / Save as PDF</button>
      </div>
      <div className="a4-sheet mx-auto shadow-2xl" data-testid="print-sheet">
        <SheetHeader s={s} job={job} />
        <div className="mt-6 inline-block bg-slate-900 text-white text-[12px] font-bold uppercase tracking-[0.18em] px-3 py-1.5" data-testid="print-category">
          {wedding ? "Wedding Card Job Sheet" : "Printing Job Sheet"}
        </div>
        <Section title="Customer Details">
          <table className="w-full"><tbody>
            <Row label="Customer Name" value={job.customer_name} testid="print-customer" />
            <Row label="Contact Number" value={job.contact_number} testid="print-contact" />
          </tbody></table>
        </Section>
        <Section title="Job Details">
          <table className="w-full"><tbody>
            {!wedding && <Row label="Type of Job" value={job.job_type} testid="print-job-type" />}
            <Row label="Quantity" value={job.quantity} testid="print-quantity" />
            <Row label="Status" value={job.status} testid="print-status" />
          </tbody></table>
        </Section>
        <Section title="Payment Details">
          <table className="w-full font-mono"><tbody>
            {wedding && <Row label="Card Cost" value={inr(job.card_cost)} testid="print-card-cost" />}
            {wedding && <Row label="Printing Cost" value={inr(job.printing_cost)} testid="print-printing-cost" />}
            {wedding && job.discount > 0 && <Row label="Discount" value={`− ${inr(job.discount)}`} testid="print-discount" />}
            {!wedding && <Row label="Amount" value={inr(job.amount)} testid="print-amount" />}
            <Row label="Total Amount" value={inr(job.total_amount)} testid="print-total" bold />
            <Row label="Advance Paid" value={inr(job.advance)} testid="print-advance" />
          </tbody></table>
          <div className="mt-3 flex items-center justify-between bg-slate-100 border border-slate-300 px-4 py-3">
            <span className="text-[13px] font-bold uppercase tracking-wider text-slate-700">Balance Due</span>
            <span className="font-mono text-[20px] font-extrabold text-slate-900" data-testid="print-balance">{inr(job.balance)}</span>
          </div>
        </Section>
        <div className="mt-24 grid grid-cols-2 gap-16 text-[12px] text-slate-600">
          <div className="border-t border-slate-400 pt-2 text-center">Customer Signature</div>
          <div className="border-t border-slate-400 pt-2 text-center">For {s.shop_name}</div>
        </div>
        {s.print_footer && <div className="mt-12 text-center text-[11px] text-slate-500 border-t border-slate-200 pt-3">{s.print_footer}</div>}
      </div>
    </div>
  );
}
