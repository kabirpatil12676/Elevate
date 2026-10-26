import pool from './src/config/db.js';

async function inspect() {
  const journeysCols = await pool.query(`
    SELECT column_name, data_type, column_default, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'journeys'
    ORDER BY ordinal_position
  `);
  console.log('--- Journeys Table Columns ---');
  journeysCols.rows.forEach(r => console.log(r.column_name, ':', r.data_type, '| default:', r.column_default, '| nullable:', r.is_nullable));

  const allTables = await pool.query(`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename
  `);
  console.log('\n--- All Public Tables ---');
  console.log(allTables.rows.map(r => r.tablename));

  const enrollmentsCols = await pool.query(`
    SELECT column_name, data_type, column_default, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'enrollments'
    ORDER BY ordinal_position
  `);
  console.log('\n--- Enrollments Table Columns ---');
  enrollmentsCols.rows.forEach(r => console.log(r.column_name, ':', r.data_type, '| default:', r.column_default, '| nullable:', r.is_nullable));

  process.exit(0);
}

inspect().catch(err => {
  console.error(err);
  process.exit(1);
});
