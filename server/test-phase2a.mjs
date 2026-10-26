import http from 'http';

function request(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch (e) { json = data; }
        resolve({ status: res.statusCode, headers: res.headers, body: json });
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

const EXPECTED_STAGE_TYPES = ['explore', 'learn', 'experience', 'validate', 'apply', 'transform'];

async function runTests() {
  console.log('========================================================');
  console.log('   ELEVATE PHASE 2A TERMINAL API VERIFICATION SUITE     ');
  console.log('========================================================\n');

  let passed = 0;
  let total = 0;

  function assert(name, condition, details = '') {
    total++;
    if (condition) {
      passed++;
      console.log(`✅ PASS: ${name}`);
      if (details) console.log(`   ${details}`);
    } else {
      console.log(`❌ FAIL: ${name}`);
      if (details) console.log(`   ${details}`);
    }
  }

  // 1. GET /api/journeys
  const res1 = await request({ host: 'localhost', port: 5000, path: '/api/journeys', method: 'GET' });
  assert(
    'GET /api/journeys returns 200 with 8 published journeys',
    res1.status === 200 && res1.body.success === true && Array.isArray(res1.body.journeys) && res1.body.journeys.length === 8,
    `Status: ${res1.status}, Count: ${res1.body?.journeys?.length}`
  );

  const journeys = res1.body?.journeys || [];
  const sampleJourney = journeys[0];

  // 2. Journey fields integrity
  const requiredFields = ['id', 'title', 'description', 'category', 'skill_domain', 'difficulty', 'duration_hours', 'badge', 'status'];
  const hasFields = sampleJourney && requiredFields.every(f => sampleJourney[f] !== undefined && sampleJourney[f] !== null);
  assert(
    'Journeys contain all required catalogue & badge fields',
    hasFields,
    `Sample: "${sampleJourney?.title}" | Badge: "${sampleJourney?.badge}" | Domain: "${sampleJourney?.skill_domain}"`
  );

  // 3. GET /api/journeys/:id returns 6 ordered stages for sample journey
  const res3 = await request({ host: 'localhost', port: 5000, path: `/api/journeys/${sampleJourney?.id}`, method: 'GET' });
  const sampleStages = res3.body?.stages || [];
  const stagesCountValid = sampleStages.length === 6;
  const stagesOrderValid = sampleStages.every((s, idx) => s.order_index === idx + 1);
  const stagesTypesValid = sampleStages.every((s, idx) => s.stage_type === EXPECTED_STAGE_TYPES[idx]);
  const stagesDescValid = sampleStages.every(s => typeof s.description === 'string' && s.description.length > 10);

  assert(
    'GET /api/journeys/:id returns 200 with 6 ordered stages for sample journey',
    res3.status === 200 && res3.body.success === true && stagesCountValid && stagesOrderValid && stagesTypesValid && stagesDescValid,
    `Status: ${res3.status}, Stages count: ${sampleStages.length}, Stage types: [${sampleStages.map(s => s.stage_type).join(', ')}]`
  );

  // 4. Verify ALL 8 journeys have 6 stages in exact order
  let allJourneysValid = true;
  for (const j of journeys) {
    const res = await request({ host: 'localhost', port: 5000, path: `/api/journeys/${j.id}`, method: 'GET' });
    const stages = res.body?.stages || [];
    const valid = stages.length === 6 &&
      stages.every((s, idx) => s.order_index === idx + 1 && s.stage_type === EXPECTED_STAGE_TYPES[idx] && s.title && s.description);
    if (!valid) {
      allJourneysValid = false;
      console.log(`   ❌ Journey "${j.title}" stages check failed! Count: ${stages.length}`);
    }
  }
  assert(
    'All 8 journeys have 6 database-backed stages in Explore->Learn->Experience->Validate->Apply->Transform order',
    allJourneysValid,
    'Verified 8 / 8 journeys individually via GET /api/journeys/:id'
  );

  // 5. GET /api/journeys/:id (non-existent UUID)
  const res5 = await request({ host: 'localhost', port: 5000, path: '/api/journeys/00000000-0000-0000-0000-000000000000', method: 'GET' });
  assert(
    'GET /api/journeys/:id with non-existent UUID returns 404',
    res5.status === 404 && res5.body.success === false && res5.body.message === 'Journey not found',
    `Status: ${res5.status}, Message: "${res5.body?.message}"`
  );

  // 6. GET /api/journeys/:id (malformed non-UUID string)
  const res6 = await request({ host: 'localhost', port: 5000, path: '/api/journeys/not-a-valid-uuid-format', method: 'GET' });
  assert(
    'GET /api/journeys/:id with malformed UUID returns 404',
    res6.status === 404 && res6.body.success === false && res6.body.message === 'Journey not found',
    `Status: ${res6.status}, Message: "${res6.body?.message}"`
  );

  // 7. POST /api/journeys/:id/enroll (unauthenticated)
  const res7 = await request({
    host: 'localhost', port: 5000, path: `/api/journeys/${sampleJourney?.id}/enroll`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  assert(
    'POST /api/journeys/:id/enroll without auth returns 401 Unauthorized',
    res7.status === 401 && res7.body.success === false && res7.body.message === 'Authentication required',
    `Status: ${res7.status}, Message: "${res7.body?.message}"`
  );

  // 8. POST /api/journeys (unauthenticated creation)
  const res8 = await request({
    host: 'localhost', port: 5000, path: '/api/journeys',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { title: 'Unauthorized Journey' });
  assert(
    'POST /api/journeys without educator/admin auth returns 401 Unauthorized',
    res8.status === 401 && res8.body.success === false && res8.body.message === 'Authentication required',
    `Status: ${res8.status}, Message: "${res8.body?.message}"`
  );

  console.log('\n--------------------------------------------------------');
  console.log(`RESULTS: ${passed} / ${total} TESTS PASSED`);
  console.log('========================================================\n');

  if (passed !== total) process.exit(1);
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
