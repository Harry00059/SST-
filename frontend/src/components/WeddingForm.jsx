import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, CalcRow } from "@/components/common";
import { inr, num, round2, todayISO } from "@/lib/api";

const init = (j) => ({
  customer_name: j?.customer_name ?? "",
  contact_number: j?.contact_number ?? "",
  date: j?.date ?? todayISO(),
  quantity: j?.quantity ?? "",
  card_cost: j?.card_cost ?? "",
  printing_cost: j?.printing_cost ?? "",
  discount: j?.discount ?? "",
  advance: j?.advance ?? "",
});

export const WeddingForm = ({ initial, onSubmit, submitLabel = "Save Job Sheet", submitting }) => {
  const [f, setF] = useState(() => init(initial));
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const gross = round2(num(f.card_cost) + num(f.printing_cost));
  const total = round2(gross - num(f.discount));
  const balance = round2(total - num(f.advance));
  const errors = {
    discount: num(f.discount) > gross ? "Discount cannot exceed card + printing cost" : null,
    advance: num(f.advance) > total ? "Advance cannot exceed total amount" : null,
  };
  const invalid = Object.values(errors).some(Boolean);

  const submit = (e) => {
    e.preventDefault();
    if (invalid) return;
    onSubmit({
      category: "wedding",
      customer_name: f.customer_name.trim(),
      contact_number: f.contact_number.trim(),
      date: f.date,
      quantity: parseInt(f.quantity, 10),
      card_cost: num(f.card_cost),
      printing_cost: num(f.printing_cost),
      discount: num(f.discount),
      advance: num(f.advance),
    });
  };

  return (
    <form onSubmit={submit} data-testid="wedding-form" className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div className="xl:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-5">
        <Field label="Customer Name" id="wedding-customer-name" value={f.customer_name} onChange={set("customer_name")} required />
        <Field label="Contact Number" id="wedding-contact-number" type="tel" pattern="[0-9+\-\s]{7,15}" title="7-15 digits" value={f.contact_number} onChange={set("contact_number")} required />
        <Field label="Date" id="wedding-date" type="date" value={f.date} onChange={set("date")} required />
        <Field label="Quantity" id="wedding-quantity" type="number" min="1" step="1" value={f.quantity} onChange={set("quantity")} required />
        <Field label="Card Cost" id="wedding-card-cost" prefix="₹" type="number" min="0" step="0.01" value={f.card_cost} onChange={set("card_cost")} required />
        <Field label="Printing Cost" id="wedding-printing-cost" prefix="₹" type="number" min="0" step="0.01" value={f.printing_cost} onChange={set("printing_cost")} required />
        <Field label="Discount (optional)" id="wedding-discount" prefix="₹" type="number" min="0" step="0.01" value={f.discount} onChange={set("discount")} error={errors.discount} />
        <Field label="Advance" id="wedding-advance" prefix="₹" type="number" min="0" step="0.01" value={f.advance} onChange={set("advance")} error={errors.advance} />
      </div>
      <div className="bg-slate-950/80 border border-blue-900/40 p-5 rounded-xl space-y-3 h-fit" data-testid="wedding-calc-panel">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-blue-300 mb-2">Live Calculation</div>
        <CalcRow label="Card Cost" value={inr(f.card_cost)} />
        <CalcRow label="Printing Cost" value={inr(f.printing_cost)} />
        <CalcRow label="Discount" value={`− ${inr(f.discount)}`} tone="text-amber-300" />
        <div className="border-t border-slate-800 pt-3"><CalcRow label="Total Amount" value={inr(total)} strong /></div>
        <CalcRow label="Advance" value={inr(f.advance)} tone="text-emerald-300" />
        <div className="border-t border-slate-800 pt-3"><CalcRow label="Balance" value={inr(balance)} strong tone="text-red-300" /></div>
        <Button type="submit" disabled={submitting || invalid} data-testid="wedding-submit-button" className="w-full mt-3 bg-blue-600 hover:bg-blue-700 text-white">
          {submitting ? "Saving..." : submitLabel}
        </Button>
      </div>
    </form>
  );
};
