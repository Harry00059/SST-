import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import CreateJob from "@/pages/CreateJob";
import WorkManagement from "@/pages/WorkManagement";
import JobDetail from "@/pages/JobDetail";
import PrintJob from "@/pages/PrintJob";
import Reports from "@/pages/Reports";
import RecycleBin from "@/pages/RecycleBin";
import Settings from "@/pages/Settings";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/jobs/:id/print" element={<PrintJob />} />
          <Route element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="/create" element={<CreateJob />} />
            <Route path="/work" element={<WorkManagement />} />
            <Route path="/jobs/:id" element={<JobDetail />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/recycle-bin" element={<RecycleBin />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster theme="dark" position="top-right" richColors />
    </div>
  );
}

export default App;
