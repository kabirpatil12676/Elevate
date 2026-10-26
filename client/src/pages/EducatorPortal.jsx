import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import educatorService from '../services/educator.service';

// ─── Stage Metas for the ELEVATE 6-Stage Experiential Model ─────────────────
const STAGE_CONFIGS = [
  {
    type: 'explore',
    label: '1. Explore',
    subtitle: 'Diagnostic & Discovery',
    icon: 'travel_explore',
    color: '#6366f1',
    bg: 'bg-indigo-50 border-indigo-200 text-indigo-700',
  },
  {
    type: 'learn',
    label: '2. Learn',
    subtitle: 'Knowledge Delivery & Video Capsules',
    icon: 'auto_stories',
    color: '#0ea5e9',
    bg: 'bg-sky-50 border-sky-200 text-sky-700',
  },
  {
    type: 'experience',
    label: '3. Experience',
    subtitle: 'Hands-On Challenge Simulation',
    icon: 'psychology',
    color: '#f59e0b',
    bg: 'bg-amber-50 border-amber-200 text-amber-700',
  },
  {
    type: 'validate',
    label: '4. Validate',
    subtitle: 'Peer & Educator Review',
    icon: 'fact_check',
    color: '#10b981',
    bg: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  },
  {
    type: 'apply',
    label: '5. Apply',
    subtitle: 'Real-World Implementation Project',
    icon: 'build_circle',
    color: '#f97316',
    bg: 'bg-orange-50 border-orange-200 text-orange-700',
  },
  {
    type: 'transform',
    label: '6. Transform',
    subtitle: 'Milestone Portfolio & Reflection',
    icon: 'workspace_premium',
    color: '#8b5cf6',
    bg: 'bg-purple-50 border-purple-200 text-purple-700',
  },
];

// YouTube URL parser
function extractYouTubeId(url) {
  if (!url) return null;
  const match = url.trim().match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

function isValidYouTube(url) {
  return !!extractYouTubeId(url);
}

// ───────────────────────────────────────────────────────────────────────────
// Main Educator Portal Component
// ───────────────────────────────────────────────────────────────────────────
const EducatorPortal = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  // Navigation / View State: 'list' | 'studio'
  const [view, setView] = useState('list');
  const [selectedJourneyId, setSelectedJourneyId] = useState(null);

  // List View State
  const [journeys, setJourneys] = useState([]);
  const [loadingJourneys, setLoadingJourneys] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'draft' | 'published'
  const [feedbackMsg, setFeedbackMsg] = useState({ type: '', text: '' });

  // Create Journey Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    category: 'Engineering Fundamentals',
    skill_domain: 'Core Engineering',
    difficulty: 'Beginner',
    duration_hours: 3.0,
    badge: 'NEW GROWTH TRACK',
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');

  // Studio / Detail View State
  const [currentJourney, setCurrentJourney] = useState(null);
  const [stages, setStages] = useState([]);
  const [loadingStudio, setLoadingStudio] = useState(false);
  const [activeStageIndex, setActiveStageIndex] = useState(0);

  // Lesson Modal State (Add or Edit)
  const [lessonModal, setLessonModal] = useState({
    open: false,
    mode: 'add', // 'add' | 'edit'
    stageId: null,
    lessonId: null,
    title: '',
    description: '',
    content_url: '',
    duration_min: 15,
  });
  const [lessonSaving, setLessonSaving] = useState(false);
  const [lessonError, setLessonError] = useState('');

  // Stage Edit State
  const [editingStageDesc, setEditingStageDesc] = useState({});
  const [stageSaving, setStageSaving] = useState(false);

  // Journey Metadata Edit State (in Studio)
  const [metadataForm, setMetadataForm] = useState({});
  const [metadataSaving, setMetadataSaving] = useState(false);

  // Preview Modal State
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // ── Load Journeys List ───────────────────────────────────────────────────
  const fetchJourneys = useCallback(async () => {
    setLoadingJourneys(true);
    try {
      const data = await educatorService.getMyJourneys();
      setJourneys(data);
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to load journeys' });
    } finally {
      setLoadingJourneys(false);
    }
  }, []);

  useEffect(() => {
    if (view === 'list') {
      fetchJourneys();
    }
  }, [view, fetchJourneys]);

  // ── Load Studio Details ──────────────────────────────────────────────────
  const fetchStudioData = useCallback(async (journeyId) => {
    setLoadingStudio(true);
    try {
      const data = await educatorService.getManageJourney(journeyId);
      setCurrentJourney(data.journey);
      setStages(data.stages || []);
      setMetadataForm({
        title: data.journey.title || '',
        description: data.journey.description || '',
        category: data.journey.category || 'Engineering Fundamentals',
        skill_domain: data.journey.skill_domain || 'General',
        difficulty: data.journey.difficulty || 'Beginner',
        duration_hours: data.journey.duration_hours || 2.0,
        badge: data.journey.badge || '',
      });
      // Initialize editable stage descriptions
      const descMap = {};
      data.stages?.forEach((s) => {
        descMap[s.id] = s.description || '';
      });
      setEditingStageDesc(descMap);
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to load journey details' });
      setView('list');
    } finally {
      setLoadingStudio(false);
    }
  }, []);

  useEffect(() => {
    if (view === 'studio' && selectedJourneyId) {
      fetchStudioData(selectedJourneyId);
    }
  }, [view, selectedJourneyId, fetchStudioData]);

  // ── Create Journey ───────────────────────────────────────────────────────
  const handleCreateJourney = async (e) => {
    e.preventDefault();
    setCreateError('');
    if (!createForm.title.trim()) {
      setCreateError('Please enter a journey title');
      return;
    }
    setCreateLoading(true);
    try {
      const res = await educatorService.createDraftJourney(createForm);
      setShowCreateModal(false);
      setCreateForm({
        title: '',
        description: '',
        category: 'Engineering Fundamentals',
        skill_domain: 'Core Engineering',
        difficulty: 'Beginner',
        duration_hours: 3.0,
        badge: 'NEW GROWTH TRACK',
      });
      setFeedbackMsg({ type: 'success', text: 'Growth Journey draft created with 6 stages!' });
      // Transition directly to Studio for the newly created journey
      setSelectedJourneyId(res.journey.id);
      setView('studio');
    } catch (err) {
      setCreateError(err.message || 'Failed to create journey draft');
    } finally {
      setCreateLoading(false);
    }
  };

  // ── Save Journey Metadata ────────────────────────────────────────────────
  const handleSaveMetadata = async () => {
    setMetadataSaving(true);
    try {
      const res = await educatorService.updateJourneyMetadata(currentJourney.id, metadataForm);
      setCurrentJourney(res.journey);
      setFeedbackMsg({ type: 'success', text: 'Journey details saved successfully!' });
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to update journey details' });
    } finally {
      setMetadataSaving(false);
    }
  };

  // ── Save Stage Description ───────────────────────────────────────────────
  const handleSaveStage = async (stageId) => {
    setStageSaving(true);
    try {
      const newDesc = editingStageDesc[stageId];
      await educatorService.updateStage(stageId, { description: newDesc });
      setStages((prev) =>
        prev.map((s) => (s.id === stageId ? { ...s, description: newDesc } : s))
      );
      setFeedbackMsg({ type: 'success', text: 'Stage description updated!' });
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to save stage' });
    } finally {
      setStageSaving(false);
    }
  };

  // ── Save Lesson (Add or Edit) ────────────────────────────────────────────
  const handleSaveLesson = async (e) => {
    e.preventDefault();
    setLessonError('');

    if (!lessonModal.title.trim()) {
      setLessonError('Please enter a lesson title');
      return;
    }
    if (!isValidYouTube(lessonModal.content_url)) {
      setLessonError('Please provide a valid YouTube video URL (e.g. https://www.youtube.com/watch?v=...)');
      return;
    }

    setLessonSaving(true);
    try {
      if (lessonModal.mode === 'add') {
        const res = await educatorService.addLesson(lessonModal.stageId, {
          title: lessonModal.title.trim(),
          description: lessonModal.description.trim(),
          content_url: lessonModal.content_url.trim(),
          duration_min: parseInt(lessonModal.duration_min, 10) || 10,
        });

        // Add to local state
        setStages((prev) =>
          prev.map((s) =>
            s.id === lessonModal.stageId
              ? { ...s, lessons: [...(s.lessons || []), res.lesson] }
              : s
          )
        );
        setFeedbackMsg({ type: 'success', text: 'Video lesson added to stage!' });
      } else {
        const res = await educatorService.updateLesson(lessonModal.lessonId, {
          title: lessonModal.title.trim(),
          description: lessonModal.description.trim(),
          content_url: lessonModal.content_url.trim(),
          duration_min: parseInt(lessonModal.duration_min, 10) || 10,
        });

        // Update in local state
        setStages((prev) =>
          prev.map((s) => ({
            ...s,
            lessons: (s.lessons || []).map((l) =>
              l.id === lessonModal.lessonId ? res.lesson : l
            ),
          }))
        );
        setFeedbackMsg({ type: 'success', text: 'Lesson updated successfully!' });
      }

      setLessonModal({ ...lessonModal, open: false });
    } catch (err) {
      setLessonError(err.message || 'Failed to save lesson');
    } finally {
      setLessonSaving(false);
    }
  };

  // ── Delete Lesson ────────────────────────────────────────────────────────
  const handleDeleteLesson = async (stageId, lessonId) => {
    if (!window.confirm('Are you sure you want to delete this lesson?')) return;
    try {
      await educatorService.deleteLesson(lessonId);
      setStages((prev) =>
        prev.map((s) =>
          s.id === stageId
            ? { ...s, lessons: (s.lessons || []).filter((l) => l.id !== lessonId) }
            : s
        )
      );
      setFeedbackMsg({ type: 'success', text: 'Lesson deleted successfully.' });
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to delete lesson' });
    }
  };

  // ── Delete Journey Draft ─────────────────────────────────────────────────
  const handleDeleteJourney = async (id, title) => {
    if (!window.confirm(`Are you sure you want to delete draft journey "${title}"? This cannot be undone.`)) return;
    try {
      await educatorService.deleteDraftJourney(id);
      setJourneys((prev) => prev.filter((j) => j.id !== id));
      setFeedbackMsg({ type: 'success', text: `Journey "${title}" deleted.` });
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to delete journey' });
    }
  };

  // ── Publish / Unpublish (Admin Action) ────────────────────────────────────
  const handleTogglePublish = async (id, currentStatus) => {
    const nextStatus = currentStatus === 'published' ? 'draft' : 'published';
    const actionLabel = nextStatus === 'published' ? 'publish to catalogue' : 'unpublish back to draft';

    if (!window.confirm(`Are you sure you want to ${actionLabel}?`)) return;

    try {
      const res = await educatorService.publishJourney(id, nextStatus);
      if (currentJourney && currentJourney.id === id) {
        setCurrentJourney(res.journey);
      }
      setJourneys((prev) => prev.map((j) => (j.id === id ? res.journey : j)));
      setFeedbackMsg({
        type: 'success',
        text: `Journey successfully ${nextStatus === 'published' ? 'published to catalogue' : 'moved to drafts'}.`,
      });
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to update publication status' });
    }
  };

  // Filter journeys for list view
  const filteredJourneys = journeys.filter((j) => {
    if (statusFilter === 'all') return true;
    return j.status === statusFilter;
  });

  return (
    <div className="bg-[#f7f9fc] text-[#191c1e] min-h-screen flex flex-col font-['Inter'] antialiased">
      <Navbar />

      <main className="flex-grow pt-24 pb-20">
        <div className="max-w-[1340px] mx-auto px-6 md:px-10">

          {/* Alert Toast Notification */}
          <AnimatePresence>
            {feedbackMsg.text && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`mb-6 p-4 rounded-2xl flex items-center justify-between text-sm shadow-sm border ${
                  feedbackMsg.type === 'error'
                    ? 'bg-[#ffdad6] text-[#93000a] border-[#ba1a1a]/20'
                    : 'bg-emerald-50 text-emerald-900 border-emerald-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-lg">
                    {feedbackMsg.type === 'error' ? 'error' : 'check_circle'}
                  </span>
                  <span className="font-medium">{feedbackMsg.text}</span>
                </div>
                <button
                  onClick={() => setFeedbackMsg({ type: '', text: '' })}
                  className="text-current hover:opacity-70 p-1"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* VIEW 1: JOURNEYS MANAGEMENT LIST                                */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {view === 'list' && (
            <div>
              {/* Header Banner */}
              <div className="bg-white rounded-3xl p-8 md:p-10 border border-[#e1e3e4] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs uppercase font-extrabold tracking-wider px-3 py-1 bg-[#4353cf]/10 text-[#4353cf] rounded-full inline-block">
                      Educator Studio
                    </span>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {isAdmin ? 'Administrator Access' : 'Faculty Authoring'}
                    </span>
                  </div>
                  <h1 className="text-3xl md:text-4xl font-bold font-['Hanken_Grotesk'] text-[#191c1e] tracking-tight">
                    Growth Journey Builder
                  </h1>
                  <p className="text-sm text-[#454654] mt-1.5 max-w-2xl">
                    Design experiential learning journeys mapped across the 6 ELEVATE stages: Explore, Learn, Experience, Validate, Apply, and Transform.
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 bg-[#24389c] hover:bg-[#1a2b7a] text-white px-5 py-3 rounded-2xl text-sm font-semibold shadow-sm transition-all transform active:scale-95"
                  >
                    <span className="material-symbols-outlined text-lg">add_circle</span>
                    Create Growth Journey
                  </button>
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-[#e1e3e4] shadow-sm">
                  {[
                    { key: 'all', label: 'All Journeys', count: journeys.length },
                    { key: 'draft', label: 'Drafts', count: journeys.filter((j) => j.status === 'draft').length },
                    { key: 'published', label: 'Published', count: journeys.filter((j) => j.status === 'published').length },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setStatusFilter(tab.key)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                        statusFilter === tab.key
                          ? 'bg-[#24389c] text-white shadow-sm'
                          : 'text-[#454654] hover:bg-slate-100'
                      }`}
                    >
                      {tab.label}
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                          statusFilter === tab.key ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {tab.count}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Journey Cards Grid */}
              {loadingJourneys ? (
                <div className="py-20 text-center">
                  <div className="inline-block w-8 h-8 border-4 border-[#24389c] border-t-transparent rounded-full animate-spin mb-3"></div>
                  <p className="text-sm text-[#757685]">Loading journeys studio...</p>
                </div>
              ) : filteredJourneys.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 border border-[#e1e3e4] text-center shadow-sm">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mx-auto mb-4">
                    <span className="material-symbols-outlined text-3xl">auto_stories</span>
                  </div>
                  <h3 className="text-lg font-bold text-[#191c1e] mb-1">No Growth Journeys Found</h3>
                  <p className="text-sm text-[#757685] max-w-md mx-auto mb-6">
                    {statusFilter === 'draft'
                      ? 'You have no draft journeys in progress. Start by creating a new journey.'
                      : statusFilter === 'published'
                      ? 'No published journeys found under this view.'
                      : 'Create your first 6-stage experiential journey to begin authoring content.'}
                  </p>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="inline-flex items-center gap-2 bg-[#24389c] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#1a2b7a] transition-all"
                  >
                    <span className="material-symbols-outlined text-base">add</span>
                    Create Growth Journey
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredJourneys.map((journey) => (
                    <motion.div
                      key={journey.id}
                      layout
                      className="bg-white rounded-3xl border border-[#e1e3e4] p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                    >
                      <div>
                        {/* Status Badge & Actions */}
                        <div className="flex items-center justify-between mb-3">
                          <span
                            className={`text-[11px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full border ${
                              journey.status === 'published'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}
                          >
                            {journey.status === 'published' ? '● Published' : '○ Draft'}
                          </span>

                          <span className="text-xs font-semibold text-slate-500">
                            {journey.category || 'General'}
                          </span>
                        </div>

                        {/* Title & Description */}
                        <h3 className="text-lg font-bold text-[#191c1e] font-['Hanken_Grotesk'] mb-2 line-clamp-2">
                          {journey.title}
                        </h3>
                        <p className="text-xs text-[#454654] line-clamp-3 mb-4 leading-relaxed">
                          {journey.description || 'No description provided yet.'}
                        </p>

                        {/* 6 Stages Indicator */}
                        <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200/60 mb-4">
                          <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 mb-1.5">
                            <span className="flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-sm text-[#24389c]">route</span>
                              6 Growth Stages
                            </span>
                            <span className="text-indigo-700 font-extrabold">Active</span>
                          </div>
                          <div className="grid grid-cols-6 gap-1">
                            {STAGE_CONFIGS.map((stg, idx) => (
                              <div
                                key={idx}
                                title={stg.label}
                                className="h-1.5 rounded-full"
                                style={{ backgroundColor: stg.color }}
                              ></div>
                            ))}
                          </div>
                        </div>

                        {/* Key Metrics */}
                        <div className="flex items-center gap-4 text-xs text-[#757685] mb-4 border-t border-slate-100 pt-3">
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">schedule</span>
                            {journey.duration_hours || 0} hrs
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">play_lesson</span>
                            {journey.lesson_count || 0} lessons
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">signal_cellular_alt</span>
                            {journey.difficulty || 'Beginner'}
                          </span>
                        </div>
                      </div>

                      {/* Card Action Buttons */}
                      <div className="space-y-2 pt-2 border-t border-[#e1e3e4]">
                        <button
                          onClick={() => {
                            setSelectedJourneyId(journey.id);
                            setView('studio');
                          }}
                          className="w-full flex items-center justify-center gap-2 bg-[#24389c] hover:bg-[#1a2b7a] text-white py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm"
                        >
                          <span className="material-symbols-outlined text-base">edit_document</span>
                          Open Stage & Lesson Studio
                        </button>

                        <div className="flex items-center gap-2">
                          {/* Admin Publish Toggle */}
                          {isAdmin && (
                            <button
                              onClick={() => handleTogglePublish(journey.id, journey.status)}
                              className={`flex-1 py-2 px-3 rounded-xl text-[11px] font-bold border transition-colors flex items-center justify-center gap-1.5 ${
                                journey.status === 'published'
                                  ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                                  : 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                              }`}
                            >
                              <span className="material-symbols-outlined text-sm">
                                {journey.status === 'published' ? 'unpublished' : 'publish'}
                              </span>
                              {journey.status === 'published' ? 'Unpublish' : 'Publish to Live'}
                            </button>
                          )}

                          {/* Delete Draft Button */}
                          {journey.status === 'draft' && (
                            <button
                              onClick={() => handleDeleteJourney(journey.id, journey.title)}
                              className="py-2 px-3 rounded-xl text-[11px] font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors"
                              title="Delete draft"
                            >
                              <span className="material-symbols-outlined text-sm">delete</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* VIEW 2: GROWTH JOURNEY STUDIO (STAGES & LESSONS BUILDER)        */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {view === 'studio' && (
            <div>
              {/* Studio Top Navigation Bar */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <button
                  onClick={() => setView('list')}
                  className="inline-flex items-center gap-2 text-sm font-bold text-[#454654] hover:text-[#24389c] transition-colors bg-white px-4 py-2 rounded-xl border border-[#e1e3e4] shadow-sm w-fit"
                >
                  <span className="material-symbols-outlined text-base">arrow_back</span>
                  Back to Journey Studio
                </button>

                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-full border ${
                      currentJourney?.status === 'published'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}
                  >
                    {currentJourney?.status === 'published' ? '● Published Track' : '○ Draft Journey'}
                  </span>

                  <button
                    onClick={() => setShowPreviewModal(true)}
                    className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm"
                  >
                    <span className="material-symbols-outlined text-base text-[#24389c]">visibility</span>
                    Preview as Learner
                  </button>

                  {isAdmin && currentJourney && (
                    <button
                      onClick={() => handleTogglePublish(currentJourney.id, currentJourney.status)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                        currentJourney.status === 'published'
                          ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                          : 'bg-emerald-600 text-white hover:bg-emerald-700 border-transparent shadow-sm'
                      }`}
                    >
                      <span className="material-symbols-outlined text-base">
                        {currentJourney.status === 'published' ? 'unpublished' : 'publish'}
                      </span>
                      {currentJourney.status === 'published' ? 'Unpublish Draft' : 'Publish Journey'}
                    </button>
                  )}
                </div>
              </div>

              {loadingStudio ? (
                <div className="py-24 text-center">
                  <div className="inline-block w-8 h-8 border-4 border-[#24389c] border-t-transparent rounded-full animate-spin mb-3"></div>
                  <p className="text-sm text-[#757685]">Loading journey builder studio...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* Left Column (4 cols): Journey Metadata Card */}
                  <div className="lg:col-span-4 space-y-6">
                    <div className="bg-white rounded-3xl p-6 border border-[#e1e3e4] shadow-sm">
                      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                        <h2 className="text-base font-bold text-[#191c1e] font-['Hanken_Grotesk']">
                          Journey Metadata
                        </h2>
                        <button
                          onClick={handleSaveMetadata}
                          disabled={metadataSaving}
                          className="flex items-center gap-1.5 bg-[#24389c] hover:bg-[#1a2b7a] text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                        >
                          <span className="material-symbols-outlined text-sm">save</span>
                          {metadataSaving ? 'Saving...' : 'Save Info'}
                        </button>
                      </div>

                      <div className="space-y-4 text-xs">
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Course Title</label>
                          <input
                            type="text"
                            value={metadataForm.title || ''}
                            onChange={(e) => setMetadataForm({ ...metadataForm, title: e.target.value })}
                            className="w-full bg-[#f8f9fa] border border-[#c6c5d6] rounded-xl py-2 px-3 text-slate-900 focus:outline-none focus:border-[#24389c] focus:bg-white"
                          />
                        </div>

                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Description</label>
                          <textarea
                            rows={3}
                            value={metadataForm.description || ''}
                            onChange={(e) => setMetadataForm({ ...metadataForm, description: e.target.value })}
                            className="w-full bg-[#f8f9fa] border border-[#c6c5d6] rounded-xl py-2 px-3 text-slate-900 focus:outline-none focus:border-[#24389c] focus:bg-white resize-none"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block font-bold text-slate-700 mb-1">Category</label>
                            <input
                              type="text"
                              value={metadataForm.category || ''}
                              onChange={(e) => setMetadataForm({ ...metadataForm, category: e.target.value })}
                              className="w-full bg-[#f8f9fa] border border-[#c6c5d6] rounded-xl py-2 px-3 text-slate-900 focus:outline-none focus:border-[#24389c] focus:bg-white"
                            />
                          </div>

                          <div>
                            <label className="block font-bold text-slate-700 mb-1">Skill Domain</label>
                            <input
                              type="text"
                              value={metadataForm.skill_domain || ''}
                              onChange={(e) => setMetadataForm({ ...metadataForm, skill_domain: e.target.value })}
                              className="w-full bg-[#f8f9fa] border border-[#c6c5d6] rounded-xl py-2 px-3 text-slate-900 focus:outline-none focus:border-[#24389c] focus:bg-white"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block font-bold text-slate-700 mb-1">Difficulty</label>
                            <select
                              value={metadataForm.difficulty || 'Beginner'}
                              onChange={(e) => setMetadataForm({ ...metadataForm, difficulty: e.target.value })}
                              className="w-full bg-[#f8f9fa] border border-[#c6c5d6] rounded-xl py-2 px-3 text-slate-900 focus:outline-none focus:border-[#24389c] focus:bg-white"
                            >
                              <option value="Beginner">Beginner</option>
                              <option value="Intermediate">Intermediate</option>
                              <option value="Advanced">Advanced</option>
                            </select>
                          </div>

                          <div>
                            <label className="block font-bold text-slate-700 mb-1">Duration (Hours)</label>
                            <input
                              type="number"
                              step="0.1"
                              value={metadataForm.duration_hours || 2.0}
                              onChange={(e) => setMetadataForm({ ...metadataForm, duration_hours: e.target.value })}
                              className="w-full bg-[#f8f9fa] border border-[#c6c5d6] rounded-xl py-2 px-3 text-slate-900 focus:outline-none focus:border-[#24389c] focus:bg-white"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Catalogue Badge</label>
                          <input
                            type="text"
                            placeholder="e.g. NEW TRACK, POPULAR COURSE"
                            value={metadataForm.badge || ''}
                            onChange={(e) => setMetadataForm({ ...metadataForm, badge: e.target.value })}
                            className="w-full bg-[#f8f9fa] border border-[#c6c5d6] rounded-xl py-2 px-3 text-slate-900 focus:outline-none focus:border-[#24389c] focus:bg-white"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Six Stages Navigation Tabs */}
                    <div className="bg-white rounded-3xl p-6 border border-[#e1e3e4] shadow-sm">
                      <h3 className="text-sm font-bold text-[#191c1e] mb-3 pb-2 border-b border-slate-100 flex items-center justify-between">
                        <span>Six-Stage Architecture</span>
                        <span className="text-[10px] text-slate-500 font-normal">Click to navigate</span>
                      </h3>
                      <div className="space-y-2">
                        {stages.map((stage, idx) => {
                          const config = STAGE_CONFIGS.find((c) => c.type === stage.stage_type) || STAGE_CONFIGS[idx];
                          const isCurrent = activeStageIndex === idx;
                          const lessonCount = stage.lessons?.length || 0;

                          return (
                            <button
                              key={stage.id}
                              onClick={() => setActiveStageIndex(idx)}
                              className={`w-full text-left p-3 rounded-2xl border transition-all flex items-center justify-between ${
                                isCurrent
                                  ? 'bg-[#24389c] text-white border-transparent shadow-sm'
                                  : 'bg-[#f8f9fa] text-slate-700 border-slate-200/80 hover:bg-slate-100'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <span
                                  className={`material-symbols-outlined text-lg ${
                                    isCurrent ? 'text-white' : 'text-slate-500'
                                  }`}
                                >
                                  {config?.icon || 'circle'}
                                </span>
                                <div>
                                  <p className="text-xs font-bold leading-tight">{config?.label}</p>
                                  <p className={`text-[10px] ${isCurrent ? 'text-white/80' : 'text-slate-400'}`}>
                                    {config?.subtitle}
                                  </p>
                                </div>
                              </div>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  isCurrent ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                                }`}
                              >
                                {lessonCount} {lessonCount === 1 ? 'lesson' : 'lessons'}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Right Column (8 cols): Active Stage Content & Lesson Builder */}
                  <div className="lg:col-span-8 space-y-6">
                    {stages[activeStageIndex] && (() => {
                      const currentStage = stages[activeStageIndex];
                      const config = STAGE_CONFIGS.find((c) => c.type === currentStage.stage_type) || STAGE_CONFIGS[activeStageIndex];

                      return (
                        <div className="bg-white rounded-3xl p-8 border border-[#e1e3e4] shadow-sm">
                          {/* Stage Header */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 mb-6">
                            <div className="flex items-center gap-3">
                              <div
                                className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-sm shrink-0"
                                style={{ backgroundColor: config.color }}
                              >
                                <span className="material-symbols-outlined text-2xl">{config.icon}</span>
                              </div>
                              <div>
                                <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#24389c]">
                                  Stage {activeStageIndex + 1} of 6
                                </span>
                                <h2 className="text-2xl font-bold font-['Hanken_Grotesk'] text-[#191c1e]">
                                  {currentStage.title}
                                </h2>
                                <p className="text-xs text-slate-500 mt-0.5">{config.subtitle}</p>
                              </div>
                            </div>

                            <button
                              onClick={() =>
                                setLessonModal({
                                  open: true,
                                  mode: 'add',
                                  stageId: currentStage.id,
                                  lessonId: null,
                                  title: '',
                                  description: '',
                                  content_url: '',
                                  duration_min: 15,
                                })
                              }
                              className="flex items-center gap-2 bg-[#4353cf] hover:bg-[#2435b4] text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm shrink-0"
                            >
                              <span className="material-symbols-outlined text-base">add_video</span>
                              Add Video Lesson
                            </button>
                          </div>

                          {/* Editable Stage Description */}
                          <div className="mb-8 bg-slate-50 p-5 rounded-2xl border border-slate-200/70">
                            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                              <span>Stage Learning Objective & Description</span>
                              <button
                                onClick={() => handleSaveStage(currentStage.id)}
                                disabled={stageSaving}
                                className="text-[11px] font-bold text-[#24389c] hover:underline"
                              >
                                {stageSaving ? 'Saving...' : 'Save Description'}
                              </button>
                            </label>
                            <textarea
                              rows={2}
                              value={editingStageDesc[currentStage.id] || ''}
                              onChange={(e) =>
                                setEditingStageDesc({
                                  ...editingStageDesc,
                                  [currentStage.id]: e.target.value,
                                })
                              }
                              placeholder="Describe the objective and expected experiential outcome for this stage..."
                              className="w-full bg-white border border-[#c6c5d6] rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-[#24389c] resize-none"
                            />
                          </div>

                          {/* Video Lessons (Capsules) List */}
                          <div>
                            <div className="flex items-center justify-between mb-4">
                              <h3 className="text-sm font-bold text-[#191c1e] flex items-center gap-2">
                                <span className="material-symbols-outlined text-base text-[#24389c]">movie</span>
                                Video Lessons ({currentStage.lessons?.length || 0})
                              </h3>
                              <span className="text-[11px] text-slate-400">
                                Learners watch these video capsules sequentially
                              </span>
                            </div>

                            {(!currentStage.lessons || currentStage.lessons.length === 0) ? (
                              <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center text-slate-400">
                                <span className="material-symbols-outlined text-3xl mb-1 text-slate-300">smart_display</span>
                                <p className="text-xs font-medium text-slate-600 mb-1">No lessons added to this stage yet</p>
                                <p className="text-[11px] text-slate-400 mb-4 max-w-sm mx-auto">
                                  Add curated YouTube video capsules to guide students through this stage challenge.
                                </p>
                                <button
                                  onClick={() =>
                                    setLessonModal({
                                      open: true,
                                      mode: 'add',
                                      stageId: currentStage.id,
                                      lessonId: null,
                                      title: '',
                                      description: '',
                                      content_url: '',
                                      duration_min: 15,
                                    })
                                  }
                                  className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors"
                                >
                                  <span className="material-symbols-outlined text-sm">add</span>
                                  Add First Lesson
                                </button>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {currentStage.lessons.map((lesson, lIdx) => {
                                  const ytId = extractYouTubeId(lesson.content_url);
                                  return (
                                    <div
                                      key={lesson.id}
                                      className="p-4 rounded-2xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                                    >
                                      <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-600 shrink-0 mt-0.5">
                                          {lIdx + 1}
                                        </div>
                                        <div>
                                          <h4 className="text-sm font-bold text-[#191c1e] group-hover:text-[#24389c] transition-colors">
                                            {lesson.title}
                                          </h4>
                                          {lesson.description && (
                                            <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                                              {lesson.description}
                                            </p>
                                          )}
                                          <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-400">
                                            <span className="flex items-center gap-1">
                                              <span className="material-symbols-outlined text-xs">schedule</span>
                                              {lesson.duration_min || 10} min
                                            </span>
                                            {ytId && (
                                              <a
                                                href={lesson.content_url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="flex items-center gap-1 text-red-600 hover:underline font-semibold"
                                              >
                                                <span className="material-symbols-outlined text-xs">play_circle</span>
                                                YouTube (ID: {ytId})
                                              </a>
                                            )}
                                          </div>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                                        <button
                                          onClick={() =>
                                            setLessonModal({
                                              open: true,
                                              mode: 'edit',
                                              stageId: currentStage.id,
                                              lessonId: lesson.id,
                                              title: lesson.title,
                                              description: lesson.description || '',
                                              content_url: lesson.content_url || '',
                                              duration_min: lesson.duration_min || 15,
                                            })
                                          }
                                          className="p-2 text-slate-500 hover:text-[#24389c] hover:bg-slate-100 rounded-lg transition-colors"
                                          title="Edit lesson"
                                        >
                                          <span className="material-symbols-outlined text-base">edit</span>
                                        </button>

                                        <button
                                          onClick={() => handleDeleteLesson(currentStage.id, lesson.id)}
                                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                          title="Delete lesson"
                                        >
                                          <span className="material-symbols-outlined text-base">delete</span>
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* MODAL 1: CREATE NEW GROWTH JOURNEY DRAFT                         */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          <AnimatePresence>
            {showCreateModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  className="bg-white rounded-3xl max-w-xl w-full p-8 border border-[#e1e3e4] shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
                >
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#24389c]">
                        Growth Journey Studio
                      </span>
                      <h3 className="text-xl font-bold font-['Hanken_Grotesk'] text-[#191c1e]">
                        Create New Growth Journey
                      </h3>
                    </div>
                    <button
                      onClick={() => setShowCreateModal(false)}
                      className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                    >
                      <span className="material-symbols-outlined">close</span>
                    </button>
                  </div>

                  {createError && (
                    <div className="mb-4 p-3 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 text-xs font-medium">
                      {createError}
                    </div>
                  )}

                  <form onSubmit={handleCreateJourney} className="space-y-4 text-xs">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Course / Journey Title <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Modern Full-Stack Architecture & Microservices"
                        value={createForm.title}
                        onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                        className="w-full bg-[#f8f9fa] border border-[#c6c5d6] rounded-xl py-2.5 px-3.5 text-slate-900 focus:outline-none focus:border-[#24389c] focus:bg-white text-sm"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Overview Description</label>
                      <textarea
                        rows={3}
                        placeholder="Explain the experiential growth outcome students will achieve through this journey..."
                        value={createForm.description}
                        onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                        className="w-full bg-[#f8f9fa] border border-[#c6c5d6] rounded-xl p-3 text-slate-900 focus:outline-none focus:border-[#24389c] focus:bg-white resize-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Category</label>
                        <select
                          value={createForm.category}
                          onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}
                          className="w-full bg-[#f8f9fa] border border-[#c6c5d6] rounded-xl py-2 px-3 text-slate-900 focus:outline-none focus:border-[#24389c]"
                        >
                          <option value="Engineering Fundamentals">Engineering Fundamentals</option>
                          <option value="Career Growth">Career Growth</option>
                          <option value="Communication">Communication</option>
                          <option value="Teamwork">Teamwork</option>
                          <option value="Problem Solving">Problem Solving</option>
                          <option value="Technical Writing">Technical Writing</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Skill Domain</label>
                        <input
                          type="text"
                          value={createForm.skill_domain}
                          onChange={(e) => setCreateForm({ ...createForm, skill_domain: e.target.value })}
                          className="w-full bg-[#f8f9fa] border border-[#c6c5d6] rounded-xl py-2 px-3 text-slate-900 focus:outline-none focus:border-[#24389c]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Difficulty</label>
                        <select
                          value={createForm.difficulty}
                          onChange={(e) => setCreateForm({ ...createForm, difficulty: e.target.value })}
                          className="w-full bg-[#f8f9fa] border border-[#c6c5d6] rounded-xl py-2 px-3 text-slate-900 focus:outline-none focus:border-[#24389c]"
                        >
                          <option value="Beginner">Beginner</option>
                          <option value="Intermediate">Intermediate</option>
                          <option value="Advanced">Advanced</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Duration (Hours)</label>
                        <input
                          type="number"
                          step="0.5"
                          min="0.5"
                          value={createForm.duration_hours}
                          onChange={(e) => setCreateForm({ ...createForm, duration_hours: e.target.value })}
                          className="w-full bg-[#f8f9fa] border border-[#c6c5d6] rounded-xl py-2 px-3 text-slate-900 focus:outline-none focus:border-[#24389c]"
                        />
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 text-[11px] leading-relaxed">
                      💡 <strong>ELEVATE 6-Stage Guarantee</strong>: This will automatically generate all 6 ordered stages (Explore, Learn, Experience, Validate, Apply, Transform) as a draft.
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setShowCreateModal(false)}
                        className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={createLoading}
                        className="bg-[#24389c] hover:bg-[#1a2b7a] text-white px-5 py-2.5 rounded-xl font-bold transition-all disabled:opacity-50"
                      >
                        {createLoading ? 'Generating Stages...' : 'Create Draft Journey'}
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* MODAL 2: ADD / EDIT VIDEO LESSON (CAPSULE)                      */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          <AnimatePresence>
            {lessonModal.open && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  className="bg-white rounded-3xl max-w-lg w-full p-8 border border-[#e1e3e4] shadow-2xl overflow-hidden"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-5">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#4353cf]">
                        Stage Video Capsule
                      </span>
                      <h3 className="text-xl font-bold font-['Hanken_Grotesk'] text-[#191c1e]">
                        {lessonModal.mode === 'add' ? 'Add Video Lesson' : 'Edit Video Lesson'}
                      </h3>
                    </div>
                    <button
                      onClick={() => setLessonModal({ ...lessonModal, open: false })}
                      className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                    >
                      <span className="material-symbols-outlined">close</span>
                    </button>
                  </div>

                  {lessonError && (
                    <div className="mb-4 p-3 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 text-xs font-medium">
                      {lessonError}
                    </div>
                  )}

                  <form onSubmit={handleSaveLesson} className="space-y-4 text-xs">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Lesson Title <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Concept Architecture & Core Mechanics"
                        value={lessonModal.title}
                        onChange={(e) => setLessonModal({ ...lessonModal, title: e.target.value })}
                        className="w-full bg-[#f8f9fa] border border-[#c6c5d6] rounded-xl py-2 px-3 text-slate-900 focus:outline-none focus:border-[#24389c] text-sm"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        YouTube Video URL <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="url"
                          required
                          placeholder="https://www.youtube.com/watch?v=..."
                          value={lessonModal.content_url}
                          onChange={(e) => setLessonModal({ ...lessonModal, content_url: e.target.value })}
                          className={`w-full bg-[#f8f9fa] border rounded-xl py-2 px-3 pr-8 text-slate-900 focus:outline-none text-xs ${
                            isValidYouTube(lessonModal.content_url)
                              ? 'border-emerald-500 focus:border-emerald-600'
                              : 'border-[#c6c5d6] focus:border-[#24389c]'
                          }`}
                        />
                        {isValidYouTube(lessonModal.content_url) && (
                          <span className="material-symbols-outlined text-emerald-600 text-sm absolute right-2.5 top-2.5">
                            check_circle
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Supports standard watch URLs, embed links, or youtu.be shortlinks.
                      </p>
                    </div>

                    {/* YouTube Preview Embed if URL is valid */}
                    {isValidYouTube(lessonModal.content_url) && (() => {
                      const ytId = extractYouTubeId(lessonModal.content_url);
                      return (
                        <div className="rounded-xl overflow-hidden border border-slate-200 aspect-video bg-black">
                          <iframe
                            title="Video Preview"
                            src={`https://www.youtube.com/embed/${ytId}`}
                            className="w-full h-full border-0"
                            allowFullScreen
                          />
                        </div>
                      );
                    })()}

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Estimated Duration (min)</label>
                        <input
                          type="number"
                          min="1"
                          max="300"
                          value={lessonModal.duration_min}
                          onChange={(e) => setLessonModal({ ...lessonModal, duration_min: e.target.value })}
                          className="w-full bg-[#f8f9fa] border border-[#c6c5d6] rounded-xl py-2 px-3 text-slate-900 focus:outline-none focus:border-[#24389c]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Description / Key Learnings</label>
                      <textarea
                        rows={2}
                        placeholder="What should the learner pay attention to while watching?"
                        value={lessonModal.description}
                        onChange={(e) => setLessonModal({ ...lessonModal, description: e.target.value })}
                        className="w-full bg-[#f8f9fa] border border-[#c6c5d6] rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-[#24389c] resize-none"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setLessonModal({ ...lessonModal, open: false })}
                        className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={lessonSaving}
                        className="bg-[#24389c] hover:bg-[#1a2b7a] text-white px-5 py-2 rounded-xl font-bold transition-all disabled:opacity-50"
                      >
                        {lessonSaving ? 'Saving...' : lessonModal.mode === 'add' ? 'Add Lesson' : 'Save Changes'}
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* MODAL 3: LEARNER VIEW PREVIEW MODAL                             */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          <AnimatePresence>
            {showPreviewModal && currentJourney && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white rounded-3xl max-w-4xl w-full p-8 border border-[#e1e3e4] shadow-2xl max-h-[90vh] overflow-y-auto"
                >
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#24389c]">
                        Learner View Preview
                      </span>
                      <h3 className="text-2xl font-bold font-['Hanken_Grotesk'] text-[#191c1e]">
                        {currentJourney.title}
                      </h3>
                    </div>
                    <button
                      onClick={() => setShowPreviewModal(false)}
                      className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                    >
                      <span className="material-symbols-outlined">close</span>
                    </button>
                  </div>

                  <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                    {currentJourney.description || 'No journey description provided.'}
                  </p>

                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
                    Course Growth Architecture (6 Stages)
                  </h4>

                  <div className="space-y-4">
                    {stages.map((stg, idx) => {
                      const cfg = STAGE_CONFIGS.find((c) => c.type === stg.stage_type) || STAGE_CONFIGS[idx];
                      return (
                        <div key={stg.id} className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50">
                          <div className="flex items-center gap-3 mb-2">
                            <span
                              className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold"
                              style={{ backgroundColor: cfg.color }}
                            >
                              {idx + 1}
                            </span>
                            <div>
                              <h5 className="text-sm font-bold text-slate-900">{stg.title}</h5>
                              <p className="text-xs text-slate-500">{stg.description}</p>
                            </div>
                          </div>

                          {stg.lessons && stg.lessons.length > 0 && (
                            <div className="mt-3 pl-11 space-y-2">
                              {stg.lessons.map((l, lIdx) => (
                                <div
                                  key={l.id}
                                  className="p-2.5 rounded-xl bg-white border border-slate-200/80 flex items-center justify-between text-xs"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-sm text-red-600">play_circle</span>
                                    <span className="font-semibold text-slate-800">
                                      {lIdx + 1}. {l.title}
                                    </span>
                                  </div>
                                  <span className="text-[11px] text-slate-400">{l.duration_min || 10} min</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
                    <button
                      onClick={() => setShowPreviewModal(false)}
                      className="bg-[#24389c] text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-[#1a2b7a] transition-all"
                    >
                      Close Preview
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

export default EducatorPortal;
