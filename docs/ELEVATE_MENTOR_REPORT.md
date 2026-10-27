# ELEVATE — Mentor Report

**Project:** Design and Evaluation of an Educator-Led Experiential Pedagogical Model and Personalized Digital Platform for Holistic Student Growth  
**Short name:** ELEVATE (Educator-Led Experiential Value and Life-skills Advancement Through Engagement)  
**Programme:** B.Tech Information Technology, Walchand Institute of Technology, Solapur  
**Group:** B-07  
**Local codebase:** `D:\fproject\Elevate`  
**This report’s basis:** inspection of the current source, migrations, tests, and package scripts on 27 October 2026. It does **not** claim that the running app was walked through in a browser for this document.

---

## How to read this report

Features below are labelled as:

1. **Implemented** — present in the current frontend and/or backend code.
2. **Automated tests** — covered by Node test scripts under `server/test-phase*.js`, with the results recorded in this report.
3. **Manually verified in a running application** — **not claimed here.** No browser walkthrough was performed while preparing this document.
4. **Still needs verification** — depends on local data, payment keys, email keys, or a live click-through.

This is a student project prototype. It does **not** confer institutional accreditation, university credit, or an official professional licence.

---

## 1. What ELEVATE is, and the problem it addresses

Engineering programmes teach technical subjects well, but many students still struggle with communication, teamwork, confidence, and applying skills in realistic tasks. Typical e-learning sites emphasise long videos and quizzes. Completing a video is not the same as practising a skill and receiving feedback.

ELEVATE is a web platform that treats a **Growth Journey** as the unit of learning. A journey is a short, educator-designed path with six stages. The intended output is not only a completion badge, but a **Growth Portfolio**: evidence of what the learner did, the feedback they received, and how they improved.

A related but separate track is **live workshops** (events): scheduled sessions with registration, optional payment, attendance, and a workshop-specific certificate of participation.

---

## 2. The six-stage growth model (E-L-E-V-A-T)

Each published journey is structured around six stages stored in the database:

| Stage | Name | What the learner does |
|---|---|---|
| **E** | Explore | A diagnostic / baseline step so the path can start from the learner’s current state. |
| **L** | Learn | Short educator-authored video capsules (lessons), not hour-long lectures. |
| **E** | Experience | A practical activity: the learner submits work (text, files, or similar). |
| **V** | Validate | An educator reviews the submission against a rubric and can request revision. |
| **A** | Apply | A more authentic task that connects practice to a real setting. |
| **T** | Transform | The learner curates evidence into a portfolio and reflection. |

The design draws on experiential learning (learn by doing), mastery learning (revise after feedback rather than one attempt and move on), and reflective practice (compare before and after).

---

## 3. Technologies and what each one does

| Technology | Role in this project |
|---|---|
| **React + Vite** | Browser user interface, with Tailwind CSS for layout and styling. |
| **React Router** | Pages such as home, catalogue, dashboard, educator studio, workshops, and certificate verification. |
| **Node.js + Express** | HTTP API: authentication, journeys, lessons, activities, payments, events, certificates. |
| **PostgreSQL** | Lasting storage for users, journeys, enrolments, payments, events, attendance, and certificates. |
| **JWT in an HTTP-only cookie** | Keeps a signed-in session without putting the token in frontend source. |
| **Razorpay (test-oriented integration)** | Creates and verifies orders for paid journeys and paid workshops. Live success with a real bank card is **not** claimed here. |
| **PDFKit + QR codes** | Builds downloadable PDF certificates on the server. |
| **Resend (optional)** | Can email a certificate if an API key is configured. Issuance still works if email is missing. |
| **Git / GitHub** | Source control. The local working tree currently contains a large set of **uncommitted** changes; GitHub may not yet match this machine. |

---

## 4. Who uses the system

### Learner (student)

**Implemented**

- Register and log in (public registration creates a **learner** account).
- Browse the journey catalogue (`/courses`) and workshop catalogue (`/events`).
- Complete a diagnostic questionnaire (`/learning-needs`) and receive rule-based journey recommendations.
- Enrol in journeys (free or, if priced, through the payment checkout path).
- Watch lessons and have progress recorded (`/learn/:journeyId`).
- Submit practical activities and see educator feedback.
- View a dashboard (`/dashboard`), growth report (`/growth-report`), and portfolio (`/portfolio`).
- Register for **free** workshops directly; paid workshops require the payment flow.
- Check workshop certificate eligibility, claim an eligible certificate, download a PDF, and open a public verification link.
- List issued journey and workshop certificates on the dashboard.

**Automated tests:** journey eligibility and certificates (Phase 5C); free workshop registration and capacity (Phase 6A); paid workshop orders and verification with a **mocked** Razorpay client (Phase 6B.1 / 6B.1.1); workshop attendance and certificates with mocks (Phase 6B.2).

**Still needs verification:** a learner account that actually has lessons, submissions, and a completed workshop on **this** database; Razorpay keys if you want to show paid checkout; Resend if you want a real email.

### Educator

**Implemented**

- Educator Studio (`/educator`): draft journeys, stages, lessons, and activities; review submissions and give feedback.
- Workshop management: create drafts, publish, cancel, view the attendee roster, mark a workshop completed after it has ended, mark present/absent.
- Ownership: an educator can manage their own events; another educator is rejected by the API.

**Note:** publishing a **journey** (as opposed to a workshop) is an **admin-only** API on `PATCH /api/educator/journeys/:id/publish`.

**Educator review vs administrator review:** an educator only sees journeys and submissions where `journeys.created_by` is that educator. An administrator sees all of them. If a learner submits work on a catalogue journey that has no owner, only an administrator can review it. That empty educator inbox is ownership filtering, not a missing review screen. Catalogue journeys are meant to be owned by the local demo educator (`educator@elevate.edu`) after `seed-educator-admin.js` / `db:seed` assignment.

**Automated tests:** educator permissions, roster isolation, attendance ownership, and workshop completion guards.

**Still needs verification:** that this machine already has an educator user and published content you can click through.

### Administrator

**Implemented in the API**

- Role `admin` can complete workshops (including a documented force-complete on the API), view all events, revoke certificates, and list/resolve **unresolved captured payments**.

**Implemented only thinly in the UI**

- `/admin` is a short console with links into the Educator Studio and workshops. The page still contains a placeholder note about later governance/analytics. `GET /api/admin` is a stub (`Admin routes coming soon`).
- There is **no** dedicated frontend screen for unresolved payments; that exists as API routes under `/api/payments/unresolved`.

Do not present the admin page as a full control panel.

---

## 5. Catalogue, authentication, and roles

- Public pages include home (`/`), courses, community, career roadmaps, workshops, testimonials, about, login, register, and public certificate verification.
- Authenticated pages use `ProtectedRoute`. `/educator` allows `educator` and `admin`. `/admin` allows `admin` only.
- Passwords are hashed (bcrypt). Sessions use a JWT cookie. Role checks for attendance, payments, and certificates run on the **server**. The browser is not treated as the authority.

---

## 6. Videos, progress, diagnostic, activities, reports, portfolios

**Implemented**

- Lessons (capsules) inside the Learn stage; progress is stored in PostgreSQL.
- Diagnostic answers stored and matched to journeys by a recommendation helper.
- Activities, submissions, and educator review (including revision requests).
- Growth report and portfolio pages that read learner APIs.

**Automated tests:** lesson progress, activities/feedback, and portfolio integrity appear in Phase 4/5 suites; Phase 5C checks that incomplete lessons and unapproved required activities **block** a journey certificate.

**Still needs verification:** that seeded lessons and activities exist for the journeys you open during the viva. Empty stages will look unfinished even though the feature exists in code.

---

## 7. Workshops, attendance, and certificates

### Workshops

**Implemented**

- Public list and detail pages.
- Free registration with capacity locking (row lock + seat count) so two people cannot take the last seat at once.
- Paid workshops cannot be joined with the free-register button; they go through Razorpay order creation and signature verification.
- Reservations expire so abandoned checkouts can free a seat (hardening tests).
- If a payment is captured after an event is full or cancelled, the system can mark the order **captured but unresolved** instead of silently overselling. Resolution is an API for admin/educator, not a polished UI.

### Attendance

**Implemented (server is authoritative)**

- One attendance row per event and learner (`present` / `absent`).
- Only the owning educator or an admin can record it.
- Learners cannot mark themselves.
- Cancelled, waitlisted, or missing registrations are rejected.
- Paid registrations need a captured `paid` status; unresolved captured payments block attendance.
- Normal recording is refused until the scheduled **end time** has passed. The educator roster UI also hides Present/Absent until the event has ended or is marked completed.

### Journey certificates vs workshop certificates

These are **separate** tables and rules.

A **journey** certificate is issued only when the server agrees the learner finished that journey’s requirements (published journey, enrolment, lessons, required activities). Format in tests: `ELV-…`.

A **workshop** certificate is issued only when **all** of the following hold on the server:

- Valid, non-cancelled registration (`registered`).
- Event lifecycle status is `completed`.
- Scheduled end time has passed.
- Attendance is `present`.
- If the workshop is paid: payment status is captured/`paid`, with no unresolved payment problem.

Numbers use the `ELV-WS-` prefix. Tokens are 64 hex characters. Duplicate issue requests return the existing row. Revoked certificates verify as invalid and cannot be downloaded.

Public verification (`/verify-certificate/:token` → `GET /api/certificates/verify/:token`) is designed to show name, title, number, dates, and type — **not** email, payment IDs, or internal user IDs.

PDF download is generated on the server. Optional email uses Resend; missing configuration records `not_configured` and still leaves the certificate issued.

**Automated tests:** Phase 5C (journey certificates, PDF, verification, revocation, mocked email); Phase 6B.2 (attendance, workshop certificates, concurrent issue, PDF, privacy, revocation, mocked email). See Section 10 for counts.

**Still needs verification in a live demo:** a workshop that has **already ended**, is **completed**, and has **present** attendance for the learner you will use. Creating a future workshop during a 7-minute talk is not enough to claim a certificate on the same day unless you wait until `ends_at` (the educator UI does not bypass that rule).

---

## 8. Architecture (short)

```
Browser (React, Vite, port 5173 by default)
    → HTTP + cookie → Express API (port 5000 by default, /api/...)
                          → PostgreSQL (elevate_db by default)
                          → Razorpay (only if keys are set)
                          → Resend (only if a key is set)
```

Schema is created with `server/src/db/init.js` and extended by additive migrations (learner needs, payments, lessons, activities, portfolio, certificates, events, workshop pricing, payment hardening, workshop attendance/certificates). The frontend calls `VITE_API_URL` or falls back to `http://localhost:5000/api`.

---

## 9. Automated tests and actual results

Tests are **not** wired into `package.json` as `npm test`. They are run from `server/` with Node, for example `node test-phase6b2.js`. They start a temporary HTTP server and talk to the **local PostgreSQL** database. External Razorpay and Resend calls are **mocked** in the later suites.

Results from the stabilization audit on **27 October 2026** (each command’s exit code was checked):

| Suite | File | Result |
|---|---|---|
| Diagnostic / recommendations | `test-phase2b-full.js` | **16 passed, 0 failed** (exit 0) |
| Diagnostic smoke | `test-diagnostic.js` | exit 0 |
| Journey pricing foundation | `test-phase3a.js` | **16 passed, 0 failed** (exit 0) after isolating assertions to the eight catalogue titles |
| Razorpay validation | `test-phase3b.js` | exit 0 |
| Educator authoring | `test-phase4a.js` | **36 passed, 0 failed** (exit 0) after isolating Scenario 36 to the eight catalogue titles |
| Lesson player / progress | `test-phase4b.js` | **35 passed, 0 failed** (exit 0) |
| Activities and feedback | `test-phase5a.js` | **37 passed, 0 failed** (exit 0), including new ownership list checks 4D–4F |
| Growth report / portfolio | `test-phase5b.js` | exit 0 |
| Journey certificates | `test-phase5c.js` | **22 passed, 0 failed** (exit 0) |
| Workshops | `test-phase6a.js` | **30 passed, 0 failed** (exit 0) |
| Paid workshop payments | `test-phase6b1.js` | **37 passed, 0 failed** (exit 0) |
| Payment hardening | `test-phase6b1-hardening.js` | **39 passed, 0 failed** (exit 0) |
| Workshop attendance / certificates | `test-phase6b2.js` | **50 passed, 0 failed** (exit 0) |

**Earlier Phase 3A failure (13 passed / 3 failed):** that run counted *every* published journey in the local database. Extra rows from later payment and workshop tests (including a paid “Hardening Journey” and leftover “Phase 6B.2 Regression Journey …” titles) made a global count of eight fail. That was **test-data contamination plus an over-strict assertion**, not a broken price column or payment verifier. The suite now checks that the **eight named catalogue journeys** still exist and are free. Leftover 6B.2 regression journeys from a crashed run were deleted; the paid Hardening Journey was left in place because it is not a catalogue title.

Frontend: `npm run lint` in `client/` completed with **warnings only** (exit 0). `npm run build` **succeeded**.

**Not claimed:** live Razorpay capture, live Resend delivery, or a full browser demonstration of every screen.

---

## 10. Limitations and work that still needs a human check

- **Local Git vs GitHub:** many workshop, certificate, and portal files are still uncommitted on `main`. A clone of GitHub alone may be older than this folder.
- **Admin UI** is incomplete; do not oversell it.
- **Unresolved payments** have APIs, not a learner/admin page.
- **Email** is optional and was tested with mocks.
- **Paid checkout** needs valid Razorpay test keys in `server/.env` (never commit that file).
- **Certificate claim** needs a completed, ended workshop with present attendance.
- **Content:** journeys, lessons, and workshops exist only if this database was seeded and educators added material.
- **Home v2** (`/home-v2`) is a separate landing page; it was not modified for later workshop work and is not required for the demo path in the companion guide.
- The public Community / Testimonials pages are largely presentational.

---

## 11. Suggested one-line summary for a mentor

ELEVATE is a student-built web prototype that models educator-led, six-stage skill practice (with feedback and a portfolio) and adds workshops with server-side attendance and verifiable PDF certificates. Core rules are covered by automated API tests with mocked payment and email providers; a live click-through still depends on local accounts, scheduled workshop times, and optional third-party keys.
