import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import eventService from '../services/event.service';

function formatFullDateTime(startsAt, endsAt) {
  if (!startsAt) return '';
  const start = new Date(startsAt);
  const end = endsAt ? new Date(endsAt) : null;

  const dateOptions = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };
  const timeOptions = { hour: 'numeric', minute: '2-digit', hour12: true };

  const dateStr = start.toLocaleDateString('en-US', dateOptions);
  const startTime = start.toLocaleTimeString('en-US', timeOptions);
  const endTime = end ? end.toLocaleTimeString('en-US', timeOptions) : '';

  return { dateStr, timeStr: `${startTime}${endTime ? ` - ${endTime}` : ''}` };
}

const EventDetail = () => {
  const { id: eventId } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Registration state
  const [isRegistered, setIsRegistered] = useState(false);
  const [_myRegistration, setMyRegistration] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Certificate state
  const [certEligibility, setCertEligibility] = useState(null);
  const [certData, setCertData] = useState(null);
  const [_certLoading, setCertLoading] = useState(false);
  const [certIssuing, setCertIssuing] = useState(false);
  const [certDownloading, setCertDownloading] = useState(false);

  const checkCertificateEligibility = useCallback(async () => {
    if (!isAuthenticated || !eventId) return;
    setCertLoading(true);
    try {
      const res = await eventService.getCertificateEligibility(eventId);
      setCertEligibility(res);
      if (res.certificate) {
        setCertData(res.certificate);
      }
    } catch {
      setCertEligibility(null);
    } finally {
      setCertLoading(false);
    }
  }, [eventId, isAuthenticated]);

  const fetchEventAndRegistrations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await eventService.getEventDetail(eventId);
      setEvent(res.event);

      // If user is authenticated, check their registration status
      if (isAuthenticated) {
        try {
          const regRes = await eventService.getMyRegistrations();
          const match = (regRes.registrations || []).find(
            (r) => r.event_id === eventId && ['registered', 'waitlisted'].includes(r.registration_status)
          );
          if (match) {
            setIsRegistered(true);
            setMyRegistration(match);
          } else if (res.event?.user_registration) {
            setIsRegistered(true);
            setMyRegistration(res.event.user_registration);
          } else {
            setIsRegistered(false);
            setMyRegistration(null);
          }
        } catch {
          if (res.event?.user_registration) {
            setIsRegistered(true);
            setMyRegistration(res.event.user_registration);
          }
        }
      }
    } catch (err) {
      setError(err.message || 'Event not found or unavailable.');
    } finally {
      setLoading(false);
    }
  }, [eventId, isAuthenticated]);

  useEffect(() => {
    fetchEventAndRegistrations();
  }, [fetchEventAndRegistrations]);

  useEffect(() => {
    if (isAuthenticated && eventId) {
      checkCertificateEligibility();
    }
  }, [isAuthenticated, eventId, checkCertificateEligibility]);

  // ── Workshop Certificate Actions ───────────────────────────────────────────
  const handleClaimCertificate = async () => {
    setCertIssuing(true);
    setActionMessage(null);
    try {
      const res = await eventService.issueWorkshopCertificate(eventId);
      setCertData(res.certificate);
      setCertEligibility({ eligible: true, already_issued: true, certificate: res.certificate });
      setActionMessage({
        type: 'success',
        text: `🎉 Certificate ${res.certificate?.certificate_number || ''} issued successfully!`,
      });
    } catch (err) {
      setActionMessage({
        type: 'error',
        text: err.response?.data?.message || err.message || 'Failed to issue workshop certificate.',
      });
    } finally {
      setCertIssuing(false);
    }
  };

  const handleDownloadCertificatePdf = async () => {
    if (!certData?.id) return;
    setCertDownloading(true);
    setActionMessage(null);
    try {
      const cleanTitle = (event?.title || 'Workshop').replace(/[^a-zA-Z0-9_-]/g, '_');
      await eventService.downloadWorkshopCertificatePdf(certData.id, `${cleanTitle}_Certificate.pdf`);
    } catch (err) {
      setActionMessage({
        type: 'error',
        text: err.response?.data?.message || err.message || 'Failed to download certificate PDF.',
      });
    } finally {
      setCertDownloading(false);
    }
  };

  // ── Free Workshop Registration ─────────────────────────────────────────────
  const handleRegister = async () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/events/${eventId}` } });
      return;
    }

    setActionLoading(true);
    setActionMessage(null);
    try {
      const res = await eventService.registerForEvent(eventId);
      setIsRegistered(true);
      setMyRegistration(res.registration);
      setActionMessage({
        type: 'success',
        text: '🎉 Registration confirmed! Your seat is reserved.',
      });
      fetchEventAndRegistrations();
    } catch (err) {
      setActionMessage({
        type: 'error',
        text: err.message || 'Unable to complete registration. The workshop may be full or closed.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // ── Paid Workshop Registration via Razorpay ────────────────────────────────
  const handlePaidRegister = async () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/events/${eventId}` } });
      return;
    }

    setActionLoading(true);
    setActionMessage(null);

    const { default: paymentService } = await import('../services/payment.service');

    await paymentService.initiatePayment({
      eventId: event.id,
      eventTitle: event.title,
      userEmail: user?.email || '',
      userName: user?.name || '',
      onSuccess: async (result) => {
        setActionLoading(false);
        if (result?.waitlisted) {
          setActionMessage({
            type: 'info',
            text: 'Payment received! The workshop reached capacity just as your payment was processed; your seat has been placed on administrative hold for resolution.',
          });
        } else {
          setActionMessage({
            type: 'success',
            text: `🎉 Payment verified and seat confirmed for ${event.title}!`,
          });
        }
        setIsRegistered(true);
        fetchEventAndRegistrations();
      },
      onFailure: (errMsg) => {
        setActionLoading(false);
        setActionMessage({
          type: 'error',
          text: errMsg || 'Payment or registration failed. Please try again.',
        });
      },
      onDismiss: () => {
        setActionLoading(false);
      },
    });
  };

  const handleCancelRegistration = async () => {
    setActionLoading(true);
    setActionMessage(null);
    setShowCancelModal(false);
    try {
      await eventService.cancelRegistration(eventId);
      setIsRegistered(false);
      setMyRegistration(null);
      setActionMessage({
        type: 'info',
        text: 'Your registration has been cancelled. Your seat has been released for other learners.',
      });
      // Refresh event count
      const updated = await eventService.getEventDetail(eventId);
      setEvent(updated.event);
    } catch (err) {
      setActionMessage({
        type: 'error',
        text: err.message || 'Failed to cancel registration.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-[#f7f9fc] min-h-screen flex flex-col font-['Inter']">
        <Navbar />
        <div className="max-w-[1080px] mx-auto px-6 md:px-12 pt-36 pb-20 w-full animate-pulse">
          <div className="h-6 bg-slate-200 rounded w-1/4 mb-6" />
          <div className="h-10 bg-slate-200 rounded w-3/4 mb-4" />
          <div className="h-6 bg-slate-200 rounded w-1/2 mb-10" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              <div className="h-40 bg-slate-200 rounded-3xl" />
              <div className="h-40 bg-slate-200 rounded-3xl" />
            </div>
            <div className="h-80 bg-slate-200 rounded-3xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="bg-[#f7f9fc] min-h-screen flex flex-col font-['Inter']">
        <Navbar />
        <div className="max-w-md mx-auto my-auto px-6 py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-3xl">event_busy</span>
          </div>
          <h2 className="text-2xl font-bold font-['Hanken_Grotesk'] text-[#191c1e] mb-2">
            Workshop Not Found
          </h2>
          <p className="text-sm text-[#757685] mb-6">
            {error || 'This event may have been cancelled or does not exist.'}
          </p>
          <Link
            to="/events"
            className="inline-flex items-center gap-2 bg-[#24389c] text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-sm"
          >
            <span className="material-symbols-outlined text-base">arrow_back</span>
            Back to Workshops
          </Link>
        </div>
      </div>
    );
  }

  const { dateStr, timeStr } = formatFullDateTime(event.starts_at, event.ends_at);
  const deadlineDate = new Date(event.registration_deadline);
  const isDeadlinePassed = deadlineDate < new Date();
  const isStarted = new Date(event.starts_at) < new Date();
  const isEnded = event.ends_at ? new Date(event.ends_at) <= new Date() : false;
  const capacityPct = Math.min(
    100,
    Math.round(((event.registered_count || 0) / (event.max_capacity || 1)) * 100)
  );

  return (
    <div className="bg-[#f7f9fc] text-[#191c1e] min-h-screen flex flex-col font-['Inter'] antialiased">
      <Navbar />

      <main className="flex-grow pt-28 pb-20">
        <div className="max-w-[1180px] mx-auto px-6 md:px-12">
          {/* Breadcrumb Navigation */}
          <div className="mb-6">
            <Link
              to="/events"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#454654] hover:text-[#24389c] transition-colors"
            >
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              All Workshops & Events
            </Link>
          </div>

          {/* Feedback banner */}
          <AnimatePresence>
            {actionMessage && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`p-4 rounded-2xl mb-6 text-sm font-semibold flex items-center justify-between border ${
                  actionMessage.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : actionMessage.type === 'info'
                    ? 'bg-blue-50 text-blue-800 border-blue-200'
                    : 'bg-rose-50 text-rose-800 border-rose-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-lg">
                    {actionMessage.type === 'success'
                      ? 'check_circle'
                      : actionMessage.type === 'info'
                      ? 'info'
                      : 'error'}
                  </span>
                  <span>{actionMessage.text}</span>
                </div>
                <button
                  onClick={() => setActionMessage(null)}
                  className="text-slate-500 hover:text-slate-800"
                >
                  <span className="material-symbols-outlined text-base">close</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main 2-Column Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left 2 Cols: Details & Description */}
            <div className="lg:col-span-2 space-y-6">
              {/* Event Card Header */}
              <div className="bg-white rounded-3xl p-8 border border-[#e1e3e4] shadow-sm">
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 bg-indigo-50 text-[#4353cf] rounded-xl border border-indigo-100">
                    {event.category || 'Workshop'}
                  </span>
                  {event.status === 'cancelled' ? (
                    <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 bg-rose-50 text-rose-700 rounded-xl border border-rose-200">
                      Cancelled
                    </span>
                  ) : event.is_full ? (
                    <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 bg-rose-50 text-rose-700 rounded-xl border border-rose-200">
                      Full
                    </span>
                  ) : isDeadlinePassed ? (
                    <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 bg-slate-100 text-slate-700 rounded-xl border border-slate-200">
                      Registration Closed
                    </span>
                  ) : (
                    <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200">
                      Open for Registration
                    </span>
                  )}
                </div>

                <h1 className="text-2xl md:text-4xl font-extrabold font-['Hanken_Grotesk'] text-[#191c1e] leading-tight mb-4">
                  {event.title}
                </h1>

                {/* Key session logistics */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6 border-t border-slate-100">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-[#4353cf] flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-xl">calendar_month</span>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#757685] uppercase tracking-wider">Date & Time</p>
                      <p className="text-sm font-semibold text-[#191c1e]">{dateStr}</p>
                      <p className="text-xs text-[#555664]">{timeStr}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-[#4353cf] flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-xl">
                        {event.venue ? 'location_on' : 'videocam'}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#757685] uppercase tracking-wider">Format & Location</p>
                      <p className="text-sm font-semibold text-[#191c1e]">
                        {event.venue ? 'In-Person Venue' : 'Live Online Session'}
                      </p>
                      <p className="text-xs text-[#555664] truncate max-w-[200px]">
                        {event.venue || 'Virtual classroom via Google Meet / Zoom'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Workshop Certificate Card */}
              {isAuthenticated && (isRegistered || certEligibility || event.status === 'completed' || isEnded) && (
                <div className="bg-white rounded-3xl p-7 border border-[#e1e3e4] shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#4353cf] via-indigo-500 to-emerald-500" />

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-xl">workspace_premium</span>
                      </div>
                      <div>
                        <h2 className="text-base font-bold font-['Hanken_Grotesk'] text-[#191c1e]">
                          Certificate of Participation
                        </h2>
                        <p className="text-xs text-[#757685]">
                          Verifiable credential for live workshop attendance
                        </p>
                      </div>
                    </div>

                    {certData && certData.status === 'issued' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 self-start sm:self-auto">
                        <span className="material-symbols-outlined text-xs">verified</span>
                        Verified &amp; Issued
                      </span>
                    )}
                  </div>

                  {certData && certData.status === 'issued' ? (
                    <div className="space-y-4">
                      <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold text-emerald-900">
                            Awarded to <strong className="font-bold">{certData.recipient_name || user?.name}</strong>
                          </p>
                          <p className="text-[11px] text-emerald-700 font-mono mt-0.5">
                            ID: {certData.certificate_number} • Issued: {new Date(certData.issued_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 pt-2">
                        <button
                          onClick={handleDownloadCertificatePdf}
                          disabled={certDownloading}
                          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-base">
                            {certDownloading ? 'sync' : 'download'}
                          </span>
                          <span>{certDownloading ? 'Generating PDF...' : 'Download Certificate PDF'}</span>
                        </button>

                        <Link
                          to={`/verify-certificate/${certData.verification_token}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-all"
                        >
                          <span className="material-symbols-outlined text-base text-[#4353cf]">verified</span>
                          <span>Verify Authenticity</span>
                          <span className="material-symbols-outlined text-xs">open_in_new</span>
                        </Link>
                      </div>
                    </div>
                  ) : certEligibility && (certEligibility.eligible || certEligibility.is_eligible) ? (
                    <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <p className="text-xs font-bold text-[#24389c]">
                            🎉 You are eligible for this certificate!
                          </p>
                          <p className="text-xs text-[#555664] mt-0.5">
                            Your attendance has been confirmed. Click below to issue your official verifiable certificate.
                          </p>
                        </div>
                        <button
                          onClick={handleClaimCertificate}
                          disabled={certIssuing}
                          className="px-5 py-2.5 bg-[#24389c] hover:bg-[#1a2b7a] disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-all whitespace-nowrap cursor-pointer flex items-center justify-center gap-2"
                        >
                          <span className="material-symbols-outlined text-base">workspace_premium</span>
                          <span>{certIssuing ? 'Issuing...' : 'Claim Certificate'}</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-[#555664]">
                      <div className="flex items-start gap-2.5">
                        <span className="material-symbols-outlined text-base text-slate-500 mt-0.5">info</span>
                        <div>
                          <span className="font-semibold text-slate-800">Certificate Status: </span>
                          <span>
                            {certEligibility?.reason ||
                              (Array.isArray(certEligibility?.reasons) && certEligibility.reasons[0]) ||
                              (event.status !== 'completed' && !isEnded
                                ? 'Available after the workshop has concluded and your attendance is verified by the instructor.'
                                : 'Attendance verification is pending or you were not recorded as present.')}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Description & Learning Outcomes */}
              <div className="bg-white rounded-3xl p-8 border border-[#e1e3e4] shadow-sm">
                <h2 className="text-xl font-bold font-['Hanken_Grotesk'] text-[#191c1e] mb-4">
                  About this Workshop
                </h2>
                <div className="text-sm text-[#454654] leading-relaxed whitespace-pre-line">
                  {event.description ||
                    'In this experiential masterclass, learners work through structured challenges under the guidance of industry facilitators. This live session aligns with the ELEVATE experiential framework, emphasizing applied problem solving and actionable feedback.'}
                </div>
              </div>

              {/* Facilitator Bio */}
              <div className="bg-white rounded-3xl p-8 border border-[#e1e3e4] shadow-sm">
                <h2 className="text-xl font-bold font-['Hanken_Grotesk'] text-[#191c1e] mb-4">
                  Meet Your Facilitator
                </h2>
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#24389c] to-[#4353cf] text-white flex items-center justify-center font-bold text-xl shadow-md shrink-0">
                    {event.facilitator_name ? event.facilitator_name.charAt(0).toUpperCase() : 'E'}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[#191c1e]">
                      {event.facilitator_name || 'ELEVATE Expert Instructor'}
                    </h3>
                    <p className="text-xs font-semibold text-[#4353cf] mb-2">
                      Educator & Industry Mentor
                    </p>
                    <p className="text-xs text-[#555664] leading-relaxed">
                      {event.facilitator_bio ||
                        'Certified mentor with extensive background in delivering interactive engineering cohorts and real-world project guidance.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Registration Card & Logistics */}
            <div className="space-y-6">
              {/* Registration Card */}
              <div className="bg-white rounded-3xl p-7 border border-[#e1e3e4] shadow-sm sticky top-28">
                <h3 className="text-lg font-bold font-['Hanken_Grotesk'] text-[#191c1e] mb-2">
                  Registration Details
                </h3>
                {/* Pricing display */}
                <div className="mb-4 p-3 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#4353cf]">
                    {Number(event.price) > 0 ? 'Workshop Fee' : 'Admission'}
                  </span>
                  {Number(event.price) > 0 ? (
                    <span className="text-base font-extrabold text-[#191c1e]">
                      ₹{Number(event.price).toLocaleString('en-IN')}
                      <span className="text-xs font-normal text-[#757685] ml-1">{event.currency || 'INR'}</span>
                    </span>
                  ) : (
                    <span className="text-base font-extrabold text-emerald-700">Free</span>
                  )}
                </div>

                {/* Capacity Status Bar */}
                <div className="mb-6 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center justify-between text-xs font-semibold text-[#191c1e] mb-2">
                    <span>Cohort Capacity</span>
                    <span>
                      {event.registered_count} / {event.max_capacity} Seats
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden mb-2">
                    <div
                      className={`h-full transition-all duration-500 ${
                        capacityPct >= 100
                          ? 'bg-rose-500'
                          : capacityPct > 80
                          ? 'bg-amber-500'
                          : 'bg-[#4353cf]'
                      }`}
                      style={{ width: `${capacityPct}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-[#757685]">
                    {event.seats_available > 0
                      ? `${event.seats_available} seats remaining`
                      : 'All seats booked'}
                  </p>
                </div>

                {/* Deadline Notice */}
                <div className="flex items-center gap-2.5 text-xs text-[#555664] mb-6 p-3 bg-amber-50/60 border border-amber-100 rounded-xl">
                  <span className="material-symbols-outlined text-[18px] text-amber-600">timer</span>
                  <span>
                    Registration closes on{' '}
                    <strong className="text-amber-900">
                      {deadlineDate.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </strong>
                  </span>
                </div>

                {/* Registration CTA Actions */}
                {isRegistered ? (
                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-center">
                      <span className="material-symbols-outlined text-3xl text-emerald-600 mb-1">
                        check_circle
                      </span>
                      <h4 className="text-sm font-bold text-emerald-800">You are Registered!</h4>
                      <p className="text-xs text-emerald-600 mt-1">
                        Seat confirmed under {user?.name}
                      </p>
                    </div>

                    {/* Meeting link display if registered */}
                    {event.meeting_url && (
                      <a
                        href={event.meeting_url}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-2"
                      >
                        <span className="material-symbols-outlined text-base">video_call</span>
                        Join Live Workshop
                      </a>
                    )}

                    {!isStarted && (
                      <button
                        onClick={() => setShowCancelModal(true)}
                        disabled={actionLoading}
                        className="w-full py-2.5 px-4 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-xl transition-all"
                      >
                        Cancel My Registration
                      </button>
                    )}
                  </div>
                ) : event.status === 'cancelled' ? (
                  <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-center">
                    <span className="material-symbols-outlined text-3xl text-rose-600 mb-1">
                      event_busy
                    </span>
                    <h4 className="text-sm font-bold text-rose-800">Workshop Cancelled</h4>
                    <p className="text-xs text-rose-600 mt-1">
                      This session was cancelled by the facilitator.
                    </p>
                  </div>
                ) : isDeadlinePassed ? (
                  <button
                    disabled
                    className="w-full py-3 px-4 rounded-xl text-xs font-bold bg-slate-100 text-slate-400 cursor-not-allowed text-center"
                  >
                    Registration Closed
                  </button>
                ) : event.is_full ? (
                  <button
                    disabled
                    className="w-full py-3 px-4 rounded-xl text-xs font-bold bg-slate-100 text-slate-400 cursor-not-allowed text-center"
                  >
                    Event Fully Booked
                  </button>
                ) : !isAuthenticated ? (
                  <div className="space-y-3">
                    <Link
                      to="/login"
                      state={{ from: `/events/${eventId}` }}
                      className="w-full py-3 px-4 rounded-xl text-xs font-bold bg-[#24389c] hover:bg-[#1a2b7a] text-white shadow-sm transition-all flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-base">login</span>
                      {Number(event.price) > 0
                        ? `Sign in to Pay ₹${Number(event.price).toLocaleString('en-IN')}`
                        : 'Sign in to Register (Free)'}
                    </Link>
                    <p className="text-[11px] text-center text-[#757685]">
                      Don't have an account?{' '}
                      <Link to="/register" className="text-[#4353cf] font-semibold hover:underline">
                        Create free account
                      </Link>
                    </p>
                  </div>
                ) : Number(event.price) > 0 ? (
                  <button
                    onClick={handlePaidRegister}
                    disabled={actionLoading}
                    className="w-full py-3.5 px-4 rounded-xl text-xs font-bold bg-[#24389c] hover:bg-[#1a2b7a] text-white shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 transform active:scale-[0.99]"
                  >
                    {actionLoading ? (
                      <>
                        <span className="material-symbols-outlined text-base animate-spin">
                          progress_activity
                        </span>
                        Processing Payment...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-base">payment</span>
                        Pay ₹{Number(event.price).toLocaleString('en-IN')} &amp; Register
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={handleRegister}
                    disabled={actionLoading}
                    className="w-full py-3.5 px-4 rounded-xl text-xs font-bold bg-[#24389c] hover:bg-[#1a2b7a] text-white shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 transform active:scale-[0.99]"
                  >
                    {actionLoading ? (
                      <>
                        <span className="material-symbols-outlined text-base animate-spin">
                          progress_activity
                        </span>
                        Reserving Seat...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-base">how_to_reg</span>
                        Register for Workshop (Free)
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Cancel Registration Confirmation Modal */}
      <AnimatePresence>
        {showCancelModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-slate-100"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-2xl">event_busy</span>
              </div>
              <h3 className="text-lg font-bold font-['Hanken_Grotesk'] text-[#191c1e] mb-2">
                Cancel Workshop Registration?
              </h3>
              <p className="text-xs text-[#555664] mb-6 leading-relaxed">
                Are you sure you want to release your seat for <strong>{event.title}</strong>? Another learner on the waiting list may claim this spot.
              </p>
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200 transition-all"
                >
                  Keep Registration
                </button>
                <button
                  onClick={handleCancelRegistration}
                  disabled={actionLoading}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-sm transition-all flex items-center gap-1.5"
                >
                  {actionLoading ? 'Cancelling...' : 'Yes, Cancel Registration'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EventDetail;
