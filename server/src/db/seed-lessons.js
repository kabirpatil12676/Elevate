/**
 * ELEVATE Phase 4B — Seed Sample Video Lessons
 *
 * Populates published growth journeys' stages with realistic educational video lessons.
 * Idempotent: Skips stages that already have capsules.
 */

import pool from '../config/db.js';
import dotenv from 'dotenv';

dotenv.config();

const sampleLessonsByStageType = {
  explore: [
    {
      title: 'Orientation & Core Pedagogical Diagnostic',
      description: 'Understanding the ELEVATE experiential model, assessing prerequisite knowledge, and setting target learning milestones.',
      content_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      duration_min: 12,
    },
    {
      title: 'Domain Landscape & Emerging Tech Overview',
      description: 'A deep-dive map of current industry paradigms, skill matrices, and baseline self-evaluation techniques.',
      content_url: 'https://www.youtube.com/watch?v=rfscVS0vtbw',
      duration_min: 15,
    },
  ],
  learn: [
    {
      title: 'Foundational Concepts & Architectural Blueprint',
      description: 'Core theoretical mechanics, mental models, and foundational system structures essential for real-world engineering.',
      content_url: 'https://www.youtube.com/watch?v=zOjov-2OZ0E',
      duration_min: 22,
    },
    {
      title: 'Deep-Dive Principles & Common Anti-Patterns',
      description: 'Analyzing state-of-the-art patterns, debugging methodologies, and code quality criteria in modern systems.',
      content_url: 'https://www.youtube.com/watch?v=PkZNo7MFNFg',
      duration_min: 18,
    },
  ],
  experience: [
    {
      title: 'Interactive Challenge Walkthrough & Constraint Briefing',
      description: 'Setting up local lab environments, running simulations, and overcoming real-world assignment edge cases.',
      content_url: 'https://www.youtube.com/watch?v=G3e-cpL7ofc',
      duration_min: 25,
    },
  ],
  validate: [
    {
      title: 'Peer Review Protocols & Educator Critique Rubrics',
      description: 'How to structure pull request submissions, provide constructive critique, and incorporate expert suggestions.',
      content_url: 'https://www.youtube.com/watch?v=aircAruvnKk',
      duration_min: 14,
    },
  ],
  apply: [
    {
      title: 'Capstone Project Execution & Integration Architecture',
      description: 'Synthesizing all modules into a production-grade implementation with automated verification and deployment.',
      content_url: 'https://www.youtube.com/watch?v=W6NZfCO5SIk',
      duration_min: 28,
    },
  ],
  transform: [
    {
      title: 'Portfolio Documentation & Career Milestone Reflection',
      description: 'Documenting engineering outcomes, curating portfolio evidence, and preparing for technical panel discussions.',
      content_url: 'https://www.youtube.com/watch?v=Oe421EPjeBE',
      duration_min: 16,
    },
  ],
};

async function seedLessons() {
  const client = await pool.connect();
  try {
    console.log('Seeding published journeys with video lessons...');

    // Fetch all published journeys
    const jRes = await client.query(
      `SELECT id, title FROM journeys WHERE status = 'published' ORDER BY created_at ASC`
    );

    let totalCreated = 0;

    for (const journey of jRes.rows) {
      // Fetch stages for this journey
      const sRes = await client.query(
        `SELECT id, stage_type, title, order_index FROM stages WHERE journey_id = $1 ORDER BY order_index ASC`,
        [journey.id]
      );

      for (const stage of sRes.rows) {
        // Check if stage already has capsules
        const cRes = await client.query(
          `SELECT count(*) as count FROM capsules WHERE stage_id = $1`,
          [stage.id]
        );

        if (parseInt(cRes.rows[0].count, 10) === 0) {
          const templates = sampleLessonsByStageType[stage.stage_type] || sampleLessonsByStageType.learn;

          for (let i = 0; i < templates.length; i++) {
            const tmpl = templates[i];
            await client.query(
              `INSERT INTO capsules (stage_id, title, description, content_url, content_type, duration_min, order_index)
               VALUES ($1, $2, $3, $4, 'video', $5, $6)`,
              [
                stage.id,
                `${tmpl.title} (${stage.stage_type.toUpperCase()})`,
                tmpl.description,
                tmpl.content_url,
                tmpl.duration_min,
                i + 1,
              ]
            );
            totalCreated++;
          }
        }
      }
    }

    console.log(`✅ Seeded ${totalCreated} video lessons across published journeys.`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Error seeding lessons:', err);
    process.exit(1);
  } finally {
    client.release();
  }
}

seedLessons();
