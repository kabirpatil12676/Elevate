import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import learnerService from '../services/learner.service';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STAGE_META = {
  explore:    { label: 'Explore',    icon: 'travel_explore',    color: '#6366f1', bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/30' },
  learn:      { label: 'Learn',      icon: 'auto_stories',      color: '#0ea5e9', bg: 'bg-sky-500/10',    text: 'text-sky-400',    border: 'border-sky-500/30' },
  experience: { label: 'Experience', icon: 'psychology',        color: '#f59e0b', bg: 'bg-amber-500/10',  text: 'text-amber-400',  border: 'border-amber-500/30' },
  validate:   { label: 'Validate',   icon: 'fact_check',        color: '#10b981', bg: 'bg-emerald-500/10',text: 'text-emerald-400',border: 'border-emerald-500/30' },
  apply:      { label: 'Apply',      icon: 'build_circle',      color: '#f97316', bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/30' },
  transform:  { label: 'Transform',  icon: 'workspace_premium', color: '#a855f7', bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30' },
};

function getYouTubeEmbedUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const match = url.trim().match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
  if (match && match[1]) {
    return `https://www.youtube.com/embed/${match[1]}?rel=0&autoplay=0`;
  }
  return null;
}

function isValidHttpUrl(string) {
  if (!string || typeof string !== 'string') return false;
  try {
    const url = new URL(string.trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

const LessonPlayer = () => {
  const { journeyId } = useParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [journey, setJourney] = useState(null);
  const [stages, setStages] = useState([]);
  const [progress, setProgress] = useState(null);

  // Active item in workspace: 'lesson' | 'activity'
  const [activeItemType, setActiveItemType] = useState('lesson');
  const [currentLesson, setCurrentLesson] = useState(null);
  const [currentActivity, setCurrentActivity] = useState(null);

  const [completing, setCompleting] = useState(false);
  const [collapsedStages, setCollapsedStages] = useState({});
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Activity Submission Form State
  const [submitForm, setSubmitForm] = useState({
    content_text: '',
    content_url: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitFeedback, setSubmitFeedback] = useState({ type: '', text: '' });
  const [activityHistory, setActivityHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Flattened list of all lessons in sequence
  const allLessons = useMemo(() => {
    const list = [];
    stages.forEach((stage) => {
      (stage.lessons || []).forEach((lesson) => {
        list.push({
          ...lesson,
          stageTitle: stage.title,
          stageType: stage.stage_type,
          stageId: stage.id,
        });
      });
    });
    return list;
  }, [stages]);

  // Current lesson index in flattened list
  const currentLessonIndex = useMemo(() => {
    if (!currentLesson || allLessons.length === 0) return -1;
    return allLessons.findIndex((l) => l.id === currentLesson.id);
  }, [currentLesson, allLessons]);

  const loadPlayerData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [playerData, progressData] = await Promise.all([
        learnerService.getJourneyPlayerData(journeyId),
        learnerService.getJourneyProgress(journeyId),
      ]);

      setJourney(playerData.journey);
      setStages(playerData.stages || []);
      setProgress(progressData.progress || null);

      // Determine initial item to display
      const lessonsMap = progressData.progress?.lessons || {};
      const flattened = [];
      (playerData.stages || []).forEach((stage) => {
        (stage.lessons || []).forEach((l) => {
          flattened.push({
            ...l,
            stageTitle: stage.title,
            stageType: stage.stage_type,
            stageId: stage.id,
          });
        });
      });

      if (flattened.length > 0) {
        const firstIncomplete = flattened.find((l) => !lessonsMap[l.id]?.completed);
        setCurrentLesson(firstIncomplete || flattened[0]);
        setActiveItemType('lesson');
      } else {
        // Check if any activities exist
        const firstStageWithAct = (playerData.stages || []).find((s) => s.activities?.length > 0);
        if (firstStageWithAct && firstStageWithAct.activities.length > 0) {
          const act = firstStageWithAct.activities[0];
          setCurrentActivity({
            ...act,
            stageTitle: firstStageWithAct.title,
            stageType: firstStageWithAct.stage_type,
          });
          setActiveItemType('activity');
        }
      }
    } catch (err) {
      if (err.status === 403) {
        setError('not_enrolled');
      } else if (err.status === 404) {
        setError('not_found');
      } else {
        setError(err.message || 'Failed to load lesson player');
      }
    } finally {
      setLoading(false);
    }
  }, [journeyId]);

  useEffect(() => {
    loadPlayerData();
  }, [loadPlayerData]);

  // Fetch activity submission history when selecting an activity
  const fetchActivityHistory = useCallback(async (activityId) => {
    if (!activityId) return;
    setLoadingHistory(true);
    try {
      const res = await learnerService.getActivitySubmissions(journeyId, activityId);
      setActivityHistory(res.submissions || []);
    } catch (err) {
      console.error('Failed to load activity submission history:', err);
    } finally {
      setLoadingHistory(false);
    }
  }, [journeyId]);

  const handleSelectLesson = (lesson, stage) => {
    setCurrentLesson({
      ...lesson,
      stageTitle: stage.title,
      stageType: stage.stage_type,
      stageId: stage.id,
    });
    setActiveItemType('lesson');
    setSidebarOpen(false);
  };

  const handleSelectActivity = (activity, stage) => {
    setCurrentActivity({
      ...activity,
      stageTitle: stage.title,
      stageType: stage.stage_type,
      stageId: stage.id,
    });
    setSubmitFeedback({ type: '', text: '' });
    setSubmitForm({
      content_text: activity.latest_content_text || '',
      content_url: activity.latest_content_url || '',
    });
    setActiveItemType('activity');
    setSidebarOpen(false);
    fetchActivityHistory(activity.id);
  };

  const handleMarkComplete = async () => {
    if (!currentLesson || completing) return;
    const isAlreadyCompleted = progress?.lessons?.[currentLesson.id]?.completed;
    if (isAlreadyCompleted) return;

    setCompleting(true);
    try {
      await learnerService.markLessonComplete(journeyId, currentLesson.id);
      const pData = await learnerService.getJourneyProgress(journeyId);
      setProgress(pData.progress);
    } catch (err) {
      console.error('Failed to mark lesson complete:', err);
    } finally {
      setCompleting(false);
    }
  };

  const handlePrevLesson = () => {
    if (currentLessonIndex > 0) {
      setCurrentLesson(allLessons[currentLessonIndex - 1]);
    }
  };

  const handleNextLesson = () => {
    if (currentLessonIndex >= 0 && currentLessonIndex < allLessons.length - 1) {
      setCurrentLesson(allLessons[currentLessonIndex + 1]);
    }
  };

  const toggleStageCollapse = (stageId) => {
    setCollapsedStages((prev) => ({
      ...prev,
      [stageId]: !prev[stageId],
    }));
  };

  // Activity Submission Handler
  const handleSubmitActivity = async (e) => {
    e.preventDefault();
    if (!currentActivity || submitting) return;
    setSubmitFeedback({ type: '', text: '' });

    const type = currentActivity.submission_type;
    const trimmedText = submitForm.content_text.trim();
    const trimmedUrl = submitForm.content_url.trim();

    if (type === 'text' && (!trimmedText || trimmedText.length < 5)) {
      setSubmitFeedback({ type: 'error', text: 'Please provide a written response (min 5 characters).' });
      return;
    }

    if (type === 'url' && (!trimmedUrl || !isValidHttpUrl(trimmedUrl))) {
      setSubmitFeedback({ type: 'error', text: 'Please provide a valid project URL (beginning with http:// or https://).' });
      return;
    }

    if (type === 'both') {
      if (!trimmedText && !trimmedUrl) {
        setSubmitFeedback({ type: 'error', text: 'Please provide a written response, a project URL, or both.' });
        return;
      }
      if (trimmedUrl && !isValidHttpUrl(trimmedUrl)) {
        setSubmitFeedback({ type: 'error', text: 'The project link provided is not a valid URL.' });
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await learnerService.submitActivity(journeyId, currentActivity.id, {
        content_text: trimmedText || null,
        content_url: trimmedUrl || null,
      });

      setSubmitFeedback({
        type: 'success',
        text: res.message || 'Activity work submitted successfully for educator review.',
      });

      // Refresh activity history & player data to reflect updated latest_status
      await Promise.all([
        fetchActivityHistory(currentActivity.id),
        learnerService.getJourneyPlayerData(journeyId).then((data) => {
          setStages(data.stages || []);
          // Update current activity reference
          const updatedStage = (data.stages || []).find((s) => s.id === currentActivity.stage_id);
          const updatedAct = (updatedStage?.activities || []).find((a) => a.id === currentActivity.id);
          if (updatedAct) {
            setCurrentActivity((prev) => ({
              ...prev,
              ...updatedAct,
            }));
          }
        }),
      ]);
    } catch (err) {
      setSubmitFeedback({
        type: 'error',
        text: err.message || 'Failed to submit work. Please check requirements and try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading Skeleton ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="bg-[#0b0f19] text-white min-h-screen flex flex-col font-['Inter']">
        <div className="h-16 border-b border-white/10 px-6 flex items-center justify-between animate-pulse">
          <div className="h-5 w-48 bg-white/10 rounded-md" />
          <div className="h-8 w-32 bg-white/10 rounded-full" />
        </div>
        <div className="flex-grow grid grid-cols-1 lg:grid-cols-4 p-6 gap-6">
          <div className="lg:col-span-3 space-y-4">
            <div className="aspect-video bg-white/5 rounded-2xl animate-pulse" />
            <div className="h-8 w-2/3 bg-white/10 rounded-lg animate-pulse" />
            <div className="h-4 w-full bg-white/5 rounded-md animate-pulse" />
          </div>
          <div className="bg-white/5 rounded-2xl p-4 space-y-4 animate-pulse">
            <div className="h-6 w-1/2 bg-white/10 rounded-md" />
            <div className="space-y-2">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-12 bg-white/5 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Access Denied / Not Enrolled Error ───────────────────────────────────────
  if (error === 'not_enrolled') {
    return (
      <div className="bg-[#0b0f19] text-white min-h-screen flex items-center justify-center p-6 font-['Inter']">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-[#131b2e] border border-white/10 rounded-3xl p-8 text-center shadow-2xl"
        >
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-3xl">lock</span>
          </div>
          <h1 className="text-2xl font-bold font-['Hanken_Grotesk'] mb-2">Enrollment Required</h1>
          <p className="text-sm text-slate-400 mb-8 leading-relaxed">
            You must be enrolled in this Growth Journey to access lesson capsules, practical activities, and educator review.
          </p>
          <div className="flex flex-col gap-3">
            <Link
              to={`/courses/${journeyId}`}
              className="w-full bg-[#4353cf] hover:bg-[#3444b8] text-white font-semibold py-3 px-6 rounded-xl text-sm transition-colors shadow-lg shadow-[#4353cf]/25 flex items-center justify-center gap-2"
            >
              <span>View Course & Enroll</span>
              <span className="material-symbols-outlined text-base">arrow_forward</span>
            </Link>
            <Link
              to="/dashboard"
              className="w-full border border-white/15 hover:bg-white/5 text-slate-300 font-semibold py-2.5 px-6 rounded-xl text-sm transition-colors"
            >
              Back to Dashboard
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Not Found / General Error ───────────────────────────────────────────────
  if (error || !journey) {
    return (
      <div className="bg-[#0b0f19] text-white min-h-screen flex items-center justify-center p-6 font-['Inter']">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-[#131b2e] border border-white/10 rounded-3xl p-8 text-center shadow-2xl"
        >
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-3xl">error</span>
          </div>
          <h1 className="text-2xl font-bold font-['Hanken_Grotesk'] mb-2">
            {error === 'not_found' ? 'Journey Not Found' : 'Unable to Load Player'}
          </h1>
          <p className="text-sm text-slate-400 mb-8 leading-relaxed">
            {error === 'not_found'
              ? 'This Growth Journey does not exist or has not been published.'
              : error}
          </p>
          <div className="flex flex-col gap-3">
            <Link
              to="/courses"
              className="w-full bg-[#4353cf] hover:bg-[#3444b8] text-white font-semibold py-3 px-6 rounded-xl text-sm transition-colors"
            >
              Explore All Courses
            </Link>
            <Link
              to="/dashboard"
              className="w-full border border-white/15 hover:bg-white/5 text-slate-300 font-semibold py-2.5 px-6 rounded-xl text-sm transition-colors"
            >
              Back to Dashboard
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  const isCurrentCompleted = currentLesson ? progress?.lessons?.[currentLesson.id]?.completed : false;
  const embedUrl = currentLesson ? getYouTubeEmbedUrl(currentLesson.content_url) : null;
  const activeMeta = activeItemType === 'lesson'
    ? (currentLesson ? STAGE_META[currentLesson.stageType] || STAGE_META.learn : STAGE_META.learn)
    : (currentActivity ? STAGE_META[currentActivity.stageType] || STAGE_META.experience : STAGE_META.experience);

  // Status computation for current activity
  const latestStatus = currentActivity?.latest_status;
  const isApproved = latestStatus === 'approved';
  const isUnderReview = latestStatus === 'submitted' || latestStatus === 'under_review';
  const isRevisionRequested = latestStatus === 'revision_requested';

  return (
    <div className="bg-[#0b0f19] text-slate-100 min-h-screen flex flex-col font-['Inter']">
      {/* ── Top Navigation Bar ────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-[#0f172a]/95 backdrop-blur-md border-b border-white/10 px-4 md:px-8 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 md:gap-4 min-w-0">
          <Link
            to="/dashboard"
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors shrink-0"
            title="Return to Dashboard"
          >
            <span className="material-symbols-outlined text-xl">arrow_back</span>
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded bg-[#4353cf]/20 text-[#6875f5] border border-[#4353cf]/30">
                {journey.category || 'Course'}
              </span>
              <span className="text-xs text-slate-400 hidden sm:inline">
                • {journey.difficulty}
              </span>
            </div>
            <h1 className="text-sm md:text-base font-bold font-['Hanken_Grotesk'] text-white truncate max-w-[280px] sm:max-w-md md:max-w-lg">
              {journey.title}
            </h1>
          </div>
        </div>

        {/* Progress & Sidebar Toggle */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden md:flex flex-col items-end gap-1">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400">Lesson Progress</span>
              <span className="font-bold text-white">
                {progress?.completed_lessons || 0} / {progress?.total_lessons || allLessons.length}
              </span>
              <span className="text-emerald-400 font-bold">
                ({progress?.journey_progress_pct || 0}%)
              </span>
            </div>
            <div className="w-40 h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#4353cf] to-emerald-400 transition-all duration-500 rounded-full"
                style={{ width: `${progress?.journey_progress_pct || 0}%` }}
              />
            </div>
          </div>

          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 flex items-center gap-1.5 text-xs font-medium"
          >
            <span className="material-symbols-outlined text-lg">menu_book</span>
            <span>Syllabus</span>
          </button>
        </div>
      </header>

      {/* ── Main Workspace ────────────────────────────────────────────────── */}
      <div className="flex-grow flex flex-col lg:flex-row min-h-0">
        {/* Left: Content Area (Lesson or Practical Activity) */}
        <main className="flex-grow p-4 md:p-8 lg:p-10 overflow-y-auto max-w-[1300px] mx-auto w-full">
          {activeItemType === 'lesson' && currentLesson ? (
            /* ══════════════ VIDEO LESSON VIEW ══════════════ */
            <div className="space-y-6">
              {/* Video Embed Frame */}
              <div className="relative aspect-video w-full rounded-2xl md:rounded-3xl overflow-hidden bg-black/60 border border-white/10 shadow-2xl">
                {embedUrl ? (
                  <iframe
                    src={embedUrl}
                    title={currentLesson.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    className="w-full h-full border-0"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-[#131b2e]">
                    <span className="material-symbols-outlined text-5xl text-slate-500 mb-3">
                      play_disabled
                    </span>
                    <h3 className="text-lg font-semibold text-slate-200">Video Content Unavailable</h3>
                    <p className="text-xs text-slate-400 max-w-sm mt-1">
                      The video URL for this capsule is invalid or in processing. Please select another item from the syllabus.
                    </p>
                  </div>
                )}
              </div>

              {/* Lesson Metadata & Control Bar */}
              <div className="bg-[#131b2e] border border-white/10 rounded-2xl md:rounded-3xl p-6 space-y-6 shadow-xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${activeMeta.bg} ${activeMeta.text} border ${activeMeta.border}`}
                      >
                        <span className="material-symbols-outlined text-sm">{activeMeta.icon}</span>
                        {currentLesson.stageTitle || activeMeta.label}
                      </span>
                      {currentLesson.duration_min && (
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs">schedule</span>
                          {currentLesson.duration_min} min
                        </span>
                      )}
                    </div>
                    <h2 className="text-xl md:text-2xl font-bold font-['Hanken_Grotesk'] text-white">
                      {currentLesson.title}
                    </h2>
                  </div>

                  {/* Completion Action Button */}
                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      onClick={handleMarkComplete}
                      disabled={isCurrentCompleted || completing}
                      className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-md ${
                        isCurrentCompleted
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 cursor-default'
                          : 'bg-[#4353cf] hover:bg-[#3444b8] text-white shadow-[#4353cf]/25 cursor-pointer hover:scale-[1.02]'
                      }`}
                    >
                      <span className="material-symbols-outlined text-lg">
                        {isCurrentCompleted ? 'check_circle' : 'done'}
                      </span>
                      <span>{isCurrentCompleted ? 'Completed' : completing ? 'Saving...' : 'Mark as Completed'}</span>
                    </button>
                  </div>
                </div>

                {/* Lesson Description */}
                {currentLesson.description && (
                  <div className="border-t border-white/10 pt-4">
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Lesson Overview
                    </h4>
                    <p className="text-sm text-slate-300 leading-relaxed">
                      {currentLesson.description}
                    </p>
                  </div>
                )}

                {/* Step-through Controls */}
                <div className="border-t border-white/10 pt-4 flex items-center justify-between">
                  <button
                    onClick={handlePrevLesson}
                    disabled={currentLessonIndex <= 0}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <span className="material-symbols-outlined text-base">chevron_left</span>
                    <span>Previous Lesson</span>
                  </button>

                  <span className="text-xs text-slate-400">
                    Lesson {currentLessonIndex + 1} of {allLessons.length}
                  </span>

                  <button
                    onClick={handleNextLesson}
                    disabled={currentLessonIndex >= allLessons.length - 1}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <span>Next Lesson</span>
                    <span className="material-symbols-outlined text-base">chevron_right</span>
                  </button>
                </div>
              </div>
            </div>
          ) : activeItemType === 'activity' && currentActivity ? (
            /* ══════════════ PRACTICAL ACTIVITY VIEW ══════════════ */
            <div className="space-y-6">
              {/* Activity Header Card */}
              <div className="bg-[#131b2e] border border-white/10 rounded-2xl md:rounded-3xl p-6 md:p-8 space-y-6 shadow-xl">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${activeMeta.bg} ${activeMeta.text} border ${activeMeta.border}`}
                      >
                        <span className="material-symbols-outlined text-sm">{activeMeta.icon}</span>
                        {currentActivity.stageTitle || activeMeta.label}
                      </span>

                      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/5 text-slate-300 border border-white/10">
                        {currentActivity.is_required ? 'Required Practical' : 'Optional Challenge'}
                      </span>

                      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/5 text-slate-300 border border-white/10">
                        Format: {currentActivity.submission_type === 'both' ? 'Written + Project URL' : currentActivity.submission_type === 'url' ? 'Project URL' : 'Written Response'}
                      </span>

                      {currentActivity.max_attempts && (
                        <span className="text-xs text-slate-400">
                          (Max {currentActivity.max_attempts} attempts)
                        </span>
                      )}
                    </div>

                    <h2 className="text-2xl md:text-3xl font-bold font-['Hanken_Grotesk'] text-white">
                      {currentActivity.title}
                    </h2>
                  </div>

                  {/* Submission Status Badge */}
                  <div className="shrink-0">
                    {isApproved ? (
                      <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        <span className="material-symbols-outlined text-base">verified</span>
                        Approved by Educator
                      </span>
                    ) : isUnderReview ? (
                      <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        <span className="material-symbols-outlined text-base">schedule</span>
                        Under Review
                      </span>
                    ) : isRevisionRequested ? (
                      <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        <span className="material-symbols-outlined text-base">replay</span>
                        Revision Requested
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-white/10 text-slate-300 border border-white/10">
                        <span className="material-symbols-outlined text-base">pending</span>
                        Awaiting Submission
                      </span>
                    )}
                  </div>
                </div>

                {/* Instructions & Objectives */}
                <div className="bg-[#0b0f19] border border-white/10 rounded-2xl p-5 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#6875f5] flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm">assignment</span>
                    Activity Instructions & Expected Outcomes
                  </h4>
                  <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-line">
                    {currentActivity.instructions || 'Review the conceptual requirements for this stage and complete your practical task.'}
                  </p>
                </div>

                {/* Latest Educator Feedback Card (if exists) */}
                {currentActivity.latest_feedback && (
                  <div
                    className={`rounded-2xl p-5 border ${
                      isApproved
                        ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                        : isRevisionRequested
                        ? 'bg-rose-950/20 border-rose-500/30 text-rose-200'
                        : 'bg-white/5 border-white/10 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-base">comment</span>
                        Educator Feedback
                      </span>
                      {currentActivity.latest_feedback.overall_score !== null && (
                        <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-white/10">
                          Score: {currentActivity.latest_feedback.overall_score} / 100
                        </span>
                      )}
                    </div>
                    <p className="text-sm italic leading-relaxed">
                      "{currentActivity.latest_feedback.comments}"
                    </p>
                    <div className="text-[11px] text-slate-400 mt-2">
                      Reviewed by {currentActivity.latest_feedback.reviewer_name || 'Course Instructor'}
                    </div>
                  </div>
                )}

                {/* ── Submission Form ── */}
                <div className="border-t border-white/10 pt-6">
                  <h3 className="text-lg font-bold font-['Hanken_Grotesk'] text-white mb-2">
                    {isApproved
                      ? 'Completed Submission'
                      : isUnderReview
                      ? 'Current Submission'
                      : isRevisionRequested
                      ? 'Submit Revised Work'
                      : 'Submit Your Practical Work'}
                  </h3>

                  {isApproved ? (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 text-xs text-emerald-300 flex items-center gap-2">
                      <span className="material-symbols-outlined text-lg">check_circle</span>
                      <span>This practical activity has been approved by your educator. No further submissions are needed.</span>
                    </div>
                  ) : isUnderReview ? (
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 text-xs text-amber-300 flex items-center gap-2">
                      <span className="material-symbols-outlined text-lg">hourglass_top</span>
                      <span>Your submission is currently queued for educator evaluation. You will receive feedback here once reviewed.</span>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmitActivity} className="space-y-5">
                      {/* Text Response Field */}
                      {(currentActivity.submission_type === 'text' || currentActivity.submission_type === 'both') && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <label className="font-semibold text-slate-300">
                              Written Response / Architecture Brief
                            </label>
                            <span className="text-slate-400">
                              {submitForm.content_text.length} / 20,000 characters
                            </span>
                          </div>
                          <textarea
                            rows={6}
                            value={submitForm.content_text}
                            onChange={(e) => setSubmitForm({ ...submitForm, content_text: e.target.value })}
                            placeholder="Detail your engineering decisions, system trade-offs, schemas, or problem-solving approaches..."
                            className="w-full bg-[#0b0f19] border border-white/15 focus:border-[#4353cf] focus:ring-1 focus:ring-[#4353cf] rounded-xl p-3 text-sm text-slate-100 placeholder:text-slate-500 transition-colors"
                          />
                        </div>
                      )}

                      {/* Project URL Field */}
                      {(currentActivity.submission_type === 'url' || currentActivity.submission_type === 'both') && (
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-slate-300">
                            Project or Repository URL (e.g. GitHub, GitLab, deployment link)
                          </label>
                          <input
                            type="url"
                            value={submitForm.content_url}
                            onChange={(e) => setSubmitForm({ ...submitForm, content_url: e.target.value })}
                            placeholder="https://github.com/your-username/practical-challenge"
                            className="w-full bg-[#0b0f19] border border-white/15 focus:border-[#4353cf] focus:ring-1 focus:ring-[#4353cf] rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 transition-colors"
                          />
                        </div>
                      )}

                      {/* Error or Success notification */}
                      {submitFeedback.text && (
                        <div
                          className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                            submitFeedback.type === 'error'
                              ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                              : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          <span className="material-symbols-outlined text-base">
                            {submitFeedback.type === 'error' ? 'error' : 'check_circle'}
                          </span>
                          <span>{submitFeedback.text}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-end">
                        <button
                          type="submit"
                          disabled={submitting}
                          className="bg-[#4353cf] hover:bg-[#3444b8] disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-all shadow-md shadow-[#4353cf]/25 flex items-center gap-2"
                        >
                          {submitting ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              <span>Submitting...</span>
                            </>
                          ) : (
                            <>
                              <span className="material-symbols-outlined text-base">send</span>
                              <span>{isRevisionRequested ? 'Submit Revised Work' : 'Submit Activity Work'}</span>
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  )}
                </div>

                {/* ── Submission History ── */}
                {(loadingHistory || activityHistory.length > 0) && (
                  <div className="border-t border-white/10 pt-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-base">history</span>
                        Submission & Revision History {activityHistory.length > 0 && `(${activityHistory.length} attempt${activityHistory.length > 1 ? 's' : ''})`}
                      </h4>
                      {loadingHistory && (
                        <span className="text-[11px] text-slate-400 animate-pulse">Loading history...</span>
                      )}
                    </div>

                    <div className="space-y-3">
                      {activityHistory.map((attempt) => (
                        <div
                          key={attempt.id}
                          className="bg-[#0b0f19] border border-white/10 rounded-xl p-4 space-y-3"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-white">
                              Attempt #{attempt.attempt_num}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-slate-400">
                                {new Date(attempt.submitted_at).toLocaleDateString()}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  attempt.status === 'approved'
                                    ? 'bg-emerald-500/20 text-emerald-300'
                                    : attempt.status === 'revision_requested'
                                    ? 'bg-rose-500/20 text-rose-300'
                                    : 'bg-amber-500/20 text-amber-300'
                                }`}
                              >
                                {attempt.status}
                              </span>
                            </div>
                          </div>

                          {attempt.content_url && (
                            <div className="text-xs">
                              <span className="text-slate-400">Project URL: </span>
                              <a
                                href={attempt.content_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[#6875f5] hover:underline break-all"
                              >
                                {attempt.content_url}
                              </a>
                            </div>
                          )}

                          {attempt.content_text && (
                            <p className="text-xs text-slate-300 bg-white/5 p-3 rounded-lg leading-relaxed whitespace-pre-line">
                              {attempt.content_text}
                            </p>
                          )}

                          {attempt.feedback && attempt.feedback.length > 0 && (
                            <div className="border-t border-white/5 pt-2 space-y-1">
                              <span className="text-[11px] font-bold text-slate-400">
                                Educator Review:
                              </span>
                              {attempt.feedback.map((f) => (
                                <p key={f.id} className="text-xs text-slate-300 italic">
                                  "{f.comments}" {f.overall_score && `(Score: ${f.overall_score}/100)`}
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="aspect-video bg-[#131b2e] border border-white/10 rounded-3xl flex flex-col items-center justify-center p-8 text-center">
              <span className="material-symbols-outlined text-6xl text-slate-600 mb-4">
                assignment
              </span>
              <h3 className="text-xl font-bold font-['Hanken_Grotesk'] text-slate-200">
                Select an item from the syllabus
              </h3>
              <p className="text-sm text-slate-400 max-w-md mt-2">
                Choose a video capsule or practical activity from the sidebar to continue learning.
              </p>
            </div>
          )}
        </main>

        {/* Right: Stages, Lessons & Activities Syllabus Sidebar */}
        <aside
          className={`fixed inset-y-0 right-0 z-50 w-80 sm:w-96 bg-[#0f172a] border-l border-white/10 p-5 flex flex-col transition-transform duration-300 shadow-2xl lg:static lg:translate-x-0 ${
            sidebarOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          {/* Mobile close button */}
          <div className="flex items-center justify-between pb-4 border-b border-white/10 lg:hidden">
            <h3 className="font-bold text-white font-['Hanken_Grotesk'] text-base">
              Course Syllabus
            </h3>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>

          <div className="hidden lg:flex items-center justify-between pb-4 border-b border-white/10">
            <div>
              <h3 className="font-bold text-white font-['Hanken_Grotesk'] text-base">
                Course Syllabus
              </h3>
              <p className="text-xs text-slate-400">
                6-Stage Experiential Model
              </p>
            </div>
            <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-white/5 text-slate-300 border border-white/10">
              {progress?.completed_lessons || 0} / {progress?.total_lessons || allLessons.length}
            </span>
          </div>

          {/* Stages List */}
          <div className="flex-grow overflow-y-auto space-y-4 pt-4 pr-1">
            {stages.map((stage, idx) => {
              const sm = STAGE_META[stage.stage_type] || STAGE_META.learn;
              const stageProgress = progress?.stages?.find((s) => s.stage_id === stage.id);
              const stageLessons = stage.lessons || [];
              const stageActivities = stage.activities || [];
              const isCollapsed = collapsedStages[stage.id];
              const isStageComplete = stageProgress?.completed || false;

              return (
                <div
                  key={stage.id}
                  className="bg-[#131b2e]/70 border border-white/10 rounded-2xl overflow-hidden"
                >
                  {/* Stage Header */}
                  <button
                    onClick={() => toggleStageCollapse(stage.id)}
                    className="w-full p-3.5 flex items-center justify-between gap-3 text-left hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${sm.bg} ${sm.text}`}
                      >
                        <span className="material-symbols-outlined text-sm">{sm.icon}</span>
                      </div>
                      <div className="min-w-0">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Stage {idx + 1}: {sm.label}
                        </div>
                        <h4 className="text-xs font-bold text-slate-200 truncate font-['Hanken_Grotesk']">
                          {stage.title}
                        </h4>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isStageComplete ? (
                        <span className="material-symbols-outlined text-emerald-400 text-base" title="Stage Complete">
                          verified
                        </span>
                      ) : (
                        <span className="text-[11px] font-medium text-slate-400">
                          {stageProgress?.completed_lessons || 0}/{stageProgress?.total_lessons || stageLessons.length}
                        </span>
                      )}
                      <span className="material-symbols-outlined text-slate-400 text-sm">
                        {isCollapsed ? 'expand_more' : 'expand_less'}
                      </span>
                    </div>
                  </button>

                  {/* Stage Content List */}
                  {!isCollapsed && (
                    <div className="border-t border-white/5 p-2 space-y-2">
                      {/* Video Lessons */}
                      {stageLessons.map((lesson) => {
                        const isCompleted = progress?.lessons?.[lesson.id]?.completed;
                        const isActive = activeItemType === 'lesson' && currentLesson?.id === lesson.id;

                        return (
                          <button
                            key={lesson.id}
                            onClick={() => handleSelectLesson(lesson, stage)}
                            className={`w-full text-left p-2.5 rounded-xl flex items-center justify-between gap-3 transition-all ${
                              isActive
                                ? 'bg-[#4353cf] text-white shadow-md shadow-[#4353cf]/25 font-semibold'
                                : 'hover:bg-white/5 text-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span
                                className={`material-symbols-outlined text-base shrink-0 ${
                                  isCompleted
                                    ? isActive
                                      ? 'text-white'
                                      : 'text-emerald-400'
                                    : isActive
                                    ? 'text-white/60'
                                    : 'text-slate-500'
                                }`}
                              >
                                {isCompleted ? 'check_circle' : 'play_circle'}
                              </span>
                              <span className="text-xs truncate">
                                {lesson.title}
                              </span>
                            </div>

                            {lesson.duration_min && (
                              <span
                                className={`text-[10px] shrink-0 ${
                                  isActive ? 'text-white/80' : 'text-slate-500'
                                }`}
                              >
                                {lesson.duration_min}m
                              </span>
                            )}
                          </button>
                        );
                      })}

                      {/* Practical Activities */}
                      {stageActivities.map((act) => {
                        const isActive = activeItemType === 'activity' && currentActivity?.id === act.id;
                        const actStatus = act.latest_status;

                        return (
                          <button
                            key={act.id}
                            onClick={() => handleSelectActivity(act, stage)}
                            className={`w-full text-left p-2.5 rounded-xl flex items-center justify-between gap-3 transition-all border ${
                              isActive
                                ? 'bg-[#1e293b] border-[#4353cf] text-white shadow-md font-semibold'
                                : 'border-white/5 hover:bg-white/5 text-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span
                                className={`material-symbols-outlined text-base shrink-0 ${
                                  actStatus === 'approved'
                                    ? 'text-emerald-400'
                                    : actStatus === 'revision_requested'
                                    ? 'text-rose-400'
                                    : actStatus === 'submitted'
                                    ? 'text-amber-400'
                                    : 'text-indigo-400'
                                }`}
                              >
                                assignment
                              </span>
                              <div className="min-w-0">
                                <div className="text-[10px] uppercase font-bold text-slate-400">
                                  Activity
                                </div>
                                <span className="text-xs truncate block">
                                  {act.title}
                                </span>
                              </div>
                            </div>

                            {/* Status Chip */}
                            <span
                              className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded shrink-0 ${
                                actStatus === 'approved'
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : actStatus === 'revision_requested'
                                  ? 'bg-rose-500/20 text-rose-300'
                                  : actStatus === 'submitted'
                                  ? 'bg-amber-500/20 text-amber-300'
                                  : 'bg-white/5 text-slate-400'
                              }`}
                            >
                              {actStatus === 'revision_requested'
                                ? 'Revision'
                                : actStatus === 'submitted'
                                ? 'Review'
                                : actStatus === 'approved'
                                ? 'Done'
                                : 'Pending'}
                            </span>
                          </button>
                        );
                      })}

                      {stageLessons.length === 0 && stageActivities.length === 0 && (
                        <div className="p-3 text-[11px] text-slate-500 italic text-center">
                          No items in this stage yet
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default LessonPlayer;
