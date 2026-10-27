/**
 * ELEVATE Phase 5A — Seed Sample Practical Activities
 *
 * Populates published growth journeys' experiential stages (Experience, Apply, Transform)
 * with practical engineering activities.
 * Idempotent: Skips stages that already have activities.
 */

import pool from '../config/db.js';
import dotenv from 'dotenv';

dotenv.config();

const sampleActivitiesByStageType = {
  experience: [
    {
      title: 'Lab Challenge: Component Integration & Edge Case Simulation',
      instructions: 'Construct a prototype implementing core architectural patterns under realistic workload constraints. Document your design trade-offs in written form and provide your public repository or deployment link demonstrating automated test coverage.',
      submission_type: 'both',
      is_required: true,
      max_attempts: 3,
    },
  ],
  apply: [
    {
      title: 'Real-World Capstone: Production-Grade Engineering System',
      instructions: 'Implement an end-to-end practical solution addressing the capstone problem statement. Submit your GitHub repository URL along with an executive technical brief detailing database schemas, API contracts, and verification results.',
      submission_type: 'both',
      is_required: true,
      max_attempts: 3,
    },
  ],
  transform: [
    {
      title: 'Milestone Reflection: Technical Competency & Growth Brief',
      instructions: 'Synthesize your key architectural takeaways, challenges overcome, and practical evidence gained throughout this journey. Provide a structured self-reflection explaining how your engineering decisions evolved.',
      submission_type: 'text',
      is_required: false,
      max_attempts: 3,
    },
  ],
};

async function seedActivities() {
  const client = await pool.connect();
  try {
    console.log('Seeding published journeys with practical activities...');

    const jRes = await client.query(
      `SELECT id, title FROM journeys WHERE status = 'published' ORDER BY created_at ASC`
    );

    let totalCreated = 0;

    for (const journey of jRes.rows) {
      const sRes = await client.query(
        `SELECT id, stage_type, title, order_index FROM stages WHERE journey_id = $1 ORDER BY order_index ASC`,
        [journey.id]
      );

      for (const stage of sRes.rows) {
        const templates = sampleActivitiesByStageType[stage.stage_type];
        if (!templates) continue;

        const aRes = await client.query(
          `SELECT count(*) as count FROM activities WHERE stage_id = $1`,
          [stage.id]
        );

        if (parseInt(aRes.rows[0].count, 10) === 0) {
          for (let i = 0; i < templates.length; i++) {
            const tmpl = templates[i];
            await client.query(
              `INSERT INTO activities (stage_id, title, instructions, submission_type, is_required, max_attempts, order_index)
               VALUES ($1, $2, $3, $4, $5, $6, $7)`,
              [
                stage.id,
                `${tmpl.title}`,
                tmpl.instructions,
                tmpl.submission_type,
                tmpl.is_required,
                tmpl.max_attempts,
                i + 1,
              ]
            );
            totalCreated++;
          }
        }
      }
    }

    console.log(`✅ Seeded ${totalCreated} practical activities across published journeys.`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Error seeding activities:', err);
    process.exit(1);
  } finally {
    client.release();
  }
}

seedActivities();
