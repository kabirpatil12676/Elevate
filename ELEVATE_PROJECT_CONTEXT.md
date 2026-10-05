# ELEVATE — Complete Project Context File

> **Purpose:** This document captures the full context of the ELEVATE Final Year BTech IT Project so that any LLM (regardless of account or session) can instantly understand the project and continue work without context loss.
>
> **Last Updated:** 2026-10-05

---

## 1. Project Identity

| Field | Value |
|---|---|
| **Full Title** | Design and Evaluation of an Educator-Led Experiential Pedagogical Model and Personalized Digital Platform for Holistic Student Growth |
| **Short Name** | **ELEVATE** — Educator-Led Experiential Value and Life-skills Advancement Through Engagement |
| **Department** | Information Technology |
| **College** | Walchand Institute of Technology (WIT), Solapur — An Autonomous Institute, Affiliated to Solapur University |
| **Group No.** | B-07 |
| **Project Guide** | Dr. Ms. D. D. Awasekar |
| **Academic Year** | 2025–2026 |
| **Project Type** | Final Year Major Project (BTech IT) |

---

## 2. Team Details

| Sr. | Name | Roll No. |
|-----|------|----------|
| 1 | Kabir Shitalkumar Patil | B-26 |
| 2 | Alok Shriniwas Perla | B-34 |
| 3 | Vidhi Jatinbhai Patel | B-23 |
| 4 | Rudraksh Rahul Vaidya | B-61 |

**Primary developer / repo owner:** Kabir Patil (`kabirpatil12676` on GitHub)

---

## 3. Repository and File Structure

### 3.1 Git Repository
- **GitHub:** `https://github.com/kabirpatil12676/Elevate.git`
- **Local path:** `e:\Fproject\Elevate\`
- **Default branch:** `main`
- **Current state:** Fresh repo — only initial commit with a blank `README.md`. **No application code written yet.**

### 3.2 Project Workspace Layout (`e:\Fproject\`)

```
e:\Fproject\
|-- Elevate\                           # The actual repo (currently empty)
|   |-- .git\
|   |-- README.md                       # Placeholder "# Elevate"
|   |-- ELEVATE_PROJECT_CONTEXT.md      # THIS FILE
|
|-- Documentation and Presentations
|   |-- ELEVATE_Synopsis_Final.docx          # Full synopsis with AI feedback sections
|   |-- ELEVATE_Synopsis_Final_NoAI.docx     # Synopsis with AI references removed
|   |-- ELEVATE_Synopsis_Final_Clean.docx    # Cleaned version (no extra images)
|   |-- ELEVATE_Synopsis_Final_Formatted.docx# Formatted headings/captions
|   |-- ELEVATE_Synopsis_Final_v2.docx       # Version 2 iteration
|   |-- ELEVATE_Synopsis_Updated.html        # Styled HTML version of synopsis
|   |-- BTech_IT_Project_Synopsis_Format.docx# College template
|   |-- Project_Synopsis.docx                # Shorter initial synopsis
|   |-- Design.docx                          # Design document (~880KB)
|   |-- ELEVATE_Final_Presentation (1).pptx  # Final presentation (~8.7MB)
|   |-- ELEVATE_Round_2.pptx                 # Round 2 presentation (~16MB)
|   |-- Final_1.pptx / Final_1 (1).pptx     # Earlier presentation versions
|   |-- Project Idea Presentaion Template.pptx
|
|-- Extracted Content
|   |-- synopsis_full.txt       # Full text extracted from synopsis docx
|   |-- synopsis_extract.txt    # Partial extract (sections 5.5-9)
|   |-- ppt_full.txt            # Text extracted from presentation slides
|   |-- ppt_images\             # 10 PNG images extracted from PPTs
|       |-- image1.png - image10.png
|
|-- Utility Scripts (Python, used for document processing)
|   |-- build_synopsis.py       # Generates the full synopsis docx programmatically
|   |-- build_synopsis_clean.py # Cleaned version generator (no extra figures)
|   |-- fix_docx.py             # Fixes heading sizes and figure/table numbering
|   |-- patch_script.py         # Patches build_synopsis.py to create clean variant
|   |-- map_slides.py           # Maps PPTX slides to their embedded images
|   |-- remove_author.py        # Removes template author metadata (unrelated project)
```

---

## 4. The ELEVATE Pedagogical Model

ELEVATE is not just an app — it is a **pedagogical framework** paired with a digital platform. This is the core intellectual contribution of the project.

### 4.1 Core Concept
A **Growth Journey** replaces the traditional "course" as the unit of learning. Instead of watch-quiz-certificate, the learner goes through a structured six-stage experiential cycle that produces a **Growth Portfolio** (evidence of measurable skill development) as the output.

### 4.2 The Six Stages (E-L-E-V-A-T)

| # | Stage | Name | What Happens |
|---|-------|------|--------------|
| 1 | **E** — Explore | Diagnostic Assessment | Learner completes a diagnostic capturing current competency, prior experience, hesitation areas, and personal goals. Establishes the **Learner Growth Profile** as a measurable baseline. |
| 2 | **L** — Learn | Educator-Led Learning Capsules | Focused 8-15 min educator-authored capsules: concept demonstrations, experience-based stories, practical frameworks, and case situations. NOT passive hour-long lectures. |
| 3 | **E** — Experience | Activity Challenge | Hands-on activity requiring the learner to **perform** the skill (e.g., record a 90-sec self-introduction, draft a professional email, analyze a case). Submissions can be video/text/documents. |
| 4 | **V** — Validate | Multi-Source Feedback | Submissions assessed via: educator rubric scoring + optional peer feedback. Learner can **iterate** on submission before advancing (mastery learning principle). |
| 5 | **A** — Apply | Authentic Task | Real-world application of the skill (e.g., update LinkedIn profile after personal branding capsule, deliver a real presentation). Bridges practice to real world. |
| 6 | **T** — Transform | Growth Portfolio | Learner reflects and curates portfolio: before-state diagnostics, submissions, feedback received, revisions, final artifact, self-reflection. Primary credential output. |

### 4.3 Theoretical Foundations

| Theory | Author | How ELEVATE Uses It |
|--------|--------|---------------------|
| **Experiential Learning** | Kolb (1984) | Experience, Validate, Apply, Transform map to Kolb's four-stage cycle; extended with Explore (diagnostic) and Learn (educator-led). |
| **Mastery Learning** | Bloom (1968) | Learners iterate on submissions after feedback rather than one-attempt-move-on. |
| **Reflective Practice** | Schon (1983) | Transform stage requires comparing before/after states, articulating what changed and why. |

### 4.4 Know, Do, Become Measurement Framework

Every Growth Journey measures progress across three dimensions (pre- and post-journey):

| Dimension | Measures | How |
|-----------|----------|-----|
| **KNOW** | Conceptual understanding | Pre/post diagnostic assessments, quiz scores, concept checks |
| **DO** | Demonstrated performance | Activity challenge submissions evaluated against educator rubric |
| **BECOME** | Behavioral growth | Before/after portfolio comparison, artifact quality, rubric improvement scores |

---

## 5. Problem Statement and Motivation

### 5.1 Core Problem
Engineering education delivers technical knowledge but **fails to develop life skills, communication competencies, and professional capabilities**. Existing platforms do not solve this because:

1. **Passive Content-Centric Learning** — Videos + quizzes, no practice or feedback
2. **Lack of Structured Experiential Learning** — No activity-challenge-feedback cycle
3. **Limited Personalized Feedback** — Generic assessments, no mentoring
4. **Absence of Evidence-Based Skill Assessment** — Completion certificates are not competence proof
5. **Poor Support for Holistic Development** — Technical skills only; communication, leadership, teamwork ignored

### 5.2 Research Gap
No existing platform combines:
- (a) An educator-led, six-stage experiential pedagogical model
- (b) Multi-source feedback on practice submissions
- (c) A Growth Portfolio as the primary learning artifact

...within a single organizational platform for life-skill and professional development.

### 5.3 Student Survey Validation (n = 39)
- 35.9% struggle with **confidence/public speaking**; 28.2% with **communication**
- 66.7% prefer **short practical videos**; 41% want doubt-solving communities
- 74.4% feel unprepared for **Coding/DSA**; 46.2% for **technical interviews**
- 53.8% curious about **AI tools for productivity** but lack guidance

---

## 6. Project Objectives (Formally Stated)

1. **Identify students' learning needs and skill gaps** through surveys and analysis
2. **Design an educator-led experiential pedagogical model** (the ELEVATE 6-stage framework: Explore, Learn, Experience, Validate, Apply, Transform)
3. **Develop a personalized digital platform** delivering masterclasses, learning activities, assessments, personalized pathways, multi-source feedback pipeline, and Growth Portfolio subsystem
4. **Evaluate effectiveness** through user feedback, engagement metrics, skill improvement, and the Know, Do, Become measurement framework

---

## 7. System Architecture and Technology Stack

### 7.1 Architecture Overview
- **Pattern:** Client-server, modular monolith with componentized SPA frontend
- **API Style:** RESTful
- **Core Engine:** ELEVATE Engine — server-side pedagogical logic orchestrating stage transitions, Learner Growth Profile management, submission routing, feedback pipeline, and Growth Portfolio computation

### 7.2 Technology Stack (Candidates — to be finalized)

| Component | Technology |
|-----------|-----------|
| **Frontend** | React.js — component-based SPA with role-based routing |
| **Backend** | Node.js + Express.js (primary candidate); alt: Django REST Framework |
| **Database** | PostgreSQL (relational) or MongoDB (document-oriented) — TBD |
| **Authentication** | JWT-based stateless auth; RBAC (Learner / Educator / Admin roles) |
| **File/Media Storage** | AWS S3 or Firebase Storage (for activity submissions) |
| **Version Control** | Git / GitHub |
| **CI/CD** | GitHub Actions |
| **Deployment** | Docker containers on AWS / Azure / Render |
| **Dev Hardware** | Intel i5+, 8-16 GB RAM, 256 GB SSD |

### 7.3 Core System Modules

1. **User Authentication and Role Management** — JWT + RBAC (Learner/Admin/Educator)
2. **Learner Growth Profile** — Diagnostic engine + personalization logic
3. **Journey and Stage Management (Admin)** — Authoring Growth Journeys with per-stage config
4. **Learning Capsule Delivery** — Educator-led content playback (8-15 min capsules)
5. **Activity Submission System** — File/video/text submission with status tracking + revision support
6. **ELEVATE Feedback Pipeline** — Rubric scoring + peer review orchestration
7. **Growth Portfolio Builder** — Evidence aggregation, before/after comparison, skill badge issuance
8. **Progress Dashboard (Learner)** — Journey stage status, feedback summary, portfolio view
9. **Administrative Dashboard** — Journey analytics, submission queues, cohort monitoring

### 7.4 User Roles

| Role | Capabilities |
|------|-------------|
| **Learner/Student** | Browse journeys, take diagnostics, consume capsules, submit activities, view feedback, iterate, build portfolio, view progress dashboard |
| **Educator** | Author capsules, design journeys, configure stages, score submissions via rubric, provide feedback, view learner progress |
| **Admin** | Full journey management, user management, submission queue management, analytics, platform configuration |

---

## 8. Development Methodology

Iterative, phase-wise approach:

| Phase | Description | Status |
|-------|-------------|--------|
| **Phase 1 — Requirement Analysis** | Formalize functional/non-functional requirements | Done (synopsis approved) |
| **Phase 2 — System Design** | Database schema, API contracts, ELEVATE Engine logic, UI architecture | Not started |
| **Phase 3 — Implementation** | Auth, Diagnostic, Journey Management, Capsule Delivery, Submission, Feedback, Portfolio, Dashboards | Not started |
| **Phase 4 — Testing** | Functional, integration, usability testing + end-to-end journey simulation | Not started |
| **Phase 5 — Pedagogical Evaluation** | Pre/post assessment with learner cohort vs. baseline | Not started |

---

## 9. Expected Deliverables

1. ELEVATE Pedagogical Model Specification
2. Student Requirement Survey Report
3. Cross-Platform Web-Based ELEVATE Platform Prototype (all 6 stages, at least 2 Growth Journeys)
4. Learner Growth Profile Subsystem
5. Educator-Led Growth Journey Feature
6. Activity Submission + Multi-Source Feedback Pipeline
7. Personalized Growth Portfolio Builder
8. Competency-Based Assessment Framework
9. Administrative Interface
10. Pedagogical Evaluation Report (pre/post comparison)
11. Complete Project Documentation (architecture, schema, API spec, test cases, user manuals)

---

## 10. Literature Survey Summary

### 10.1 Existing Platform Categories (Both Insufficient)

| Category | Examples | Why Insufficient |
|----------|----------|-----------------|
| Multi-Vendor Marketplaces | Udemy, Coursera, edX | Optimized for content discovery; linear video + quizzes; no submission/feedback/portfolio |
| Single-Owner LMS | Moodle, TalentLMS, Docebo | Passive content model; no experiential pedagogy; no multi-source feedback; no growth portfolios |

### 10.2 Key Academic References (IEEE Format)

| # | Author / Work | ELEVATE Contribution |
|---|---------------|----------------------|
| [1] | Kolb (1984) — Experiential Learning | Operationalizes experiential cycle digitally with activities, reflection, feedback, competency tracking |
| [2] | Bloom (1956) — Taxonomy of Educational Objectives | Integrates technical, professional, and life skills across multiple domains |
| [3] | Schon (1983) — The Reflective Practitioner | Provides digital reflection journals, guided prompts, educator feedback (Transform stage) |
| [4] | Dabbagh and Kitsantas (2012) — PLEs and Self-Regulated Learning | Combines self-regulation with active educator mentorship + personalized pathways |
| [5] | Siemens (2005) — Connectivism | Competency-based assessments, real-world activities, growth portfolios |
| [6] | Hattie and Timperley (2007) — The Power of Feedback | Multi-source feedback pipeline operationalizes structured feedback at scale |
| [7] | Ifenthaler and Yau (2020) — Learning Analytics | Learner-facing Progress Dashboard + Growth Portfolio for real-time growth visibility |

---

## 11. Presentation History

| Presentation | Date | Content |
|-------------|------|---------|
| Project Idea Presentation | Early 2026 | Initial concept pitch |
| Final Synopsis Presentation (Final_1.pptx) | July 2026 | 12-slide deck: Intro, Team, Problems, Survey, Objectives, Lit Survey, Architecture, HW/SW Requirements, References |
| Round 2 Presentation (ELEVATE_Round_2.pptx) | Mid 2026 | Extended 16MB deck with deeper architecture details |
| Final Presentation (ELEVATE_Final_Presentation (1).pptx) | July 2026 | Polished final version |

---

## 12. Key Diagrams and Visual Assets

Located in `e:\Fproject\ppt_images\`:

| Image | Content |
|-------|---------|
| image1.png | Title slide / cover visual |
| image2.png | Logo / small graphic |
| image3.png | Traditional LMS vs ELEVATE comparison |
| image4.png | Five key challenges in current digital learning |
| image5.png | Student survey analysis charts (n=39) |
| image6.png | Four primary objectives visual |
| image7.png | Literature survey / timeline |
| image8.png | **System Architecture Diagram** — React Frontend, Node.js + Express API, Core Services, Data Layer |
| image9.png | HW/SW requirements visual |
| image10.png | References / additional visual |

---

## 13. Current Status and Next Steps

### What Is Done
- Pedagogical model designed (ELEVATE 6-stage framework)
- Student survey conducted (n=39)
- Synopsis document finalized and approved
- Presentations completed (multiple rounds)
- GitHub repo initialized
- Literature survey completed (7 IEEE references)

### What Is NOT Done
- **No application code exists yet** — the Elevate/ repo has only a README
- Technology stack not finalized (React + Node.js are candidates)
- No database schema designed
- No API contracts defined
- No UI designs/wireframes created
- No deployment pipeline configured

### Immediate Next Steps (Recommended)
1. **Finalize tech stack** (React.js + Node.js + Express.js + PostgreSQL recommended)
2. **Design database schema** based on the pedagogical model entities (Users, Journeys, Stages, Capsules, Submissions, Feedback, Portfolios)
3. **Create wireframes / UI mockups** for Learner and Admin interfaces
4. **Set up project scaffolding** (Vite + React frontend, Express backend, PostgreSQL)
5. **Implement Phase 3** module by module: Auth, Diagnostic, Journey Management, etc.

---

## 14. Key Domain Terminology

| Term | Definition |
|------|-----------|
| **Growth Journey** | The primary learning unit in ELEVATE — a structured 6-stage sequence producing a Growth Portfolio (replaces traditional "course") |
| **Learning Capsule** | Short (8-15 min) educator-authored learning module (replaces traditional "lecture") |
| **Activity Challenge** | Hands-on task requiring skill demonstration (not just comprehension) |
| **Learner Growth Profile** | Diagnostic-generated profile capturing baseline competency, experience, hesitations, goals |
| **Growth Portfolio** | Curated evidence of learning: before-state, submissions, feedback, revisions, final artifact, self-reflection |
| **ELEVATE Engine** | Server-side pedagogical logic component — orchestrates stage transitions, manages profiles, routes submissions |
| **Know, Do, Become** | Three-dimensional measurement framework for pre/post learning outcome assessment |
| **Skill Badge** | Digital credential issued upon Growth Portfolio completion |
| **Multi-Source Feedback** | Feedback from multiple channels: educator rubric + peer review |

---

## 15. Important Notes for LLMs

1. **This is a REAL college final-year project** — code quality, documentation, and academic rigor matter.
2. **The synopsis has been approved** — do not deviate from the approved objectives/architecture without explicit user agreement.
3. **AI feedback was descoped** — earlier synopsis versions mentioned "AI-assisted feedback" (OpenAI API). The final approved version scopes feedback to **educator rubric + peer review** only. The _NoAI suffix in filenames reflects this.
4. **The platform is domain-agnostic** — it should support academic, professional, technical, and life-skill content domains.
5. **The platform is single-organization** — NOT a marketplace. One content authority manages all journeys for its learners.
6. **Growth Portfolio is the primary output** — NOT a completion certificate. This is the key differentiator.
7. **Presentation date references show July 2026** — the project is in its implementation phase (October 2026 now).
8. **The remove_author.py script** in the project root is unrelated to ELEVATE — it was for another project (pharmaceutical-supply-chain-agentic-ai).

---

## 16. File Quick Reference for LLMs

| When you need... | Look at... |
|------------------|-----------|
| Full synopsis text | `e:\Fproject\synopsis_full.txt` |
| Approved objectives | Section 6 above, or build_synopsis.py lines 388-406 |
| Architecture diagram | `e:\Fproject\ppt_images\image8.png` |
| Survey data | `e:\Fproject\ppt_images\image5.png` |
| Literature review table | build_synopsis.py lines 482-517 |
| System modules list | Section 7.3 above |
| Expected deliverables | Section 9 above |
| This context file | `e:\Fproject\Elevate\ELEVATE_PROJECT_CONTEXT.md` |

---

*This context file should be read by any LLM at the start of any ELEVATE-related conversation. It is stored inside the repo so it persists across sessions, accounts, and tools.*
