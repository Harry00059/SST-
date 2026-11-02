import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api, errMsg } from "@/lib/api";
import { PageHeader, Panel, Field, inputCls } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function Settings() {
  const [s, setS] = useState(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { api.get("/settings").then((r) => setS(r.data)).catch((e) => toast.error(errMsg(e))); }, []);
  if (!s) return <div className="text-slate-500">Loading settings...</div>;
  const set = (k) => (e) => setS({ ...s, [k]: e.target.value });

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.put("/settings", { ...s, overdue_days: parseInt(s.overdue_days, 10) });
      setS(data);
      toast.success("Settings saved");
    } catch (err) { toast.error(errMsg(err)); } finally { setSaving(false); }
  };

  return (
    <div>
      <PageHeader title="Settings" subtitle="Shop details shown on printed job sheets" />
      <Panel className="p-6 md:p-8 max-w-3xl">
        <form onSubmit={save} className="grid grid-cols-1 md:grid-cols-2 gap-5" data-testid="settings-form">
          <Field label="Shop Name" id="settings-shop-name" className="md:col-span-2" value={s.shop_name} onChange={set("shop_name")} required />
          <div className="md:col-span-2 space-y-1.5">
            <Label htmlFor="settings-address" className="text-xs font-semibold uppercase tracking-wider text-slate-400">Address</Label>
            <Textarea id="settings-address" data-testid="settings-address-input" rows={3} value={s.address} onChange={set("address")} className={`${inputCls} h-auto`} />
          </div>
          <Field label="Phone" id="settings-phone" value={s.phone} onChange={set("phone")} />
          <Field label="Email" id="settings-email" type="email" value={s.email} onChange={set("email")} />
          <Field label="Print Footer Note" id="settings-footer" className="md:col-span-2" value={s.print_footer} onChange={set("print_footer")} />
          <Field label="Overdue After (days)" id="settings-overdue-days" type="number" min="1" max="365" value={s.overdue_days} onChange={set("overdue_days")} required />
          <div className="md:col-span-2 flex justify-end">
            <Button type="submit" disabled={saving} data-testid="settings-save-button" className="bg-blue-600 hover:bg-blue-700">{saving ? "Saving..." : "Save Settings"}</Button>
          </div>
        </form>
      </Panel>
    </div>
  );
}
