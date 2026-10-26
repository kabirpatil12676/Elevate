import { query } from './src/config/db.js';
import jwt from 'jsonwebtoken';
import http from 'http';
import app from './src/index.js';
import { recommendJourneys, noMatchMessage } from './src/lib/recommendationEngine.js';

async function runAllTests() {
  console.log('======================================================');
  console.log('       ELEVATE PHASE 2B COMPREHENSIVE VERIFICATION    ');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName} — ${details}`);
      failed++;
    }
  }

  // Setup test server
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  // Create two distinct test users in DB
  const userARes = await query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
     RETURNING id, email, role`,
    ['Student Alpha', 'student.alpha.phase2b@elevate.edu', 'hashedpw123', 'learner']
  );
  const userA = userARes.rows[0];

  const userBRes = await query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
     RETURNING id, email, role`,
    ['Student Beta', 'student.beta.phase2b@elevate.edu', 'hashedpw123', 'learner']
  );
  const userB = userBRes.rows[0];

  const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-for-dev';
  const tokenA = jwt.sign({ id: userA.id, email: userA.email, role: userA.role }, jwtSecret, { expiresIn: '1h' });
  const tokenB = jwt.sign({ id: userB.id, email: userB.email, role: userB.role }, jwtSecret, { expiresIn: '1h' });

  // Clean existing test submissions
  await query('DELETE FROM learner_needs WHERE user_id IN ($1, $2)', [userA.id, userB.id]);

  console.log('--- 1. Authentication & Access Control Tests ---');
  // 1.1 Unauthenticated GET
  const unauthGet = await fetch(`${baseUrl}/api/diagnostic/needs`);
  assert(unauthGet.status === 401, 'Unauthenticated GET /api/diagnostic/needs returns 401');

  // 1.2 Unauthenticated POST
  const unauthPost = await fetch(`${baseUrl}/api/diagnostic/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ academic_year: '1st Year' }),
  });
  assert(unauthPost.status === 401, 'Unauthenticated POST /api/diagnostic/submit returns 401');

  // 1.3 Initial Authenticated GET for User A (Not yet submitted)
  const initialGetA = await fetch(`${baseUrl}/api/diagnostic/needs`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  const initialAData = await initialGetA.json();
  assert(
    initialGetA.status === 200 && initialAData.submitted === false && initialAData.needs === null,
    'Authenticated GET for unsubmitted user returns submitted: false and needs: null'
  );

  console.log('\n--- 2. Input Validation Tests ---');
  // 2.1 Invalid career_interests (not array)
  const badInterests = await fetch(`${baseUrl}/api/diagnostic/submit`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ career_interests: 'Software Development' }),
  });
  assert(badInterests.status === 400, 'Rejects non-array career_interests with 400');

  // 2.2 Invalid skills (not object)
  const badSkills = await fetch(`${baseUrl}/api/diagnostic/submit`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ career_interests: [], skills: 'Intermediate' }),
  });
  assert(badSkills.status === 400, 'Rejects non-object skills with 400');

  // 2.3 Invalid challenges (not array)
  const badChallenges = await fetch(`${baseUrl}/api/diagnostic/submit`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ career_interests: [], skills: {}, challenges: 'Placement' }),
  });
  assert(badChallenges.status === 400, 'Rejects non-array challenges with 400');

  console.log('\n--- 3. Persistence & Upsert Tests ---');
  // 3.1 Initial submission for User A
  const submitPayloadA = {
    academic_year: '3rd Year',
    branch: 'Computer Science / IT',
    academic_situation: 'Preparing actively for campus placements & interviews',
    weekly_hours: '5–8 hours/week',
    career_interests: ['Software Development'],
    skills: {
      programming: 'Intermediate',
      sql: 'Beginner',
      technical_writing: 'Beginner',
      project_experience: 'Beginner',
      communication: 'Beginner',
    },
    challenges: ['Lack of projects', 'Placement preparation'],
    learning_goals: 'Build a solid portfolio of academic projects.',
    prior_experience: ['Classroom theory only'],
  };

  const submitResA = await fetch(`${baseUrl}/api/diagnostic/submit`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(submitPayloadA),
  });
  const submitAData = await submitResA.json();
  assert(
    submitResA.status === 200 && submitAData.success === true && submitAData.submitted === true,
    'User A successfully submits learning needs (Status 200)'
  );

  const dbRowsA1 = await query('SELECT COUNT(*) FROM learner_needs WHERE user_id = $1', [userA.id]);
  assert(parseInt(dbRowsA1.rows[0].count, 10) === 1, 'Exactly one row created in learner_needs table for User A');

  // 3.2 Update User A (submitting again updates in place)
  submitPayloadA.academic_year = '4th Year';
  submitPayloadA.learning_goals = 'Final year thesis and capstone project.';
  const updateResA = await fetch(`${baseUrl}/api/diagnostic/submit`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(submitPayloadA),
  });
  const updateAData = await updateResA.json();
  assert(
    updateResA.status === 200 && updateAData.needs.academic_year === '4th Year',
    'Re-submitting updates the existing record with new values'
  );

  const dbRowsA2 = await query('SELECT COUNT(*) FROM learner_needs WHERE user_id = $1', [userA.id]);
  assert(
    parseInt(dbRowsA2.rows[0].count, 10) === 1,
    'Upsert maintains exactly 1 record without creating duplicates'
  );

  console.log('\n--- 4. User Isolation & Privacy Tests ---');
  // 4.1 User B queries /api/diagnostic/needs -> should NOT see User A's data
  const getB = await fetch(`${baseUrl}/api/diagnostic/needs`, {
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  const dataB = await getB.json();
  assert(
    dataB.submitted === false && dataB.needs === null,
    'User B cannot access User A diagnostic data (isolated by req.user.id)'
  );

  console.log('\n--- 5. Deterministic Recommendation Engine Tests ---');
  const allJourneys = (await query(`SELECT * FROM journeys WHERE status = 'published'`)).rows;

  // 5.1 Case A: First-year student needing fundamentals
  const recCaseA = recommendJourneys(
    {
      academic_year: '1st Year',
      career_interests: ['Core Engineering'],
      skills: { programming: 'Beginner' },
      challenges: ['Weak fundamentals'],
      prior_experience: ['Classroom theory only'],
    },
    allJourneys
  );
  assert(
    recCaseA.recommendations.length > 0 &&
      recCaseA.recommendations[0].journey.title === 'How to Do Engineering',
    '1st Year Core Engineering + Weak fundamentals prioritizes "How to Do Engineering"'
  );
  assert(
    recCaseA.recommendations[0].reasons.length > 0,
    'Recommendation includes human-readable reasons explaining the match'
  );

  // 5.2 Case B: Communication challenge
  const recCaseB = recommendJourneys(
    {
      academic_year: '2nd Year',
      career_interests: ['Other'],
      skills: { communication: 'Beginner' },
      challenges: ['Communication'],
      prior_experience: [],
    },
    allJourneys
  );
  const titlesB = recCaseB.recommendations.map((r) => r.journey.title);
  assert(
    titlesB.includes('How to Do Anchoring') || titlesB.includes('Write Anchoring Script'),
    'Communication skill gap recommends communication journeys (Anchoring/Script)'
  );

  // 5.3 Case C: Uncovered Interest (Cybersecurity)
  const recCaseC = recommendJourneys(
    {
      academic_year: '2nd Year',
      career_interests: ['Cybersecurity'],
      skills: {},
      challenges: ['Lack of projects'],
      prior_experience: [],
    },
    allJourneys
  );
  assert(
    recCaseC.catalogueNote !== null && recCaseC.catalogueNote.includes('Cybersecurity'),
    'Catalogue note transparently alerts student that Cybersecurity tracks are in development'
  );

  // 5.4 Case D: Incomplete / zero matches
  const recCaseD = recommendJourneys(
    {
      academic_year: '',
      career_interests: [],
      skills: {},
      challenges: [],
      prior_experience: [],
    },
    allJourneys
  );
  assert(
    recCaseD.recommendations.length === 0 && recCaseD.catalogueNote !== null,
    'Empty/unmatched profile returns 0 recommendations with clear catalogue notice'
  );

  server.close();

  console.log('\n======================================================');
  console.log(`TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runAllTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
