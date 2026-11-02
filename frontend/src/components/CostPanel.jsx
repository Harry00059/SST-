import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, CalcRow } from "@/components/common";
import { inr, num, round2 } from "@/lib/api";

const startVal = (job, k) => (job.costs_recorded ? job[k] ?? "" : "");

export const CostPanel = ({ job, onSave, saving, readOnly }) => {
  const wedding = job.category === "wedding";
  const [f, setF] = useState({
    actual_card_cost: startVal(job, "actual_card_cost"),
    actual_printing_cost: startVal(job, "actual_printing_cost"),
    actual_production_cost: startVal(job, "actual_production_cost"),
  });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const prod = round2(wedding ? num(f.actual_card_cost) + num(f.actual_printing_cost) : num(f.actual_production_cost));
  const profit = round2(job.total_amount - prod);
  const margin = job.total_amount ? round2((profit / job.total_amount) * 100) : 0;

  const submit = (e) => {
    e.preventDefault();
    onSave(wedding
      ? { actual_card_cost: num(f.actual_card_cost), actual_printing_cost: num(f.actual_printing_cost) }
      : { actual_production_cost: num(f.actual_production_cost) });
  };

  return (
    <form onSubmit={submit} className="grid grid-cols-1 xl:grid-cols-3 gap-6" data-testid="cost-form">
      <div className="xl:col-span-2 space-y-5">
        <p className="text-sm text-slate-400">Internal costs. These never appear on the printed customer job sheet.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {wedding ? (
            <>
              <Field label="Actual Card Cost" id="cost-actual-card" prefix="₹" type="number" min="0" step="0.01" value={f.actual_card_cost} onChange={set("actual_card_cost")} required disabled={readOnly} />
              <Field label="Actual Printing Cost" id="cost-actual-printing" prefix="₹" type="number" min="0" step="0.01" value={f.actual_printing_cost} onChange={set("actual_printing_cost")} required disabled={readOnly} />
            </>
          ) : (
            <Field label="Actual Production Cost" id="cost-actual-production" prefix="₹" type="number" min="0" step="0.01" value={f.actual_production_cost} onChange={set("actual_production_cost")} required disabled={readOnly} />
          )}
        </div>
      </div>
      <div className="bg-slate-950/80 border border-blue-900/40 p-5 rounded-xl space-y-3 h-fit" data-testid="cost-calc-panel">
        <CalcRow label="Total Amount" value={inr(job.total_amount)} />
        <CalcRow label="Total Production Cost" value={inr(prod)} tone="text-amber-300" />
        <div className="border-t border-slate-800 pt-3"><CalcRow label="Actual Profit" value={inr(profit)} strong tone={profit < 0 ? "text-red-300" : "text-emerald-300"} /></div>
        <CalcRow label="Profit Margin" value={`${margin}%`} strong tone="text-cyan-300" />
        {!readOnly && (
          <Button type="submit" disabled={saving} data-testid="cost-save-button" className="w-full mt-3 bg-blue-600 hover:bg-blue-700 text-white">
            {saving ? "Saving..." : "Save Costs"}
          </Button>
        )}
      </div>
    </form>
  );
};
