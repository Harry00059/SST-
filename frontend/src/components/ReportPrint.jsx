import { inr, fmtDateTime } from "@/lib/api";
import { printCell } from "@/lib/reportExport";

export const ReportPrint = ({ report, shop }) => (
  <div className="report-print print-only text-slate-900 bg-white" data-testid="report-print-sheet">
    <div className="flex items-start justify-between border-b-[3px] border-slate-900 pb-4">
      <div>
        <div className="text-[22px] font-extrabold tracking-tight">{shop.shop_name}</div>
        {shop.address && <div className="text-[11px] text-slate-600 whitespace-pre-line">{shop.address}</div>}
        <div className="text-[11px] text-slate-600">{[shop.phone, shop.email].filter(Boolean).join(" · ")}</div>
      </div>
      <div className="text-right">
        <div className="text-[16px] font-bold">{report.title}</div>
        <div className="text-[12px] text-slate-600">{report.period}</div>
        <div className="text-[10px] text-slate-500 mt-1">Generated {fmtDateTime(new Date().toISOString())}</div>
      </div>
    </div>
    <div className="grid grid-cols-4 gap-x-6 gap-y-2 mt-5 text-[11px]">
      {report.summary.map(([l, v, money]) => (
        <div key={l} className="border-b border-slate-200 pb-1">
          <div className="text-slate-500">{l}</div>
          <div className="font-mono font-semibold text-[12px]">{money ? inr(v) : l.includes("%") ? `${v}%` : v}</div>
        </div>
      ))}
    </div>
    <div className="mt-6 text-[11px] font-bold uppercase tracking-[0.16em] text-blue-700 mb-2">{report.tableTitle}</div>
    <table className="w-full text-[10.5px] border-collapse">
      <thead>
        <tr className="bg-slate-100">{report.columns.map((c) => <th key={c} className="text-left p-1.5 border border-slate-300 font-semibold">{c}</th>)}</tr>
      </thead>
      <tbody>
        {report.rows.length === 0 ? (
          <tr><td colSpan={report.columns.length} className="p-3 text-center text-slate-500 border border-slate-300">No data for this period.</td></tr>
        ) : report.rows.map((r, i) => (
          <tr key={i} className="break-inside-avoid">{r.map((v, k) => <td key={k} className="p-1.5 border border-slate-300">{printCell(report.columns[k], v)}</td>)}</tr>
        ))}
      </tbody>
    </table>
  </div>
);
