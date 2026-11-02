import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, CalcRow } from "@/components/common";
import { inr, num, round2, todayISO } from "@/lib/api";

const init = (j) => ({
  customer_name: j?.customer_name ?? "",
  contact_number: j?.contact_number ?? "",
  date: j?.date ?? todayISO(),
  job_type: j?.job_type ?? "",
  quantity: j?.quantity ?? "",
  amount: j?.amount ?? "",
  advance: j?.advance ?? "",
});

export const OtherForm = ({ initial, onSubmit, submitLabel = "Save Job Sheet", submitting }) => {
  const [f, setF] = useState(() => init(initial));
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const total = round2(num(f.amount));
  const balance = round2(total - num(f.advance));
  const amtErr = num(f.amount) < 0 ? "Value cannot be negative" : null;
  const advErr = num(f.advance) < 0 ? "Value cannot be negative" : num(f.advance) > total ? "Advance cannot exceed amount" : null;

  const submit = (e) => {
    e.preventDefault();
    if (advErr || amtErr) return;
    onSubmit({
      category: "other",
      customer_name: f.customer_name.trim(),
      contact_number: f.contact_number.trim(),
      date: f.date,
      job_type: f.job_type.trim(),
      quantity: parseInt(f.quantity, 10),
      amount: num(f.amount),
      advance: num(f.advance),
    });
  };

  return (
    <form onSubmit={submit} data-testid="other-form" className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div className="xl:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-5">
        <Field label="Customer Name" id="other-customer-name" value={f.customer_name} onChange={set("customer_name")} required />
        <Field label="Contact Number" id="other-contact-number" type="tel" pattern="[0-9+\-\s]{7,15}" title="7-15 digits" value={f.contact_number} onChange={set("contact_number")} required />
        <Field label="Date" id="other-date" type="date" value={f.date} onChange={set("date")} required />
        <Field label="Type of Job" id="other-job-type" placeholder="e.g. Visiting cards, Flex banner" value={f.job_type} onChange={set("job_type")} required />
        <Field label="Quantity" id="other-quantity" type="number" min="1" step="1" value={f.quantity} onChange={set("quantity")} required />
        <Field label="Amount" id="other-amount" prefix="₹" type="number" min="0" step="0.01" value={f.amount} onChange={set("amount")} error={amtErr} required />
        <Field label="Advance" id="other-advance" prefix="₹" type="number" min="0" step="0.01" value={f.advance} onChange={set("advance")} error={advErr} />
      </div>
      <div className="bg-slate-950/80 border border-blue-900/40 p-5 rounded-xl space-y-3 h-fit" data-testid="other-calc-panel">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-blue-300 mb-2">Live Calculation</div>
        <CalcRow label="Total Amount" value={inr(total)} strong />
        <CalcRow label="Advance" value={inr(f.advance)} tone="text-emerald-300" />
        <div className="border-t border-slate-800 pt-3"><CalcRow label="Balance" value={inr(balance)} strong tone="text-red-300" /></div>
        <Button type="submit" disabled={submitting || !!advErr || !!amtErr} data-testid="other-submit-button" className="w-full mt-3 bg-blue-600 hover:bg-blue-700 text-white">
          {submitting ? "Saving..." : submitLabel}
        </Button>
      </div>
    </form>
  );
};
