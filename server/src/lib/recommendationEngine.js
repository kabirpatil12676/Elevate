/**
 * ELEVATE — Rule-Based Journey Recommendation Engine
 *
 * Matches a learner's questionnaire answers against published journeys
 * using deterministic scoring rules. No AI, no LLM APIs, no random selections.
 *
 * Scoring is additive: each matching rule contributes points with an understandable reason.
 * Top-scoring published journeys (up to 3) are returned with reasons.
 *
 * Exported: recommendJourneys(needs, journeys)
 */

// ── Specific Interest Mapping ──────────────────────────────────────────────
// Only map interests to journeys where there is a genuine pedagogical connection.
// For topics not covered (e.g. Cybersecurity, Cloud Computing), do NOT assign fake points.
const DIRECT_INTEREST_RULES = {
  'Software Development': [
    {
      match: (j) => j.title.toLowerCase().includes('problem statement'),
      score: 4,
      reason: 'Helps you learn how to identify and formulate real-world engineering and software project problems.',
    },
    {
      match: (j) => j.title.toLowerCase().includes('synopsis'),
      score: 3,
      reason: 'Teaches structured project documentation and technical report writing vital for software deliverables.',
    },
    {
      match: (j) => j.title.toLowerCase().includes('team'),
      score: 3,
      reason: 'Builds teamwork and collaborative habits essential for software development teams.',
    },
  ],
  'Data Analytics': [
    {
      match: (j) => j.title.toLowerCase().includes('problem statement'),
      score: 4,
      reason: 'Teaches you how to frame clear, solvable problem statements from data.',
    },
    {
      match: (j) => j.title.toLowerCase().includes('synopsis'),
      score: 4,
      reason: 'Develops technical documentation, methodology structuring, and report writing for data projects.',
    },
  ],
  'Data Science/AI': [
    {
      match: (j) => j.title.toLowerCase().includes('problem statement'),
      score: 4,
      reason: 'Provides systematic methods to define research and applied AI/Data Science problem statements.',
    },
    {
      match: (j) => j.title.toLowerCase().includes('synopsis'),
      score: 3,
      reason: 'Develops formal report writing, literature structure, and synopsis skills for AI/ML projects.',
    },
  ],
  'Core Engineering': [
    {
      match: (j) => j.title.toLowerCase().includes('engineering'),
      score: 5,
      reason: 'Directly addresses the practical mindset and problem-solving approaches needed in core engineering.',
    },
    {
      match: (j) => j.title.toLowerCase().includes('problem statement'),
      score: 3,
      reason: 'Guides you in selecting a meaningful capstone or mini-project problem in engineering.',
    },
  ],
  'Entrepreneurship': [
    {
      match: (j) => j.title.toLowerCase().includes('team'),
      score: 5,
      reason: 'Teaches team formation, role assignment, and leadership crucial for early-stage ventures.',
    },
    {
      match: (j) => j.title.toLowerCase().includes('event'),
      score: 4,
      reason: 'Builds operational, planning, and execution skills through real event organization.',
    },
    {
      match: (j) => j.title.toLowerCase().includes('problem statement'),
      score: 4,
      reason: 'Helps validate problem-solution fit before building a startup product.',
    },
  ],
};

// Topics currently not taught in ELEVATE's 8 published journeys
const UNCOVERED_INTERESTS = ['Cybersecurity', 'Cloud Computing'];

// ── Challenge Rules ────────────────────────────────────────────────────────
const CHALLENGE_RULES = {
  'Lack of projects': [
    {
      match: (j) => j.title.toLowerCase().includes('problem statement'),
      score: 5,
      reason: 'Directly solves your lack of projects by guiding you step-by-step to define a credible project topic.',
    },
    {
      match: (j) => j.title.toLowerCase().includes('synopsis'),
      score: 4,
      reason: 'Helps you produce a complete project synopsis and technical report to build your portfolio.',
    },
  ],
  'Weak fundamentals': [
    {
      match: (j) => j.title.toLowerCase().includes('engineering'),
      score: 5,
      reason: 'Strengthens your foundational engineering thinking and practical problem-solving approach.',
    },
    {
      match: (j) => j.title.toLowerCase().includes('first year'),
      score: 4,
      reason: 'Lays a strong academic and behavioral foundation for succeeding in engineering.',
    },
  ],
  'Placement preparation': [
    {
      match: (j) => j.title.toLowerCase().includes('synopsis'),
      score: 4,
      reason: 'Gives you documented project deliverables and technical writing to showcase in placement interviews.',
    },
    {
      match: (j) => j.title.toLowerCase().includes('team'),
      score: 3,
      reason: 'Demonstrates behavioral teamwork and collaborative leadership experience for campus hiring.',
    },
    {
      match: (j) => j.title.toLowerCase().includes('anchoring') && !j.title.toLowerCase().includes('script'),
      score: 3,
      reason: 'Builds spontaneous speaking confidence to handle HR and technical interview rounds effectively.',
    },
  ],
  'Communication': [
    {
      match: (j) => j.title.toLowerCase().includes('anchoring') && !j.title.toLowerCase().includes('script'),
      score: 5,
      reason: 'Targets your communication gap with hands-on public speaking and stage presence practice.',
    },
    {
      match: (j) => j.title.toLowerCase().includes('script'),
      score: 5,
      reason: 'Improves your ability to draft concise, professional scripts and spoken presentations.',
    },
    {
      match: (j) => j.title.toLowerCase().includes('event'),
      score: 3,
      reason: 'Provides practical interpersonal and stakeholder communication practice in an event context.',
    },
  ],
  'Identifying a career direction': [
    {
      match: (j) => j.title.toLowerCase().includes('first year'),
      score: 4,
      reason: 'Helps early-stage students explore different engineering domains and chart their college roadmap.',
    },
    {
      match: (j) => j.title.toLowerCase().includes('engineering'),
      score: 4,
      reason: 'Helps clarify how academic coursework connects to practical industry engineering roles.',
    },
  ],
  'Internship readiness': [
    {
      match: (j) => j.title.toLowerCase().includes('problem statement'),
      score: 4,
      reason: 'Gives you the analytical problem-solving foundation required during industry internships.',
    },
    {
      match: (j) => j.title.toLowerCase().includes('synopsis'),
      score: 3,
      reason: 'Prepares you to write professional internship project reports and executive summaries.',
    },
    {
      match: (j) => j.title.toLowerCase().includes('team'),
      score: 3,
      reason: 'Prepares you to integrate quickly and productively into an engineering team environment.',
    },
  ],
};

// ── Skill Gap Rules (Skill rated Beginner or None) ──────────────────────────
const SKILL_GAP_RULES = {
  communication: [
    {
      match: (j) => j.category === 'Communication',
      score: 4,
      reason: 'Directly develops the communication and speaking skills you identified as an area to grow.',
    },
  ],
  technical_writing: [
    {
      match: (j) => j.title.toLowerCase().includes('synopsis'),
      score: 5,
      reason: 'Focuses specifically on technical writing, report structures, and formal documentation.',
    },
    {
      match: (j) => j.title.toLowerCase().includes('script'),
      score: 3,
      reason: 'Strengthens concise writing and structural flow for formal communications.',
    },
  ],
  teamwork: [
    {
      match: (j) => j.title.toLowerCase().includes('team'),
      score: 5,
      reason: 'Directly addresses teamwork dynamics, peer accountability, and collaborative roles.',
    },
    {
      match: (j) => j.title.toLowerCase().includes('event'),
      score: 3,
      reason: 'Provides experiential practice in coordinating multi-person committees and tasks.',
    },
  ],
  project_experience: [
    {
      match: (j) => j.title.toLowerCase().includes('problem statement'),
      score: 4,
      reason: 'Provides a structured framework to kickstart practical project experience.',
    },
    {
      match: (j) => j.title.toLowerCase().includes('synopsis'),
      score: 4,
      reason: 'Guides you through formulating, drafting, and completing a verifiable project report.',
    },
  ],
};

// ── Academic Year Rules ────────────────────────────────────────────────────
const YEAR_AFFINITY_RULES = {
  '1st Year': [
    {
      match: (j) => j.title.toLowerCase().includes('first year'),
      score: 5,
      reason: 'Specifically crafted as a foundational guide for first-year engineering students.',
    },
    {
      match: (j) => j.title.toLowerCase().includes('engineering'),
      score: 3,
      reason: 'Introduces core engineering principles at a level tailored for early-stage undergraduates.',
    },
  ],
  '2nd Year': [
    {
      match: (j) => j.title.toLowerCase().includes('engineering'),
      score: 3,
      reason: 'Helps transition from basic first-year sciences into core engineering coursework.',
    },
    {
      match: (j) => j.title.toLowerCase().includes('team'),
      score: 3,
      reason: 'Prepares you for second-year group projects and department technical committee roles.',
    },
    {
      match: (j) => j.title.toLowerCase().includes('problem statement'),
      score: 2,
      reason: 'Introduces early project selection skills for mini-projects.',
    },
  ],
  '3rd Year': [
    {
      match: (j) => j.title.toLowerCase().includes('problem statement'),
      score: 4,
      reason: 'Ideal for 3rd year students finalizing mini-projects or gearing up for Capstone projects.',
    },
    {
      match: (j) => j.title.toLowerCase().includes('synopsis'),
      score: 4,
      reason: 'Directly aligns with pre-final year project synopsis submissions and internship documentation.',
    },
    {
      match: (j) => j.title.toLowerCase().includes('team'),
      score: 3,
      reason: 'Helps assemble and align your major project team members.',
    },
  ],
  '4th Year': [
    {
      match: (j) => j.title.toLowerCase().includes('synopsis'),
      score: 5,
      reason: 'Essential for final year B.Tech project report submission and thesis requirements.',
    },
    {
      match: (j) => j.title.toLowerCase().includes('problem statement'),
      score: 4,
      reason: 'Assists in refining problem boundaries and evaluation criteria for final-year defense.',
    },
  ],
};

/**
 * Main recommendation generator.
 *
 * @param {object} needs - The learner_needs database record
 * @param {Array} publishedJourneys - Published journeys from journeys table (status = 'published')
 * @returns {object} { recommendations: Array, catalogueNote: string|null, scoreSummary: object }
 */
export function recommendJourneys(needs = {}, publishedJourneys = []) {
  if (!Array.isArray(publishedJourneys) || publishedJourneys.length === 0) {
    return {
      recommendations: [],
      catalogueNote: 'No published Growth Journeys are currently available in the catalogue.',
      scoreSummary: {},
    };
  }

  const {
    academic_year = '',
    career_interests = [],
    skills = {},
    challenges = [],
    prior_experience = [],
  } = needs;

  // Initialize scoring maps
  const scores = {};
  const reasonsMap = {};

  for (const j of publishedJourneys) {
    scores[j.id] = 0;
    reasonsMap[j.id] = new Set();
  }

  // 1. Direct Interest Matching
  if (Array.isArray(career_interests)) {
    for (const interest of career_interests) {
      const rules = DIRECT_INTEREST_RULES[interest];
      if (rules) {
        for (const rule of rules) {
          for (const j of publishedJourneys) {
            if (rule.match(j)) {
              scores[j.id] += rule.score;
              reasonsMap[j.id].add(rule.reason);
            }
          }
        }
      }
    }
  }

  // 2. Challenge Matching
  if (Array.isArray(challenges)) {
    for (const challenge of challenges) {
      const rules = CHALLENGE_RULES[challenge];
      if (rules) {
        for (const rule of rules) {
          for (const j of publishedJourneys) {
            if (rule.match(j)) {
              scores[j.id] += rule.score;
              reasonsMap[j.id].add(rule.reason);
            }
          }
        }
      }
    }
  }

  // 3. Skill Gap Matching (rated Beginner, None, or No)
  if (skills && typeof skills === 'object') {
    for (const [skillKey, level] of Object.entries(skills)) {
      const normKey = skillKey.toLowerCase().replace(/[\s-]/g, '_');
      const isGap = level === 'Beginner' || level === 'None' || level === 'No';
      if (isGap && SKILL_GAP_RULES[normKey]) {
        for (const rule of SKILL_GAP_RULES[normKey]) {
          for (const j of publishedJourneys) {
            if (rule.match(j)) {
              scores[j.id] += rule.score;
              reasonsMap[j.id].add(rule.reason);
            }
          }
        }
      }
    }
  }

  // 4. Academic Year Affinity
  if (academic_year && YEAR_AFFINITY_RULES[academic_year]) {
    for (const rule of YEAR_AFFINITY_RULES[academic_year]) {
      for (const j of publishedJourneys) {
        if (rule.match(j)) {
          scores[j.id] += rule.score;
          reasonsMap[j.id].add(rule.reason);
        }
      }
    }
  }

  // 5. Beginner experience bonus
  const isBeginnerExp =
    (Array.isArray(prior_experience) &&
      (prior_experience.includes('Classroom theory only') ||
        prior_experience.includes('Beginner / No practical experience'))) ||
    academic_year === '1st Year';

  if (isBeginnerExp) {
    for (const j of publishedJourneys) {
      if (j.difficulty === 'Beginner') {
        scores[j.id] += 1;
        reasonsMap[j.id].add('Beginner difficulty matches your practical experience level.');
      }
    }
  }

  // 6. Check for uncovered interests
  const uncoveredSelected = (Array.isArray(career_interests) ? career_interests : []).filter(
    (ci) => UNCOVERED_INTERESTS.includes(ci) || ci === 'Other'
  );

  let catalogueNote = null;
  if (uncoveredSelected.length > 0) {
    catalogueNote = `Note: The current ELEVATE catalogue features 8 experiential Growth Journeys focused on engineering foundations, project formulation, technical reporting, and communication. Specialized domain tracks for ${uncoveredSelected.join(
      ' and '
    )} are actively in development by educators. The recommendations below target your core engineering, project delivery, and communication needs.`;
  }

  // 7. Filter, sort, and select top recommendations (minimum threshold score >= 4)
  const MIN_SCORE_THRESHOLD = 4;
  const ranked = publishedJourneys
    .map((j) => ({
      journey: {
        id: j.id,
        title: j.title,
        description: j.description,
        category: j.category,
        skill_domain: j.skill_domain,
        difficulty: j.difficulty,
        duration_hours: j.duration_hours,
      },
      score: scores[j.id],
      reasons: Array.from(reasonsMap[j.id]),
    }))
    .filter((r) => r.score >= MIN_SCORE_THRESHOLD)
    .sort((a, b) => b.score - a.score || a.journey.title.localeCompare(b.journey.title))
    .slice(0, 3);

  // If no journey reached threshold, provide honest empty result with explanation
  if (ranked.length === 0) {
    const interestStr = (career_interests || []).join(', ') || 'your profile';
    return {
      recommendations: [],
      catalogueNote: `The current ELEVATE catalogue of 8 Growth Journeys does not have strong matches for ${interestStr}. More specialized journeys are being curated by educators. You can explore the full course catalogue to discover available journeys.`,
      scoreSummary: scores,
    };
  }

  return {
    recommendations: ranked,
    catalogueNote,
    scoreSummary: scores,
  };
}

/**
 * Fallback message helper
 */
export function noMatchMessage(needs) {
  const interests = (needs?.career_interests || []).join(', ') || 'your selected areas';
  return `The current ELEVATE catalogue of 8 Growth Journeys does not have strong matches for ${interests}. More journeys are being developed by educators. Browse the full catalogue to find the closest available option.`;
}
