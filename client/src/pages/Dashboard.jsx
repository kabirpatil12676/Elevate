import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import diagnosticService from '../services/diagnostic.service';
import learnerService from '../services/learner.service';
import portfolioService from '../services/portfolio.service';
import certificateService from '../services/certificate.service';
import eventService from '../services/event.service';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [eventsState, setEventsState] = useState({
    loading: true,
    registrations: [],
    error: null,
  });
  const [cancellingEventId, setCancellingEventId] = useState(null);
  const [eventActionMsg, setEventActionMsg] = useState(null);

  const [diagnosticState, setDiagnosticState] = useState({
    loading: true,
    submitted: false,
    needs: null,
    recommendations: [],
    catalogueNote: null,
  });

  const [enrollmentsState, setEnrollmentsState] = useState({
    loading: true,
    enrollments: [],
    totalCompletedLessons: 0,
    activitiesSummary: null,
  });

  const [portfolioState, setPortfolioState] = useState({
    loading: true,
    featuredCount: 0,
  });

  const [certificatesState, setCertificatesState] = useState({
    loading: true,
    certificates: [],
    byJourneyId: {},
  });

  const [issuingJourneyId, setIssuingJourneyId] = useState(null);
  const [downloadingCertId, setDownloadingCertId] = useState(null);
  const [retryingEmailId, setRetryingEmailId] = useState(null);
  const [certificateActionMsg, setCertificateActionMsg] = useState(null);

  const loadCombinedCertificates = async () => {
    const [certList, wsCertRes] = await Promise.all([
      certificateService.getMyCertificates().catch(() => []),
      eventService.getMyWorkshopCertificates().catch(() => ({ certificates: [] })),
    ]);
    const journeyList = Array.isArray(certList) ? certList : (certList?.certificates || []);
    const journeyCerts = journeyList.map((c) => ({ ...c, cert_type: 'journey' }));
    const wsCerts = (wsCertRes?.certificates || []).map((c) => ({
      ...c,
      cert_type: 'workshop',
      journey_title: c.workshop_title || c.event_title,
    }));
    const byJourney = {};
    journeyCerts.forEach((c) => {
      byJourney[c.journey_id] = c;
    });
    return { certificates: [...journeyCerts, ...wsCerts], byJourneyId: byJourney };
  };

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        const diagRes = await diagnosticService.getLearnerNeeds();
        if (mounted) {
          setDiagnosticState({
            loading: false,
            submitted: diagRes.submitted || false,
            needs: diagRes.needs || null,
            recommendations: diagRes.recommendations || [],
            catalogueNote: diagRes.catalogueNote || null,
          });
        }
      } catch {
        if (mounted) {
          setDiagnosticState({
            loading: false,
            submitted: false,
            needs: null,
            recommendations: [],
            catalogueNote: null,
          });
        }
      }

      try {
        const learnRes = await learnerService.getLearnerDashboard();
        if (mounted) {
          const list = learnRes.enrollments || [];
          const totalLessonsCompleted = list.reduce(
            (acc, curr) => acc + (curr.progress?.completed_lessons || 0),
            0
          );
          setEnrollmentsState({
            loading: false,
            enrollments: list,
            totalCompletedLessons: totalLessonsCompleted,
            activitiesSummary: learnRes.activities_summary || null,
          });
        }
      } catch {
        if (mounted) {
          setEnrollmentsState({
            loading: false,
            enrollments: [],
            totalCompletedLessons: 0,
            activitiesSummary: null,
          });
        }
      }

      try {
        const portRes = await portfolioService.getPortfolio();
        if (mounted) {
          setPortfolioState({
            loading: false,
            featuredCount: portRes.total_featured || 0,
          });
        }
      } catch {
        if (mounted) {
          setPortfolioState({
            loading: false,
            featuredCount: 0,
          });
        }
      }

      try {
        const merged = await loadCombinedCertificates();
        if (mounted) {
          setCertificatesState({
            loading: false,
            ...merged,
          });
        }
      } catch {
        if (mounted) {
          setCertificatesState({
            loading: false,
            certificates: [],
            byJourneyId: {},
          });
        }
      }

      try {
        const eventsRes = await eventService.getMyRegistrations();
        if (mounted) {
          setEventsState({
            loading: false,
            registrations: eventsRes.registrations || [],
            error: null,
          });
        }
      } catch {
        if (mounted) {
          setEventsState({
            loading: false,
            registrations: [],
            error: null,
          });
        }
      }
    }

    loadData();
    return () => {
      mounted = false;
    };
  }, []);

  const handleCancelEventRegistration = async (eventId, eventTitle) => {
    if (!window.confirm(`Are you sure you want to cancel your registration for "${eventTitle}"?`)) {
      return;
    }
    setCancellingEventId(eventId);
    setEventActionMsg(null);
    try {
      await eventService.cancelRegistration(eventId);
      const updated = await eventService.getMyRegistrations();
      setEventsState({
        loading: false,
        registrations: updated.registrations || [],
        error: null,
      });
      setEventActionMsg({
        type: 'success',
        text: `Your registration for "${eventTitle}" has been cancelled.`,
      });
    } catch (err) {
      setEventActionMsg({
        type: 'error',
        text: err.message || 'Failed to cancel registration.',
      });
    } finally {
      setCancellingEventId(null);
    }
  };

  const handleIssueCertificate = async (journeyId) => {
    setIssuingJourneyId(journeyId);
    setCertificateActionMsg(null);
    try {
      const res = await certificateService.issueCertificate(journeyId);
      const merged = await loadCombinedCertificates();
      setCertificatesState({
        loading: false,
        ...merged,
      });
      setCertificateActionMsg({
        type: 'success',
        text: `Certificate ${res.certificate?.certificate_number || ''} issued successfully!`,
      });
    } catch (err) {
      setCertificateActionMsg({
        type: 'error',
        text:
          err.response?.data?.message ||
          'Certificate issuance failed. Please ensure all curriculum lessons and required activities are completed.',
      });
    } finally {
      setIssuingJourneyId(null);
    }
  };

  const handleDownloadPdf = async (cert, journeyTitle) => {
    setDownloadingCertId(cert.id);
    setCertificateActionMsg(null);
    try {
      const cleanTitle = (journeyTitle || 'Certificate').replace(/[^a-zA-Z0-9_-]/g, '_');
      if (cert.cert_type === 'workshop') {
        await eventService.downloadWorkshopCertificatePdf(cert.id, `${cleanTitle}_Certificate.pdf`);
      } else {
        await certificateService.downloadCertificatePdf(cert.id, `${cleanTitle}_Certificate.pdf`);
      }
    } catch (err) {
      setCertificateActionMsg({
        type: 'error',
        text: err.response?.data?.message || 'Failed to download certificate PDF. Please try again.',
      });
    } finally {
      setDownloadingCertId(null);
    }
  };

  const handleRetryEmail = async (cert) => {
    const certId = typeof cert === 'object' ? cert.id : cert;
    const isWorkshop = typeof cert === 'object' && cert.cert_type === 'workshop';
    setRetryingEmailId(certId);
    setCertificateActionMsg(null);
    try {
      const res = isWorkshop
        ? await eventService.retryWorkshopCertificateEmail(certId)
        : await certificateService.retryEmail(certId);

      const merged = await loadCombinedCertificates();
      setCertificatesState((s) => ({ ...s, ...merged }));
      setCertificateActionMsg({
        type: 'success',
        text: res?.message || 'Certificate email delivery requested.',
      });
    } catch (err) {
      setCertificateActionMsg({
        type: 'error',
        text: err.response?.data?.message || 'Email delivery failed. Verify email server configuration.',
      });
    } finally {
      setRetryingEmailId(null);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="bg-[#f7f9fc] text-[#191c1e] min-h-screen flex flex-col font-['Inter'] antialiased">
      <Navbar />

      <main className="flex-grow pt-28 pb-20">
        <div className="max-w-[1280px] mx-auto px-6 md:px-12">
          {/* Welcome Banner */}
          <div className="bg-white rounded-3xl p-8 md:p-12 border border-[#e1e3e4] shadow-sm mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-[#4353cf] text-white flex items-center justify-center font-bold text-2xl shadow-md">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl md:text-3xl font-bold text-[#191c1e] font-['Hanken_Grotesk']">
                    Welcome, {user?.name || 'Learner'}!
                  </h1>
                  <span className="text-xs uppercase font-bold tracking-wider px-3 py-1 bg-[#4353cf]/10 text-[#4353cf] rounded-full">
                    {user?.role || 'learner'}
                  </span>
                </div>
                <p className="text-sm text-[#454654] mt-1">{user?.email}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <Link
                to="/growth-report"
                className="flex-1 md:flex-none text-center bg-[#4353cf] hover:bg-[#2435b4] text-white font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm text-sm flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[18px]">analytics</span>
                Growth Report
              </Link>
              <Link
                to="/portfolio"
                className="flex-1 md:flex-none text-center border border-[#4353cf] text-[#4353cf] hover:bg-[#4353cf]/10 font-semibold px-4 py-2.5 rounded-xl transition-colors text-sm flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[18px]">folder_special</span>
                My Portfolio
              </Link>
              <Link
                to="/learning-needs"
                className="flex-1 md:flex-none text-center border border-[#c6c5d6] hover:border-[#4353cf] text-[#454654] font-semibold px-4 py-2.5 rounded-xl transition-colors text-sm"
              >
                {diagnosticState.submitted ? 'Diagnostic' : 'Questionnaire'}
              </Link>
              <Link
                to="/events"
                className="flex-1 md:flex-none text-center border border-[#c6c5d6] hover:border-[#4353cf] text-[#454654] font-semibold px-4 py-2.5 rounded-xl transition-colors text-sm flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[18px]">groups</span>
                Workshops
              </Link>
              <Link
                to="/courses"
                className="flex-1 md:flex-none text-center border border-[#c6c5d6] hover:border-[#4353cf] text-[#454654] font-semibold px-4 py-2.5 rounded-xl transition-colors text-sm"
              >
                Browse
              </Link>
              <button
                onClick={handleLogout}
                className="flex-1 md:flex-none text-center border border-[#c6c5d6] hover:border-[#ba1a1a] text-[#454654] hover:text-[#ba1a1a] font-semibold px-4 py-2.5 rounded-xl transition-colors text-sm"
              >
                Log out
              </button>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5 mb-10">
            <div className="bg-white p-6 rounded-2xl border border-[#e1e3e4] shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-[#757685] uppercase tracking-wider">
                  Diagnostic Status
                </span>
                <span className="material-symbols-outlined text-[#4353cf]">psychology</span>
              </div>
              <div className="text-2xl font-extrabold text-[#191c1e] font-['Hanken_Grotesk']">
                {diagnosticState.loading
                  ? '...'
                  : diagnosticState.submitted
                  ? 'Evaluated'
                  : 'Pending'}
              </div>
              <p className="text-xs text-[#757685] mt-1">
                {diagnosticState.submitted
                  ? `${diagnosticState.needs?.academic_year || 'Undergraduate'} Profile Saved`
                  : 'Complete to unlock tailored recommendations'}
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-[#e1e3e4] shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-[#757685] uppercase tracking-wider">
                  Enrolled Journeys
                </span>
                <span className="material-symbols-outlined text-[#4353cf]">school</span>
              </div>
              <div className="text-2xl font-extrabold text-[#191c1e] font-['Hanken_Grotesk'] truncate">
                {enrollmentsState.loading
                  ? '...'
                  : `${enrollmentsState.enrollments.length} Active`}
              </div>
              <p className="text-xs text-[#757685] mt-1">
                {enrollmentsState.enrollments.length > 0
                  ? 'Experiential learning in progress'
                  : 'Enroll to start learning'}
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-[#e1e3e4] shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-[#757685] uppercase tracking-wider">
                  Completed Lessons
                </span>
                <span className="material-symbols-outlined text-emerald-600">task_alt</span>
              </div>
              <div className="text-2xl font-extrabold text-[#191c1e] font-['Hanken_Grotesk']">
                {enrollmentsState.loading ? '...' : enrollmentsState.totalCompletedLessons}
              </div>
              <p className="text-xs text-[#757685] mt-1">
                Video capsules verified & tracked
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-[#e1e3e4] shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-[#757685] uppercase tracking-wider">
                  Practical Activities
                </span>
                <span className="material-symbols-outlined text-[#24389c]">assignment_turned_in</span>
              </div>
              <div className="text-2xl font-extrabold text-[#191c1e] font-['Hanken_Grotesk']">
                {enrollmentsState.loading
                  ? '...'
                  : `${enrollmentsState.activitiesSummary?.approved_activities || 0} Approved`}
              </div>
              <p className="text-xs text-[#757685] mt-1">
                {enrollmentsState.activitiesSummary?.pending_review || 0} in review
                {enrollmentsState.activitiesSummary?.revision_requested
                  ? ` • ${enrollmentsState.activitiesSummary.revision_requested} revision`
                  : ''}
              </p>
            </div>

            <Link
              to="/portfolio"
              className="bg-white p-6 rounded-2xl border border-[#e1e3e4] hover:border-[#4353cf]/60 shadow-sm transition-all block group"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-[#757685] group-hover:text-[#4353cf] uppercase tracking-wider transition-colors">
                  My Portfolio
                </span>
                <span className="material-symbols-outlined text-[#4353cf]">folder_special</span>
              </div>
              <div className="text-2xl font-extrabold text-[#191c1e] font-['Hanken_Grotesk']">
                {portfolioState.loading ? '...' : `${portfolioState.featuredCount} Featured`}
              </div>
              <p className="text-xs text-[#757685] group-hover:text-[#4353cf] transition-colors mt-1 flex items-center gap-1">
                Curate personal showcase
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </p>
            </Link>

            <div className="bg-white p-6 rounded-2xl border border-[#e1e3e4] shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-[#757685] uppercase tracking-wider">
                  Certificates
                </span>
                <span className="material-symbols-outlined text-amber-600">workspace_premium</span>
              </div>
              <div className="text-2xl font-extrabold text-[#191c1e] font-['Hanken_Grotesk']">
                {certificatesState.loading ? '...' : `${certificatesState.certificates.length} Issued`}
              </div>
              <p className="text-xs text-[#757685] mt-1">
                {certificatesState.certificates.length > 0
                  ? 'Verifiable credentials'
                  : 'Complete journeys to earn'}
              </p>
            </div>
          </div>

          {/* Action Notification Alert */}
          {certificateActionMsg && (
            <div
              className={`p-4 rounded-2xl mb-8 text-sm flex items-center justify-between shadow-xs transition-all ${
                certificateActionMsg.type === 'success'
                  ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                  : 'bg-red-50 text-red-900 border border-red-200'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-lg">
                  {certificateActionMsg.type === 'success' ? 'check_circle' : 'error'}
                </span>
                <span className="font-medium">{certificateActionMsg.text}</span>
              </div>
              <button
                onClick={() => setCertificateActionMsg(null)}
                className="text-xs font-bold uppercase tracking-wider underline hover:opacity-80 ml-4 cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* ── Verified Certificates Showcase ─────────────────────────────── */}
          {certificatesState.certificates.length > 0 && (
            <div className="mb-10">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1">
                    <span className="material-symbols-outlined text-sm">verified</span>
                    Authenticated Credentials
                  </div>
                  <h2 className="text-2xl font-bold text-[#191c1e] font-['Hanken_Grotesk']">
                    My Verified Certificates
                  </h2>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {certificatesState.certificates.map((cert) => (
                  <div
                    key={cert.id}
                    className="bg-white rounded-3xl p-6 border border-emerald-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-emerald-100/50 to-transparent rounded-bl-full pointer-events-none" />
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full bg-emerald-100 text-emerald-800">
                            {cert.status === 'revoked' ? 'Revoked' : 'Verified & Issued'}
                          </span>
                          <span className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-md ${cert.cert_type === 'workshop' ? 'bg-purple-100 text-purple-800' : 'bg-indigo-100 text-[#4353cf]'}`}>
                            {cert.cert_type === 'workshop' ? 'Workshop' : 'Journey'}
                          </span>
                        </div>
                        <span className="text-[11px] font-mono font-semibold text-slate-500">
                          {cert.certificate_number}
                        </span>
                      </div>

                      <h3 className="font-bold text-lg text-[#191c1e] font-['Hanken_Grotesk'] line-clamp-1 mb-1">
                        {cert.journey_title || 'Growth Journey'}
                      </h3>
                      <p className="text-xs text-[#757685]">
                        Issued on{' '}
                        {cert.issued_at
                          ? new Date(cert.issued_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })
                          : 'N/A'}
                      </p>

                      <div className="mt-4 pt-3 border-t border-slate-100 text-xs flex items-center justify-between text-[#757685]">
                        <span>Email Delivery:</span>
                        <span className="flex items-center gap-1 font-semibold">
                          {cert.email_status === 'sent' && (
                            <span className="text-emerald-700 flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">mail</span> Sent
                            </span>
                          )}
                          {cert.email_status === 'failed' && (
                            <span className="text-amber-700 flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">error</span> Delivery Issue
                            </span>
                          )}
                          {cert.email_status === 'not_configured' && (
                            <span className="text-slate-500">Unconfigured</span>
                          )}
                          {(!cert.email_status || cert.email_status === 'pending') && (
                            <span className="text-slate-500">Pending</span>
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="mt-6 pt-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDownloadPdf(cert, cert.journey_title)}
                          disabled={downloadingCertId === cert.id}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[16px]">
                            {downloadingCertId === cert.id ? 'sync' : 'download'}
                          </span>
                          <span>{downloadingCertId === cert.id ? 'Downloading...' : 'Download PDF'}</span>
                        </button>

                        <Link
                          to={`/verify-certificate/${cert.verification_token}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-1 px-3 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold text-xs rounded-xl transition-all shadow-2xs"
                          title="Public Verification Link"
                        >
                          <span className="material-symbols-outlined text-[16px]">verified</span>
                          <span>Verify</span>
                        </Link>
                      </div>

                      {cert.email_status === 'failed' && (
                        <button
                          onClick={() => handleRetryEmail(cert)}
                          disabled={retryingEmailId === cert.id}
                          className="w-full text-center text-[11px] font-semibold text-amber-700 hover:text-amber-900 py-1 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[13px]">refresh</span>
                          {retryingEmailId === cert.id ? 'Retrying delivery...' : 'Resend Certificate Email'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── My Enrolled Growth Journeys ───────────────────────────────── */}
          <div className="mb-10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-[#4353cf] uppercase tracking-wider mb-1">
                  <span className="material-symbols-outlined text-sm">play_circle</span>
                  Active Learning
                </div>
                <h2 className="text-2xl font-bold text-[#191c1e] font-['Hanken_Grotesk']">
                  My Enrolled Journeys
                </h2>
              </div>
              {enrollmentsState.enrollments.length > 0 && (
                <Link
                  to="/courses"
                  className="text-xs font-semibold text-[#4353cf] hover:underline flex items-center gap-1"
                >
                  Explore More Journeys
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </Link>
              )}
            </div>

            {enrollmentsState.loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
                {[1, 2].map((i) => (
                  <div key={i} className="h-48 bg-white rounded-3xl border border-[#e1e3e4]" />
                ))}
              </div>
            ) : enrollmentsState.enrollments.length === 0 ? (
              <div className="bg-white rounded-3xl p-8 md:p-10 border border-[#e1e3e4] text-center max-w-xl mx-auto shadow-sm">
                <div className="w-16 h-16 rounded-2xl bg-[#4353cf]/10 text-[#4353cf] flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-3xl">school</span>
                </div>
                <h3 className="text-xl font-bold text-[#191c1e] font-['Hanken_Grotesk'] mb-2">
                  Start Your First Growth Journey
                </h3>
                <p className="text-sm text-[#454654] leading-relaxed mb-6">
                  You are not currently enrolled in any Growth Journeys. Choose from our curated experiential learning tracks to start mastering engineering skills.
                </p>
                <Link
                  to="/courses"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#4353cf] hover:bg-[#3444b8] text-white text-sm font-semibold rounded-xl shadow-md transition-all"
                >
                  Browse Course Catalogue
                  <span className="material-symbols-outlined text-base">arrow_forward</span>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {enrollmentsState.enrollments.map((item) => {
                  const j = item.journey;
                  const prog = item.progress || {};
                  const pct = prog.progress_pct || 0;
                  const cert = certificatesState.byJourneyId[j.id];

                  const isLessonsComplete =
                    (prog.total_lessons || 0) > 0 &&
                    (prog.completed_lessons || 0) >= (prog.total_lessons || 0);
                  const isActivitiesApproved =
                    (prog.total_activities || 0) === 0 ||
                    (prog.approved_activities || 0) >= (prog.total_activities || 0);
                  const isEligible = isLessonsComplete && isActivitiesApproved;

                  return (
                    <div
                      key={j.id}
                      className="bg-white rounded-3xl p-6 border border-[#e1e3e4] hover:border-[#4353cf]/40 hover:shadow-md transition-all flex flex-col justify-between"
                    >
                      <div className="space-y-4">
                        <div className="flex items-center justify-between gap-2">
                          <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full bg-[#4353cf]/10 text-[#4353cf]">
                            {j.category || 'General'}
                          </span>
                          <span className="text-xs text-[#757685] font-medium">
                            {j.difficulty}
                          </span>
                        </div>

                        <div>
                          <h3 className="font-bold text-lg text-[#191c1e] font-['Hanken_Grotesk'] line-clamp-1 hover:text-[#4353cf] transition-colors">
                            <Link to={`/learn/${j.id}`}>{j.title}</Link>
                          </h3>
                          <p className="text-xs text-[#454654] mt-1 line-clamp-2 leading-relaxed">
                            {j.description}
                          </p>
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-1.5 pt-2 border-t border-[#e1e3e4]">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-[#757685] font-medium">Progress</span>
                            <span className="font-bold text-[#191c1e]">
                              {prog.completed_lessons || 0} / {prog.total_lessons || 0} ({pct}%)
                            </span>
                          </div>
                          <div className="w-full h-2 bg-[#f0f2fa] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-[#4353cf] to-emerald-500 rounded-full transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>

                        {/* Next Lesson Indicator */}
                        {prog.next_lesson && (
                          <div className="bg-[#f7f9fc] p-3 rounded-xl border border-[#e1e3e4] flex items-center gap-2 text-xs">
                            <span className="material-symbols-outlined text-sm text-[#4353cf]">
                              play_circle
                            </span>
                            <div className="truncate">
                              <span className="text-[#757685]">Up Next: </span>
                              <span className="font-semibold text-[#191c1e]">
                                {prog.next_lesson.lesson_title}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Practical Activity Milestones */}
                        {prog.total_activities > 0 && (
                          <div className="flex items-center justify-between text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                            <span className="flex items-center gap-1.5 font-medium text-slate-700">
                              <span className="material-symbols-outlined text-sm text-[#4353cf]">
                                assignment
                              </span>
                              Practical Activities
                            </span>
                            <span className="font-bold text-slate-900">
                              {prog.approved_activities || 0} / {prog.total_activities}
                              {prog.revision_requested_activities > 0 && (
                                <span className="ml-1 text-amber-600 font-extrabold text-[10px]">
                                  (Revision Req)
                                </span>
                              )}
                            </span>
                          </div>
                        )}

                        {/* Certificate Status / Eligibility / Claim Section */}
                        {cert ? (
                          <div className="bg-emerald-50/80 border border-emerald-200/90 p-3 rounded-2xl text-xs space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-emerald-800 flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-[16px] text-emerald-600">
                                  verified
                                </span>
                                Certificate Issued
                              </span>
                              <span className="font-mono text-[10px] font-bold text-emerald-700 bg-white px-2 py-0.5 rounded border border-emerald-200">
                                {cert.certificate_number}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 pt-1">
                              <button
                                onClick={() => handleDownloadPdf(cert, j.title)}
                                disabled={downloadingCertId === cert.id}
                                className="flex-1 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-[14px]">
                                  {downloadingCertId === cert.id ? 'sync' : 'download'}
                                </span>
                                {downloadingCertId === cert.id ? 'Downloading...' : 'PDF'}
                              </button>
                              <Link
                                to={`/verify-certificate/${cert.verification_token}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="py-1.5 px-3 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                              >
                                <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                                Verify
                              </Link>
                            </div>
                          </div>
                        ) : isEligible ? (
                          <div className="bg-indigo-50/90 border border-indigo-200 p-3 rounded-2xl text-xs space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-indigo-900 flex items-center gap-1">
                                <span className="material-symbols-outlined text-[16px] text-[#4353cf]">
                                  workspace_premium
                                </span>
                                Requirements Met!
                              </span>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-[#4353cf] bg-white px-2 py-0.5 rounded border border-indigo-200">
                                Eligible
                              </span>
                            </div>
                            <p className="text-[11px] text-indigo-700 leading-snug">
                              All curriculum lessons and required activities are completed and approved.
                            </p>
                            <button
                              onClick={() => handleIssueCertificate(j.id)}
                              disabled={issuingJourneyId === j.id}
                              className="w-full py-2 px-3 bg-[#4353cf] hover:bg-[#2435b4] disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[16px]">
                                {issuingJourneyId === j.id ? 'sync' : 'verified'}
                              </span>
                              {issuingJourneyId === j.id ? 'Issuing Certificate...' : 'Claim Verified Certificate'}
                            </button>
                          </div>
                        ) : (
                          <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl text-xs space-y-1.5 text-slate-600">
                            <div className="flex items-center justify-between font-semibold text-slate-700">
                              <span className="flex items-center gap-1 text-[11px]">
                                <span className="material-symbols-outlined text-[14px] text-slate-400">
                                  pending
                                </span>
                                Certificate Eligibility:
                              </span>
                              <span className="text-[10px] uppercase font-bold text-slate-500">In Progress</span>
                            </div>
                            <div className="space-y-1 text-[11px]">
                              <div
                                className={`flex items-center justify-between ${
                                  isLessonsComplete ? 'text-emerald-700 font-medium' : 'text-slate-600'
                                }`}
                              >
                                <span>• Lessons Completed:</span>
                                <span>
                                  {prog.completed_lessons || 0} / {prog.total_lessons || 0} {isLessonsComplete ? '✓' : ''}
                                </span>
                              </div>
                              {prog.total_activities > 0 && (
                                <div
                                  className={`flex items-center justify-between ${
                                    isActivitiesApproved ? 'text-emerald-700 font-medium' : 'text-slate-600'
                                  }`}
                                >
                                  <span>• Approved Activities:</span>
                                  <span>
                                    {prog.approved_activities || 0} / {prog.total_activities} {isActivitiesApproved ? '✓' : ''}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="mt-5 pt-3">
                        <Link
                          to={`/learn/${j.id}`}
                          className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#4353cf] hover:bg-[#3444b8] text-white font-semibold text-xs rounded-xl shadow-sm transition-all"
                        >
                          <span className="material-symbols-outlined text-base">play_arrow</span>
                          <span>{pct > 0 ? 'Continue Learning' : 'Start Journey'}</span>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── My Registered Workshops & Masterclasses (Phase 6A) ─────────── */}
          <div className="mb-10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-[#4353cf] uppercase tracking-wider mb-1">
                  <span className="material-symbols-outlined text-sm">groups</span>
                  Live Experiential Learning
                </div>
                <h2 className="text-2xl font-bold text-[#191c1e] font-['Hanken_Grotesk']">
                  My Registered Workshops
                </h2>
              </div>
              <Link
                to="/events"
                className="text-xs font-semibold text-[#4353cf] hover:underline flex items-center gap-1"
              >
                Browse All Workshops
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </Link>
            </div>

            {eventActionMsg && (
              <div
                className={`p-4 rounded-2xl mb-6 text-xs font-semibold flex items-center justify-between border ${
                  eventActionMsg.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border-rose-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-base">
                    {eventActionMsg.type === 'success' ? 'check_circle' : 'error'}
                  </span>
                  <span>{eventActionMsg.text}</span>
                </div>
                <button
                  onClick={() => setEventActionMsg(null)}
                  className="text-slate-500 hover:text-slate-700"
                >
                  <span className="material-symbols-outlined text-base">close</span>
                </button>
              </div>
            )}

            {eventsState.loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
                {[1, 2].map((i) => (
                  <div key={i} className="h-44 bg-white rounded-3xl border border-[#e1e3e4]" />
                ))}
              </div>
            ) : eventsState.registrations.length === 0 ? (
              <div className="bg-white rounded-3xl p-8 border border-[#e1e3e4] text-center max-w-xl mx-auto shadow-sm">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-[#4353cf] flex items-center justify-center mx-auto mb-3">
                  <span className="material-symbols-outlined text-2xl">event_available</span>
                </div>
                <h3 className="text-lg font-bold text-[#191c1e] font-['Hanken_Grotesk'] mb-1">
                  No Workshop Registrations Yet
                </h3>
                <p className="text-xs text-[#555664] leading-relaxed mb-5">
                  Enhance your learning journey by joining live cohort masterclasses. Interact with industry facilitators and peers in real-time practical sessions.
                </p>
                <Link
                  to="/events"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#4353cf] hover:bg-[#3444b8] text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                >
                  <span>Explore Upcoming Workshops</span>
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {eventsState.registrations.map((reg) => {
                  const isPast = new Date(reg.starts_at).getTime() < Date.now();
                  const isRegistered = reg.registration_status === 'registered';

                  return (
                    <div
                      key={reg.registration_id}
                      className="bg-white rounded-3xl border border-[#e1e3e4] shadow-sm p-6 flex flex-col justify-between hover:border-[#4353cf]/40 transition-all"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-lg bg-indigo-50 text-[#4353cf] border border-indigo-100">
                            {reg.category || 'Workshop'}
                          </span>
                          <span
                            className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-lg border ${
                              isRegistered
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-slate-100 text-slate-500 border-slate-200'
                            }`}
                          >
                            {isRegistered ? 'Registered' : 'Cancelled'}
                          </span>
                        </div>

                        <Link
                          to={`/events/${reg.event_id}`}
                          className="font-bold text-base text-[#191c1e] font-['Hanken_Grotesk'] hover:text-[#4353cf] transition-colors line-clamp-2 mb-2 block"
                        >
                          {reg.title}
                        </Link>

                        <div className="space-y-1.5 text-xs text-[#555664] mb-4">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm text-[#4353cf]">person</span>
                            <span>{reg.facilitator_name || 'ELEVATE Mentor'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm text-[#4353cf]">
                              calendar_today
                            </span>
                            <span>
                              {new Date(reg.starts_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm text-[#4353cf]">
                              {reg.venue ? 'location_on' : 'videocam'}
                            </span>
                            <span className="truncate">{reg.venue || 'Live Online Cohort'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center gap-2">
                        {isRegistered && reg.meeting_url && !isPast && (
                          <a
                            href={reg.meeting_url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all text-center flex items-center justify-center gap-1"
                          >
                            <span className="material-symbols-outlined text-sm">video_call</span>
                            Join
                          </a>
                        )}
                        <Link
                          to={`/events/${reg.event_id}`}
                          className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all text-center"
                        >
                          {isRegistered && (isPast || reg.event_status === 'completed')
                            ? 'Certificate'
                            : 'Details'}
                        </Link>
                        {isRegistered && !isPast && (
                          <button
                            onClick={() => handleCancelEventRegistration(reg.event_id, reg.title)}
                            disabled={cancellingEventId === reg.event_id}
                            className="py-2 px-3 text-rose-600 hover:bg-rose-50 border border-rose-200 text-xs font-semibold rounded-xl transition-all"
                            title="Cancel registration"
                          >
                            {cancellingEventId === reg.event_id ? '...' : 'Cancel'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section: Diagnostic Questionnaire Banner or Recommendations List */}
          {!diagnosticState.loading && (
            <div className="mb-10">
              {!diagnosticState.submitted ? (
                /* High-converting Callout when diagnostic is not submitted */
                <div className="bg-gradient-to-br from-[#f0f2fa] to-[#e4e9f7] border border-[#d9dff5] p-8 md:p-10 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-8 shadow-sm">
                  <div className="space-y-3 max-w-2xl">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#4353cf]/10 text-[#4353cf] text-xs font-bold rounded-full uppercase tracking-wider">
                      <span className="material-symbols-outlined text-sm">psychology</span>
                      Personalized Experiential Learning Path
                    </div>
                    <h2 className="text-2xl md:text-3xl font-bold text-[#191c1e] font-['Hanken_Grotesk']">
                      Discover Your Ideal Growth Journey
                    </h2>
                    <p className="text-sm text-[#454654] leading-relaxed">
                      Complete our 2-minute diagnostic questionnaire to identify your practical skill gaps,
                      engineering standing, and project priorities. Receive transparent, rule-matched recommendations
                      across all published ELEVATE Growth Journeys.
                    </p>
                  </div>

                  <Link
                    to="/learning-needs"
                    className="inline-flex items-center gap-2 px-8 py-4 bg-[#4353cf] hover:bg-[#2435b4] text-white font-bold rounded-2xl shadow-md hover:shadow-lg transition-all shrink-0 text-sm group"
                  >
                    Start Questionnaire
                    <span className="material-symbols-outlined text-base group-hover:translate-x-1 transition-transform">
                      arrow_forward
                    </span>
                  </Link>
                </div>
              ) : (
                /* Recommendations Card on Dashboard */
                <div className="bg-white rounded-3xl p-8 border border-[#e1e3e4] shadow-sm space-y-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#e1e3e4] pb-6">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-bold text-[#4353cf] uppercase tracking-wider mb-1">
                        <span className="material-symbols-outlined text-sm">verified</span>
                        Personalized Recommendations
                      </div>
                      <h2 className="text-2xl font-bold text-[#191c1e] font-['Hanken_Grotesk']">
                        Recommended Journeys for Your Profile
                      </h2>
                    </div>

                    <div className="flex items-center gap-3">
                      <Link
                        to="/learning-needs"
                        className="inline-flex items-center gap-2 px-4 py-2 border border-[#c6c5d6] hover:border-[#4353cf] text-[#4353cf] font-semibold text-xs rounded-xl transition-colors"
                      >
                        <span className="material-symbols-outlined text-sm">tune</span>
                        Adjust Responses
                      </Link>
                    </div>
                  </div>

                  {diagnosticState.catalogueNote && (
                    <div className="bg-[#fff9eb] border border-[#f5dfa8] rounded-2xl p-4 text-xs text-[#734900] flex items-start gap-3">
                      <span className="material-symbols-outlined text-[#b87405] text-base mt-0.5">info</span>
                      <div>{diagnosticState.catalogueNote}</div>
                    </div>
                  )}

                  {diagnosticState.recommendations.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-sm text-[#454654] mb-3">
                        No high-confidence matches found in the current catalogue for your specific criteria.
                      </p>
                      <Link
                        to="/courses"
                        className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#4353cf] text-white text-xs font-semibold rounded-xl"
                      >
                        Browse All Courses
                      </Link>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {diagnosticState.recommendations.map((rec, i) => (
                        <div
                          key={rec.journey.id}
                          className="bg-[#f7f9fc] rounded-2xl p-6 border border-[#e1e3e4] hover:border-[#4353cf]/40 transition-all flex flex-col justify-between"
                        >
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="px-2 py-0.5 bg-[#4353cf] text-white text-[10px] font-bold rounded">
                                #{i + 1} Match
                              </span>
                              <span className="text-xs font-bold text-[#4353cf]">
                                {rec.score} pts
                              </span>
                            </div>

                            <h3 className="font-bold text-[#191c1e] text-base font-['Hanken_Grotesk'] line-clamp-1 hover:text-[#4353cf] transition-colors">
                              <Link to={`/courses/${rec.journey.id}`}>{rec.journey.title}</Link>
                            </h3>

                            <p className="text-xs text-[#454654] line-clamp-2">
                              {rec.journey.description}
                            </p>

                            <div className="pt-2 border-t border-[#e1e3e4]">
                              <p className="text-[11px] text-[#757685] font-medium italic line-clamp-2">
                                "{rec.reasons[0]}"
                              </p>
                            </div>
                          </div>

                          <div className="mt-5 pt-3">
                            <Link
                              to={`/courses/${rec.journey.id}`}
                              className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-white hover:bg-[#4353cf] text-[#4353cf] hover:text-white border border-[#c6c5d6] hover:border-transparent font-semibold text-xs rounded-xl transition-all shadow-2xs"
                            >
                              Explore Journey
                              <span className="material-symbols-outlined text-xs">arrow_forward</span>
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Platform Status Notice */}
          <div className="bg-[#f0f2fa] border border-[#d9dff5] p-6 rounded-2xl flex items-start gap-4">
            <span className="material-symbols-outlined text-[#4353cf] text-2xl mt-0.5">info</span>
            <div>
              <h3 className="font-semibold text-sm text-[#191c1e] mb-1">
                Phase 2B Diagnostic & Recommendation System Active
              </h3>
              <p className="text-xs text-[#454654] leading-relaxed">
                Your learning needs are persisted securely in PostgreSQL. Recommendations are generated
                using transparent, deterministic rules without external AI dependencies. Subsequent phases will
                connect lecture video player, activity challenge submissions, and Razorpay enrollment.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
