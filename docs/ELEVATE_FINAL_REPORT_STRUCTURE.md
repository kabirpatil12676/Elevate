# ELEVATE Final Report Structure

Use this outline for the academic report. Keep four labels separate in every chapter where they apply:

- **Implemented** — present in the codebase and reachable in the application.
- **Tested** — exercised by an automated suite or a recorded manual check. Name the test or the date.
- **Unconfigured** — code exists, but the external service is not connected.
- **Planned** — described as future work and not present as a working feature.

Do not write measured learning outcomes until `docs/ELEVATE_LEARNER_EVALUATION_PLAN.md` has been completed with real participants. Until then, Chapter 13 contains the method and states that results are not yet available.

## 1. Problem definition and motivation

State the educational problem: learners need a guided path from concept to evidence of change, and educators need ownership of content, feedback, and completion. Motivate ELEVATE as an educator-led experiential platform, not as a generic video catalogue.

## 2. Literature review and theoretical foundations

Cover experiential learning, diagnostic or pre-assessment, rubric-based feedback and revision, portfolio evidence, and credential verification. Tie the review to Know → Do → Become. Cite sources actually read. Do not invent study results.

## 3. ELEVATE six-stage model

Explain Explore → Learn → Experience → Validate → Apply → Transform, and how each stage appears in a Growth Journey (diagnostic, capsules, practical activity, educator review, application, reflection and portfolio).

## 4. System architecture

Describe the React client on Vercel, the Express API on Render, and Neon PostgreSQL in Singapore. Explain the same-origin `/api` proxy, HTTP-only session cookie, and role checks on the server. Note the free-tier hosting constraint and that no paid keep-alive service is used.

## 5. Database design

Summarise the relational model actually migrated (users, journeys, stages, capsules, enrolments, activities, submissions, feedback, portfolios, certificates, events, registrations, attendance, workshop certificates, payment orders). State that production data was preserved and that seed scripts are not run against production.

## 6. API and module design

Group endpoints by module: authentication, diagnostic recommendations, journeys and enrolment, lesson progress, submissions and educator review, growth report and portfolio, workshops and attendance, certificates and public verification, payments. For each module, note which role may call it.

## 7. Technology stack

Record the versions used in the repository: React, Vite, Tailwind, Express, PostgreSQL (`pg`), JWT, PDFKit, and the optional Razorpay and Resend packages. State that Razorpay and Resend are dependencies, not configured production services.

## 8. Implemented functionality

List working product areas: learner, educator, and admin roles; registration locked to learner; diagnostic recommendations; journey enrolment; lesson player and progress; educator studio; practical submissions; rubric feedback and revision; growth report and portfolio; career roadmaps; community and homepage; workshops, capacity, and attendance; journey and workshop certificates with PDF download, public verification, and revocation.

## 9. UI screenshots

Capture the homepage, courses, lesson player, learner dashboard, growth report, portfolio, educator portal, admin portal, workshops, and certificate verification. Label each figure with the route and whether it was taken locally or in production. Do not reuse a screenshot for a screen that was not opened.

## 10. Automated testing

List each phase suite and its result from the run recorded in the project log. Include frontend lint and production build. If a suite was not run, say so. Do not convert a skipped suite into a pass.

## 11. Manual testing

Record checks that a person performed: registration and login (already completed in an earlier phase), page refresh, session persistence, logout, and any educator, admin, or certificate checks. Mark blocked checks as blocked, with the reason, instead of describing them as successful.

## 12. Production deployment

Document:

- Frontend: `https://elevate-eight-gamma.vercel.app/`
- Backend: `https://elevate-backend-4mdn.onrender.com`
- Database: Neon PostgreSQL, Singapore
- Health: `GET /api/health` via the Vercel proxy and directly on Render
- Recurring hosting cost: ₹0, using Vercel, Render, and Neon free tiers

## 13. Learner evaluation methodology and results

Insert the Know, Do, and Become instruments and the analysis method from the evaluation plan. Under results, write “Not yet collected” until real rows exist. Do not estimate an improvement percentage.

## 14. Limitations

Include at least:

- Razorpay is not configured. Paid enrolment and paid workshop registration fail with an explicit message. Free registration remains available.
- Resend is not configured. Certificate email is not delivered. PDF download and public verification remain available.
- Render free tier sleeps after inactivity. The first request after sleep is slow. No artificial keep-alive is configured.
- Admin portal is a governed entry to educator studio and workshops. It is not a separate analytics product.
- Homepage portrait assets are large PNGs. Appearance was preserved rather than replaced.
- Educational effectiveness is not demonstrated until the evaluation instruments are completed.

## 15. Future scope

Possible later work, labelled planned: live Razorpay keys, Resend domain verification, richer admin analytics, image compression after a visual comparison, and a full learner cohort study.

## 16. Conclusion and references

Conclude only on what was built, deployed, and tested. Separate that from learning effectiveness. List references used in Chapter 2.
