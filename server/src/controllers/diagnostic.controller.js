import { query } from '../config/db.js';
import { recommendJourneys } from '../lib/recommendationEngine.js';

/**
 * GET /api/diagnostic/needs
 * Retrieve the authenticated learner's saved questionnaire answers and current recommendations.
 */
export const getLearnerNeeds = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const needsResult = await query(
      `SELECT * FROM learner_needs WHERE user_id = $1`,
      [userId]
    );

    if (needsResult.rows.length === 0) {
      return res.json({
        success: true,
        submitted: false,
        needs: null,
        recommendations: [],
        catalogueNote: null,
      });
    }

    const needs = needsResult.rows[0];

    // Fetch published journeys to generate fresh recommendations
    const journeysResult = await query(
      `SELECT id, title, description, category, skill_domain, difficulty, duration_hours
       FROM journeys
       WHERE status = 'published'
       ORDER BY title`
    );

    const recResult = recommendJourneys(needs, journeysResult.rows);

    res.json({
      success: true,
      submitted: true,
      needs,
      recommendations: recResult.recommendations,
      catalogueNote: recResult.catalogueNote,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/diagnostic/submit
 * Save or update the authenticated learner's questionnaire responses and generate recommendations.
 */
export const saveLearnerNeeds = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const {
      academic_year = '',
      branch = '',
      academic_situation = '',
      career_interests = [],
      skills = {},
      challenges = [],
      learning_goals = '',
      weekly_hours = '',
      prior_experience = [],
    } = req.body;

    // Backend Input Validation
    if (!Array.isArray(career_interests)) {
      return res.status(400).json({
        success: false,
        message: 'Career interests must be an array',
      });
    }

    if (typeof skills !== 'object' || skills === null || Array.isArray(skills)) {
      return res.status(400).json({
        success: false,
        message: 'Skills must be an object of skill ratings',
      });
    }

    if (!Array.isArray(challenges)) {
      return res.status(400).json({
        success: false,
        message: 'Challenges must be an array',
      });
    }

    if (!Array.isArray(prior_experience)) {
      return res.status(400).json({
        success: false,
        message: 'Prior experience must be an array',
      });
    }

    // Prepare payload
    const rawAnswers = {
      academic_year,
      branch,
      academic_situation,
      career_interests,
      skills,
      challenges,
      learning_goals,
      weekly_hours,
      prior_experience,
      submitted_at: new Date().toISOString(),
    };

    // Upsert into learner_needs table (associated strictly with req.user.id)
    const upsertQuery = `
      INSERT INTO learner_needs (
        user_id,
        academic_year,
        branch,
        academic_situation,
        career_interests,
        skills,
        challenges,
        learning_goals,
        weekly_hours,
        prior_experience,
        raw_answers,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
      ON CONFLICT (user_id) DO UPDATE SET
        academic_year = EXCLUDED.academic_year,
        branch = EXCLUDED.branch,
        academic_situation = EXCLUDED.academic_situation,
        career_interests = EXCLUDED.career_interests,
        skills = EXCLUDED.skills,
        challenges = EXCLUDED.challenges,
        learning_goals = EXCLUDED.learning_goals,
        weekly_hours = EXCLUDED.weekly_hours,
        prior_experience = EXCLUDED.prior_experience,
        raw_answers = EXCLUDED.raw_answers,
        updated_at = NOW()
      RETURNING *
    `;

    const savedResult = await query(upsertQuery, [
      userId,
      academic_year || null,
      branch || null,
      academic_situation || null,
      JSON.stringify(career_interests),
      JSON.stringify(skills),
      JSON.stringify(challenges),
      learning_goals || null,
      weekly_hours || null,
      JSON.stringify(prior_experience),
      JSON.stringify(rawAnswers),
    ]);

    const savedNeeds = savedResult.rows[0];

    // Query published journeys from database
    const journeysResult = await query(
      `SELECT id, title, description, category, skill_domain, difficulty, duration_hours
       FROM journeys
       WHERE status = 'published'
       ORDER BY title`
    );

    // Generate rule-based recommendations
    const recResult = recommendJourneys(savedNeeds, journeysResult.rows);

    res.status(200).json({
      success: true,
      message: 'Learning needs saved successfully',
      submitted: true,
      needs: savedNeeds,
      recommendations: recResult.recommendations,
      catalogueNote: recResult.catalogueNote,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/diagnostic/recommendations
 * Fetch fresh recommendations based on the stored learner needs.
 */
export const getRecommendations = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const needsResult = await query(
      `SELECT * FROM learner_needs WHERE user_id = $1`,
      [userId]
    );

    if (needsResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No learning needs found. Please complete the questionnaire first.',
        recommendations: [],
      });
    }

    const journeysResult = await query(
      `SELECT id, title, description, category, skill_domain, difficulty, duration_hours
       FROM journeys
       WHERE status = 'published'
       ORDER BY title`
    );

    const recResult = recommendJourneys(needsResult.rows[0], journeysResult.rows);

    res.json({
      success: true,
      recommendations: recResult.recommendations,
      catalogueNote: recResult.catalogueNote,
    });
  } catch (error) {
    next(error);
  }
};
