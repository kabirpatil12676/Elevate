# ELEVATE — Local Demonstration Guide

Use this on **Windows PowerShell** with the project at `D:\fproject\Elevate`.  
Do **not** reset the database, re-run `db:init` / `db:seed`, or re-apply migrations unless your mentor session cannot start at all and you know those scripts are required. This machine already has a working schema if earlier phases ran successfully.

**Never print, copy, or commit** values from `server/.env` or `client/.env` (database password, JWT secret, Razorpay keys, Resend key).

---

## 1. What you will run

| Piece | Default local URL | Start command (from its folder) |
|---|---|---|
| PostgreSQL | `localhost:5432` (typical) | Windows service — see below |
| Express API | `http://localhost:5000` | `npm run dev` in `server` |
| Health check | `http://localhost:5000/api/health` | browser or `Invoke-RestMethod` |
| React / Vite UI | `http://localhost:5173` | `npm run dev` in `client` |

The frontend uses `VITE_API_URL` from `client/.env` if present, otherwise **`http://localhost:5000/api`**. CORS on the server uses `CLIENT_URL` from `server/.env`, otherwise **`http://localhost:5173`**.

Keep **two PowerShell windows** open: one for the API, one for the UI.

---

## 2. Check or start PostgreSQL

List PostgreSQL-related services:

```powershell
Get-Service *postgres*
```

If a service exists and `Status` is `Stopped`, start **that** service name (the name varies by installer, for example `postgresql-x64-16`):

```powershell
Start-Service -Name "postgresql-x64-16"
```

If `Get-Service *postgres*` returns nothing, PostgreSQL may be installed but not registered as a Windows service, or it is not installed. Start it the way you normally do on this PC (pgAdmin, installer tray icon, or Docker). Do not invent a new database.

Confirm the service is running:

```powershell
Get-Service *postgres* | Format-Table Name, Status, DisplayName
```

---

## 3. Confirm the database is reachable (no password on screen)

The API reads `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD` from `server/.env`. Do not `Get-Content` that file in front of an audience.

From `D:\fproject\Elevate\server`, this uses dotenv internally and only prints connected/failed:

```powershell
cd D:\fproject\Elevate\server
node --input-type=module -e "import dotenv from 'dotenv'; import pg from 'pg'; dotenv.config(); const p=new pg.Pool(); const r=await p.query('SELECT current_database() AS db, NOW() AS ts'); console.log('OK', r.rows[0].db, r.rows[0].ts); await p.end();"
```

Expected: a line starting with `OK` and the database name (often `elevate_db`).

If it fails: PostgreSQL is down, `server/.env` is missing, or the password/host in `.env` does not match the server. Fix `.env` privately; do not paste it into chat or slides.

---

## 4. Start the Express backend

```powershell
cd D:\fproject\Elevate\server
npm run dev
```

Wait until the console shows that the server is running on **http://localhost:5000** (or the `PORT` in `.env`).

### Health check (second PowerShell window, or a browser)

```powershell
Invoke-RestMethod http://localhost:5000/api/health
```

You want `status` = `ok` and `database` = `connected`.

### Common startup problems

| What you see | Likely cause | What to do |
|---|---|---|
| `EADDRINUSE` / port 5000 in use | Another Node process already bound | In Task Manager end the extra Node process, or change `PORT` in `.env` (then point the frontend at the new port). |
| Health `database: disconnected` | Postgres down or bad `.env` | Start Postgres; fix `.env` privately; retry health. |
| `JWT_SECRET` / Razorpay errors on **login or pay** | Missing env vars | Login needs `JWT_SECRET`. Paid checkout needs Razorpay keys. Free workshops and most pages work without Razorpay. |
| CORS / cookie login fails | `CLIENT_URL` not `http://localhost:5173` | Align `CLIENT_URL` with the Vite origin. |
| Frontend “Unable to connect to ELEVATE server” | API not running | Start `server` first, then refresh the UI. |

Leave this window open. Stopping it with Ctrl+C stops the API.

---

## 5. Start the React / Vite frontend

```powershell
cd D:\fproject\Elevate\client
npm run dev
```

Vite prints the local URL, normally **http://localhost:5173**. Open that in the browser (not the production `vite preview` URL unless you built and intended to).

Confirm the UI talks to this machine’s API:

```powershell
cd D:\fproject\Elevate\client
if (Test-Path .env) { Select-String -Path .env -Pattern '^VITE_API_URL=' } else { Write-Output 'No client/.env; app falls back to http://localhost:5000/api' }
```

Do not display other env files. If `VITE_API_URL` points at a hosted URL, change it **locally** to `http://localhost:5000/api` before the demo, then restart `npm run dev`.

---

## 6. Accounts (safe local use)

### Learner (recommended for the viva)

There is **no** guaranteed seeded learner in `package.json` scripts. Create one **once** before the mentor arrives:

1. Open http://localhost:5173/register  
2. Register with your own name, a new email, and a password of at least 6 characters.  
3. You should land on `/dashboard` as role **learner**.

Use that same email at http://localhost:5173/login later.

### Educator and administrator (only if already seeded)

`server/src/db/seed-educator-admin.js` can insert:

| Role | Email |
|---|---|
| Educator | `educator@elevate.edu` |
| Admin | `admin@elevate.edu` |

Passwords are **in that seed file**, not in `.env`. Open the file on disk if you need to recall them. **Do not re-run the seed script** before the demo; it is `ON CONFLICT DO NOTHING` but the instruction for this session is to avoid extra seeding.

If login fails for those emails, they were never applied on this database. Use **Register** for a learner, and ask an existing educator user you already have. Public registration (form and API) always creates a **learner**, even if a role field is sent. Educator and administrator accounts come from seed scripts or authorized database setup, not from the public register endpoint.

### Educator submissions on catalogue journeys

The educator inbox lists only journeys **that educator owns**. The eight seeded catalogue courses are assigned to `educator@elevate.edu` when that demo account exists (unowned rows are linked; already-owned journeys are not stolen). Logging in as a different educator and expecting to see those submissions is the wrong demo path — use the demo educator, or an administrator, who can review platform-wide.

### After login, where each role should go

| Role | First page |
|---|---|
| Learner | http://localhost:5173/dashboard |
| Educator | http://localhost:5173/educator |
| Admin | http://localhost:5173/admin (thin page) then `/educator` |

Log out from the navbar before switching accounts (same browser).

---

## 7. Five-to-seven minute demonstration sequence

**Preconditions (check these before the mentor sits down):**

- API health shows `database: connected`.
- UI loads at port 5173.
- A **learner** you can log in as.
- An **educator** you can log in as (needed for attendance / complete).
- **Free workshop registration:** at least one **published** workshop with **price 0**, **status published**, registration deadline **in the future**, and a free seat. If none exist, create one as the educator (Workshop tab → create → publish) **before** the talk, with a start time still in the future so the learner can register.
- **Certificate claim in the same sitting:** the workshop must have **already ended** (`ends_at` in the past), **status `completed`**, the learner **registered**, and attendance **present**. The educator UI will **not** let you mark attendance before the scheduled end. Do not promise a same-session certificate for a workshop that ends tomorrow.

If the certificate preconditions are not met, use the **fallback path** in Section 8. Do not improvise a paid Razorpay click unless keys are known to work.

### Minute-by-minute plan

1. **Home (about 45 s)**  
   Open http://localhost:5173/  
   Explain: ELEVATE is a six-stage growth journey plus live workshops, built by the project group as a working prototype.

2. **Learner login (20 s)**  
   http://localhost:5173/login → learner account → `/dashboard`.

3. **Journeys (40 s)**  
   Navbar **Courses** → http://localhost:5173/courses  
   Open one published journey. Say that enrolment and lessons live behind login; paid journeys would use Razorpay (you will not complete a live payment unless keys are confirmed).

4. **Workshops — reliable learner action (60 s)**  
   Navbar **Workshops** → http://localhost:5173/events  
   Open a **free upcoming** workshop → **Register**.  
   Return to the dashboard and show the registration card.

5. **Progress / portfolio (40 s, skip empty screens quickly)**  
   If the learner has enrolments: `/learn/...` or dashboard lesson progress.  
   Open `/growth-report` and `/portfolio` only if they show data; if empty, say “these pages read the learner APIs; this account has not finished a journey yet.”

6. **Switch to educator (60 s)**  
   Log out. Log in as educator. Open http://localhost:5173/educator  
   Show journeys (studio) briefly, then the **workshops** list, **View attendees** for the event the learner joined.

7. **Complete + attendance (only if `ends_at` has passed) (45 s)**  
   On the roster: **Mark completed** (only works after scheduled end, unless you are using the admin API force flag — the button does not send force).  
   Then **Present** for the learner. If the buttons say “Available after scheduled end”, **stop** and explain the rule instead of forcing it in the UI.

8. **Learner claims certificate (45 s, only if step 7 succeeded)**  
   Log out. Learner login. Open the same event: http://localhost:5173/events/{id}  
   If the page says eligible, **Claim Certificate**, then **Download Certificate PDF**.

9. **Public verification (20 s)**  
   Click **Verify** / open `/verify-certificate/{token}` in a new tab (no login). Point out: name, workshop title, number — not email or payment data.

10. **Close (20 s)**  
    Stack: React, Express, PostgreSQL; tests mock Razorpay and email; limitations as in the mentor report.

Keep a spare browser profile or window so you are not fighting a single cookie when switching roles.

---

## 8. Shorter fallback (about 4 minutes)

Use this if Razorpay keys, Resend, seeded lessons, or an ended workshop are missing.

1. Home → explain the six stages.  
2. Register or log in as learner.  
3. Courses catalogue + one journey detail.  
4. Workshops list + **free** register **or** only the detail page if no free seat.  
5. Educator studio: show a journey or a workshop draft/publish if you already have one.  
6. Open http://localhost:5173/verify-certificate/demo-invalid-token and show a failed verification (404/invalid) to prove the public route exists **without** claiming a real certificate.  
7. Stop. Say journey/workshop certificates and payments are implemented and API-tested; this database is not in a completed-workshop state.

Do **not** click paid checkout in fallback mode.

---

## 9. Mentor talking points

### 60–90 second introduction (speak naturally)

“ELEVATE is our final-year project: a website that treats professional and life skills as a six-stage growth journey rather than a long video course. The learner explores their starting point, studies short educator videos, submits a practical task, gets feedback, applies the skill, and records evidence in a portfolio. We also built live workshops: students register, paid seats go through Razorpay with signature checks and seat limits, and after the session an educator records attendance. A workshop PDF certificate is issued only if the server confirms registration, completion, presence, and payment where required. We used React, Express, and PostgreSQL. Automated tests cover the main API rules with mocked payment and email providers. We have not claimed a live bank payment or a live email send in this demonstration.”

### Likely viva questions

**What problem are you solving?**  
Students get technical teaching but little structured practice and feedback on professional skills. Video-and-quiz platforms do not store evidence of performance.

**What is your solution?**  
A six-stage journey with educator feedback and a portfolio, plus workshops with attendance and a separate certificate.

**How is the system structured?**  
A React client calls an Express API. PostgreSQL holds users, journeys, payments, events, attendance, and certificates. Role checks run on the server.

**How do you stop people cheating attendance or certificates?**  
Learners cannot call the attendance API. Certificates are issued only after server checks. Public verify does not expose emails or payment IDs. PDFs are generated on the server for the owner (or admin).

**What about payments and overselling?**  
Orders are verified with Razorpay’s signature. Capacity is locked in a database transaction. Abandoned reservations expire. A payment captured when the event is full or cancelled can be marked unresolved instead of creating an extra confirmed seat. We tested this with a mock Razorpay client, not a live capture in this report.

**How did you test?**  
Phase scripts under `server/test-phase*.js` hit a real local Postgres and a temporary Express server. Latest relevant counts: 6B.2 50/50, 6B.1 hardening 39/39, 6B.1 37/37, 6A 30/30, 5C 22/22. Phase 3A was 13/16 because it still expects eight free published journeys; this database has extra rows from later tests.

**What is not finished?**  
Admin UI is a stub. Unresolved-payment handling is API-only. Email is optional. GitHub may lag this folder’s uncommitted work. We did not perform a recorded browser test for this write-up.

**Why two certificate types?**  
A journey certificate means the learner finished that journey’s requirements. A workshop certificate means they attended a completed live session. Mixing those rules would be incorrect.

---

## 10. Stop the servers after the presentation

In **each** of the two PowerShell windows that run `npm run dev`:

```powershell
# Press Ctrl+C once. If Node does not exit:
Stop-Process -Name node -ErrorAction SilentlyContinue
```

Only use `Stop-Process -Name node` if you are sure you are not killing unrelated Node tools.

You do **not** need to stop PostgreSQL after a demo; leaving the service running is normal.

---

## 11. Commands recap (copy in order)

```powershell
# 1) PostgreSQL
Get-Service *postgres*
# Start-Service -Name "<the name from Get-Service>"   # only if Stopped

# 2) Database ping (no password printed)
cd D:\fproject\Elevate\server
node --input-type=module -e "import dotenv from 'dotenv'; import pg from 'pg'; dotenv.config(); const p=new pg.Pool(); const r=await p.query('SELECT current_database() AS db, NOW() AS ts'); console.log('OK', r.rows[0].db, r.rows[0].ts); await p.end();"

# 3) API  (leave running)
cd D:\fproject\Elevate\server
npm run dev

# 4) Health (other window)
Invoke-RestMethod http://localhost:5000/api/health

# 5) UI   (leave running)
cd D:\fproject\Elevate\client
npm run dev
# Open http://localhost:5173
```

Open in the browser: **http://localhost:5173** (app) and, if needed, **http://localhost:5000/api/health** (API).

---

## 12. Git and tests (for you, not for the mentor screen)

As of 27 October 2026 this clone is on branch `main` with many modified and untracked files (workshops, certificates, portals, tests). **Nothing in this guide commits or pushes.**

Automated results used in the mentor report were from `server/` Node test files on that date. They were **not** re-run while writing these documents. If you re-run tests, do it **after** the viva; they write and delete temporary users/events and can leave extra journeys if a run crashes (that is what confused Phase 3A).
