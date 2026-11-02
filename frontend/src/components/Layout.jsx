import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { LayoutDashboard, FilePlus2, KanbanSquare, BarChart3, Trash2, Settings, Printer, Menu, X } from "lucide-react";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, id: "dashboard" },
  { to: "/create", label: "Create Job Sheet", icon: FilePlus2, id: "create" },
  { to: "/work", label: "Work Management", icon: KanbanSquare, id: "work" },
  { to: "/reports", label: "Reports", icon: BarChart3, id: "reports" },
  { to: "/recycle-bin", label: "Recycle Bin", icon: Trash2, id: "recycle-bin" },
  { to: "/settings", label: "Settings", icon: Settings, id: "settings" },
];

const Brand = () => (
  <div className="p-5 border-b border-slate-800 flex items-center gap-3">
    <div className="h-10 w-10 rounded-lg bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-900/40">
      <Printer className="h-5 w-5 text-white" />
    </div>
    <div>
      <div className="font-extrabold tracking-tight text-slate-50 leading-tight">SST</div>
      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Job Management</div>
    </div>
  </div>
);

const NavItems = ({ onNavigate }) => (
  <nav className="p-3 space-y-1">
    {NAV.map(({ to, label, icon: Icon, id }) => (
      <NavLink
        key={to}
        to={to}
        end={to === "/"}
        onClick={onNavigate}
        data-testid={`nav-${id}`}
        className={({ isActive }) =>
          `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 border ${
            isActive
              ? "bg-blue-600/15 text-blue-300 border-blue-500/30"
              : "text-slate-400 border-transparent hover:text-slate-100 hover:bg-slate-800/60"
          }`
        }
      >
        <Icon className="h-4 w-4" />
        {label}
      </NavLink>
    ))}
  </nav>
);

export default function Layout() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 print:bg-white">
      <aside className="no-print hidden lg:flex w-64 bg-slate-950/90 border-r border-slate-800 flex-col justify-between h-screen fixed left-0 top-0 z-40">
        <div>
          <Brand />
          <NavItems />
        </div>
        <div className="p-5 text-[11px] text-slate-500 border-t border-slate-800">SST Cards and Printers</div>
      </aside>
      <header className="no-print lg:hidden sticky top-0 z-40 bg-slate-950/95 backdrop-blur border-b border-slate-800 flex items-center justify-between pr-3">
        <Brand />
        <button data-testid="mobile-menu-toggle" onClick={() => setOpen(!open)} className="p-2 rounded-lg text-slate-300 hover:bg-slate-800">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>
      {open && (
        <div className="no-print lg:hidden fixed inset-x-0 top-[81px] z-30 bg-slate-950 border-b border-slate-800">
          <NavItems onNavigate={() => setOpen(false)} />
        </div>
      )}
      <main key={pathname} className="app-shell-main lg:ml-64 min-h-screen app-grid-bg p-5 md:p-8 rise">
        <Outlet />
      </main>
    </div>
  );
}
