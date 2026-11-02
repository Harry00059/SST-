# SST Job Management — PRD

## Original problem statement
Build a complete business application named SST Job Management. React + Tailwind, FastAPI, MongoDB. Premium modern dark mode (charcoal/navy, blue accents), desktop-first, minimal. Single-user, no login, no employee management. Navigation: Dashboard, Create Job Sheet, Work Management, Reports, Recycle Bin, Settings. Separate Wedding Card job sheet (Customer Name, Contact, Date, Quantity, Card Cost, Printing Cost, Discount optional, Total, Advance, Balance) and Other Printing job sheet (Customer Name, Contact, Date, Type of Job, Quantity, Amount, Advance, Balance). Sequential job numbers SST-2026-001. Work Management cards with statuses Pending/In Progress/On Hold/Completed/Delivered. Cost management (actual card/printing cost or actual production cost → total production cost, actual profit, margin %), hidden from printed sheets. Balance = Total − Advance. Edit history (field, old, new, date/time). Soft-delete recycle bin with restore preserving job number and history. A4 printable job sheets (print / Save as PDF). Dashboard KPIs. Reports: daily, monthly, sales, profit, category, payment. Docker + Docker Compose for Windows, .env.example, install docs, no hardcoded secrets. Do not invent extra business features.

User choices: Wedding Total = Card Cost + Printing Cost − Discount; Overdue = job date > 7 days ago and not Completed/Delivered; currency INR (₹); job number year = current year, restart at 001 yearly; print header "SST CARDS AND PRINTERS".

## Architecture
- Backend: /app/backend/server.py (FastAPI). Collections: jobs (uuid id, unique job_number index, history array, is_deleted), counters (per-year atomic seq), settings. All financials computed & validated server-side.
- Frontend: React pages Dashboard, CreateJob, WorkManagement, JobDetail (details/costs/history), PrintJob (A4), Reports, RecycleBin, Settings.
- Docker: docker-compose.yml, backend/Dockerfile, frontend/Dockerfile (nginx), .env.example, INSTALL.md.

## Implemented (2026-11-02)
- All modules above; tested by testing agent (backend 26/27, frontend all flows). Fixed after test: zero-cost save now marks costs recorded; contact must contain 7–15 digits; stale search response guard; toasts moved bottom-right.
- Settings: shop name, address, phone, email, print footer, overdue days.

## Backlog
- P2: Docker build not executed in this environment (verify on Windows).
- P2: Export reports to CSV/print.

## Next tasks
- User review and feedback.
