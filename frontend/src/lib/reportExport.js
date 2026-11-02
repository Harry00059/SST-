import { CATEGORY_LABEL, fmtDate, inr } from "@/lib/api";

const JOB_COLS = ["Job No", "Customer", "Category", "Date", "Total", "Advance", "Balance", "Status"];
const AGG = (first) => [first, "Jobs", "Sales", "Advance", "Outstanding", "Prod. Cost", "Profit", "Margin %"];
const MONEY_COLS = new Set(["Total", "Advance", "Balance", "Sales", "Outstanding", "Prod. Cost", "Profit"]);

const jobRow = (j) => [j.job_number, j.customer_name, CATEGORY_LABEL[j.category], j.date, j.total_amount, j.advance, j.balance, j.status];
const aggRow = (label) => (g) => [label(g.key), g.jobs, g.sales, g.advance, g.balance, g.production_cost, g.profit, g.margin];

const TITLES = {
  daily: "Daily Report", monthly: "Monthly Report", sales: "Sales Report",
  profit: "Profit Report", category: "Category Report", payment: "Payment Report",
};

const summaryLines = (s) => [
  ["Jobs", s.jobs, false], ["Sales", s.sales, true], ["Advance Received", s.advance, true],
  ["Outstanding Balance", s.balance, true], ["Production Cost", s.production_cost, true],
  ["Actual Profit", s.profit, true], ["Profit Margin %", s.margin, false], ["Jobs with Actual Costs", s.costed_jobs, false],
];

export const buildReport = (tab, data) => {
  const t = {
    daily: () => ({ columns: JOB_COLS, rows: data.jobs.map(jobRow) }),
    monthly: () => ({ columns: AGG("Date"), rows: data.daily.map(aggRow((k) => k)) }),
    sales: () => ({ columns: ["Date", "Jobs", "Sales", "Advance", "Outstanding"], rows: data.daily.map((d) => [d.key, d.jobs, d.sales, d.advance, d.balance]) }),
    profit: () => ({
      columns: ["Job No", "Customer", "Category", "Date", "Total", "Prod. Cost", "Profit", "Margin %"],
      rows: data.jobs.filter((j) => j.costs_recorded).map((j) => [j.job_number, j.customer_name, CATEGORY_LABEL[j.category], j.date, j.total_amount, j.total_production_cost, j.actual_profit, j.profit_margin]),
    }),
    category: () => ({ columns: AGG("Category"), rows: data.categories.map(aggRow((k) => CATEGORY_LABEL[k])) }),
    payment: () => ({ columns: JOB_COLS, rows: data.jobs.filter((j) => j.balance > 0).map(jobRow) }),
  }[tab]();
  const p = data.payments;
  const extra = tab === "payment" ? [
    ["Fully Paid Jobs", p.paid.count, false], ["Fully Paid Amount", p.paid.amount, true],
    ["Partially Paid Jobs", p.partial.count, false], ["Partial Advance", p.partial.advance, true], ["Partial Balance", p.partial.balance, true],
    ["No Advance Jobs", p.unpaid.count, false], ["No Advance Balance", p.unpaid.balance, true],
  ] : [];
  return {
    title: TITLES[tab],
    tableTitle: tab === "payment" ? "Outstanding Balances" : "Details",
    period: data.start === data.end ? fmtDate(data.start) : `${fmtDate(data.start)} – ${fmtDate(data.end)}`,
    summary: [...summaryLines(data.summary), ...extra],
    ...t,
  };
};

const csvCell = (v) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const downloadCsv = (tab, report, shopName) => {
  const lines = [
    [shopName], [report.title], ["Period", report.period], [],
    ["Summary"], ...report.summary.map(([l, v]) => [l, v]), [],
    [report.tableTitle], report.columns, ...report.rows,
  ];
  const csv = "\uFEFF" + lines.map((r) => r.map(csvCell).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `SST-${tab}-report-${report.period.replace(/[^0-9A-Za-z]+/g, "_")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

export const printCell = (col, v) => {
  if (MONEY_COLS.has(col)) return inr(v);
  if (col === "Date" && /^\d{4}-\d{2}-\d{2}$/.test(v)) return fmtDate(v);
  if (col === "Margin %") return `${v}%`;
  return v;
};
