import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import educatorService from '../services/educator.service';
import eventService from '../services/event.service';

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

  // Activity Modal State (Add or Edit)
  const [activityModal, setActivityModal] = useState({
    open: false,
    mode: 'add', // 'add' | 'edit'
    stageId: null,
    activityId: null,
    title: '',
    instructions: '',
    submission_type: 'both',
    is_required: true,
    max_attempts: 3,
    due_date: '',
  });
  const [activitySaving, setActivitySaving] = useState(false);
  const [activityError, setActivityError] = useState('');

  // Submissions Management State
  const [submissions, setSubmissions] = useState([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [subStatusFilter, setSubStatusFilter] = useState('all');
  const [reviewModal, setReviewModal] = useState({
    open: false,
    submission: null,
    comments: '',
    overall_score: '',
    saving: false,
    error: '',
  });

  // Stage Edit State
  const [editingStageDesc, setEditingStageDesc] = useState({});
  const [stageSaving, setStageSaving] = useState(false);

  // Journey Metadata Edit State (in Studio)
  const [metadataForm, setMetadataForm] = useState({});
  const [metadataSaving, setMetadataSaving] = useState(false);

  // Preview Modal State
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // ── Workshops & Events State (Phase 6A) ──────────────────────────────────
  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [eventFilter, setEventFilter] = useState('all'); // 'all' | 'draft' | 'published' | 'cancelled'
  const [showEventModal, setShowEventModal] = useState(false);
  const [eventModalMode, setEventModalMode] = useState('create'); // 'create' | 'edit'
  const [editingEventId, setEditingEventId] = useState(null);
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    category: 'AI & Digital',
    facilitator_name: '',
    facilitator_bio: '',
    venue: '',
    meeting_url: '',
    starts_at: '',
    ends_at: '',
    registration_deadline: '',
    max_capacity: 50,
    price: '',
    currency: 'INR',
  });
  const [eventSaving, setEventSaving] = useState(false);
  const [eventError, setEventError] = useState('');

  // Attendees Modal State
  const [attendeesModal, setAttendeesModal] = useState({
    open: false,
    event: null,
    registrations: [],
    registered_count: 0,
    seats_available: 0,
    loading: false,
    error: '',
  });

  const fetchMyEvents = useCallback(async () => {
    setLoadingEvents(true);
    try {
      const res = await eventService.getMyEvents();
      setEvents(res.events || []);
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to load workshops' });
    } finally {
      setLoadingEvents(false);
    }
  }, []);

  const handleOpenCreateEvent = () => {
    const now = new Date();
    const dStart = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    dStart.setHours(18, 0, 0, 0);
    const dEnd = new Date(dStart.getTime() + 2 * 60 * 60 * 1000);
    const dDeadline = new Date(dStart.getTime() - 24 * 60 * 60 * 1000);

    const pad = (n) => String(n).padStart(2, '0');
    const toInputVal = (d) =>
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

    setEventModalMode('create');
    setEditingEventId(null);
    setEventError('');
    setEventForm({
      title: '',
      description: '',
      category: 'AI & Digital',
      facilitator_name: user?.name || '',
      facilitator_bio: 'Educator & experiential learning facilitator at ELEVATE.',
      venue: '',
      meeting_url: 'https://meet.google.com/',
      starts_at: toInputVal(dStart),
      ends_at: toInputVal(dEnd),
      registration_deadline: toInputVal(dDeadline),
      max_capacity: 50,
      price: '',
      currency: 'INR',
    });
    setShowEventModal(true);
  };

  const handleOpenEditEvent = (ev) => {
    const pad = (n) => String(n).padStart(2, '0');
    const toInputVal = (dateVal) => {
      if (!dateVal) return '';
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return '';
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    setEventModalMode('edit');
    setEditingEventId(ev.id);
    setEventError('');
    setEventForm({
      title: ev.title || '',
      description: ev.description || '',
      category: ev.category || 'AI & Digital',
      facilitator_name: ev.facilitator_name || '',
      facilitator_bio: ev.facilitator_bio || '',
      venue: ev.venue || '',
      meeting_url: ev.meeting_url || '',
      starts_at: toInputVal(ev.starts_at),
      ends_at: toInputVal(ev.ends_at),
      registration_deadline: toInputVal(ev.registration_deadline),
      max_capacity: ev.max_capacity || 50,
      price: ev.price !== undefined && ev.price !== null ? String(ev.price) : '',
      currency: ev.currency || 'INR',
    });
    setShowEventModal(true);
  };

  const handleSaveEvent = async (e) => {
    e.preventDefault();
    setEventError('');
    if (!eventForm.title.trim()) {
      setEventError('Workshop title is required');
      return;
    }
    if (!eventForm.starts_at || !eventForm.ends_at || !eventForm.registration_deadline) {
      setEventError('Start time, end time, and registration deadline are all required');
      return;
    }
    if (new Date(eventForm.ends_at) <= new Date(eventForm.starts_at)) {
      setEventError('Session end time must be after start time');
      return;
    }
    if (new Date(eventForm.registration_deadline) > new Date(eventForm.starts_at)) {
      setEventError('Registration deadline must be before or at session start time');
      return;
    }

    setEventSaving(true);
    try {
      const parsedPrice = eventForm.price !== '' ? parseFloat(eventForm.price) : 0;
      if (isNaN(parsedPrice) || parsedPrice < 0) {
        setEventError('Price must be a non-negative number (enter 0 for free)');
        return;
      }

      const payload = {
        title: eventForm.title.trim(),
        description: eventForm.description.trim(),
        category: eventForm.category,
        facilitator_name: eventForm.facilitator_name.trim(),
        facilitator_bio: eventForm.facilitator_bio.trim(),
        venue: eventForm.venue.trim() || null,
        meeting_url: eventForm.meeting_url.trim() || null,
        starts_at: new Date(eventForm.starts_at).toISOString(),
        ends_at: new Date(eventForm.ends_at).toISOString(),
        registration_deadline: new Date(eventForm.registration_deadline).toISOString(),
        max_capacity: parseInt(eventForm.max_capacity, 10) || 50,
        price: parsedPrice,
        currency: 'INR',
      };

      if (eventModalMode === 'create') {
        const res = await eventService.createEvent(payload);
        setFeedbackMsg({ type: 'success', text: `Workshop "${res.event.title}" saved as draft.` });
      } else {
        const res = await eventService.updateEvent(editingEventId, payload);
        setFeedbackMsg({ type: 'success', text: `Workshop "${res.event.title}" updated.` });
      }
      setShowEventModal(false);
      fetchMyEvents();
    } catch (err) {
      setEventError(err.message || 'Failed to save workshop');
    } finally {
      setEventSaving(false);
    }
  };

  const handlePublishEvent = async (eventId, title) => {
    if (!window.confirm(`Publish "${title}"? It will become visible in the public workshops catalogue.`)) return;
    try {
      await eventService.publishEvent(eventId);
      setFeedbackMsg({ type: 'success', text: `"${title}" published successfully.` });
      fetchMyEvents();
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to publish event.' });
    }
  };

  const handleCancelEvent = async (eventId, title) => {
    if (!window.confirm(`Cancel workshop "${title}"? Registrants will see it marked as cancelled.`)) return;
    try {
      await eventService.cancelEvent(eventId);
      setFeedbackMsg({ type: 'info', text: `Workshop "${title}" has been cancelled.` });
      fetchMyEvents();
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to cancel event.' });
    }
  };

  const handleDeleteEvent = async (eventId, title) => {
    if (!window.confirm(`Permanently delete draft "${title}"? This cannot be undone.`)) return;
    try {
      await eventService.deleteEvent(eventId);
      setFeedbackMsg({ type: 'success', text: `Draft "${title}" deleted.` });
      fetchMyEvents();
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to delete draft.' });
    }
  };

  const handleViewAttendees = async (eventId) => {
    setAttendeesModal({
      open: true,
      event: null,
      registrations: [],
      registered_count: 0,
      seats_available: 0,
      attendance_summary: null,
      loading: true,
      error: '',
    });
    try {
      const res = await eventService.getEventRegistrations(eventId);
      setAttendeesModal({
        open: true,
        event: res.event,
        registrations: res.registrations || [],
        registered_count: res.registered_count,
        seats_available: res.seats_available,
        attendance_summary: res.attendance_summary,
        loading: false,
        error: '',
      });
    } catch (err) {
      setAttendeesModal((prev) => ({
        ...prev,
        loading: false,
        error: err.message || 'Failed to load attendees',
      }));
    }
  };

  const handleMarkAttendance = async (eventId, learnerId, status) => {
    try {
      await eventService.recordAttendance(eventId, [{ user_id: learnerId, status }]);
      setAttendeesModal((prev) => {
        const nextRegs = prev.registrations.map((r) =>
          r.user_id === learnerId ? { ...r, attendance_status: status } : r
        );
        const present = nextRegs.filter((r) => r.status === 'registered' && r.attendance_status === 'present').length;
        const absent = nextRegs.filter((r) => r.status === 'registered' && r.attendance_status === 'absent').length;
        return {
          ...prev,
          registrations: nextRegs,
          attendance_summary: {
            total_registered: prev.registered_count,
            present_count: present,
            absent_count: absent,
            unmarked_count: Math.max(0, prev.registered_count - (present + absent)),
          },
        };
      });
      setFeedbackMsg({ type: 'success', text: `Marked attendee as ${status}.` });
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: err.response?.data?.message || err.message || 'Failed to update attendance' });
    }
  };

  const handleCompleteWorkshop = async (eventId) => {
    try {
      await eventService.completeEvent(eventId);
      setAttendeesModal((prev) => ({
        ...prev,
        event: { ...prev.event, status: 'completed' },
      }));
      setEvents((prev) =>
        prev.map((e) => (e.id === eventId ? { ...e, status: 'completed' } : e))
      );
      setFeedbackMsg({ type: 'success', text: 'Workshop successfully marked as completed.' });
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: err.response?.data?.message || err.message || 'Failed to complete workshop' });
    }
  };

  // ── Load Journeys List ───────────────────────────────────────────────────
  const fetchJourneys = useCallback(async () => {
    setLoadingJourneys(true);
    try {
      const data = await educatorService.getMyJourneys();
      setJourneys(Array.isArray(data) ? data : []);
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to load journeys' });
    } finally {
      setLoadingJourneys(false);
    }
  }, []);

  useEffect(() => {
    if (view === 'list') {
      fetchJourneys();
    } else if (view === 'events') {
      fetchMyEvents();
    }
  }, [view, fetchJourneys, fetchMyEvents]);

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

  // ── Activity Handlers ────────────────────────────────────────────────────
  const handleSaveActivity = async (e) => {
    e.preventDefault();
    setActivityError('');
    if (!activityModal.title.trim()) {
      setActivityError('Please enter an activity title');
      return;
    }
    setActivitySaving(true);
    try {
      const payload = {
        title: activityModal.title.trim(),
        instructions: activityModal.instructions.trim(),
        submission_type: activityModal.submission_type,
        is_required: Boolean(activityModal.is_required),
        max_attempts: parseInt(activityModal.max_attempts, 10) || 3,
        due_date: activityModal.due_date ? new Date(activityModal.due_date).toISOString() : null,
      };

      if (activityModal.mode === 'add') {
        const res = await educatorService.createActivity(activityModal.stageId, payload);
        setStages((prev) =>
          prev.map((s) =>
            s.id === activityModal.stageId
              ? { ...s, activities: [...(s.activities || []), res.activity] }
              : s
          )
        );
        setFeedbackMsg({ type: 'success', text: 'Practical activity added to stage!' });
      } else {
        const res = await educatorService.updateActivity(activityModal.activityId, payload);
        setStages((prev) =>
          prev.map((s) => ({
            ...s,
            activities: (s.activities || []).map((a) =>
              a.id === activityModal.activityId ? res.activity : a
            ),
          }))
        );
        setFeedbackMsg({ type: 'success', text: 'Activity updated successfully!' });
      }
      setActivityModal((prev) => ({ ...prev, open: false }));
    } catch (err) {
      setActivityError(err.message || 'Failed to save activity');
    } finally {
      setActivitySaving(false);
    }
  };

  const handleDeleteActivity = async (stageId, activityId) => {
    if (!window.confirm('Are you sure you want to delete this activity?')) return;
    try {
      const res = await educatorService.deleteActivity(activityId);
      setStages((prev) =>
        prev.map((s) =>
          s.id === stageId
            ? { ...s, activities: (s.activities || []).filter((a) => a.id !== activityId) }
            : s
        )
      );
      setFeedbackMsg({
        type: 'success',
        text: res.message || 'Activity deleted/archived successfully.',
      });
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to delete activity' });
    }
  };

  // ── Submissions Review Handlers ──────────────────────────────────────────
  const fetchSubmissions = useCallback(async (status) => {
    setLoadingSubmissions(true);
    try {
      const filter = status && status !== 'all' ? status : undefined;
      const data = await educatorService.getSubmissions({ status: filter });
      setSubmissions(data || []);
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to load learner submissions' });
    } finally {
      setLoadingSubmissions(false);
    }
  }, []);

  useEffect(() => {
    if (view === 'submissions') {
      fetchSubmissions(subStatusFilter);
    }
  }, [view, subStatusFilter, fetchSubmissions]);

  const handleOpenReview = async (submission) => {
    try {
      const details = await educatorService.getSubmissionDetails(submission.id);
      setReviewModal({
        open: true,
        submission: details,
        comments: '',
        overall_score: details.feedback?.[0]?.overall_score || '',
        saving: false,
        error: '',
      });
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to load submission details' });
    }
  };

  const handleSubmitReview = async (targetStatus) => {
    if (!reviewModal.submission || reviewModal.saving) return;
    setReviewModal((prev) => ({ ...prev, saving: true, error: '' }));
    try {
      await educatorService.reviewSubmission(reviewModal.submission.id, {
        status: targetStatus,
        comments: reviewModal.comments,
        overall_score: reviewModal.overall_score ? parseFloat(reviewModal.overall_score) : null,
      });

      setFeedbackMsg({
        type: 'success',
        text: `Submission successfully ${
          targetStatus === 'approved'
            ? 'approved'
            : targetStatus === 'revision_requested'
            ? 'returned with revision request'
            : 'marked under review'
        }!`,
      });

      setReviewModal({
        open: false,
        submission: null,
        comments: '',
        overall_score: '',
        saving: false,
        error: '',
      });

      fetchSubmissions(subStatusFilter);
    } catch (err) {
      setReviewModal((prev) => ({ ...prev, saving: false, error: err.message || 'Review failed' }));
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

                <div className="flex flex-wrap items-center gap-3 shrink-0">
                  <button
                    onClick={() => {
                      setView('events');
                      fetchMyEvents();
                    }}
                    className="flex items-center gap-2 bg-white hover:bg-slate-50 text-[#4353cf] border border-[#4353cf] px-5 py-3 rounded-2xl text-sm font-semibold shadow-sm transition-all"
                  >
                    <span className="material-symbols-outlined text-lg">groups</span>
                    Workshops & Events
                  </button>
                  <button
                    onClick={() => {
                      setView('submissions');
                      fetchSubmissions('all');
                    }}
                    className="flex items-center gap-2 bg-white hover:bg-slate-50 text-[#24389c] border border-[#24389c] px-5 py-3 rounded-2xl text-sm font-semibold shadow-sm transition-all"
                  >
                    <span className="material-symbols-outlined text-lg">rate_review</span>
                    Learner Submissions
                  </button>
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

                          {/* ── Practical Activities & Challenges Section ── */}
                          <div className="mt-8 pt-8 border-t border-slate-100">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                              <div>
                                <h3 className="text-sm font-bold text-[#191c1e] flex items-center gap-2">
                                  <span className="material-symbols-outlined text-base text-[#24389c]">assignment</span>
                                  Practical Activities & Challenges ({currentStage.activities?.length || 0})
                                </h3>
                                <p className="text-[11px] text-slate-400">
                                  Hands-on tasks requiring written responses, project repository links, or both
                                </p>
                              </div>

                              <button
                                onClick={() =>
                                  setActivityModal({
                                    open: true,
                                    mode: 'add',
                                    stageId: currentStage.id,
                                    activityId: null,
                                    title: '',
                                    instructions: '',
                                    submission_type: 'both',
                                    is_required: true,
                                    max_attempts: 3,
                                    due_date: '',
                                  })
                                }
                                className="flex items-center gap-1.5 bg-[#191c1e] hover:bg-black text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm shrink-0"
                              >
                                <span className="material-symbols-outlined text-sm">add_task</span>
                                Add Activity
                              </button>
                            </div>

                            {(!currentStage.activities || currentStage.activities.length === 0) ? (
                              <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center text-slate-400">
                                <span className="material-symbols-outlined text-3xl mb-1 text-slate-300">psychology</span>
                                <p className="text-xs font-medium text-slate-600 mb-1">No practical activities in this stage yet</p>
                                <p className="text-[11px] text-slate-400 mb-3 max-w-sm mx-auto">
                                  Assign engineering challenges, lab assignments, or capstone projects to test real-world mastery.
                                </p>
                                <button
                                  onClick={() =>
                                    setActivityModal({
                                      open: true,
                                      mode: 'add',
                                      stageId: currentStage.id,
                                      activityId: null,
                                      title: '',
                                      instructions: '',
                                      submission_type: 'both',
                                      is_required: true,
                                      max_attempts: 3,
                                      due_date: '',
                                    })
                                  }
                                  className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors"
                                >
                                  <span className="material-symbols-outlined text-sm">add</span>
                                  Add First Activity
                                </button>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {currentStage.activities.map((act) => (
                                  <div
                                    key={act.id}
                                    className="p-4 rounded-2xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                                  >
                                    <div className="space-y-1.5 min-w-0">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <h4 className="text-xs font-bold text-slate-900 truncate">
                                          {act.title}
                                        </h4>
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                                          {act.submission_type === 'both' ? 'Written + URL' : act.submission_type === 'url' ? 'Project URL' : 'Written'}
                                        </span>
                                        <span
                                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                            act.is_required
                                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                              : 'bg-slate-100 text-slate-600'
                                          }`}
                                        >
                                          {act.is_required ? 'Required' : 'Optional'}
                                        </span>
                                        <span className="text-[10px] text-slate-400">
                                          {act.submission_count || 0} submission{act.submission_count === 1 ? '' : 's'}
                                        </span>
                                      </div>
                                      <p className="text-xs text-slate-500 line-clamp-2">
                                        {act.instructions}
                                      </p>
                                    </div>

                                    <div className="flex items-center gap-1 shrink-0">
                                      <button
                                        onClick={() =>
                                          setActivityModal({
                                            open: true,
                                            mode: 'edit',
                                            stageId: currentStage.id,
                                            activityId: act.id,
                                            title: act.title,
                                            instructions: act.instructions || '',
                                            submission_type: act.submission_type || 'both',
                                            is_required: act.is_required !== false,
                                            max_attempts: act.max_attempts || 3,
                                            due_date: act.due_date ? act.due_date.substring(0, 10) : '',
                                          })
                                        }
                                        className="p-2 text-slate-400 hover:text-[#24389c] hover:bg-slate-100 rounded-lg transition-colors"
                                        title="Edit activity"
                                      >
                                        <span className="material-symbols-outlined text-base">edit</span>
                                      </button>
                                      <button
                                        onClick={() => handleDeleteActivity(currentStage.id, act.id)}
                                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                        title="Delete activity"
                                      >
                                        <span className="material-symbols-outlined text-base">delete</span>
                                      </button>
                                    </div>
                                  </div>
                                ))}
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
          {/* VIEW 3: LEARNER SUBMISSIONS & EVALUATION STUDIO               */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {view === 'submissions' && (
            <div>
              {/* Submissions Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <button
                  onClick={() => setView('list')}
                  className="inline-flex items-center gap-2 text-sm font-bold text-[#454654] hover:text-[#24389c] transition-colors bg-white px-4 py-2 rounded-xl border border-[#e1e3e4] shadow-sm w-fit"
                >
                  <span className="material-symbols-outlined text-base">arrow_back</span>
                  Back to Journey Studio
                </button>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => fetchSubmissions(subStatusFilter)}
                    disabled={loadingSubmissions}
                    className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm"
                  >
                    <span className={`material-symbols-outlined text-base text-[#24389c] ${loadingSubmissions ? 'animate-spin' : ''}`}>
                      refresh
                    </span>
                    Refresh Submissions
                  </button>
                </div>
              </div>

              {/* Banner */}
              <div className="bg-white rounded-3xl p-8 md:p-10 border border-[#e1e3e4] shadow-sm mb-8">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs uppercase font-extrabold tracking-wider px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full inline-block">
                    Educator Review Studio
                  </span>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                    Phase 5A Assessment Flow
                  </span>
                </div>
                <h1 className="text-3xl font-bold font-['Hanken_Grotesk'] text-[#191c1e] tracking-tight">
                  Learner Submissions & Feedback
                </h1>
                <p className="text-sm text-[#454654] mt-1.5 max-w-2xl leading-relaxed">
                  Review student practical responses, evaluate project links, deliver qualitative feedback, request revisions, and officially approve stage milestones.
                </p>

                {/* Status Filter Tabs */}
                <div className="flex flex-wrap items-center gap-2 mt-6 pt-6 border-t border-slate-100">
                  {[
                    { key: 'all', label: 'All Submissions' },
                    { key: 'submitted', label: 'Awaiting Review' },
                    { key: 'under_review', label: 'Under Review' },
                    { key: 'revision_requested', label: 'Revision Requested' },
                    { key: 'approved', label: 'Approved' },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setSubStatusFilter(tab.key)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                        subStatusFilter === tab.key
                          ? 'bg-[#24389c] text-white shadow-sm'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Submissions Content */}
              {loadingSubmissions ? (
                <div className="py-20 text-center">
                  <div className="inline-block w-8 h-8 border-4 border-[#24389c] border-t-transparent rounded-full animate-spin mb-3"></div>
                  <p className="text-sm text-[#757685]">Loading submissions...</p>
                </div>
              ) : submissions.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 border border-[#e1e3e4] text-center shadow-sm">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mx-auto mb-4">
                    <span className="material-symbols-outlined text-3xl">task</span>
                  </div>
                  <h3 className="text-lg font-bold text-[#191c1e] mb-1">No Submissions Found</h3>
                  <p className="text-sm text-[#757685] max-w-md mx-auto">
                    {subStatusFilter === 'all'
                      ? 'No learners have submitted practical activity responses for your journeys yet.'
                      : `No submissions matching the filter "${subStatusFilter.replace('_', ' ')}".`}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {submissions.map((sub) => {
                    const statusColors = {
                      submitted: 'bg-amber-50 text-amber-800 border-amber-200',
                      under_review: 'bg-blue-50 text-blue-800 border-blue-200',
                      revision_requested: 'bg-orange-50 text-orange-800 border-orange-200',
                      approved: 'bg-emerald-50 text-emerald-800 border-emerald-200',
                    };
                    const statusLabels = {
                      submitted: 'Awaiting Review',
                      under_review: 'Under Review',
                      revision_requested: 'Revision Requested',
                      approved: 'Approved',
                    };

                    return (
                      <div
                        key={sub.id}
                        className="bg-white rounded-3xl border border-[#e1e3e4] p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                      >
                        <div>
                          {/* Header: Status & Attempt */}
                          <div className="flex items-center justify-between mb-3">
                            <span
                              className={`text-[11px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full border ${
                                statusColors[sub.status] || 'bg-slate-100 text-slate-700 border-slate-200'
                              }`}
                            >
                              ● {statusLabels[sub.status] || sub.status}
                            </span>
                            <span className="text-xs font-bold text-slate-500">
                              Attempt #{sub.attempt_num}
                            </span>
                          </div>

                          {/* Learner Info */}
                          <div className="flex items-center gap-3 mb-4 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                            <div className="w-9 h-9 rounded-full bg-[#24389c]/10 text-[#24389c] font-bold flex items-center justify-center text-sm">
                              {(sub.learner_name || 'L')[0].toUpperCase()}
                            </div>
                            <div className="overflow-hidden">
                              <h4 className="text-xs font-bold text-slate-900 truncate">
                                {sub.learner_name || 'Learner'}
                              </h4>
                              <p className="text-[11px] text-slate-500 truncate">
                                {sub.learner_email}
                              </p>
                            </div>
                          </div>

                          {/* Journey & Stage */}
                          <div className="mb-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 block truncate">
                              {sub.journey_title} • Stage {sub.stage_order}
                            </span>
                            <h3 className="text-sm font-bold text-[#191c1e] line-clamp-2">
                              {sub.activity_title}
                            </h3>
                          </div>

                          {/* Snippet of Response */}
                          {sub.response_text && (
                            <p className="text-xs text-slate-600 line-clamp-3 bg-slate-50/60 p-2.5 rounded-xl border border-slate-100 mb-3 italic">
                              "{sub.response_text}"
                            </p>
                          )}

                          {sub.github_url && (
                            <div className="flex items-center gap-1.5 text-xs text-[#24389c] font-semibold mb-3 truncate">
                              <span className="material-symbols-outlined text-sm">link</span>
                              <span className="truncate">{sub.github_url}</span>
                            </div>
                          )}

                          <div className="text-[11px] text-slate-400 mb-4">
                            Submitted: {sub.submitted_at ? new Date(sub.submitted_at).toLocaleDateString() : 'N/A'}
                          </div>
                        </div>

                        {/* Action */}
                        <div className="pt-3 border-t border-slate-100">
                          <button
                            onClick={() => handleOpenReview(sub)}
                            className="w-full flex items-center justify-center gap-2 bg-[#24389c] hover:bg-[#1a2b7a] text-white py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm"
                          >
                            <span className="material-symbols-outlined text-base">rate_review</span>
                            Review & Give Feedback
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* VIEW 4: WORKSHOPS & EVENTS MANAGEMENT (PHASE 6A)                */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {view === 'events' && (
            <div>
              {/* Header & Actions */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setView('list')}
                    className="p-2.5 rounded-xl bg-white border border-[#e1e3e4] text-[#454654] hover:text-[#24389c] hover:bg-slate-50 transition-all shadow-sm"
                    title="Back to Journeys"
                  >
                    <span className="material-symbols-outlined text-lg">arrow_back</span>
                  </button>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#4353cf]">
                        Phase 6A • Live Experiential Cohorts
                      </span>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-bold font-['Hanken_Grotesk'] text-[#191c1e] tracking-tight">
                      Workshops & Events Management
                    </h1>
                    <p className="text-xs text-[#454654] mt-0.5">
                      Schedule live cohorts, manage capacity, track learner attendees, and publish sessions.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleOpenCreateEvent}
                    className="flex items-center gap-2 bg-[#4353cf] hover:bg-[#3444b8] text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-all"
                  >
                    <span className="material-symbols-outlined text-base">add_circle</span>
                    Schedule New Workshop
                  </button>
                </div>
              </div>

              {/* Status Filter Tabs */}
              <div className="flex items-center gap-2 mb-6 bg-white p-1.5 rounded-2xl border border-[#e1e3e4] shadow-sm w-fit overflow-x-auto">
                {[
                  { key: 'all', label: 'All Workshops', count: events.length },
                  { key: 'draft', label: 'Drafts', count: events.filter((e) => e.status === 'draft').length },
                  { key: 'published', label: 'Published', count: events.filter((e) => e.status === 'published').length },
                  { key: 'cancelled', label: 'Cancelled', count: events.filter((e) => e.status === 'cancelled').length },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setEventFilter(tab.key)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                      eventFilter === tab.key
                        ? 'bg-[#4353cf] text-white shadow-sm'
                        : 'text-[#454654] hover:bg-slate-100'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        eventFilter === tab.key ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Event Cards Grid */}
              {loadingEvents ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-64 bg-white rounded-3xl border border-[#e1e3e4]" />
                  ))}
                </div>
              ) : events.filter((e) => eventFilter === 'all' || e.status === eventFilter).length === 0 ? (
                <div className="bg-white rounded-3xl p-12 border border-[#e1e3e4] text-center max-w-lg mx-auto shadow-sm">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-[#4353cf] flex items-center justify-center mx-auto mb-4">
                    <span className="material-symbols-outlined text-3xl">event_busy</span>
                  </div>
                  <h3 className="text-lg font-bold font-['Hanken_Grotesk'] text-[#191c1e] mb-1">
                    No Workshops Found
                  </h3>
                  <p className="text-xs text-[#757685] mb-6">
                    {eventFilter === 'all'
                      ? 'You have not scheduled any workshops or events yet.'
                      : `No workshops currently with status "${eventFilter}".`}
                  </p>
                  <button
                    onClick={handleOpenCreateEvent}
                    className="inline-flex items-center gap-2 bg-[#4353cf] hover:bg-[#3444b8] text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-all"
                  >
                    <span className="material-symbols-outlined text-base">add</span>
                    Create Your First Workshop
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {events
                    .filter((e) => eventFilter === 'all' || e.status === eventFilter)
                    .map((ev) => {
                      const capacityPct =
                        ev.max_capacity > 0
                          ? Math.min(100, Math.round((ev.registered_count / ev.max_capacity) * 100))
                          : 0;
                      return (
                        <div
                          key={ev.id}
                          className="bg-white rounded-3xl border border-[#e1e3e4] shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden"
                        >
                          <div className="p-6">
                            <div className="flex items-center justify-between gap-2 mb-3">
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-indigo-50 text-[#4353cf] rounded-md border border-indigo-100">
                                {ev.category || 'Workshop'}
                              </span>
                              <span
                                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                                  ev.status === 'published'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : ev.status === 'draft'
                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                    : 'bg-rose-50 text-rose-700 border-rose-200'
                                }`}
                              >
                                {ev.status}
                              </span>
                            </div>

                            <h3 className="font-bold text-base font-['Hanken_Grotesk'] text-[#191c1e] line-clamp-2 mb-2">
                              {ev.title}
                            </h3>

                            <div className="space-y-1.5 text-xs text-[#555664] mb-4">
                              <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-sm text-[#4353cf]">
                                  calendar_today
                                </span>
                                <span>
                                  {new Date(ev.starts_at).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: 'numeric',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-sm text-[#4353cf]">
                                  {ev.venue ? 'location_on' : 'videocam'}
                                </span>
                                <span className="truncate">{ev.venue || 'Live Online Cohort'}</span>
                              </div>
                              {isAdmin && ev.creator_name && (
                                <div className="flex items-center gap-2 text-slate-400">
                                  <span className="material-symbols-outlined text-sm">badge</span>
                                  <span>Educator: {ev.creator_name}</span>
                                </div>
                              )}
                            </div>

                            {/* Capacity Progress */}
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                              <div className="flex items-center justify-between text-[11px] font-semibold text-[#191c1e] mb-1">
                                <span>Roster</span>
                                <span>
                                  {ev.registered_count} / {ev.max_capacity} Seats ({ev.seats_available} left)
                                </span>
                              </div>
                              <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                <div
                                  className={`h-full transition-all ${
                                    capacityPct >= 100
                                      ? 'bg-rose-500'
                                      : capacityPct > 80
                                      ? 'bg-amber-500'
                                      : 'bg-[#4353cf]'
                                  }`}
                                  style={{ width: `${capacityPct}%` }}
                                />
                              </div>
                            </div>
                          </div>

                          {/* Footer Actions */}
                          <div className="bg-[#fcfdff] px-6 py-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                            <button
                              onClick={() => handleViewAttendees(ev.id)}
                              className="inline-flex items-center gap-1 text-xs font-bold text-[#4353cf] hover:text-[#2435b4] py-1.5 px-2.5 rounded-lg hover:bg-indigo-50 transition-colors"
                            >
                              <span className="material-symbols-outlined text-base">group</span>
                              Attendees ({ev.registered_count})
                            </button>

                            <div className="flex items-center gap-1.5">
                              {ev.status === 'draft' && (
                                <>
                                  <button
                                    onClick={() => handlePublishEvent(ev.id, ev.title)}
                                    className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
                                    title="Publish event"
                                  >
                                    Publish
                                  </button>
                                  <button
                                    onClick={() => handleOpenEditEvent(ev)}
                                    className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
                                    title="Edit workshop"
                                  >
                                    <span className="material-symbols-outlined text-base">edit</span>
                                  </button>
                                  <button
                                    onClick={() => handleDeleteEvent(ev.id, ev.title)}
                                    className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg"
                                    title="Delete draft"
                                  >
                                    <span className="material-symbols-outlined text-base">delete</span>
                                  </button>
                                </>
                              )}
                              {ev.status === 'published' && (
                                <>
                                  <button
                                    onClick={() => handleOpenEditEvent(ev)}
                                    className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
                                    title="Edit workshop"
                                  >
                                    <span className="material-symbols-outlined text-base">edit</span>
                                  </button>
                                  <button
                                    onClick={() => handleCancelEvent(ev.id, ev.title)}
                                    className="py-1.5 px-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition-all"
                                    title="Cancel workshop"
                                  >
                                    Cancel
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
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

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* MODAL 4: PRACTICAL ACTIVITY BUILDER MODAL                       */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          <AnimatePresence>
            {activityModal.open && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  className="bg-white rounded-3xl max-w-xl w-full p-8 border border-[#e1e3e4] shadow-2xl max-h-[90vh] overflow-y-auto"
                >
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#24389c]">
                        Stage Activity Studio
                      </span>
                      <h3 className="text-xl font-bold font-['Hanken_Grotesk'] text-[#191c1e]">
                        {activityModal.mode === 'add' ? 'Add Practical Activity' : 'Edit Practical Activity'}
                      </h3>
                    </div>
                    <button
                      onClick={() => setActivityModal((prev) => ({ ...prev, open: false }))}
                      className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                    >
                      <span className="material-symbols-outlined">close</span>
                    </button>
                  </div>

                  {activityError && (
                    <div className="mb-4 p-3 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 text-xs font-medium">
                      {activityError}
                    </div>
                  )}

                  <form onSubmit={handleSaveActivity} className="space-y-4 text-xs">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Activity Title <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. System Design Architecture & Repository Submission"
                        value={activityModal.title}
                        onChange={(e) => setActivityModal({ ...activityModal, title: e.target.value })}
                        className="w-full bg-[#f8f9fa] border border-[#c6c5d6] rounded-xl py-2 px-3 text-slate-900 focus:outline-none focus:border-[#24389c] text-sm"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Instructions & Expected Outcome
                      </label>
                      <textarea
                        rows={4}
                        placeholder="Detail the deliverables, problem statement, and evaluation criteria for this milestone..."
                        value={activityModal.instructions}
                        onChange={(e) => setActivityModal({ ...activityModal, instructions: e.target.value })}
                        className="w-full bg-[#f8f9fa] border border-[#c6c5d6] rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-[#24389c] resize-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          Submission Format
                        </label>
                        <select
                          value={activityModal.submission_type}
                          onChange={(e) => setActivityModal({ ...activityModal, submission_type: e.target.value })}
                          className="w-full bg-[#f8f9fa] border border-[#c6c5d6] rounded-xl py-2 px-3 text-slate-900 focus:outline-none focus:border-[#24389c]"
                        >
                          <option value="both">Written Response & Project URL</option>
                          <option value="text">Written Response Only</option>
                          <option value="url">Project URL Only</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          Max Allowed Attempts
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={activityModal.max_attempts}
                          onChange={(e) => setActivityModal({ ...activityModal, max_attempts: e.target.value })}
                          className="w-full bg-[#f8f9fa] border border-[#c6c5d6] rounded-xl py-2 px-3 text-slate-900 focus:outline-none focus:border-[#24389c]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 items-center">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          Optional Due Date
                        </label>
                        <input
                          type="date"
                          value={activityModal.due_date ? activityModal.due_date.slice(0, 10) : ''}
                          onChange={(e) => setActivityModal({ ...activityModal, due_date: e.target.value })}
                          className="w-full bg-[#f8f9fa] border border-[#c6c5d6] rounded-xl py-2 px-3 text-slate-900 focus:outline-none focus:border-[#24389c]"
                        />
                      </div>

                      <div className="pt-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={activityModal.is_required}
                            onChange={(e) => setActivityModal({ ...activityModal, is_required: e.target.checked })}
                            className="w-4 h-4 text-[#24389c] rounded border-[#c6c5d6] focus:ring-0"
                          />
                          <span className="font-semibold text-slate-800">
                            Required for Stage Completion
                          </span>
                        </label>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setActivityModal((prev) => ({ ...prev, open: false }))}
                        className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={activitySaving}
                        className="bg-[#24389c] hover:bg-[#1a2b7a] text-white px-5 py-2 rounded-xl font-bold transition-all disabled:opacity-50"
                      >
                        {activitySaving
                          ? 'Saving...'
                          : activityModal.mode === 'add'
                          ? 'Add Activity'
                          : 'Save Changes'}
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* MODAL 5: EDUCATOR SUBMISSION REVIEW & FEEDBACK MODAL            */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          <AnimatePresence>
            {reviewModal.open && reviewModal.submission && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  className="bg-white rounded-3xl max-w-2xl w-full p-8 border border-[#e1e3e4] shadow-2xl max-h-[90vh] overflow-y-auto"
                >
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#24389c]">
                        Assessment & Feedback
                      </span>
                      <h3 className="text-xl font-bold font-['Hanken_Grotesk'] text-[#191c1e]">
                        Review Learner Submission
                      </h3>
                    </div>
                    <button
                      onClick={() => setReviewModal((prev) => ({ ...prev, open: false }))}
                      className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                    >
                      <span className="material-symbols-outlined">close</span>
                    </button>
                  </div>

                  {reviewModal.error && (
                    <div className="mb-4 p-3 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 text-xs font-medium">
                      {reviewModal.error}
                    </div>
                  )}

                  {/* Submission Context Card */}
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 mb-6 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-[#24389c] uppercase text-[10px] tracking-wider">
                        {reviewModal.submission.journey_title} • Stage {reviewModal.submission.stage_order}: {reviewModal.submission.stage_title}
                      </span>
                      <span className="font-bold text-slate-500">
                        Attempt #{reviewModal.submission.attempt_num}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900">
                      {reviewModal.submission.activity_title}
                    </h4>

                    {reviewModal.submission.activity_instructions && (
                      <p className="text-slate-600 bg-white p-3 rounded-xl border border-slate-100 leading-relaxed">
                        <strong className="text-slate-800">Prompt:</strong> {reviewModal.submission.activity_instructions}
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-slate-500 text-[11px]">
                      <span>Learner: <strong className="text-slate-800">{reviewModal.submission.learner_name}</strong> ({reviewModal.submission.learner_email})</span>
                      <span>Submitted: {new Date(reviewModal.submission.submitted_at).toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Current Submission Content */}
                  <div className="space-y-4 mb-6">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-[#24389c]">draft</span>
                      Learner Submission Deliverables
                    </h4>

                    {reviewModal.submission.response_text && (
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Written Response:
                        </label>
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-800 whitespace-pre-wrap leading-relaxed font-sans">
                          {reviewModal.submission.response_text}
                        </div>
                      </div>
                    )}

                    {reviewModal.submission.github_url && (
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Project URL / Repository Link:
                        </label>
                        <a
                          href={reviewModal.submission.github_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-[#24389c] rounded-xl text-xs font-bold border border-indigo-200 transition-colors"
                        >
                          <span className="material-symbols-outlined text-sm">open_in_new</span>
                          {reviewModal.submission.github_url}
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Submission History Accordion if multiple attempts exist */}
                  {reviewModal.submission.history && reviewModal.submission.history.length > 1 && (
                    <div className="mb-6 border border-slate-200 rounded-2xl p-4 bg-slate-50/50">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm text-amber-600">history</span>
                        Submission Attempts History ({reviewModal.submission.history.length})
                      </h4>
                      <div className="space-y-3">
                        {reviewModal.submission.history.map((hist) => (
                          <div
                            key={hist.id}
                            className={`p-3 rounded-xl border text-xs ${
                              hist.id === reviewModal.submission.id
                                ? 'bg-white border-[#24389c]/40 shadow-xs'
                                : 'bg-slate-100/70 border-slate-200 text-slate-600'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold text-slate-800">
                                Attempt #{hist.attempt_num} {hist.id === reviewModal.submission.id && '(Current)'}
                              </span>
                              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                                {hist.status}
                              </span>
                            </div>
                            {hist.response_text && (
                              <p className="line-clamp-2 italic text-[11px] text-slate-600 mb-1">
                                "{hist.response_text}"
                              </p>
                            )}
                            {hist.feedback && hist.feedback.length > 0 && (
                              <div className="text-[10px] text-slate-500 bg-amber-50/60 p-1.5 rounded-lg border border-amber-200/50 mt-1">
                                <strong>Feedback:</strong> {hist.feedback[0].comments}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Educator Feedback Entry Form */}
                  <div className="space-y-4 pt-4 border-t border-slate-100 text-xs">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Educator Feedback & Mentorship Comments <span className="text-slate-400 font-normal">(Required for revision requests)</span>
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Provide clear, encouraging, and actionable feedback on this submission..."
                        value={reviewModal.comments}
                        onChange={(e) => setReviewModal({ ...reviewModal, comments: e.target.value })}
                        className="w-full bg-[#f8f9fa] border border-[#c6c5d6] rounded-xl p-3 text-slate-900 focus:outline-none focus:border-[#24389c] focus:bg-white resize-none"
                      />
                    </div>

                    <div className="w-1/2">
                      <label className="block font-bold text-slate-700 mb-1">
                        Evaluation Score <span className="text-slate-400 font-normal">(Optional, 0 - 100)</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        placeholder="e.g. 95"
                        value={reviewModal.overall_score}
                        onChange={(e) => setReviewModal({ ...reviewModal, overall_score: e.target.value })}
                        className="w-full bg-[#f8f9fa] border border-[#c6c5d6] rounded-xl py-2 px-3 text-slate-900 focus:outline-none focus:border-[#24389c]"
                      />
                    </div>

                    {/* Review Actions */}
                    <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setReviewModal((prev) => ({ ...prev, open: false }))}
                        className="px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold transition-colors"
                      >
                        Close
                      </button>

                      <button
                        type="button"
                        disabled={reviewModal.saving}
                        onClick={() => handleSubmitReview('under_review')}
                        className="px-4 py-2.5 bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200 rounded-xl font-bold transition-all disabled:opacity-50"
                      >
                        Keep Under Review
                      </button>

                      <button
                        type="button"
                        disabled={reviewModal.saving}
                        onClick={() => handleSubmitReview('revision_requested')}
                        className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold transition-all disabled:opacity-50 shadow-sm"
                      >
                        Request Revision
                      </button>

                      <button
                        type="button"
                        disabled={reviewModal.saving}
                        onClick={() => handleSubmitReview('approved')}
                        className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all disabled:opacity-50 shadow-sm"
                      >
                        Approve Milestone
                      </button>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* MODAL 5: CREATE / EDIT WORKSHOP MODAL (PHASE 6A)                 */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          <AnimatePresence>
            {showEventModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white rounded-3xl max-w-2xl w-full p-8 border border-[#e1e3e4] shadow-2xl max-h-[92vh] overflow-y-auto"
                >
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#4353cf]">
                        Phase 6A • Workshop Authoring
                      </span>
                      <h3 className="text-xl font-bold font-['Hanken_Grotesk'] text-[#191c1e]">
                        {eventModalMode === 'create' ? 'Schedule New Workshop' : 'Edit Workshop Details'}
                      </h3>
                    </div>
                    <button
                      onClick={() => setShowEventModal(false)}
                      className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                      <span className="material-symbols-outlined">close</span>
                    </button>
                  </div>

                  {eventError && (
                    <div className="mb-4 p-3.5 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 text-xs font-semibold flex items-center gap-2">
                      <span className="material-symbols-outlined text-base">error</span>
                      <span>{eventError}</span>
                    </div>
                  )}

                  <form onSubmit={handleSaveEvent} className="space-y-4 text-xs">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Workshop Title <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Applied Microservices: Real-Time Event Driven Architecture"
                        value={eventForm.title}
                        onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                        className="w-full bg-[#f8f9fa] border border-[#c6c5d6] rounded-xl py-2.5 px-3.5 text-slate-900 focus:outline-none focus:border-[#4353cf] focus:bg-white text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Category</label>
                        <select
                          value={eventForm.category}
                          onChange={(e) => setEventForm({ ...eventForm, category: e.target.value })}
                          className="w-full bg-[#f8f9fa] border border-[#c6c5d6] rounded-xl py-2 px-3 text-slate-900 focus:outline-none focus:border-[#4353cf]"
                        >
                          <option value="AI & Digital">AI & Digital</option>
                          <option value="Career Growth">Career Growth</option>
                          <option value="Communication">Communication</option>
                          <option value="Engineering">Engineering</option>
                          <option value="Product & Design">Product & Design</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          Max Capacity (Seats) <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="500"
                          required
                          value={eventForm.max_capacity}
                          onChange={(e) => setEventForm({ ...eventForm, max_capacity: e.target.value })}
                          className="w-full bg-[#f8f9fa] border border-[#c6c5d6] rounded-xl py-2 px-3 text-slate-900 focus:outline-none focus:border-[#4353cf]"
                        />
                      </div>
                    </div>

                    {/* Pricing */}
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Registration Fee (₹ INR)
                      </label>
                      <div className="flex items-center gap-3">
                        <div className="relative flex-1">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-semibold text-sm">₹</span>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            placeholder="0 for free"
                            value={eventForm.price}
                            onChange={(e) => setEventForm({ ...eventForm, price: e.target.value })}
                            className="w-full bg-[#f8f9fa] border border-[#c6c5d6] rounded-xl py-2 pl-7 pr-3 text-slate-900 focus:outline-none focus:border-[#4353cf] focus:bg-white"
                          />
                        </div>
                        <span className="text-xs font-semibold text-[#757685] bg-slate-100 px-3 py-2 rounded-xl border border-slate-200">
                          INR
                        </span>
                      </div>
                      <p className="text-[11px] text-[#757685] mt-1">
                        Set to 0 for free workshop. Once published with confirmed registrations, pricing cannot be changed.
                      </p>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Session Overview / Description</label>
                      <textarea
                        rows={3}
                        placeholder="Describe session objectives, practical outcomes, and pre-requisites..."
                        value={eventForm.description}
                        onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                        className="w-full bg-[#f8f9fa] border border-[#c6c5d6] rounded-xl p-3 text-slate-900 focus:outline-none focus:border-[#4353cf] focus:bg-white resize-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Facilitator Name</label>
                        <input
                          type="text"
                          value={eventForm.facilitator_name}
                          onChange={(e) => setEventForm({ ...eventForm, facilitator_name: e.target.value })}
                          className="w-full bg-[#f8f9fa] border border-[#c6c5d6] rounded-xl py-2 px-3 text-slate-900 focus:outline-none focus:border-[#4353cf]"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Meeting URL (Google Meet/Zoom)</label>
                        <input
                          type="url"
                          placeholder="https://meet.google.com/xyz-abcd-efg"
                          value={eventForm.meeting_url}
                          onChange={(e) => setEventForm({ ...eventForm, meeting_url: e.target.value })}
                          className="w-full bg-[#f8f9fa] border border-[#c6c5d6] rounded-xl py-2 px-3 text-slate-900 focus:outline-none focus:border-[#4353cf]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Physical Venue (Optional, if in-person)</label>
                      <input
                        type="text"
                        placeholder="e.g. Innovation Hall, Building B, Room 302"
                        value={eventForm.venue}
                        onChange={(e) => setEventForm({ ...eventForm, venue: e.target.value })}
                        className="w-full bg-[#f8f9fa] border border-[#c6c5d6] rounded-xl py-2 px-3 text-slate-900 focus:outline-none focus:border-[#4353cf]"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          Starts At <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="datetime-local"
                          required
                          value={eventForm.starts_at}
                          onChange={(e) => setEventForm({ ...eventForm, starts_at: e.target.value })}
                          className="w-full bg-[#f8f9fa] border border-[#c6c5d6] rounded-xl py-2 px-2.5 text-slate-900 focus:outline-none focus:border-[#4353cf]"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          Ends At <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="datetime-local"
                          required
                          value={eventForm.ends_at}
                          onChange={(e) => setEventForm({ ...eventForm, ends_at: e.target.value })}
                          className="w-full bg-[#f8f9fa] border border-[#c6c5d6] rounded-xl py-2 px-2.5 text-slate-900 focus:outline-none focus:border-[#4353cf]"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          Registration Closes <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="datetime-local"
                          required
                          value={eventForm.registration_deadline}
                          onChange={(e) => setEventForm({ ...eventForm, registration_deadline: e.target.value })}
                          className="w-full bg-[#f8f9fa] border border-[#c6c5d6] rounded-xl py-2 px-2.5 text-slate-900 focus:outline-none focus:border-[#4353cf]"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setShowEventModal(false)}
                        className="px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={eventSaving}
                        className="bg-[#4353cf] hover:bg-[#3444b8] text-white px-6 py-2.5 rounded-xl font-bold transition-all disabled:opacity-50 shadow-sm flex items-center gap-1.5"
                      >
                        {eventSaving ? 'Saving...' : eventModalMode === 'create' ? 'Save as Draft' : 'Save Changes'}
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* MODAL 6: WORKSHOP ATTENDEES ROSTER MODAL (PHASE 6A)              */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          <AnimatePresence>
            {attendeesModal.open && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white rounded-3xl max-w-2xl w-full p-8 border border-[#e1e3e4] shadow-2xl max-h-[85vh] flex flex-col"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 mb-4 gap-3 shrink-0">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#4353cf]">
                          Attendee Roster
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          attendeesModal.event?.status === 'completed'
                            ? 'bg-purple-100 text-purple-800'
                            : attendeesModal.event?.status === 'published'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {attendeesModal.event?.status || 'Active'}
                        </span>
                      </div>
                      <h3 className="text-xl font-bold font-['Hanken_Grotesk'] text-[#191c1e]">
                        {attendeesModal.event?.title || 'Workshop Attendees'}
                      </h3>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#555664] mt-1">
                        <span>
                          Booked: <strong>{attendeesModal.registered_count}</strong> / {attendeesModal.event?.max_capacity || 0} seats
                        </span>
                        {attendeesModal.attendance_summary && (
                          <span className="text-[11px] font-semibold text-slate-600">
                            Attendance: <span className="text-emerald-700 font-bold">{attendeesModal.attendance_summary.present_count} Present</span> • <span className="text-rose-700 font-bold">{attendeesModal.attendance_summary.absent_count} Absent</span> • <span className="text-amber-700 font-bold">{attendeesModal.attendance_summary.unmarked_count} Unmarked</span>
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {attendeesModal.event?.status === 'published' && (
                        <button
                          onClick={() => handleCompleteWorkshop(attendeesModal.event.id)}
                          className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5"
                          title="Mark this workshop as completed to enable participant certificates"
                        >
                          <span className="material-symbols-outlined text-sm">verified</span>
                          Mark Completed
                        </button>
                      )}
                      <button
                        onClick={() => setAttendeesModal((prev) => ({ ...prev, open: false }))}
                        className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                      >
                        <span className="material-symbols-outlined">close</span>
                      </button>
                    </div>
                  </div>

                  {attendeesModal.loading ? (
                    <div className="py-12 text-center text-xs text-slate-500 animate-pulse">
                      Loading registered attendees...
                    </div>
                  ) : attendeesModal.error ? (
                    <div className="p-4 bg-rose-50 text-rose-700 rounded-2xl text-xs font-semibold mb-4">
                      {attendeesModal.error}
                    </div>
                  ) : attendeesModal.registrations.length === 0 ? (
                    <div className="py-12 text-center text-xs text-slate-500">
                      <span className="material-symbols-outlined text-3xl text-slate-300 block mb-2">
                        person_off
                      </span>
                      No learners have registered for this workshop yet.
                    </div>
                  ) : (
                    <div className="flex-grow overflow-y-auto pr-1">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-100 text-[#757685] uppercase tracking-wider font-bold">
                            <th className="pb-3 font-semibold">Learner</th>
                            <th className="pb-3 font-semibold">Email</th>
                            <th className="pb-3 font-semibold">Payment</th>
                            <th className="pb-3 font-semibold">Attendance</th>
                            <th className="pb-3 font-semibold text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {attendeesModal.registrations.map((reg) => (
                            <tr key={reg.id} className="hover:bg-slate-50/60 transition-colors">
                              <td className="py-3 font-bold text-[#191c1e]">
                                {reg.learner_name}
                                {reg.status !== 'registered' && (
                                  <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] bg-slate-100 text-slate-500 uppercase">
                                    {reg.status}
                                  </span>
                                )}
                              </td>
                              <td className="py-3 text-[#555664]">{reg.learner_email}</td>
                              <td className="py-3">
                                <span
                                  className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase tracking-wider ${
                                    reg.payment_status === 'paid'
                                      ? 'bg-emerald-50 text-emerald-700'
                                      : reg.payment_status === 'free'
                                      ? 'bg-slate-100 text-slate-600'
                                      : reg.payment_status === 'pending'
                                      ? 'bg-amber-50 text-amber-700'
                                      : 'bg-rose-50 text-rose-700'
                                  }`}
                                >
                                  {reg.payment_status === 'paid'
                                    ? `₹${((reg.amount_paid_paise || 0) / 100).toLocaleString('en-IN')}`
                                    : (reg.payment_status || 'free')}
                                </span>
                              </td>
                              <td className="py-3">
                                <span
                                  className={`px-2.5 py-1 rounded-full font-bold text-[10px] uppercase tracking-wider ${
                                    reg.attendance_status === 'present'
                                      ? 'bg-emerald-100 text-emerald-800 font-extrabold'
                                      : reg.attendance_status === 'absent'
                                      ? 'bg-rose-100 text-rose-800 font-extrabold'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}
                                >
                                  {reg.attendance_status === 'present' ? '✓ Present' : reg.attendance_status === 'absent' ? '✗ Absent' : '○ Unmarked'}
                                </span>
                              </td>
                              <td className="py-3 text-right">
                                {reg.status === 'registered' && (attendeesModal.event?.is_ended || attendeesModal.event?.status === 'completed') ? (
                                  <div className="inline-flex rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                                    <button
                                      onClick={() => handleMarkAttendance(attendeesModal.event.id, reg.user_id, 'present')}
                                      className={`px-2.5 py-1 text-[11px] font-bold transition-colors ${
                                        reg.attendance_status === 'present'
                                          ? 'bg-emerald-600 text-white'
                                          : 'bg-white text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
                                      }`}
                                    >
                                      Present
                                    </button>
                                    <button
                                      onClick={() => handleMarkAttendance(attendeesModal.event.id, reg.user_id, 'absent')}
                                      className={`px-2.5 py-1 text-[11px] font-bold transition-colors border-l border-slate-200 ${
                                        reg.attendance_status === 'absent'
                                          ? 'bg-rose-600 text-white'
                                          : 'bg-white text-slate-600 hover:bg-rose-50 hover:text-rose-700'
                                      }`}
                                    >
                                      Absent
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-slate-400 italic">
                                    {reg.status === 'registered' ? 'Available after scheduled end' : 'Not eligible'}
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div className="pt-4 border-t border-slate-100 shrink-0 flex justify-end">
                    <button
                      onClick={() => setAttendeesModal((prev) => ({ ...prev, open: false }))}
                      className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
                    >
                      Close Roster
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
