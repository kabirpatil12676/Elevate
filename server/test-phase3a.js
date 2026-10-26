import pool, { query } from './src/config/db.js';
import http from 'http';
import app from './src/index.js';

async function runVerification() {
  console.log('========================================================');
  console.log('       ELEVATE PHASE 3A FOUNDATION VERIFICATION         ');
  console.log('========================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, name, details = '') {
    if (condition) {
      console.log(`✅ PASS: ${name}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${name} — ${details}`);
      failed++;
    }
  }

  // 1. Verify journeys.price column & existing records
  console.log('--- 1. Journeys Pricing Schema & Data Verification ---');
  const priceColRes = await query(`
    SELECT column_name, data_type, column_default, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'journeys' AND column_name = 'price'
  `);
  assert(
    priceColRes.rows.length === 1 && priceColRes.rows[0].data_type === 'numeric',
    'journeys.price exists as NUMERIC type',
    JSON.stringify(priceColRes.rows)
  );

  const journeysRes = await query(`
    SELECT id, title, price, status FROM journeys WHERE status = 'published' ORDER BY title
  `);
  assert(
    journeysRes.rows.length === 8,
    'All 8 existing published journeys preserved',
    `Found ${journeysRes.rows.length}`
  );

  const allZero = journeysRes.rows.every(j => Number(j.price) === 0);
  assert(
    allZero,
    'All 8 existing journeys default to ₹0.00 (Free)',
    JSON.stringify(journeysRes.rows.map(j => ({ title: j.title, price: j.price })))
  );

  // 2. Verify negative price prevention constraint
  console.log('\n--- 2. Price Constraint Verification ---');
  let rejectedNegative = false;
  try {
    await query(`
      INSERT INTO journeys (title, price, status)
      VALUES ('Negative Price Test Course', -50.00, 'draft')
    `);
  } catch (err) {
    if (err.message.includes('check_journey_price_non_negative') || err.message.includes('violates check constraint')) {
      rejectedNegative = true;
    }
  }
  assert(rejectedNegative, 'Database check constraint check_journey_price_non_negative rejects negative price');

  // 3. Verify payment_orders table & constraints
  console.log('\n--- 3. Payment Orders Table & Constraints Verification ---');
  const tableCheck = await query(`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payment_orders'
  `);
  assert(tableCheck.rows.length === 1, 'payment_orders table exists in public schema');

  const paymentColsRes = await query(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name = 'payment_orders'
    ORDER BY ordinal_position
  `);
  const colMap = {};
  paymentColsRes.rows.forEach(r => { colMap[r.column_name] = r; });

  const requiredCols = [
    'id', 'user_id', 'journey_id', 'razorpay_order_id',
    'amount_paise', 'currency', 'status', 'razorpay_payment_id',
    'razorpay_signature', 'verified_at', 'captured_at',
    'created_at', 'updated_at'
  ];
  const allRequiredPresent = requiredCols.every(c => !!colMap[c]);
  assert(allRequiredPresent, 'All 13 required payment_orders columns exist', `Missing: ${requiredCols.filter(c => !colMap[c]).join(', ')}`);

  // Check unique constraints on razorpay_order_id and razorpay_payment_id
  const uniqueConstraints = await query(`
    SELECT conname, pg_get_constraintdef(c.oid) as def
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'payment_orders' AND c.contype = 'u'
  `);
  const uDefs = uniqueConstraints.rows.map(r => r.def);
  const hasOrderUnique = uDefs.some(d => d.includes('razorpay_order_id'));
  const hasPaymentUnique = uDefs.some(d => d.includes('razorpay_payment_id'));
  assert(hasOrderUnique, 'UNIQUE constraint on payment_orders.razorpay_order_id verified');
  assert(hasPaymentUnique, 'UNIQUE constraint on payment_orders.razorpay_payment_id verified');

  // Check amount constraint
  let rejectedNegativeAmount = false;
  const sampleUser = (await query('SELECT id FROM users LIMIT 1')).rows[0];
  const sampleJourney = journeysRes.rows[0];
  try {
    await query(`
      INSERT INTO payment_orders (user_id, journey_id, razorpay_order_id, amount_paise)
      VALUES ($1, $2, 'order_test_neg', -100)
    `, [sampleUser.id, sampleJourney.id]);
  } catch (err) {
    if (err.message.includes('violates check constraint')) {
      rejectedNegativeAmount = true;
    }
  }
  assert(rejectedNegativeAmount, 'CHECK constraint rejects negative amount_paise');

  // Check invalid status constraint
  let rejectedBadStatus = false;
  try {
    await query(`
      INSERT INTO payment_orders (user_id, journey_id, razorpay_order_id, amount_paise, status)
      VALUES ($1, $2, 'order_test_bad_status', 1000, 'unsupported_status')
    `, [sampleUser.id, sampleJourney.id]);
  } catch (err) {
    if (err.message.includes('violates check constraint')) {
      rejectedBadStatus = true;
    }
  }
  assert(rejectedBadStatus, 'CHECK constraint restricts payment status to allowed enum values');

  // Check indexes
  const indexRes = await query(`
    SELECT indexname FROM pg_indexes WHERE tablename = 'payment_orders'
  `);
  const indexes = indexRes.rows.map(r => r.indexname);
  assert(indexes.includes('idx_payment_orders_user_id'), 'Index idx_payment_orders_user_id verified');
  assert(indexes.includes('idx_payment_orders_journey_id'), 'Index idx_payment_orders_journey_id verified');
  assert(indexes.includes('idx_payment_orders_status'), 'Index idx_payment_orders_status verified');

  // 4. API Endpoints Exposing Price
  console.log('\n--- 4. API Catalogue & Details Price Exposure ---');
  const server = http.createServer(app);
  await new Promise(r => server.listen(0, r));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  const catRes = await fetch(`${baseUrl}/api/journeys`);
  const catData = await catRes.json();
  assert(
    catRes.status === 200 && catData.success && catData.journeys.length === 8,
    'GET /api/journeys returns 200 with 8 journeys'
  );
  assert(
    catData.journeys.every(j => j.price !== undefined && j.price !== null),
    'GET /api/journeys exposes price field on every journey'
  );

  const detailRes = await fetch(`${baseUrl}/api/journeys/${sampleJourney.id}`);
  const detailData = await detailRes.json();
  assert(
    detailRes.status === 200 && detailData.success && detailData.journey.price !== undefined,
    'GET /api/journeys/:id exposes price field on journey detail'
  );
  console.log(`  Sample journey: "${detailData.journey.title}" | price: ₹${detailData.journey.price}`);

  server.close();

  console.log('\n========================================================');
  console.log(`VERIFICATION SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log('========================================================\n');

  if (failed > 0) process.exit(1);
  process.exit(0);
}

runVerification().catch(err => {
  console.error('Verification suite failed:', err);
  process.exit(1);
});
