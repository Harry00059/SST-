import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Heart, Printer } from "lucide-react";
import { api, errMsg } from "@/lib/api";
import { PageHeader, Panel } from "@/components/common";
import { WeddingForm } from "@/components/WeddingForm";
import { OtherForm } from "@/components/OtherForm";

const TABS = [
  { id: "wedding", label: "Wedding Card", icon: Heart },
  { id: "other", label: "Other Printing", icon: Printer },
];

export default function CreateJob() {
  const [tab, setTab] = useState("wedding");
  const [saving, setSaving] = useState(false);
  const nav = useNavigate();

  const save = async (payload) => {
    setSaving(true);
    try {
      const { data } = await api.post("/jobs", payload);
      toast.success(`Job ${data.job_number} created`);
      nav(`/jobs/${data.id}`);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader title="Create Job Sheet" subtitle="Job number is generated automatically when you save" />
      <div className="bg-slate-900 border border-slate-800 p-1.5 rounded-xl flex gap-1 mb-6 max-w-md">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            data-testid={`create-tab-${id}`}
            onClick={() => setTab(id)}
            className={`flex-1 inline-flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-semibold transition-colors ${
              tab === id ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
            }`}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>
      <Panel className="p-6 md:p-8">
        <div className="text-lg font-semibold text-slate-100 mb-6">{tab === "wedding" ? "Wedding Card Job Sheet" : "Other Printing Job Sheet"}</div>
        {tab === "wedding" ? <WeddingForm key="w" onSubmit={save} submitting={saving} /> : <OtherForm key="o" onSubmit={save} submitting={saving} />}
      </Panel>
    </div>
  );
}
