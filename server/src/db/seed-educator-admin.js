import bcrypt from 'bcryptjs';
import pool from '../config/db.js';

async function seedUsers() {
  const salt = await bcrypt.genSalt(12);
  const educatorPw = await bcrypt.hash('Educator#2026', salt);
  const adminPw = await bcrypt.hash('Admin#2026', salt);

  await pool.query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ('Prof. Elena Vance', 'educator@elevate.edu', $1, 'educator')
     ON CONFLICT (email) DO UPDATE SET password_hash = $1, role = 'educator'`,
    [educatorPw]
  );

  await pool.query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ('Dean Marcus Sterling', 'admin@elevate.edu', $1, 'admin')
     ON CONFLICT (email) DO UPDATE SET password_hash = $1, role = 'admin'`,
    [adminPw]
  );

  console.log('✔ Demo educator & admin accounts confirmed in DB');
  await pool.end();
}

seedUsers().catch(console.error);
