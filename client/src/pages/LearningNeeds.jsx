import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '../components/Navbar';
import diagnosticService from '../services/diagnostic.service';

// Options constants
const ACADEMIC_YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year'];

const BRANCHES = [
  'Computer Science / IT',
  'Electronics & Communication',
  'Mechanical Engineering',
  'Civil Engineering',
  'Electrical Engineering',
  'Chemical Engineering',
  'Information Science',
  'Other / Interdisciplinary',
];

const ACADEMIC_SITUATIONS = [
  'Focusing on foundational theory and coursework',
  'Preparing actively for campus placements & interviews',
  'Working on academic mini-projects / Capstone defense',
  'Exploring different career specializations and tracks',
];

const WEEKLY_HOURS = [
  '2–4 hours/week',
  '5–8 hours/week',
  '8–12 hours/week',
  '12+ hours/week',
];

const CAREER_INTERESTS = [
  'Software Development',
  'Data Analytics',
  'Data Science/AI',
  'Core Engineering',
  'Entrepreneurship',
  'Cybersecurity',
  'Cloud Computing',
  'Other',
];

const PRIOR_EXPERIENCE = [
  'Classroom theory only',
  'Completed online courses / tutorials',
  'Built academic mini-projects',
  'Completed an industry internship',
  'Beginner / No practical experience',
];

const SKILL_ITEMS = [
  { key: 'programming', label: 'Programming Fundamentals' },
  { key: 'sql', label: 'SQL & Database Design' },
  { key: 'excel', label: 'Excel & Data Structuring' },
  { key: 'power_bi', label: 'Power BI & Visualization' },
  { key: 'communication', label: 'Communication & Public Speaking' },
  { key: 'teamwork', label: 'Teamwork & Collaborative Roles' },
  { key: 'technical_writing', label: 'Technical Writing & Reports' },
  { key: 'project_experience', label: 'Practical Project Delivery' },
];

const SKILL_LEVELS = ['None', 'Beginner', 'Intermediate', 'Advanced'];

const CHALLENGES = [
  'Placement preparation',
  'Lack of projects',
  'Weak fundamentals',
  'Communication',
  'Identifying a career direction',
  'Internship readiness',
  'Other',
];

const GOAL_SUGGESTIONS = [
  'Build a verifiable project portfolio for job interviews',
  'Overcome public speaking fear and improve articulation',
  'Learn structured technical writing for reports and synopsis',
  'Master collaborative teamwork for hackathons and projects',
];

const LearningNeeds = () => {
  // Page mode: 'loading' | 'view_recommendations' | 'form'
  const [mode, setMode] = useState('loading');
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  // Form State
  const [formData, setFormData] = useState({
    academic_year: '3rd Year',
    branch: 'Computer Science / IT',
    academic_situation: 'Preparing actively for campus placements & interviews',
    weekly_hours: '5–8 hours/week',
    career_interests: ['Software Development'],
    prior_experience: ['Built academic mini-projects'],
    skills: {
      programming: 'Intermediate',
      sql: 'Beginner',
      excel: 'Intermediate',
      power_bi: 'None',
      communication: 'Beginner',
      teamwork: 'Intermediate',
      technical_writing: 'Beginner',
      project_experience: 'Beginner',
    },
    challenges: ['Lack of projects', 'Placement preparation'],
    learning_goals: '',
  });

  // Results State
  const [recommendations, setRecommendations] = useState([]);
  const [catalogueNote, setCatalogueNote] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [lastSavedAt, setLastSavedAt] = useState(null);

  // Fetch existing needs on mount
  useEffect(() => {
    let mounted = true;

    async function fetchExisting() {
      try {
        const res = await diagnosticService.getLearnerNeeds();
        if (!mounted) return;

        if (res.submitted && res.needs) {
          // Pre-populate form state with saved data
          const n = res.needs;
          setFormData({
            academic_year: n.academic_year || '3rd Year',
            branch: n.branch || 'Computer Science / IT',
            academic_situation: n.academic_situation || '',
            weekly_hours: n.weekly_hours || '5–8 hours/week',
            career_interests: Array.isArray(n.career_interests) ? n.career_interests : [],
            prior_experience: Array.isArray(n.prior_experience) ? n.prior_experience : [],
            skills: n.skills && typeof n.skills === 'object' ? n.skills : {},
            challenges: Array.isArray(n.challenges) ? n.challenges : [],
            learning_goals: n.learning_goals || '',
          });
          setRecommendations(res.recommendations || []);
          setCatalogueNote(res.catalogueNote || null);
          setLastSavedAt(n.updated_at || n.created_at || null);
          setMode('view_recommendations');
        } else {
          setMode('form');
        }
      } catch (err) {
        if (!mounted) return;
        console.error('Failed to load learning needs:', err);
        setMode('form');
      }
    }

    fetchExisting();
    return () => {
      mounted = false;
    };
  }, []);

  // Multi-select toggle helpers
  const toggleArrayItem = (field, item) => {
    setFormData((prev) => {
      const current = prev[field] || [];
      const exists = current.includes(item);
      const next = exists ? current.filter((x) => x !== item) : [...current, item];
      return { ...prev, [field]: next };
    });
  };

  const setSkillLevel = (skillKey, level) => {
    setFormData((prev) => ({
      ...prev,
      skills: {
        ...prev.skills,
        [skillKey]: level,
      },
    }));
  };

  // Step navigation
  const nextStep = () => {
    setFormError(null);
    if (currentStep === 1) {
      if (!formData.academic_year) {
        setFormError('Please select your current engineering academic year.');
        return;
      }
    } else if (currentStep === 2) {
      if (!formData.career_interests || formData.career_interests.length === 0) {
        setFormError('Please select at least one career interest area.');
        return;
      }
    } else if (currentStep === 3) {
      if (!formData.challenges || formData.challenges.length === 0) {
        setFormError('Please select at least one primary challenge or focus area.');
        return;
      }
    }
    setCurrentStep((s) => Math.min(s + 1, totalSteps));
  };

  const prevStep = () => {
    setFormError(null);
    setCurrentStep((s) => Math.max(s - 1, 1));
  };

  // Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    try {
      const res = await diagnosticService.submitLearnerNeeds(formData);
      if (res.success) {
        setRecommendations(res.recommendations || []);
        setCatalogueNote(res.catalogueNote || null);
        setLastSavedAt(new Date().toISOString());
        setMode('view_recommendations');
      } else {
        setFormError(res.message || 'Failed to evaluate learning needs.');
      }
    } catch (err) {
      setFormError(err.message || 'Network error occurred while saving your responses.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-[#f7f9fc] text-[#191c1e] min-h-screen flex flex-col font-['Inter'] antialiased">
      <Navbar />

      <main className="flex-grow pt-28 pb-20">
        <div className="max-w-[1080px] mx-auto px-6 md:px-12">
          {/* Header Banner */}
          <div className="mb-8">
            <div className="flex items-center gap-2 text-xs font-bold text-[#4353cf] uppercase tracking-wider mb-2">
              <span className="material-symbols-outlined text-sm">psychology</span>
              Diagnostic & Personalized Growth Roadmap
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-[#191c1e] font-['Hanken_Grotesk'] tracking-tight">
              {mode === 'view_recommendations'
                ? 'Your Personalized Growth Recommendations'
                : 'Student Learning-Needs Questionnaire'}
            </h1>
            <p className="text-sm md:text-base text-[#454654] mt-2 max-w-2xl">
              {mode === 'view_recommendations'
                ? 'Deterministic, rule-based recommendations matching your reported year, skill gaps, and practical project priorities to published ELEVATE Growth Journeys.'
                : 'Share your academic background, current skill gaps, and learning priorities to receive transparent, rule-matched recommendations across ELEVATE Growth Journeys.'}
            </p>
          </div>

          {/* Loading State */}
          {mode === 'loading' && (
            <div className="bg-white rounded-3xl p-16 border border-[#e1e3e4] text-center shadow-sm">
              <div className="w-12 h-12 border-4 border-[#4353cf] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm font-medium text-[#454654]">Loading your diagnostic profile...</p>
            </div>
          )}

          {/* ════════════════ VIEW RECOMMENDATIONS MODE ════════════════ */}
          {mode === 'view_recommendations' && (
            <div className="space-y-8">
              {/* Profile Summary Card */}
              <div className="bg-white rounded-3xl p-6 md:p-8 border border-[#e1e3e4] shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="px-3 py-1 bg-[#4353cf]/10 text-[#4353cf] text-xs font-bold rounded-full">
                      {formData.academic_year || 'Undergraduate'}
                    </span>
                    <span className="px-3 py-1 bg-[#eef0f3] text-[#454654] text-xs font-medium rounded-full">
                      {formData.branch || 'Engineering'}
                    </span>
                    {formData.career_interests?.map((ci) => (
                      <span key={ci} className="px-3 py-1 bg-[#4353cf]/5 text-[#24389c] text-xs font-semibold rounded-full border border-[#4353cf]/20">
                        {ci}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-[#757685]">
                    {lastSavedAt ? `Evaluated on ${new Date(lastSavedAt).toLocaleDateString()} at ${new Date(lastSavedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Evaluated against published catalogue'}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setCurrentStep(1);
                      setMode('form');
                    }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[#c6c5d6] hover:border-[#4353cf] text-[#4353cf] font-semibold text-xs md:text-sm transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">edit_note</span>
                    Retake / Update Questionnaire
                  </button>
                  <Link
                    to="/dashboard"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#4353cf] hover:bg-[#2435b4] text-white font-semibold text-xs md:text-sm transition-colors shadow-sm"
                  >
                    Dashboard
                  </Link>
                </div>
              </div>

              {/* Catalogue Limitation Note (if present) */}
              {catalogueNote && (
                <div className="bg-[#fff9eb] border border-[#f5dfa8] rounded-2xl p-5 flex items-start gap-3">
                  <span className="material-symbols-outlined text-[#b87405] text-xl mt-0.5">info</span>
                  <div className="text-xs md:text-sm text-[#734900] leading-relaxed">
                    <span className="font-bold">Transparent Catalogue Notice: </span>
                    {catalogueNote}
                  </div>
                </div>
              )}

              {/* Recommendations List */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-[#191c1e] font-['Hanken_Grotesk']">
                    Top Recommended Growth Journeys ({recommendations.length})
                  </h2>
                  <span className="text-xs text-[#757685] font-medium">
                    Sorted by deterministic rule match score
                  </span>
                </div>

                {recommendations.length === 0 ? (
                  <div className="bg-white rounded-3xl p-12 border border-[#e1e3e4] text-center shadow-sm">
                    <span className="material-symbols-outlined text-[#757685] text-5xl mb-3">manage_search</span>
                    <h3 className="text-lg font-bold text-[#191c1e] mb-2">No High-Confidence Matches Found</h3>
                    <p className="text-sm text-[#454654] max-w-lg mx-auto mb-6">
                      The current ELEVATE catalogue focuses on core experiential engineering, project formation, and communication. Try updating your profile or explore all published courses directly.
                    </p>
                    <div className="flex justify-center gap-3">
                      <button
                        onClick={() => {
                          setCurrentStep(1);
                          setMode('form');
                        }}
                        className="px-6 py-2.5 bg-[#4353cf] text-white text-sm font-semibold rounded-xl"
                      >
                        Adjust Questionnaire
                      </button>
                      <Link
                        to="/courses"
                        className="px-6 py-2.5 border border-[#c6c5d6] text-[#454654] text-sm font-semibold rounded-xl"
                      >
                        Browse All Courses
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-6">
                    {recommendations.map((rec, index) => {
                      const journey = rec.journey;
                      return (
                        <div
                          key={journey.id}
                          className="bg-white rounded-3xl p-6 md:p-8 border border-[#e1e3e4] hover:border-[#4353cf]/50 transition-all shadow-sm flex flex-col md:flex-row items-start justify-between gap-6"
                        >
                          <div className="flex-grow space-y-4">
                            {/* Card Header */}
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="px-2.5 py-0.5 bg-[#4353cf] text-white text-[11px] font-bold rounded-md">
                                #{index + 1} Best Match
                              </span>
                              <span className="px-2.5 py-0.5 bg-[#eef0f3] text-[#454654] text-[11px] font-semibold rounded-md">
                                {journey.category}
                              </span>
                              {journey.difficulty && (
                                <span className="px-2.5 py-0.5 bg-[#f0f9f4] text-[#1b7a47] text-[11px] font-semibold rounded-md">
                                  {journey.difficulty}
                                </span>
                              )}
                              {journey.skill_domain && (
                                <span className="px-2.5 py-0.5 bg-[#f7f9fc] text-[#757685] text-[11px] font-medium rounded-md border border-[#e1e3e4]">
                                  {journey.skill_domain}
                                </span>
                              )}
                            </div>

                            {/* Title & Description */}
                            <div>
                              <h3 className="text-xl md:text-2xl font-bold text-[#191c1e] font-['Hanken_Grotesk'] hover:text-[#4353cf] transition-colors">
                                <Link to={`/courses/${journey.id}`}>{journey.title}</Link>
                              </h3>
                              <p className="text-xs md:text-sm text-[#454654] mt-1.5 line-clamp-2 leading-relaxed">
                                {journey.description}
                              </p>
                            </div>

                            {/* Transparent Reasons Block */}
                            <div className="bg-[#f7f9fc] rounded-2xl p-4 border border-[#e8eaed]">
                              <div className="text-xs font-bold text-[#191c1e] mb-2 flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-[#4353cf] text-base">verified</span>
                                Why this matches your profile:
                              </div>
                              <ul className="space-y-1.5">
                                {rec.reasons.map((reason, rIdx) => (
                                  <li key={rIdx} className="text-xs text-[#454654] flex items-start gap-2">
                                    <span className="text-[#4353cf] font-bold mt-0.5">•</span>
                                    <span>{reason}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>

                          {/* Action Side */}
                          <div className="flex md:flex-col items-center md:items-end justify-between w-full md:w-auto gap-4 md:border-l md:border-[#f0f2f5] md:pl-6 shrink-0">
                            <div className="text-left md:text-right">
                              <span className="text-xs font-semibold text-[#757685] uppercase tracking-wider block">
                                Match Score
                              </span>
                              <span className="text-2xl font-black text-[#4353cf] font-['Hanken_Grotesk']">
                                {rec.score} pts
                              </span>
                            </div>

                            <Link
                              to={`/courses/${journey.id}`}
                              className="inline-flex items-center gap-2 px-6 py-3 bg-[#4353cf] hover:bg-[#2435b4] text-white font-bold text-xs md:text-sm rounded-xl shadow-sm hover:shadow transition-all group"
                            >
                              Explore Journey
                              <span className="material-symbols-outlined text-sm group-hover:translate-x-0.5 transition-transform">
                                arrow_forward
                              </span>
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ════════════════ MULTI-STEP QUESTIONNAIRE FORM ════════════════ */}
          {mode === 'form' && (
            <div className="bg-white rounded-3xl p-6 md:p-12 border border-[#e1e3e4] shadow-sm">
              {/* Stepper Progress Bar */}
              <div className="mb-10">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-[#4353cf] uppercase tracking-wider">
                    Step {currentStep} of {totalSteps}
                  </span>
                  <span className="text-xs font-semibold text-[#757685]">
                    {currentStep === 1 && 'Academic Profile & Time'}
                    {currentStep === 2 && 'Career Interests & Experience'}
                    {currentStep === 3 && 'Skill Self-Assessment & Challenges'}
                    {currentStep === 4 && 'Goals & Evaluation'}
                  </span>
                </div>
                <div className="w-full bg-[#eef0f3] h-2 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-[#4353cf]"
                    initial={{ width: '25%' }}
                    animate={{ width: `${(currentStep / totalSteps) * 100}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>

              {/* Validation Alert */}
              {formError && (
                <div className="mb-6 p-4 bg-[#fde8e8] border border-[#f8b4b4] rounded-2xl flex items-start gap-3">
                  <span className="material-symbols-outlined text-[#ba1a1a] text-xl mt-0.5">error</span>
                  <div className="text-xs md:text-sm text-[#ba1a1a] font-medium">{formError}</div>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <AnimatePresence mode="wait">
                  {/* STEP 1: Academic Information & Weekly Availability */}
                  {currentStep === 1 && (
                    <motion.div
                      key="step-1"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-8"
                    >
                      <div>
                        <h2 className="text-xl font-bold text-[#191c1e] font-['Hanken_Grotesk'] mb-1">
                          1. Academic Information
                        </h2>
                        <p className="text-xs md:text-sm text-[#454654]">
                          Tell us about your current engineering academic standing.
                        </p>
                      </div>

                      {/* Engineering Year */}
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-[#191c1e] mb-3">
                          Current Engineering Year <span className="text-[#ba1a1a]">*</span>
                        </label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {ACADEMIC_YEARS.map((yr) => {
                            const isSelected = formData.academic_year === yr;
                            return (
                              <button
                                type="button"
                                key={yr}
                                onClick={() => setFormData((p) => ({ ...p, academic_year: yr }))}
                                className={`py-3.5 px-4 rounded-2xl border text-sm font-semibold transition-all text-center ${
                                  isSelected
                                    ? 'border-[#4353cf] bg-[#4353cf] text-white shadow-sm'
                                    : 'border-[#e1e3e4] bg-[#f7f9fc] text-[#191c1e] hover:border-[#c6c5d6]'
                                }`}
                              >
                                {yr}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Branch Dropdown */}
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-[#191c1e] mb-2">
                          Engineering Branch / Discipline
                        </label>
                        <select
                          value={formData.branch}
                          onChange={(e) => setFormData((p) => ({ ...p, branch: e.target.value }))}
                          className="w-full px-4 py-3 bg-[#f7f9fc] border border-[#e1e3e4] rounded-2xl text-sm font-medium text-[#191c1e] focus:outline-none focus:border-[#4353cf]"
                        >
                          {BRANCHES.map((b) => (
                            <option key={b} value={b}>
                              {b}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Academic Situation */}
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-[#191c1e] mb-2">
                          Current Academic Situation / Phase
                        </label>
                        <div className="space-y-2">
                          {ACADEMIC_SITUATIONS.map((sit) => {
                            const isSelected = formData.academic_situation === sit;
                            return (
                              <div
                                key={sit}
                                onClick={() => setFormData((p) => ({ ...p, academic_situation: sit }))}
                                className={`p-4 rounded-2xl border text-xs md:text-sm font-medium cursor-pointer transition-all flex items-center justify-between ${
                                  isSelected
                                    ? 'border-[#4353cf] bg-[#4353cf]/5 text-[#191c1e]'
                                    : 'border-[#e1e3e4] bg-[#f7f9fc] text-[#454654] hover:border-[#c6c5d6]'
                                }`}
                              >
                                <span>{sit}</span>
                                <span
                                  className={`material-symbols-outlined text-lg ${
                                    isSelected ? 'text-[#4353cf]' : 'text-transparent'
                                  }`}
                                >
                                  check_circle
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Weekly Availability */}
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-[#191c1e] mb-2">
                          Weekly Dedicated Study Availability
                        </label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {WEEKLY_HOURS.map((wh) => {
                            const isSelected = formData.weekly_hours === wh;
                            return (
                              <button
                                type="button"
                                key={wh}
                                onClick={() => setFormData((p) => ({ ...p, weekly_hours: wh }))}
                                className={`py-3 px-3 rounded-2xl border text-xs md:text-sm font-medium text-center transition-all ${
                                  isSelected
                                    ? 'border-[#4353cf] bg-[#4353cf]/10 text-[#4353cf] font-bold'
                                    : 'border-[#e1e3e4] bg-[#f7f9fc] text-[#454654] hover:border-[#c6c5d6]'
                                }`}
                              >
                                {wh}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* STEP 2: Career Interests & Practical Experience */}
                  {currentStep === 2 && (
                    <motion.div
                      key="step-2"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-8"
                    >
                      <div>
                        <h2 className="text-xl font-bold text-[#191c1e] font-['Hanken_Grotesk'] mb-1">
                          2. Career Interests & Practical Experience
                        </h2>
                        <p className="text-xs md:text-sm text-[#454654]">
                          Select your primary areas of curiosity and past exposure.
                        </p>
                      </div>

                      {/* Career Interests */}
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-[#191c1e] mb-3">
                          Career Interest Areas (Select all that apply) <span className="text-[#ba1a1a]">*</span>
                        </label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {CAREER_INTERESTS.map((ci) => {
                            const isSelected = formData.career_interests?.includes(ci);
                            return (
                              <button
                                type="button"
                                key={ci}
                                onClick={() => toggleArrayItem('career_interests', ci)}
                                className={`p-4 rounded-2xl border text-xs md:text-sm font-semibold transition-all text-left flex items-center justify-between ${
                                  isSelected
                                    ? 'border-[#4353cf] bg-[#4353cf] text-white shadow-sm'
                                    : 'border-[#e1e3e4] bg-[#f7f9fc] text-[#191c1e] hover:border-[#c6c5d6]'
                                }`}
                              >
                                <span>{ci}</span>
                                {isSelected && (
                                  <span className="material-symbols-outlined text-sm">check</span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Prior Practical Experience */}
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-[#191c1e] mb-3">
                          Previous Hands-on Experience
                        </label>
                        <div className="space-y-2.5">
                          {PRIOR_EXPERIENCE.map((exp) => {
                            const isSelected = formData.prior_experience?.includes(exp);
                            return (
                              <div
                                key={exp}
                                onClick={() => toggleArrayItem('prior_experience', exp)}
                                className={`p-4 rounded-2xl border text-xs md:text-sm font-medium cursor-pointer transition-all flex items-center justify-between ${
                                  isSelected
                                    ? 'border-[#4353cf] bg-[#4353cf]/5 text-[#191c1e]'
                                    : 'border-[#e1e3e4] bg-[#f7f9fc] text-[#454654] hover:border-[#c6c5d6]'
                                }`}
                              >
                                <span>{exp}</span>
                                <span
                                  className={`material-symbols-outlined text-lg ${
                                    isSelected ? 'text-[#4353cf]' : 'text-[#c6c5d6]'
                                  }`}
                                >
                                  {isSelected ? 'check_box' : 'check_box_outline_blank'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* STEP 3: Current Skills & Challenges */}
                  {currentStep === 3 && (
                    <motion.div
                      key="step-3"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-8"
                    >
                      <div>
                        <h2 className="text-xl font-bold text-[#191c1e] font-['Hanken_Grotesk'] mb-1">
                          3. Skill Self-Assessment & Main Challenges
                        </h2>
                        <p className="text-xs md:text-sm text-[#454654]">
                          Honest self-assessment allows our deterministic rules to target your actual gaps.
                        </p>
                      </div>

                      {/* Skill Matrix */}
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-[#191c1e] mb-3">
                          Current Skill Competency Level
                        </label>
                        <div className="space-y-3">
                          {SKILL_ITEMS.map((skill) => {
                            const currentVal = formData.skills?.[skill.key] || 'None';
                            return (
                              <div
                                key={skill.key}
                                className="bg-[#f7f9fc] p-4 rounded-2xl border border-[#e1e3e4] flex flex-col md:flex-row md:items-center justify-between gap-3"
                              >
                                <span className="text-xs md:text-sm font-semibold text-[#191c1e]">
                                  {skill.label}
                                </span>
                                <div className="grid grid-cols-4 gap-2 w-full md:w-auto">
                                  {SKILL_LEVELS.map((lvl) => {
                                    const isSelected = currentVal === lvl;
                                    return (
                                      <button
                                        type="button"
                                        key={lvl}
                                        onClick={() => setSkillLevel(skill.key, lvl)}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                                          isSelected
                                            ? 'bg-[#4353cf] text-white shadow-sm'
                                            : 'bg-white border border-[#e1e3e4] text-[#454654] hover:border-[#c6c5d6]'
                                        }`}
                                      >
                                        {lvl}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Challenges */}
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-[#191c1e] mb-3">
                          Biggest Current Academic & Career Challenges <span className="text-[#ba1a1a]">*</span>
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {CHALLENGES.map((ch) => {
                            const isSelected = formData.challenges?.includes(ch);
                            return (
                              <div
                                key={ch}
                                onClick={() => toggleArrayItem('challenges', ch)}
                                className={`p-4 rounded-2xl border text-xs md:text-sm font-medium cursor-pointer transition-all flex items-center justify-between ${
                                  isSelected
                                    ? 'border-[#4353cf] bg-[#4353cf]/5 text-[#191c1e]'
                                    : 'border-[#e1e3e4] bg-[#f7f9fc] text-[#454654] hover:border-[#c6c5d6]'
                                }`}
                              >
                                <span>{ch}</span>
                                <span
                                  className={`material-symbols-outlined text-lg ${
                                    isSelected ? 'text-[#4353cf]' : 'text-[#c6c5d6]'
                                  }`}
                                >
                                  {isSelected ? 'check_box' : 'check_box_outline_blank'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* STEP 4: Learning Goals & Evaluation */}
                  {currentStep === 4 && (
                    <motion.div
                      key="step-4"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-8"
                    >
                      <div>
                        <h2 className="text-xl font-bold text-[#191c1e] font-['Hanken_Grotesk'] mb-1">
                          4. Learning Goals & Review
                        </h2>
                        <p className="text-xs md:text-sm text-[#454654]">
                          What do you primarily want to achieve through the ELEVATE Growth Journey model?
                        </p>
                      </div>

                      {/* Quick Goal Suggestions */}
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-[#191c1e] mb-2">
                          Quick Suggestions (Click to apply)
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {GOAL_SUGGESTIONS.map((sug) => (
                            <button
                              type="button"
                              key={sug}
                              onClick={() => setFormData((p) => ({ ...p, learning_goals: sug }))}
                              className="text-xs bg-[#f7f9fc] hover:bg-[#eef0f3] border border-[#e1e3e4] text-[#454654] px-3.5 py-2 rounded-xl transition-colors text-left"
                            >
                              + {sug}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Learning Goals Textarea */}
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-[#191c1e] mb-2">
                          Your Learning Goals & Expectations
                        </label>
                        <textarea
                          rows={4}
                          value={formData.learning_goals}
                          onChange={(e) => setFormData((p) => ({ ...p, learning_goals: e.target.value }))}
                          placeholder="e.g. I want to build a solid project synopsis, overcome stage hesitation, and gain hands-on technical problem-solving experience before placements..."
                          className="w-full p-4 bg-[#f7f9fc] border border-[#e1e3e4] rounded-2xl text-sm text-[#191c1e] focus:outline-none focus:border-[#4353cf]"
                        />
                      </div>

                      {/* Summary Review Card */}
                      <div className="bg-[#f7f9fc] p-6 rounded-2xl border border-[#e1e3e4] space-y-3">
                        <div className="text-xs font-bold uppercase tracking-wider text-[#757685]">
                          Evaluation Profile Summary
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                          <div>
                            <span className="text-[#757685] block">Standing:</span>
                            <span className="font-semibold text-[#191c1e]">
                              {formData.academic_year} — {formData.branch}
                            </span>
                          </div>
                          <div>
                            <span className="text-[#757685] block">Interests:</span>
                            <span className="font-semibold text-[#191c1e]">
                              {formData.career_interests?.join(', ') || 'None selected'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[#757685] block">Key Challenges:</span>
                            <span className="font-semibold text-[#191c1e]">
                              {formData.challenges?.join(', ') || 'None selected'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[#757685] block">Weekly Time:</span>
                            <span className="font-semibold text-[#191c1e]">{formData.weekly_hours}</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Form Navigation Controls */}
                <div className="mt-10 pt-6 border-t border-[#e1e3e4] flex items-center justify-between">
                  {currentStep > 1 ? (
                    <button
                      type="button"
                      onClick={prevStep}
                      className="px-6 py-2.5 rounded-xl border border-[#c6c5d6] text-[#454654] font-semibold text-xs md:text-sm hover:border-[#191c1e] transition-colors"
                    >
                      ← Back
                    </button>
                  ) : (
                    <div />
                  )}

                  {currentStep < totalSteps ? (
                    <button
                      type="button"
                      onClick={nextStep}
                      className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-[#4353cf] hover:bg-[#2435b4] text-white font-bold text-xs md:text-sm transition-colors shadow-sm"
                    >
                      Continue
                      <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={submitting}
                      className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-[#4353cf] hover:bg-[#2435b4] text-white font-bold text-xs md:text-sm transition-colors shadow-sm disabled:opacity-50"
                    >
                      {submitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Evaluating Rules...
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-sm">auto_awesome</span>
                          Generate Recommendations
                        </>
                      )}
                    </button>
                  )}
                </div>
              </form>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default LearningNeeds;
