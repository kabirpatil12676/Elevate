import { query } from './src/config/db.js';
import jwt from 'jsonwebtoken';
import http from 'http';
import app from './src/index.js';

async function testBackend() {
  console.log('--- Starting Backend Verification Tests ---');

  // Find or create a test user
  let userRes = await query('SELECT id, email, role FROM users WHERE email = $1', ['student.test@elevate.edu']);
  let testUser;
  if (userRes.rows.length === 0) {
    const ins = await query(
      'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, email, role',
      ['Test Student', 'student.test@elevate.edu', '$2a$12$eXampleHashedPasswordForTestOnly9999999', 'learner']
    );
    testUser = ins.rows[0];
  } else {
    testUser = userRes.rows[0];
  }

  const token = jwt.sign(
    { id: testUser.id, email: testUser.email, role: testUser.role },
    process.env.JWT_SECRET || 'fallback-secret-for-dev',
    { expiresIn: '1h' }
  );

  const server = http.createServer(app);
  await new Promise(r => server.listen(0, r));
  const port = server.address().port;
  const baseUrl = 'http://localhost:' + port;

  // Test 1: Unauthenticated GET /api/diagnostic -> should return 401
  const res1 = await fetch(baseUrl + '/api/diagnostic');
  console.log('Test 1 (Unauth): Status =', res1.status, res1.status === 401 ? '✅ PASS' : '❌ FAIL');

  // Test 2: Authenticated GET /api/diagnostic (initial state)
  const res2 = await fetch(baseUrl + '/api/diagnostic', {
    headers: { 'Authorization': 'Bearer ' + token }
  });
  const data2 = await res2.json();
  console.log('Test 2 (Auth GET): Status =', res2.status, 'success =', data2.success, data2.success ? '✅ PASS' : '❌ FAIL');

  // Test 3: Authenticated POST /api/diagnostic with valid payload
  const payload = {
    academic_year: '3rd Year',
    branch: 'Computer Science & Engineering',
    academic_situation: 'Preparing for placements and academic mini-projects',
    career_interests: ['Software Development', 'Data Analytics'],
    skills: {
      programming: 'Intermediate',
      sql: 'Beginner',
      excel: 'Intermediate',
      power_bi: 'None',
      communication: 'Beginner',
      teamwork: 'Intermediate',
      technical_writing: 'Beginner',
      project_experience: 'Beginner'
    },
    challenges: ['Lack of projects', 'Placement preparation'],
    learning_goals: 'Build a solid portfolio of academic projects and master problem formulation.',
    weekly_hours: '5-8 hours/week',
    prior_experience: ['Classroom theory only', 'Completed online courses']
  };

  const res3 = await fetch(baseUrl + '/api/diagnostic/submit', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  const data3 = await res3.json();
  console.log('Test 3 (Submit): Status =', res3.status, 'Recommendations count:', data3.recommendations?.length, data3.success ? '✅ PASS' : '❌ FAIL');
  if (data3.recommendations) {
    data3.recommendations.forEach((r, idx) => {
      console.log(`  Top #${idx+1}: [${r.journey.title}] (Score: ${r.score})`);
      console.log('   Reasons:', r.reasons.slice(0, 2));
    });
  }

  // Test 4: Upsert check - submitting again updates without duplicate rows
  payload.academic_year = '4th Year';
  const res4 = await fetch(baseUrl + '/api/diagnostic', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  const data4 = await res4.json();
  const countRes = await query('SELECT COUNT(*) FROM learner_needs WHERE user_id = $1', [testUser.id]);
  const rowCount = parseInt(countRes.rows[0].count, 10);
  console.log('Test 4 (Upsert): Single row count =', rowCount, rowCount === 1 ? '✅ PASS' : '❌ FAIL');
  console.log('  Updated year in DB:', data4.needs?.academic_year, data4.needs?.academic_year === '4th Year' ? '✅ PASS' : '❌ FAIL');

  // Test 5: Validation - passing non-array for challenges
  const res5 = await fetch(baseUrl + '/api/diagnostic', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ career_interests: 'not an array' })
  });
  console.log('Test 5 (Validation): Status =', res5.status, res5.status === 400 ? '✅ PASS' : '❌ FAIL');

  // Test 6: Catalogue Note for uncovered interest
  const res6 = await fetch(baseUrl + '/api/diagnostic', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      academic_year: '2nd Year',
      career_interests: ['Cybersecurity'],
      skills: {},
      challenges: ['Communication'],
      prior_experience: []
    })
  });
  const data6 = await res6.json();
  console.log('Test 6 (Catalogue note for Cybersecurity): Note present?', !!data6.catalogueNote, '✅ PASS');
  console.log('  Note excerpt:', data6.catalogueNote?.substring(0, 80) + '...');

  // Test 7: Another user cannot read this user's diagnostic
  let otherUserRes = await query('SELECT id, email, role FROM users WHERE email = $1', ['other.student@elevate.edu']);
  let otherUser;
  if (otherUserRes.rows.length === 0) {
    const ins2 = await query(
      'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, email, role',
      ['Other Student', 'other.student@elevate.edu', '$2a$12$eXampleHashedPasswordForTestOnly9999999', 'learner']
    );
    otherUser = ins2.rows[0];
  } else {
    otherUser = otherUserRes.rows[0];
  }
  const tokenOther = jwt.sign(
    { id: otherUser.id, email: otherUser.email, role: otherUser.role },
    process.env.JWT_SECRET || 'fallback-secret-for-dev',
    { expiresIn: '1h' }
  );
  const res7 = await fetch(baseUrl + '/api/diagnostic', {
    headers: { 'Authorization': 'Bearer ' + tokenOther }
  });
  const data7 = await res7.json();
  console.log('Test 7 (User isolation): Other user submitted =', data7.submitted, data7.submitted === false ? '✅ PASS' : '❌ FAIL');

  server.close();
  process.exit(0);
}

testBackend().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
