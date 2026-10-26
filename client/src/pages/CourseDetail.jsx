import React, { useState, useCallback } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import journeyService from '../services/journey.service';
import mainLogo from '../assets/main_logo.png';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDuration(hoursStr) {
  const total = parseFloat(hoursStr) || 0;
  const h = Math.floor(total);
  const m = Math.round((total - h) * 60);
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} hr`;
  return `${h} hr ${String(m).padStart(2, '0')} min`;
}

// ELEVATE's 6-stage experiential learning model
const STAGE_META = {
  explore:   { label: 'Explore',    icon: 'travel_explore',    color: '#6366f1', desc: 'Diagnostic — understand where you are now' },
  learn:     { label: 'Learn',      icon: 'auto_stories',      color: '#0ea5e9', desc: 'Core knowledge delivery and capsules' },
  experience:{ label: 'Experience', icon: 'psychology',        color: '#f59e0b', desc: 'Hands-on activity challenges' },
  validate:  { label: 'Validate',   icon: 'fact_check',        color: '#10b981', desc: 'Peer review and expert feedback' },
  apply:     { label: 'Apply',      icon: 'build_circle',      color: '#f97316', desc: 'Real-world application task' },
  transform: { label: 'Transform',  icon: 'workspace_premium', color: '#8b5cf6', desc: 'Portfolio badge and reflection' },
};

const DIFFICULTY_META = {
  Beginner:     { label: 'Beginner',     color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  Intermediate: { label: 'Intermediate', color: 'text-amber-700  bg-amber-50  border-amber-200'  },
  Advanced:     { label: 'Advanced',     color: 'text-rose-700   bg-rose-50   border-rose-200'   },
};

// ─── Enrollment Button ────────────────────────────────────────────────────────

/**
 * Renders the enrollment CTA based on auth state and journey price.
 *
 * Free journeys  → direct POST /api/journeys/:id/enroll
 * Paid journeys  → Razorpay Standard Checkout → POST /api/payments/verify → enroll
 *
 * Unauthenticated users are redirected to /login and returned to the course page.
 */
const EnrollButton = ({ journeyId, journeyTitle, price = 0 }) => {
  const { isAuthenticated, loading: authLoading, user } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();

  const [status,  setStatus]  = useState('idle'); // idle | loading | success | error | already
  const [message, setMessage] = useState('');

  const isPaid = Number(price) > 0;

  // ── Free enrollment ────────────────────────────────────────────────────────
  const handleFreeEnroll = async () => {
    setStatus('loading');
    setMessage('');
    try {
      await journeyService.enrollInJourney(journeyId);
      setStatus('success');
      setMessage('You are enrolled! Check your dashboard to begin.');
    } catch (err) {
      if (err.message?.includes('Already enrolled')) {
        setStatus('already');
        setMessage('You are already enrolled in this journey.');
      } else {
        setStatus('error');
        setMessage(err.message || 'Enrollment failed. Please try again.');
      }
    }
  };

  // ── Paid enrollment via Razorpay ──────────────────────────────────────────
  const handlePaidEnroll = async () => {
    setStatus('loading');
    setMessage('');

    // Lazy-import so the payment service is only loaded when needed
    const { default: paymentService } = await import('../services/payment.service');

    await paymentService.initiatePayment({
      journeyId,
      journeyTitle,
      userEmail: user?.email || '',
      userName:  user?.name  || '',
      onSuccess: () => {
        setStatus('success');
        setMessage('Payment successful! You are now enrolled. Check your dashboard to begin.');
      },
      onFailure: (msg) => {
        setStatus('error');
        setMessage(msg || 'Payment failed. Please try again.');
      },
      onDismiss: () => {
        setStatus('idle');
        setMessage('');
      },
    });
  };

  const handleEnroll = async () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: location.pathname } } });
      return;
    }
    if (isPaid) {
      await handlePaidEnroll();
    } else {
      await handleFreeEnroll();
    }
  };

  if (authLoading) return null;

  return (
    <div className="space-y-3">
      <AnimatePresence mode="wait">
        {(status === 'success' || status === 'already') ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-800 px-5 py-3.5 rounded-2xl text-sm font-medium"
          >
            <span className="material-symbols-outlined text-[20px] text-emerald-600">task_alt</span>
            {message}
          </motion.div>
        ) : (
          <motion.button
            key="btn"
            onClick={handleEnroll}
            disabled={status === 'loading'}
            whileHover={{ scale: status === 'loading' ? 1 : 1.01 }}
            whileTap={{ scale: 0.98 }}
            className="w-full bg-[#24389c] hover:bg-[#3f51b5] disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-base py-4 px-8 rounded-2xl transition-all shadow-lg shadow-[#24389c]/25 flex items-center justify-center gap-2"
          >
            {status === 'loading' ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>{isPaid ? 'Opening Payment…' : 'Enrolling…'}</span>
              </>
            ) : !isAuthenticated ? (
              <>
                <span className="material-symbols-outlined text-[20px]">login</span>
                <span>Sign in to {isPaid ? 'Purchase' : 'Enroll'}</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[20px]">
                  {isPaid ? 'payment' : 'rocket_launch'}
                </span>
                <span>
                  {isPaid
                    ? `Pay & Enroll — Rs.${Number(price).toLocaleString('en-IN')}`
                    : 'Start This Journey — Free'}
                </span>
              </>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {status === 'error' && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs text-red-600 flex items-center gap-1.5 px-1"
        >
          <span className="material-symbols-outlined text-[15px]">error</span>
          {message}
        </motion.p>
      )}

      {isPaid ? (
        <p className="text-[11px] text-[#9ca3af] text-center leading-relaxed px-2">
          Secure payment via <strong>Razorpay</strong> — UPI, cards, netbanking accepted.
        </p>
      ) : (
        <p className="text-[11px] text-[#9ca3af] text-center leading-relaxed px-2">
          <strong>Development data.</strong> These are seeded sample journeys, not
          yet educator-approved for production.
        </p>
      )}

      {!isAuthenticated && (
        <p className="text-xs text-center text-[#757684]">
          Don&apos;t have an account?{' '}
          <Link
            to="/register"
            state={{ from: { pathname: location.pathname } }}
            className="text-[#24389c] font-semibold hover:underline"
          >
            Join free
          </Link>
        </p>
      )}
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const CourseDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [journey, setJourney] = useState(null);
  const [stages,  setStages]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const fetchJourney = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await journeyService.getJourneyById(id);
      setJourney(data.journey);
      setStages(data.stages);
    } catch (err) {
      if (err.status === 404) {
        setError('not_found');
      } else {
        setError(err.message || 'Failed to load this course.');
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchJourney();
  }, [fetchJourney]);

  // ── Loading skeleton ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="bg-[#f7f9fc] min-h-screen font-['Inter']">
        <Navbar />
        <div className="max-w-[1100px] mx-auto px-6 md:px-12 pt-32 pb-20 animate-pulse">
          <div className="h-5 w-32 bg-[#e0e3e6] rounded-full mb-8" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 space-y-6">
              <div className="h-12 w-3/4 bg-[#e0e3e6] rounded-2xl" />
              <div className="h-4 w-full bg-[#eceef1] rounded-full" />
              <div className="h-4 w-5/6 bg-[#eceef1] rounded-full" />
              <div className="h-4 w-4/6 bg-[#eceef1] rounded-full" />
              <div className="grid grid-cols-3 gap-4 mt-6">
                {[1,2,3].map(i => <div key={i} className="h-20 bg-[#eceef1] rounded-2xl" />)}
              </div>
            </div>
            <div className="h-80 bg-[#eceef1] rounded-3xl" />
          </div>
        </div>
      </div>
    );
  }

  // ── Error / Not Found ─────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="bg-[#f7f9fc] min-h-screen font-['Inter'] flex flex-col">
        <Navbar />
        <div className="flex-grow flex items-center justify-center px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-sm"
          >
            <div className="w-20 h-20 rounded-3xl bg-[#eceef1] flex items-center justify-center mx-auto mb-6">
              <span className="material-symbols-outlined text-4xl text-[#757684]">
                {error === 'not_found' ? 'search_off' : 'wifi_off'}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-[#191c1e] font-['Manrope'] mb-2">
              {error === 'not_found' ? 'Course Not Found' : 'Could Not Load Course'}
            </h1>
            <p className="text-sm text-[#757684] mb-8 leading-relaxed">
              {error === 'not_found'
                ? 'This course URL is invalid or the course may have been removed.'
                : error}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => navigate('/courses')}
                className="bg-[#24389c] text-white px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-[#3f51b5] transition-colors"
              >
                Browse All Courses
              </button>
              {error !== 'not_found' && (
                <button
                  onClick={fetchJourney}
                  className="border border-[#c5c5d4] text-[#454652] px-6 py-2.5 rounded-full text-sm font-semibold hover:border-[#24389c] hover:text-[#24389c] transition-colors"
                >
                  Try Again
                </button>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // ── Journey found ─────────────────────────────────────────────────────────

  const diffMeta  = DIFFICULTY_META[journey.difficulty] || DIFFICULTY_META.Beginner;
  const duration  = formatDuration(journey.duration_hours);
  const thumbnail = journey.thumbnail_url;

  return (
    <div className="bg-[#f7f9fc] text-[#191c1e] min-h-screen flex flex-col font-['Inter'] antialiased">
      <Navbar />

      {/* ── Hero Banner ── */}
      <div className="relative w-full bg-[#191c2a] overflow-hidden" style={{ minHeight: '340px' }}>
        {thumbnail && (
          <img
            src={thumbnail}
            alt={journey.title}
            className="absolute inset-0 w-full h-full object-cover opacity-30"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-[#191c2a]/60 to-[#191c2a]" />

        <div className="relative max-w-[1100px] mx-auto px-6 md:px-12 pt-36 pb-14">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-xs text-white/50 mb-6">
            <Link to="/courses" className="hover:text-white/80 transition-colors">Courses</Link>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-white/70 line-clamp-1">{journey.title}</span>
          </nav>

          <div className="flex flex-wrap gap-2 mb-4">
            {journey.category && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-widest text-[#24389c] bg-white/10 border border-white/20 px-3 py-1 rounded-full backdrop-blur-sm">
                {journey.category}
              </span>
            )}
            {journey.badge && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-widest text-white bg-[#24389c]/70 border border-[#24389c]/40 px-3 py-1 rounded-full backdrop-blur-sm">
                <span className="material-symbols-outlined text-[13px]">auto_awesome</span>
                {journey.badge}
              </span>
            )}
          </div>

          <h1 className="text-3xl md:text-5xl font-extrabold text-white font-['Manrope'] leading-tight tracking-tight mb-4 max-w-3xl">
            {journey.title}
          </h1>

          {journey.description && (
            <p className="text-base text-white/70 max-w-2xl leading-relaxed">
              {journey.description}
            </p>
          )}
        </div>
      </div>

      {/* ── Main Content ── */}
      <main className="flex-grow max-w-[1100px] mx-auto px-6 md:px-12 py-12 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">

          {/* ── Left: Journey Info ── */}
          <div className="lg:col-span-2 space-y-10">

            {/* Quick Stats */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="grid grid-cols-2 sm:grid-cols-5 gap-3"
            >
              {[
                { icon: 'schedule',           label: 'Duration',   value: duration },
                { icon: 'signal_cellular_alt', label: 'Difficulty', value: journey.difficulty || '—' },
                { icon: 'payments',           label: 'Pricing',    value: Number(journey.price) > 0 ? `Rs.${Number(journey.price).toLocaleString('en-IN')}` : 'Free' },
                { icon: 'layers',             label: 'Stages',     value: `${stages.length || 6} stages` },
                { icon: 'group',              label: 'Enrolled',   value: journey.enrollment_count ?? '0' },
              ].map(({ icon, label, value }) => (
                <div
                  key={label}
                  className="bg-white rounded-2xl border border-[#e0e3e6] p-4 text-center shadow-sm"
                >
                  <span className="material-symbols-outlined text-[#24389c] text-[22px] mb-1">{icon}</span>
                  <p className="text-[11px] text-[#757684] uppercase tracking-wider font-semibold">{label}</p>
                  <p className="text-sm font-bold text-[#191c1e] mt-0.5">{value}</p>
                </div>
              ))}
            </motion.div>

            {/* Skill Domain */}
            {journey.skill_domain && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.05 }}
                className="bg-white rounded-2xl border border-[#e0e3e6] p-6 shadow-sm"
              >
                <h2 className="text-sm font-bold text-[#191c1e] uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-[#24389c]">bolt</span>
                  Skill Domain
                </h2>
                <div className="flex flex-wrap gap-2">
                  <span className={`inline-block text-xs font-semibold border px-3 py-1.5 rounded-full ${diffMeta.color}`}>
                    {journey.difficulty}
                  </span>
                  <span className="inline-block text-xs font-semibold border border-[#24389c]/20 text-[#24389c] bg-[#f0f2ff] px-3 py-1.5 rounded-full">
                    {journey.skill_domain}
                  </span>
                </div>
              </motion.div>
            )}

            {/* Learning Stages */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <h2 className="text-xl font-bold text-[#191c1e] font-['Manrope'] mb-5 flex items-center gap-2">
                <span className="material-symbols-outlined text-[22px] text-[#24389c]">route</span>
                The 6-Stage Learning Journey
              </h2>

              {stages.length > 0 ? (
                <div className="space-y-3">
                  {stages.map((stage, idx) => {
                    const meta = STAGE_META[stage.stage_type] || {
                      label: stage.stage_type,
                      icon: 'circle',
                      color: '#24389c',
                      desc: '',
                    };
                    return (
                      <motion.div
                        key={stage.id}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: 0.1 + idx * 0.07 }}
                        className="bg-white border border-[#e0e3e6] rounded-2xl p-5 flex items-start gap-4 shadow-sm hover:shadow-md hover:border-[#c5c5d4] transition-all"
                      >
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                          style={{ backgroundColor: `${meta.color}18` }}
                        >
                          <span
                            className="material-symbols-outlined text-[20px]"
                            style={{ color: meta.color }}
                          >
                            {meta.icon}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className="text-[10px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-md"
                              style={{ color: meta.color, backgroundColor: `${meta.color}14` }}
                            >
                              Stage {idx + 1} · {meta.label}
                            </span>
                          </div>
                          <h3 className="text-sm font-bold text-[#191c1e] mt-1 leading-snug">
                            {stage.title}
                          </h3>
                          {stage.description && (
                            <p className="text-xs text-[#757684] mt-1 leading-relaxed line-clamp-2">
                              {stage.description}
                            </p>
                          )}
                          {!stage.description && meta.desc && (
                            <p className="text-xs text-[#9ca3af] mt-1 leading-relaxed italic">
                              {meta.desc}
                            </p>
                          )}
                        </div>
                        <span
                          className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full flex-shrink-0 self-start mt-0.5"
                          style={{ color: meta.color, backgroundColor: `${meta.color}14` }}
                        >
                          {meta.label}
                        </span>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-amber-800 text-xs flex items-center gap-2 mb-4">
                    <span className="material-symbols-outlined text-[16px]">info</span>
                    Lesson stages have not been configured by an educator yet. The ELEVATE
                    6-stage framework is shown below for reference.
                  </div>
                  {Object.entries(STAGE_META).map(([type, meta], idx) => (
                    <div
                      key={type}
                      className="bg-white border border-[#e0e3e6] rounded-2xl p-5 flex items-center gap-4 shadow-sm opacity-60"
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${meta.color}18` }}
                      >
                        <span
                          className="material-symbols-outlined text-[20px]"
                          style={{ color: meta.color }}
                        >
                          {meta.icon}
                        </span>
                      </div>
                      <div>
                        <p
                          className="text-[10px] font-extrabold uppercase tracking-widest"
                          style={{ color: meta.color }}
                        >
                          Stage {idx + 1} · {meta.label}
                        </p>
                        <p className="text-xs text-[#9ca3af] mt-0.5 italic">{meta.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>

          {/* ── Right: Enrollment Card ── */}
          <div className="lg:sticky lg:top-28">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
              className="bg-white rounded-3xl border border-[#e0e3e6] shadow-xl overflow-hidden"
            >
              {/* Thumbnail preview */}
              {thumbnail ? (
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={thumbnail}
                    alt={journey.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                </div>
              ) : (
                <div className="h-48 bg-gradient-to-br from-[#24389c] to-[#3f51b5] flex items-center justify-center">
                  <img src={mainLogo} alt="ELEVATE" className="h-14 w-auto opacity-60" />
                </div>
              )}

              <div className="p-6 space-y-5">
                {/* Price */}
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-[#191c1e] font-['Manrope']">
                    {Number(journey.price) > 0 ? `Rs.${Number(journey.price).toLocaleString('en-IN')}` : 'Free'}
                  </span>
                  <span className="text-sm text-[#757684]">
                    {Number(journey.price) > 0 ? '· one-time fee' : '· open access'}
                  </span>
                </div>

                {/* Quick info */}
                <ul className="space-y-2.5 text-sm text-[#454652]">
                  {[
                    { icon: 'schedule',           text: duration },
                    { icon: 'signal_cellular_alt', text: journey.difficulty || 'All levels' },
                    { icon: 'category',           text: journey.category || 'General' },
                    { icon: 'hub',                text: journey.skill_domain || 'Multiple skills' },
                    { icon: 'group',              text: `${journey.enrollment_count ?? 0} learner${journey.enrollment_count !== '1' ? 's' : ''} enrolled` },
                  ].map(({ icon, text }) => (
                    <li key={icon + text} className="flex items-center gap-2.5">
                      <span className="material-symbols-outlined text-[18px] text-[#24389c]">{icon}</span>
                      {text}
                    </li>
                  ))}
                </ul>

                <div className="border-t border-[#f0f2f5] pt-4">
                  <EnrollButton journeyId={journey.id} journeyTitle={journey.title} price={journey.price} />
                </div>

                {/* Back link */}
                <Link
                  to="/courses"
                  className="flex items-center justify-center gap-1.5 text-xs text-[#757684] hover:text-[#24389c] transition-colors mt-2"
                >
                  <span className="material-symbols-outlined text-[15px]">arrow_back</span>
                  Back to all courses
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-[#e0e3e6] mt-auto">
        <div className="max-w-[1100px] mx-auto px-6 md:px-12 py-8">
          <div className="flex justify-between items-center text-xs text-[#757684]">
            <Link
              to="/"
              className="font-['Manrope'] font-bold text-lg text-[#191c1e] flex items-center gap-2"
            >
              <img src={mainLogo} alt="ELEVATE" className="h-7 w-auto" />
              ELEVATE
            </Link>
            <p>© 2026 ELEVATE. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default CourseDetail;
