import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { slug } from "@/lib/api";

export const STATUS_STYLE = {
  Pending: "bg-amber-500/10 text-amber-300 border-amber-500/30",
  "In Progress": "bg-blue-500/10 text-blue-300 border-blue-500/30",
  "On Hold": "bg-purple-500/10 text-purple-300 border-purple-500/30",
  Completed: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
  Delivered: "bg-teal-500/10 text-teal-200 border-teal-500/30",
};

export const StatusBadge = ({ status, testid }) => (
  <span data-testid={testid} className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${STATUS_STYLE[status]}`}>
    <span className="h-1.5 w-1.5 rounded-full bg-current" />
    {status}
  </span>
);

export const JobChip = ({ number, testid }) => (
  <span data-testid={testid} className="font-mono font-semibold text-blue-300 tracking-wide text-xs bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
    {number}
  </span>
);

export const PageHeader = ({ title, subtitle, children }) => (
  <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800/80 pb-5">
    <div>
      <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-50" data-testid="page-title">{title}</h1>
      {subtitle && <p className="text-sm text-slate-400 mt-1.5">{subtitle}</p>}
    </div>
    {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
  </div>
);

export const Panel = ({ className = "", children, ...rest }) => (
  <div className={`bg-slate-900/80 border border-slate-800 rounded-xl ${className}`} {...rest}>{children}</div>
);

export const inputCls = "bg-slate-950/80 border-slate-800 focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:border-blue-500 text-slate-100 placeholder:text-slate-600 h-10";

export const Field = ({ label, id, error, prefix, className = "", ...props }) => (
  <div className={`space-y-1.5 ${className}`}>
    <Label htmlFor={id} className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</Label>
    <div className="relative">
      {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">{prefix}</span>}
      <Input id={id} data-testid={`${id}-input`} className={`${inputCls} ${prefix ? "pl-7 font-mono" : ""}`} {...props} />
    </div>
    {error && <p className="text-xs text-red-400" data-testid={`${id}-error`}>{error}</p>}
  </div>
);

export const CalcRow = ({ label, value, strong, tone = "text-slate-100" }) => (
  <div className="flex items-center justify-between" data-testid={`calc-${slug(label)}`}>
    <span className={`text-sm ${strong ? "text-slate-200 font-semibold" : "text-slate-400"}`}>{label}</span>
    <span className={`font-mono ${strong ? "text-lg font-bold" : "text-sm"} ${tone}`}>{value}</span>
  </div>
);

export const Kpi = ({ label, value, accent = "from-blue-500 to-blue-700", hint, testid }) => (
  <div data-testid={testid} className="bg-slate-900/80 border border-slate-800 hover:border-slate-700 p-5 rounded-xl relative overflow-hidden transition-transform duration-200 hover:-translate-y-0.5">
    <div className={`absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r ${accent}`} />
    <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</div>
    <div className="mt-2 text-2xl font-bold font-mono tracking-tight text-slate-50" data-testid={`${testid}-value`}>{value}</div>
    {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
  </div>
);

export const Empty = ({ icon: Icon, title, text, children, testid }) => (
  <div data-testid={testid} className="border border-dashed border-slate-800 rounded-xl py-16 px-6 text-center">
    {Icon && <Icon className="h-8 w-8 text-slate-600 mx-auto mb-3" />}
    <div className="text-slate-200 font-semibold">{title}</div>
    {text && <div className="text-sm text-slate-500 mt-1">{text}</div>}
    {children && <div className="mt-4">{children}</div>}
  </div>
);
