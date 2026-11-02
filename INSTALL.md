# SST Job Management — Windows Local Installation

Single-user job management app for **SST CARDS AND PRINTERS**.
Stack: React + Tailwind (frontend), FastAPI (backend), MongoDB (database).

## 1. Requirements
- Windows 10/11 (64-bit) with WSL 2 enabled
- [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/) — install, restart, and start it once
- About 3 GB free disk space

## 2. Get the files
Copy (or `git clone`) the project folder, e.g. to `C:\SST\sst-job-management`.

## 3. Configure
Open **PowerShell** in the project folder and run:

```powershell
copy .env.example .env
```

Edit `.env` in Notepad if needed:

| Variable | Meaning |
|---|---|
| `MONGO_URL` | Database address (keep `mongodb://mongo:27017` for Docker) |
| `DB_NAME` | Database name |
| `APP_TIMEZONE` | Used for job-number year and overdue calculation |
| `BACKEND_PORT` / `FRONTEND_PORT` | Ports opened on your PC |
| `REACT_APP_BACKEND_URL` | Address the browser uses to reach the backend (`http://localhost:<BACKEND_PORT>`) |
| `CORS_ORIGINS` | Address of the frontend (`http://localhost:<FRONTEND_PORT>`) |

No secrets are stored in the code. If you change `REACT_APP_BACKEND_URL`, rebuild (step 4).

## 4. Start
```powershell
docker compose up -d --build
```
First build takes several minutes. Then open **http://localhost:3000**.

## 5. Daily use
- Stop: `docker compose stop`
- Start again: `docker compose start`
- View logs: `docker compose logs -f backend`

Data is kept in the Docker volume `sst_mongo_data` and survives restarts.
**Do not** run `docker compose down -v` — `-v` deletes the database.

## 6. Backup & restore
```powershell
docker compose exec mongo mongodump --db sst_job_management --archive=/data/db/backup.archive
docker compose cp mongo:/data/db/backup.archive .\backup.archive
```
Restore:
```powershell
docker compose cp .\backup.archive mongo:/data/db/backup.archive
docker compose exec mongo mongorestore --archive=/data/db/backup.archive --drop
```

## 7. Update to a new version
Replace the project files (keep your `.env`), then `docker compose up -d --build`.

## Features
- Dashboard, Create Job Sheet (separate Wedding Card / Other Printing forms), Work Management, Reports, Recycle Bin, Settings
- Job numbers `SST-<year>-001`, restart each year, unique-indexed in the database
- Wedding total = Card Cost + Printing Cost − Discount; Balance = Total − Advance
- Actual costs → Total Production Cost, Actual Profit, Profit Margin %
- Overdue = job date older than the configured days (default 7) and not Completed/Delivered
- Full edit history, soft-delete Recycle Bin with restore
- A4 printable job sheet (Print / Save as PDF) — internal costs are never printed
