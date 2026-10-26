/**
 * ELEVATE — Update journey badges in DB
 * Run: node src/db/update-badges.js
 */
import pool from '../config/db.js';
import dotenv from 'dotenv';
dotenv.config();

const badges = [
  ['How to Do Engineering', 'NEWLY LAUNCHED'],
  ['How to Organise an Event', 'POPULAR COURSE'],
  ['How to Do Anchoring', 'NEWLY LAUNCHED'],
  ['Write Anchoring Script', 'TRENDING NOW'],
  ['What to Do in First Year', 'TOP RATED'],
  ['How to Form a Team', 'MOST ENROLLED'],
  ['Select Problem Statement', 'FEATURED GUIDE'],
  ['Synopsis & Report Making', 'NEWLY LAUNCHED'],
];

async function run() {
  const client = await pool.connect();
  try {
    for (const [title, badge] of badges) {
      const r = await client.query(
        'UPDATE journeys SET badge = $1 WHERE title = $2 RETURNING title',
        [badge, title]
      );
      if (r.rows.length > 0) {
        console.log(`✅ "${title}" → badge: "${badge}"`);
      } else {
        console.warn(`⚠️  Not found: "${title}"`);
      }
    }
    console.log('\nDone.');
    process.exit(0);
  } finally {
    client.release();
  }
}

run().catch(e => { console.error(e.message); process.exit(1); });
