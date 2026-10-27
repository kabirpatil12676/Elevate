import bcrypt from 'bcryptjs';
import pool from '../config/db.js';
import dotenv from 'dotenv';

dotenv.config();

async function seedUsers() {
  const isProduction = process.env.NODE_ENV === 'production';
  const allowDemoSeed = process.env.ALLOW_DEMO_SEED === 'true';

  if (isProduction && !allowDemoSeed) {
    console.warn('⚠️ Seeding demo accounts is disabled in production environments. Set ALLOW_DEMO_SEED=true to override.');
    await pool.end();
    return;
  }

  const salt = await bcrypt.genSalt(12);
  const educatorPw = await bcrypt.hash('Educator#2026', salt);
  const adminPw = await bcrypt.hash('Admin#2026', salt);

  // DO NOTHING on conflict to avoid overwriting existing credentials
  await pool.query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ('Prof. Elena Vance', 'educator@elevate.edu', $1, 'educator')
     ON CONFLICT (email) DO NOTHING`,
    [educatorPw]
  );

  await pool.query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ('Dean Marcus Sterling', 'admin@elevate.edu', $1, 'admin')
     ON CONFLICT (email) DO NOTHING`,
    [adminPw]
  );

  const catalogueTitles = [
    'How to Do Engineering',
    'How to Organise an Event',
    'How to Do Anchoring',
    'Write Anchoring Script',
    'What to Do in First Year',
    'How to Form a Team',
    'Select Problem Statement',
    'Synopsis & Report Making',
  ];

  const assigned = await pool.query(
    `UPDATE journeys
     SET created_by = u.id, updated_at = NOW()
     FROM users u
     WHERE u.email = 'educator@elevate.edu'
       AND u.role = 'educator'
       AND journeys.created_by IS NULL
       AND journeys.title = ANY($1::text[])
     RETURNING journeys.title`,
    [catalogueTitles]
  );
  if (assigned.rows.length > 0) {
    console.log(`✔ Assigned ${assigned.rows.length} unowned catalogue journey(s) to educator@elevate.edu`);
  }

  console.log('✔ Demo educator & admin accounts ensured in DB');
  await pool.end();
}

seedUsers().catch(console.error);
