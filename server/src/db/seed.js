/**
 * ELEVATE Platform — Database Seed Script
 *
 * Seeds the journeys and stages tables with the 8 published courses
 * matching the ELEVATE experiential learning model:
 * 1. Explore
 * 2. Learn
 * 3. Experience
 * 4. Validate
 * 5. Apply
 * 6. Transform
 *
 * Idempotent: Can be run multiple times safely. Existing journeys or stages
 * will not be duplicated. Missing stages for existing journeys will be inserted.
 *
 * Run with: npm run db:seed
 */

import pool from '../config/db.js';
import dotenv from 'dotenv';

dotenv.config();

const journeysData = [
  {
    title: 'How to Do Engineering',
    description: 'A practical, ground-level guide to navigating engineering college life — from understanding syllabi and managing workload to finding your first internship and building projects that matter.',
    thumbnail_url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBRG4aT_4k0YkYKchQIJwXsjkBvKIjfqjhTtsP8vfiH_DGWTFEnjU0Buacu_3prd9rVZijD0lQSaRTLgTvKQ-qi5fW4JaFDj10xpARWul4faLDAxv19xAdGkGeXhO0JFaZeI33BnMQPjPRuz2JQOTNqAERwOHoMQazS74QyppKWKLNulmEZqVofNplfEuXybQUw-D3qQrn1cmGUC-pwY9jd1lcPGFKhq4gQsbG7iNKiE91OEZnXhJc-pIKzL_0Ie51gET-2xZ3sNLpg-Qk',
    category: 'Career Growth',
    skill_domain: 'Engineering Fundamentals',
    difficulty: 'Beginner',
    duration_hours: 3.5,
    badge: 'NEWLY LAUNCHED',
    status: 'published',
    stages: [
      {
        stage_type: 'explore',
        title: 'Engineering Mindset & Diagnostic',
        description: 'Assess your baseline analytical thinking, identify core academic strengths and weaknesses, and discover your engineering interests.',
        order_index: 1,
      },
      {
        stage_type: 'learn',
        title: 'Curriculum & Study Strategy Mastery',
        description: 'Master foundational concepts: decoding technical syllabi, effective self-study methods, laboratory best practices, and semester planning.',
        order_index: 2,
      },
      {
        stage_type: 'experience',
        title: 'Hands-on Workload & Problem Simulation',
        description: 'Engage in structured mini-engineering challenges simulating real assignment constraints and laboratory experiments.',
        order_index: 3,
      },
      {
        stage_type: 'validate',
        title: 'Faculty & Peer Roadmap Review',
        description: 'Submit your semester roadmap and coursework breakdown for educator feedback and collaborative peer evaluation.',
        order_index: 4,
      },
      {
        stage_type: 'apply',
        title: 'Engineering Project Proposal & Implementation',
        description: 'Execute a practical mini-project applying fundamental engineering principles to solve a campus or community problem.',
        order_index: 5,
      },
      {
        stage_type: 'transform',
        title: 'Professional Growth Portfolio & Reflection',
        description: 'Synthesize learnings into a structured engineering milestone portfolio, articulate career reflections, and unlock your Stage Badge.',
        order_index: 6,
      },
    ],
  },
  {
    title: 'How to Organise an Event',
    description: 'End-to-end event management — from ideation and budgeting to logistics, team coordination, vendor management, and post-event review.',
    thumbnail_url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBn6Lct4wfuDXvpC_cVWP62bxCb7vy9qHRX-0fWji2UgB1fstx9H376CxCOkYoMpaLSWz5_insdplkENS9BeIgtdxMByaNYw__8zR-KGCjh_zrBNvdwwL6YX-fdNQRS3v2LI_vEE3tCbmFyi13ZWb27rLl-ikytOD_Z4rdyQIUJZ4uoZzBvZM6LAg3bFs3kWrVQ7CPujcEHnXkxoikmyqDYPDFbRHnmI4MAC-va6Yg7iKoun20ILk5s_sL_nm3nwbDO8Y7GhMMHXFcyHMs',
    category: 'Communication',
    skill_domain: 'Event Management',
    difficulty: 'Intermediate',
    duration_hours: 4.25,
    badge: 'POPULAR COURSE',
    status: 'published',
    stages: [
      {
        stage_type: 'explore',
        title: 'Event Readiness & Scope Discovery',
        description: 'Analyze event objectives, evaluate target audience expectations, and identify critical operational challenges.',
        order_index: 1,
      },
      {
        stage_type: 'learn',
        title: 'Event Logistics & Financial Planning',
        description: 'Learn the core architecture of event planning: budgeting, timeline mapping, vendor procurement, and committee coordination.',
        order_index: 2,
      },
      {
        stage_type: 'experience',
        title: 'Crisis Management & Contingency Drill',
        description: 'Participate in live simulations managing unexpected logistical bottlenecks, schedule delays, and resource constraints.',
        order_index: 3,
      },
      {
        stage_type: 'validate',
        title: 'Operational Plan & Risk Assessment Review',
        description: 'Present your event blueprint, risk mitigation matrix, and budget breakdown to experienced organizers for rigorous feedback.',
        order_index: 4,
      },
      {
        stage_type: 'apply',
        title: 'Live Event Execution & Protocol Deployment',
        description: 'Coordinate and execute a simulated or live department event according to standard operating procedures.',
        order_index: 5,
      },
      {
        stage_type: 'transform',
        title: 'Post-Event Retrospective & Leadership Portfolio',
        description: 'Analyze attendee feedback metrics, complete a debrief retrospective, and document demonstrated leadership capabilities.',
        order_index: 6,
      },
    ],
  },
  {
    title: 'How to Do Anchoring',
    description: 'Build stage confidence and master hosting. Learn voice modulation, crowd engagement, handling unscripted moments, and the art of seamlessly leading an audience through any event.',
    thumbnail_url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCTfRNgEHeoqVthamolc3WTS2W3WdE0qv0M9UgD7emRfC3HM4dusncpuMbzCw8iXvt59WFpd0ZQYemUOqQiEry2b-UiMaz1vY-v8uhdSJ3jXYlXDE2vELGQNLx5AtpR2XBXSB9H63Xdn9xYTokIrh2aYEJzhgw22c2tQypn5PCCrYmWuub4neoknUzVaRURWO0pOMv_tQWdF1-VVAhRLS7OEkFulAr5-YiIuxW3hU-zuLPK13LoKkLTNBNa84e-o87rZamHiCUbZXbWkA0',
    category: 'Communication',
    skill_domain: 'Public Speaking',
    difficulty: 'Beginner',
    duration_hours: 2.75,
    badge: 'NEWLY LAUNCHED',
    status: 'published',
    stages: [
      {
        stage_type: 'explore',
        title: 'Stage Presence & Vocal Self-Assessment',
        description: 'Evaluate your baseline voice modulation, body language habits, microphone comfort, and public speaking confidence.',
        order_index: 1,
      },
      {
        stage_type: 'learn',
        title: 'Crowd Engagement & Verbal Delivery Principles',
        description: 'Study voice pitch, pacing, intentional pausing, rhetorical devices, and strategies to hold audience attention.',
        order_index: 2,
      },
      {
        stage_type: 'experience',
        title: 'Impromptu Speaking & Unscripted Moments',
        description: 'Practice spontaneous reactions to unexpected technical glitches, schedule gaps, and off-script speaker transitions.',
        order_index: 3,
      },
      {
        stage_type: 'validate',
        title: 'Recorded Delivery Peer & Mentor Critique',
        description: 'Submit a 3-minute stage introduction video to receive structured rubric-based feedback on posture, clarity, and energy.',
        order_index: 4,
      },
      {
        stage_type: 'apply',
        title: 'Simulated Formal Stage Hosting',
        description: 'Host a mock academic or technical inauguration from the opening welcome address through the final vote of thanks.',
        order_index: 5,
      },
      {
        stage_type: 'transform',
        title: 'Mastery Showreel & Public Speaking Badging',
        description: 'Assemble an anchoring highlights reel, document your public speaking evolution, and receive the Master Anchor credential.',
        order_index: 6,
      },
    ],
  },
  {
    title: 'Write Anchoring Script',
    description: 'Craft compelling anchoring scripts with perfect flow, smooth transitions, and audience-tailored language. Covers opening lines, segment introductions, and closing speeches.',
    thumbnail_url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCFXlSk4YV7KzJbfT_-KeQUCHOLQwzABJNTwIjeaj_diMPV78ZItiklekKrILAPnUJ7lfwPtaSK1GjmCkWOskdIRu6GMBDQMmFGdo3HiSPpU3xvpObd6eyaz9SLVQ6n-HFFAYKT71mXlykQFM8ZXwz2BCvlmFZcl0EnoVZnMiuI1eOLnfC_P2sv2OC7L3X2aQmFejpgZTT1G-LHAvql9EFVltozzWZl2XI8SCC08taLH4xPz9Wllxd05SCxQ6YUfieBKVAwzVMb9X-PEPk',
    category: 'Communication',
    skill_domain: 'Writing & Scripting',
    difficulty: 'Beginner',
    duration_hours: 2.17,
    badge: 'TRENDING NOW',
    status: 'published',
    stages: [
      {
        stage_type: 'explore',
        title: 'Audience & Event Genre Diagnostics',
        description: 'Analyze the tone, formal constraints, and protocol requirements for seminars, cultural festivals, and technical symposiums.',
        order_index: 1,
      },
      {
        stage_type: 'learn',
        title: 'Script Architecture & Seamless Segues',
        description: 'Learn opening hook construction, dignitary felicitation protocols, speaker introductions, and thematic bridge transitions.',
        order_index: 2,
      },
      {
        stage_type: 'experience',
        title: 'Timed Scriptwriting Challenges',
        description: 'Draft complete opening remarks and emergency filler segments under strict time and word-count constraints.',
        order_index: 3,
      },
      {
        stage_type: 'validate',
        title: 'Editorial & Flow Peer Evaluation',
        description: 'Exchange scripts with peer reviewers to check phonetic flow, pronunciation guides, and timing accuracy.',
        order_index: 4,
      },
      {
        stage_type: 'apply',
        title: 'Full Symposium Master Script Production',
        description: 'Author a complete, production-ready master anchor script with stage cues, audio prompts, and speaker bios.',
        order_index: 5,
      },
      {
        stage_type: 'transform',
        title: 'Scriptwriting Repository & Style Synthesis',
        description: 'Publish a modular script template repository for your student organization and complete a reflective writing journal.',
        order_index: 6,
      },
    ],
  },
  {
    title: 'What to Do in First Year',
    description: 'A strategic guide to making the most of your engineering first year — choosing the right clubs, building early habits, and laying the foundation for a strong career.',
    thumbnail_url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCCSUSfNZVVTn8i3hkpKCsOQeu2FVhX3qLdr_6oVau8yEwBz4-eryaTb7doWqMIqI0Fww7kpodqItq33F4u7Y2bNS9rRTLoerr1bsl1KVdb9nvopMMm6CLrIu5G79PK8iJ9JU7jrJ3U1nlR31kZbeE7WFlQTBi-Uq5qxcYGl5pSsltdLRnsrDfLuIkEcN2agHMtzqbxsQqKQd73qBjsjVwzihDFyb25y2ExOaIboO5M0KZ3PsXgY_yozyW-BVNGorzaNqmyKYPH5krViEc',
    category: 'Career Growth',
    skill_domain: 'College Life Strategy',
    difficulty: 'Beginner',
    duration_hours: 3.0,
    badge: 'TOP RATED',
    status: 'published',
    stages: [
      {
        stage_type: 'explore',
        title: 'College Aspirations & Priority Mapping',
        description: 'Map your career interests, evaluate personal academic goals, and identify foundational skills needing early development.',
        order_index: 1,
      },
      {
        stage_type: 'learn',
        title: 'Academic Excellence & Extracurricular Synergy',
        description: 'Understand how to maintain a competitive CGPA while selectively joining technical clubs and hackathon teams.',
        order_index: 2,
      },
      {
        stage_type: 'experience',
        title: 'Weekly Time-Blocking & Routine Sprint',
        description: 'Design and test a balanced weekly schedule allocating dedicated blocks for lectures, coding practice, and wellness.',
        order_index: 3,
      },
      {
        stage_type: 'validate',
        title: 'Senior Mentor & Faculty Check-in',
        description: 'Review your first-year strategic plan with senior mentors to eliminate unrealistic goals and common academic traps.',
        order_index: 4,
      },
      {
        stage_type: 'apply',
        title: 'Freshman Mini-Project or Hackathon Entry',
        description: 'Team up with peers to build a small software or hardware prototype applying concepts learned in first-semester courses.',
        order_index: 5,
      },
      {
        stage_type: 'transform',
        title: 'First-Year Milestone Portfolio',
        description: 'Document your completed coursework, technical club contributions, and early project artifacts in your student profile.',
        order_index: 6,
      },
    ],
  },
  {
    title: 'How to Form a Team',
    description: 'For engineering project teams — learn how to identify complementary skills, assign roles, set norms, manage conflicts, and build a team culture that delivers results under academic pressure.',
    thumbnail_url: null,
    category: 'Career Growth',
    skill_domain: 'Teamwork & Leadership',
    difficulty: 'Intermediate',
    duration_hours: 1.83,
    badge: 'MOST ENROLLED',
    status: 'published',
    stages: [
      {
        stage_type: 'explore',
        title: 'Individual Role & Working Style Profiling',
        description: 'Identify your primary technical strengths, communication style, and complementary qualities needed in project partners.',
        order_index: 1,
      },
      {
        stage_type: 'learn',
        title: 'Team Dynamics & Psychological Safety',
        description: 'Study team charter creation, task delegation models, agile milestone tracking, and conflict de-escalation.',
        order_index: 2,
      },
      {
        stage_type: 'experience',
        title: 'Team Pitch & Mutual Expectations Drill',
        description: 'Conduct a mock team alignment meeting to negotiate project vision, accountability standards, and individual commitments.',
        order_index: 3,
      },
      {
        stage_type: 'validate',
        title: 'Team Charter & Conflict Protocol Review',
        description: 'Submit your team charter for educator review to ensure balanced workload distribution and clear dispute resolution paths.',
        order_index: 4,
      },
      {
        stage_type: 'apply',
        title: 'Collaborative Sprint Milestone Delivery',
        description: 'Work collaboratively across a 2-week project milestone using shared repositories and issue-tracking boards.',
        order_index: 5,
      },
      {
        stage_type: 'transform',
        title: '360-Degree Peer Feedback & Team Retrospective',
        description: 'Perform structured 360-degree peer reviews, evaluate collective performance, and document team leadership insights.',
        order_index: 6,
      },
    ],
  },
  {
    title: 'Select Problem Statement',
    description: 'Feasibility and scope analysis for engineering projects — from brainstorming problem spaces to evaluating constraints, novelty, and impact before writing a single line of code.',
    thumbnail_url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAb6rc-v19OFof75dN6jK7jClXIwcdSfhsHvylq8nnNyVxncOcWp_3E_FjyGCV6Ma7JM_7HnU4kI6NGqwLR-5toCGswpwbniPgZd3bk4Qy0UGd7TFX5a1xgRe3g0adQk5dbJI-Q0y93K888neO2Zlv-aRINnrOLsR_NkIpjuemokA1iMBy9MjXWHqi0BJlXJhbjTmkjm-g9PwZj0Fn-udQYx6ldedi0gYEXVcWMBmjwLQHYJPmW9v-JzqjSpSlD8SsgpK-IZ184hSVImXY',
    category: 'AI & Digital',
    skill_domain: 'Problem Solving',
    difficulty: 'Intermediate',
    duration_hours: 2.5,
    badge: 'FEATURED GUIDE',
    status: 'published',
    stages: [
      {
        stage_type: 'explore',
        title: 'Domain Discovery & Problem Space Scouting',
        description: 'Explore local communities, technical literature, and industry challenges to find real-world problem candidates.',
        order_index: 1,
      },
      {
        stage_type: 'learn',
        title: 'Feasibility, Novelty & Impact Evaluation',
        description: 'Master problem evaluation criteria: technical feasibility within semester limits, data availability, and social relevance.',
        order_index: 2,
      },
      {
        stage_type: 'experience',
        title: 'Problem Matrix Comparative Analysis',
        description: 'Score three potential project ideas against a weighted matrix evaluating complexity, mentor expertise, and deliverables.',
        order_index: 3,
      },
      {
        stage_type: 'validate',
        title: 'Faculty Defense & Scope Calibration',
        description: 'Pitch your top problem statement to a faculty guide panel and refine scope based on critical academic feedback.',
        order_index: 4,
      },
      {
        stage_type: 'apply',
        title: 'Formal Problem Statement Document',
        description: 'Draft a publication-grade problem definition including background research, problem constraints, and success metrics.',
        order_index: 5,
      },
      {
        stage_type: 'transform',
        title: 'Project Proposal Archive & Milestone Roadmap',
        description: 'Publish your validated problem statement, archive initial literature references, and establish semester project milestones.',
        order_index: 6,
      },
    ],
  },
  {
    title: 'Synopsis & Report Making',
    description: 'Abstract, methodology, and documentation — a complete guide to writing engineering project reports and synopses that pass faculty review and can be submitted to conferences.',
    thumbnail_url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC8WLJ3wlpHYOLML8HBMvuhSa3y4q5FwHz_dhnBLYqhRXLtTKi1EwcaTOPa2sTtady2AIXfsCDHAu02OkgjdPlZ79RzxA4BWCgAMf0_xNckiwQHs4NFIthmvoK23RBW0EnIAA2TahBeqmgR1dCPPO0r06tlrDXCUO1Xa7w72CqobgG2dMCwP7exaYAWeFIcWeGB-tza0ZBhekq8N4OCMtpczru6JDygZAssIhCGr9UiUIFTGGGUw0--U3z-tjAIjCycedjsKmnSq7PZY-E',
    category: 'AI & Digital',
    skill_domain: 'Technical Writing',
    difficulty: 'Intermediate',
    duration_hours: 3.25,
    badge: 'NEWLY LAUNCHED',
    status: 'published',
    stages: [
      {
        stage_type: 'explore',
        title: 'Technical Writing Baseline Diagnostic',
        description: 'Audit your familiarity with IEEE formatting rules, citation standards, technical grammar, and academic integrity.',
        order_index: 1,
      },
      {
        stage_type: 'learn',
        title: 'Report Structure & Academic Style Guidelines',
        description: 'Learn the structural anatomy of engineering reports: abstract formulation, methodology clarity, and data presentation.',
        order_index: 2,
      },
      {
        stage_type: 'experience',
        title: 'Structured Abstract & Flowchart Drafting',
        description: 'Draft a compliant 250-word structured abstract and architectural diagram under standard conference guidelines.',
        order_index: 3,
      },
      {
        stage_type: 'validate',
        title: 'Peer Review & Plagiarism Audit',
        description: 'Conduct peer evaluations and run originality checks to detect ambiguity, unsubstantiated claims, or formatting flaws.',
        order_index: 4,
      },
      {
        stage_type: 'apply',
        title: 'Conference-Ready 4-Page Synopsis',
        description: 'Compile a complete technical synopsis with mathematical formulations, experimental methodology, and IEEE references.',
        order_index: 5,
      },
      {
        stage_type: 'transform',
        title: 'Archival Publication Package & Writing Credential',
        description: 'Generate publication-ready PDF and LaTeX source packages, reflect on technical writing growth, and earn your certificate.',
        order_index: 6,
      },
    ],
  },
];

async function seed() {
  const client = await pool.connect();
  try {
    console.log('🌱 Starting ELEVATE database seed process...\n');

    let journeysAdded = 0;
    let stagesAdded = 0;

    for (const j of journeysData) {
      // 1. Check or insert Journey
      let journeyId;
      const existingJourney = await client.query(
        'SELECT id, title FROM journeys WHERE title = $1',
        [j.title]
      );

      if (existingJourney.rows.length > 0) {
        journeyId = existingJourney.rows[0].id;
        console.log(`ℹ️  Journey already exists: "${j.title}" (${journeyId})`);
      } else {
        const insertJourneyResult = await client.query(
          `INSERT INTO journeys
             (title, description, thumbnail_url, category, skill_domain, difficulty, duration_hours, status, badge)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           RETURNING id, title`,
          [
            j.title,
            j.description,
            j.thumbnail_url,
            j.category,
            j.skill_domain,
            j.difficulty,
            j.duration_hours,
            j.status,
            j.badge,
          ]
        );
        journeyId = insertJourneyResult.rows[0].id;
        journeysAdded++;
        console.log(`✅ Inserted journey: "${j.title}" (${journeyId})`);
      }

      // 2. Check and insert Stages for this journey
      for (const s of j.stages) {
        const existingStage = await client.query(
          'SELECT id FROM stages WHERE journey_id = $1 AND stage_type = $2',
          [journeyId, s.stage_type]
        );

        if (existingStage.rows.length === 0) {
          await client.query(
            `INSERT INTO stages
               (journey_id, stage_type, title, description, order_index, config)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [journeyId, s.stage_type, s.title, s.description, s.order_index, {}]
          );
          stagesAdded++;
          console.log(`   ➕ Inserted Stage ${s.order_index} (${s.stage_type}): "${s.title}"`);
        }
      }
    }

    console.log('\n==================================================');
    console.log('🎉 Seed execution finished!');
    console.log(`   Journeys added: ${journeysAdded}`);
    console.log(`   Stages added:   ${stagesAdded}`);
    console.log('==================================================\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error.message);
    process.exit(1);
  } finally {
    client.release();
  }
}

seed();
