import { query } from './src/config/db.js';

const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
  const results = [];
  const testEmail = `test_${Date.now()}@elevatetest.com`;
  const testPassword = 'Password123!';
  const testName = 'Phase 1A Test User';

  console.log('🧪 Starting ELEVATE Backend Verification Tests...\n');

  // Test 1: GET /api/health
  try {
    const res = await fetch(`${BASE_URL}/health`);
    const data = await res.json();
    const passed = res.status === 200 && data.status === 'ok' && data.database === 'connected';
    results.push({
      test: 'GET /api/health (Server & DB Health)',
      passed,
      status: res.status,
      data,
    });
    console.log(`[Test 1] Health Check: ${passed ? 'PASSED ✅' : 'FAILED ❌'}`, data);
  } catch (err) {
    results.push({
      test: 'GET /api/health',
      passed: false,
      error: err.message,
    });
    console.log('[Test 1] Health Check: FAILED ❌', err.message);
  }

  // Test 2: POST /api/auth/register (New User)
  let userToken = null;
  let userId = null;
  let authCookie = null;
  try {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: testName,
        email: testEmail,
        password: testPassword,
        role: 'learner',
      }),
    });
    const data = await res.json();
    userToken = data.token;
    userId = data.user?.id;
    authCookie = res.headers.get('set-cookie');
    const passed = res.status === 201 && data.success === true && !!userToken && !!userId;
    results.push({
      test: 'POST /api/auth/register (Valid New User)',
      passed,
      status: res.status,
      data: { success: data.success, user: data.user, tokenReceived: !!userToken },
    });
    console.log(`[Test 2] Registration: ${passed ? 'PASSED ✅' : 'FAILED ❌'} - User ID: ${userId}`);
  } catch (err) {
    results.push({
      test: 'POST /api/auth/register (Valid New User)',
      passed: false,
      error: err.message,
    });
    console.log('[Test 2] Registration: FAILED ❌', err.message);
  }

  // Test 3: Confirm user is persisted in PostgreSQL
  try {
    const dbCheck = await query('SELECT id, name, email, role, created_at FROM users WHERE id = $1', [userId]);
    const passed = dbCheck.rows.length === 1 && dbCheck.rows[0].email === testEmail;
    results.push({
      test: 'PostgreSQL User Persistence Check',
      passed,
      data: dbCheck.rows[0],
    });
    console.log(`[Test 3] DB Persistence: ${passed ? 'PASSED ✅' : 'FAILED ❌'}`, dbCheck.rows[0]);
  } catch (err) {
    results.push({
      test: 'PostgreSQL User Persistence Check',
      passed: false,
      error: err.message,
    });
    console.log('[Test 3] DB Persistence: FAILED ❌', err.message);
  }

  // Test 4: POST /api/auth/register (Duplicate Email Rejection)
  try {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Duplicate User',
        email: testEmail,
        password: testPassword,
        role: 'learner',
      }),
    });
    const data = await res.json();
    const passed = res.status === 400 && data.success === false;
    results.push({
      test: 'POST /api/auth/register (Duplicate Email Safety)',
      passed,
      status: res.status,
      data,
    });
    console.log(`[Test 4] Duplicate Registration Rejection: ${passed ? 'PASSED ✅' : 'FAILED ❌'} (Status ${res.status} received: ${data.message})`);
  } catch (err) {
    results.push({
      test: 'POST /api/auth/register (Duplicate Email Safety)',
      passed: false,
      error: err.message,
    });
    console.log('[Test 4] Duplicate Registration Rejection: FAILED ❌', err.message);
  }

  // Test 5: POST /api/auth/login (Invalid Password Rejection)
  try {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'WrongPassword999!',
      }),
    });
    const data = await res.json();
    const passed = res.status === 401 && data.success === false;
    results.push({
      test: 'POST /api/auth/login (Invalid Password Rejection)',
      passed,
      status: res.status,
      data,
    });
    console.log(`[Test 5] Invalid Password Rejection: ${passed ? 'PASSED ✅' : 'FAILED ❌'} (Status ${res.status} received: ${data.message})`);
  } catch (err) {
    results.push({
      test: 'POST /api/auth/login (Invalid Password Rejection)',
      passed: false,
      error: err.message,
    });
    console.log('[Test 5] Invalid Password Rejection: FAILED ❌', err.message);
  }

  // Test 6: POST /api/auth/login (Valid Credentials)
  let loginToken = null;
  let loginCookie = null;
  try {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
      }),
    });
    const data = await res.json();
    loginToken = data.token;
    loginCookie = res.headers.get('set-cookie');
    const passed = res.status === 200 && data.success === true && !!loginToken;
    results.push({
      test: 'POST /api/auth/login (Valid Credentials)',
      passed,
      status: res.status,
      data: { success: data.success, user: data.user, tokenReceived: !!loginToken },
    });
    console.log(`[Test 6] Valid Login: ${passed ? 'PASSED ✅' : 'FAILED ❌'}`);
  } catch (err) {
    results.push({
      test: 'POST /api/auth/login (Valid Credentials)',
      passed: false,
      error: err.message,
    });
    console.log('[Test 6] Valid Login: FAILED ❌', err.message);
  }

  // Test 7: GET /api/auth/me (Authenticated Access via Bearer Token)
  try {
    const res = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${loginToken}` },
    });
    const data = await res.json();
    const passed = res.status === 200 && data.success === true && data.user?.id === userId;
    results.push({
      test: 'GET /api/auth/me (Bearer Token Authentication)',
      passed,
      status: res.status,
      data: data.user,
    });
    console.log(`[Test 7] Authenticated User Profile (Bearer): ${passed ? 'PASSED ✅' : 'FAILED ❌'}`);
  } catch (err) {
    results.push({
      test: 'GET /api/auth/me (Bearer Token Authentication)',
      passed: false,
      error: err.message,
    });
    console.log('[Test 7] Authenticated User Profile (Bearer): FAILED ❌', err.message);
  }

  // Test 8: GET /api/auth/me (Authenticated Access via Cookie)
  try {
    const cookieToUse = loginCookie || authCookie;
    const res = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Cookie: cookieToUse },
    });
    const data = await res.json();
    const passed = res.status === 200 && data.success === true && data.user?.id === userId;
    results.push({
      test: 'GET /api/auth/me (Cookie Authentication)',
      passed,
      status: res.status,
      data: data.user,
    });
    console.log(`[Test 8] Authenticated User Profile (Cookie): ${passed ? 'PASSED ✅' : 'FAILED ❌'}`);
  } catch (err) {
    results.push({
      test: 'GET /api/auth/me (Cookie Authentication)',
      passed: false,
      error: err.message,
    });
    console.log('[Test 8] Authenticated User Profile (Cookie): FAILED ❌', err.message);
  }

  // Test 9: GET /api/auth/me (Unauthenticated Request Rejection)
  try {
    const res = await fetch(`${BASE_URL}/auth/me`);
    const data = await res.json();
    const passed = res.status === 401 && data.success === false;
    results.push({
      test: 'GET /api/auth/me (Unauthenticated Access Rejection)',
      passed,
      status: res.status,
      data,
    });
    console.log(`[Test 9] Unauthenticated Access Rejection: ${passed ? 'PASSED ✅' : 'FAILED ❌'} (Status ${res.status} received: ${data.message})`);
  } catch (err) {
    results.push({
      test: 'GET /api/auth/me (Unauthenticated Access Rejection)',
      passed: false,
      error: err.message,
    });
    console.log('[Test 9] Unauthenticated Access Rejection: FAILED ❌', err.message);
  }

  // Test 10: POST /api/auth/logout (Clears Cookie)
  try {
    const res = await fetch(`${BASE_URL}/auth/logout`, { method: 'POST' });
    const data = await res.json();
    const setCookie = res.headers.get('set-cookie') || '';
    const cookieCleared = setCookie.includes('token=;') || setCookie.includes('Max-Age=0') || setCookie.includes('Expires=Thu, 01 Jan 1970');
    const passed = res.status === 200 && data.success === true && cookieCleared;
    results.push({
      test: 'POST /api/auth/logout (Session/Cookie Cleared)',
      passed,
      status: res.status,
      data,
      cookieCleared,
    });
    console.log(`[Test 10] Logout: ${passed ? 'PASSED ✅' : 'FAILED ❌'}`);
  } catch (err) {
    results.push({
      test: 'POST /api/auth/logout (Session/Cookie Cleared)',
      passed: false,
      error: err.message,
    });
    console.log('[Test 10] Logout: FAILED ❌', err.message);
  }

  // Cleanup: Delete the disposable test account
  try {
    await query('DELETE FROM users WHERE id = $1', [userId]);
    console.log(`\n🧹 Cleaned up disposable test account (${userId}).`);
  } catch (err) {
    console.error('Failed to cleanup test user:', err.message);
  }

  console.log('\n📊 Summary of Results:');
  const allPassed = results.every(r => r.passed);
  console.log(`Total Tests: ${results.length} | Passed: ${results.filter(r => r.passed).length} | Failed: ${results.filter(r => !r.passed).length}`);
  console.log(allPassed ? '🎉 ALL TESTS PASSED SUCCESSFULLY!' : '⚠️ SOME TESTS FAILED');
  process.exit(allPassed ? 0 : 1);
}

runTests();
