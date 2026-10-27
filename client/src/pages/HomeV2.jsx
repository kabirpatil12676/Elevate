import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import mentoringImg from '../assets/home page option 2/image for Mentoring India\'s Future.png';

/* ─────────────────────────────────────────
   HomeV2 — "Sleek Editorial Light" design
   Rich Velvet Indigo & Radiant Jewel Palette
   Route: /home-v2 & / (official homepage)
───────────────────────────────────────── */

const courseCategories = [
  { name: 'AI & Digital', icon: 'psychology' },
  { name: 'Career Growth', icon: 'trending_up' },
  { name: 'Communication', icon: 'record_voice_over' },
];

// Two hero slides
const slides = [
  {
    title: (<>Reinventing<br />Possibilities.</>),
    words: ['Reinventing', 'Possibilities.'],
    sub: 'Legal AI Researcher & Purpose-Driven Innovator',
    img: 'https://lh3.googleusercontent.com/aida/AEtjO1VD8oBkOhB91ijm4PtOOIJWNTEbKs0gkC6Jt-1N1v2E-oK8QxZZ7I5gapZab6_1LRRQCdIwn_HB9Ejpf4TwQd5IpspY6fzh7uLqzB_H4eZxOkkAgE9uh1niAm4Q02W59OA5DjdPsN360d2c0nvAWYqqmjz3LxxUxAUB3WkemkJhq2XS3_Nq679597ejdW4ASAgoioR25FByOp-8DlK1yHJTP4ldHPp_HbcG63bs5cqjlO24qSUH8szCGl1nhPm0AJocXLgr47R9pg',
  },
  {
    title: (<>Redefining<br />Education.</>),
    words: ['Redefining', 'Education.'],
    sub: '16+ Years Inspiring Future Engineers & Leaders',
    img: mentoringImg,
  },
];

export default function HomeV2() {
  const [slideIdx, setSlideIdx] = useState(0);
  const [animState, setAnimState] = useState('idle'); // 'idle' | 'exit-left' | 'exit-right' | 'enter'
  const [direction, setDirection] = useState(1);      // 1 = forward (next), -1 = backward (prev)
  const [mounted, setMounted] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isCoursesOpen, setIsCoursesOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const { user, isAuthenticated, logout } = useAuth();

  const animStateRef = useRef('idle');
  useEffect(() => {
    animStateRef.current = animState;
  }, [animState]);
  const timeoutIds = useRef([]);

  const changeSlide = useCallback((delta) => {
    if (animStateRef.current !== 'idle') return; // prevent spamming
    setHasLoaded(true);
    setDirection(delta);
    setAnimState(delta > 0 ? 'exit-left' : 'exit-right');

    const exitTimer = setTimeout(() => {
      setSlideIdx((prev) => (prev + delta + slides.length) % slides.length);
      setAnimState('enter');

      const enterTimer = setTimeout(() => {
        setAnimState('idle');
      }, 850);
      timeoutIds.current.push(enterTimer);
    }, 550);
    timeoutIds.current.push(exitTimer);
  }, []);

  // Staggered entrance on mount & preload images
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 100);
    const t2 = setTimeout(() => setHasLoaded(true), 1800);
    timeoutIds.current.push(t, t2);

    slides.forEach((s) => {
      if (s.img) {
        const img = new Image();
        img.src = s.img;
      }
    });

    const currentTimeouts = timeoutIds.current;
    return () => {
      currentTimeouts.forEach(clearTimeout);
    };
  }, []);

  // Auto-advance hero animation every 7 seconds (lazy & graceful pacing)
  useEffect(() => {
    const timer = setInterval(() => {
      changeSlide(1);
    }, 7000);

    return () => clearInterval(timer);
  }, [slideIdx, changeSlide]);

  return (
    <>
      {/* ── Google Fonts & Material Symbols ── */}
      <link
        href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,600&family=Manrope:wght@400;500;600;700;800&family=Outfit:wght@300;400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
        rel="stylesheet"
      />
      <link
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
        rel="stylesheet"
      />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,600&family=Manrope:wght@400;500;600;700;800&family=Outfit:wght@300;400;500;600;700;800;900&display=swap');

        .hv2-body {
          font-family: 'Outfit', -apple-system, BlinkMacSystemFont, sans-serif;
          min-height: 100vh;
          background-color: #faf8fc;
          color: #443850;
          -webkit-font-smoothing: antialiased;
        }

        /* ── Typography (Montserrat 600 SemiBold) ── */
        .hv2-hero-title,
        .hv2-hero-title * {
          font-family: 'Montserrat', sans-serif !important;
          font-weight: 600 !important;
          text-rendering: optimizeLegibility;
          -webkit-font-smoothing: antialiased;
        }

        .hv2-brand-mark,
        .hv2-brand-mark * {
          font-family: 'Montserrat', sans-serif !important;
          font-weight: 600 !important;
        }

        .hv2-nav-link {
          font-family: 'Manrope', sans-serif !important;
          font-weight: 600 !important;
          color: #372847;
          transition: color 0.2s ease, transform 0.2s ease;
        }
        .hv2-nav-link:hover {
          color: #db2777 !important;
          transform: translateY(-1px);
        }

        .hv2-slider-btn {
          font-family: 'Manrope', 'Montserrat', sans-serif !important;
          font-weight: 600 !important;
        }

        .hv2-display {
          font-family: 'Outfit', sans-serif;
        }
        .hv2-mono {
          font-family: 'Outfit', monospace;
        }

        /* ── Color System Classes ── */
        .hv2-ink {
          color: #1e0b36;
        }
        .hv2-body-text {
          color: #443850;
        }
        .hv2-muted-text {
          color: #6b5b7b;
        }
        .hv2-accent-rose {
          color: #db2777;
        }
        .hv2-accent-violet {
          color: #7c3aed;
        }

        /* ── Polygon float (lazy, slow drift) ── */
        @keyframes hv2PolygonFloat {
          0%, 100% { transform: rotate(0deg) scale(1) translateY(0px); }
          50%       { transform: rotate(2.5deg) scale(1.025) translateY(-8px); }
        }
        .hv2-polygon-float { animation: hv2PolygonFloat 12s ease-in-out infinite; }

        /* ── Ping dot ── */
        @keyframes hv2Ping {
          75%, 100% { transform: scale(2); opacity: 0; }
        }
        .hv2-ping { animation: hv2Ping 1.2s cubic-bezier(0,0,0.2,1) infinite; }

        /* ══════════════════════════════════════
           PAGE-LOAD ENTRANCE ANIMATIONS (LAZY & DELIBERATE)
        ══════════════════════════════════════ */

        @keyframes hv2NavEnter {
          from { opacity: 0; transform: translateY(-20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .hv2-nav-enter {
          animation: hv2NavEnter 0.9s cubic-bezier(0.16,1,0.3,1) 0.1s both;
        }

        @keyframes hv2WordUp {
          from { opacity: 0; transform: translateY(110%); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .hv2-word-0 { animation: hv2WordUp 1.1s cubic-bezier(0.16,1,0.3,1) 0.35s both; }
        .hv2-word-1 { animation: hv2WordUp 1.1s cubic-bezier(0.16,1,0.3,1) 0.6s  both; }
        .hv2-word-2 { animation: hv2WordUp 1.1s cubic-bezier(0.16,1,0.3,1) 0.85s both; }

        @keyframes hv2SubEnter {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .hv2-sub-enter  { animation: hv2SubEnter 0.9s cubic-bezier(0.16,1,0.3,1) 0.95s both; }
        .hv2-loc-enter  { animation: hv2SubEnter 0.9s cubic-bezier(0.16,1,0.3,1) 1.15s both; }

        @keyframes hv2ImgEnterLoad {
          from { opacity: 0; transform: translateX(-50%) translateY(45px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        .hv2-img-load {
          animation: hv2ImgEnterLoad 1.3s cubic-bezier(0.16,1,0.3,1) 0.4s both;
        }

        /* ══════════════════════════════════════
           SLIDE TRANSITIONS (LAZY, ELEGANT, SMOOTH)
        ══════════════════════════════════════ */

        @keyframes hv2TextExitUp {
          from { opacity: 1; transform: translateY(0); }
          to   { opacity: 0; transform: translateY(-30px); }
        }
        @keyframes hv2TextEnterUp {
          from { opacity: 0; transform: translateY(35px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        @keyframes hv2ImgExitLeft {
          from { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
          to   { opacity: 0; transform: translateX(calc(-50% - 70px)) translateY(0) scale(0.97); }
        }
        @keyframes hv2ImgExitRight {
          from { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
          to   { opacity: 0; transform: translateX(calc(-50% + 70px)) translateY(0) scale(0.97); }
        }
        @keyframes hv2ImgEnterRight {
          from { opacity: 0; transform: translateX(calc(-50% + 70px)) translateY(0) scale(0.97); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
        }
        @keyframes hv2ImgEnterLeft {
          from { opacity: 0; transform: translateX(calc(-50% - 70px)) translateY(0) scale(0.97); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
        }

        .hv2-text-exit    { animation: hv2TextExitUp  0.55s cubic-bezier(0.4,0,0.2,1)    both; }
        .hv2-text-enter   { animation: hv2TextEnterUp 0.85s cubic-bezier(0.16,1,0.3,1)  both; }

        .hv2-img-exit-left  { animation: hv2ImgExitLeft   0.55s cubic-bezier(0.4,0,0.2,1)    both; }
        .hv2-img-exit-right { animation: hv2ImgExitRight  0.55s cubic-bezier(0.4,0,0.2,1)    both; }
        .hv2-img-enter-right{ animation: hv2ImgEnterRight 0.85s cubic-bezier(0.16,1,0.3,1) both; }
        .hv2-img-enter-left { animation: hv2ImgEnterLeft  0.85s cubic-bezier(0.16,1,0.3,1) both; }

        @keyframes hv2TriLoad {
          from { opacity: 0; transform: scale(0.7) rotate(-14deg); filter: blur(8px); }
          to   { opacity: 1; transform: scale(1) rotate(0deg); filter: blur(0px); }
        }
        @keyframes hv2TriExitLeft {
          from { opacity: 1; transform: translateX(0px) rotate(0deg) scale(1); }
          to   { opacity: 0.12; transform: translateX(-90px) rotate(-12deg) scale(0.88); }
        }
        @keyframes hv2TriExitRight {
          from { opacity: 1; transform: translateX(0px) rotate(0deg) scale(1); }
          to   { opacity: 0.12; transform: translateX(90px) rotate(12deg) scale(0.88); }
        }
        @keyframes hv2TriEnterRight {
          from { opacity: 0.12; transform: translateX(90px) rotate(12deg) scale(0.88); }
          to   { opacity: 1; transform: translateX(0px) rotate(0deg) scale(1); }
        }
        @keyframes hv2TriEnterLeft {
          from { opacity: 0.12; transform: translateX(-90px) rotate(-12deg) scale(0.88); }
          to   { opacity: 1; transform: translateX(0px) rotate(0deg) scale(1); }
        }

        .hv2-tri-load       { animation: hv2TriLoad 1.3s cubic-bezier(0.16,1,0.3,1) 0.3s both; }
        .hv2-tri-exit-left  { animation: hv2TriExitLeft   0.55s cubic-bezier(0.4,0,0.2,1)    both; }
        .hv2-tri-exit-right { animation: hv2TriExitRight  0.55s cubic-bezier(0.4,0,0.2,1)    both; }
        .hv2-tri-enter-right{ animation: hv2TriEnterRight 0.85s cubic-bezier(0.16,1,0.3,1) both; }
        .hv2-tri-enter-left { animation: hv2TriEnterLeft  0.85s cubic-bezier(0.16,1,0.3,1) both; }

        /* ── Hover / card effects ── */
        .hv2-card {
          transition: all 0.3s cubic-bezier(0.16,1,0.3,1);
        }
        .hv2-card:hover {
          border-color: rgba(219, 39, 119, 0.4) !important;
          box-shadow: 0 20px 40px -10px rgba(219, 39, 119, 0.15), 0 4px 12px rgba(0, 0, 0, 0.03) !important;
          transform: translateY(-4px);
        }
        .hv2-card:hover h3 {
          color: #db2777 !important;
        }

        .hv2-card-purple {
          transition: all 0.3s cubic-bezier(0.16,1,0.3,1);
        }
        .hv2-card-purple:hover {
          border-color: rgba(124, 58, 237, 0.4) !important;
          box-shadow: 0 20px 40px -10px rgba(124, 58, 237, 0.15), 0 4px 12px rgba(0, 0, 0, 0.03) !important;
          transform: translateY(-4px);
        }
        .hv2-card-purple:hover h3 {
          color: #7c3aed !important;
        }

        .hv2-article {
          transition: all 0.3s cubic-bezier(0.16,1,0.3,1);
        }
        .hv2-article:hover {
          border-color: rgba(219, 39, 119, 0.4) !important;
          box-shadow: 0 20px 40px -10px rgba(219, 39, 119, 0.12), 0 4px 12px rgba(0,0,0,0.03) !important;
          transform: translateY(-4px);
        }
        .hv2-article:hover h3 { color: #db2777 !important; }

        .hv2-article-purple {
          transition: all 0.3s cubic-bezier(0.16,1,0.3,1);
        }
        .hv2-article-purple:hover {
          border-color: rgba(124, 58, 237, 0.4) !important;
          box-shadow: 0 20px 40px -10px rgba(124, 58, 237, 0.12), 0 4px 12px rgba(0,0,0,0.03) !important;
          transform: translateY(-4px);
        }
        .hv2-article-purple:hover h3 { color: #7c3aed !important; }

        .hv2-portrait-card img { transition: transform 0.7s cubic-bezier(0.16,1,0.3,1); }
        .hv2-portrait-card:hover img { transform: scale(1.04); }

        .hv2-video-card {
          transition: all 0.3s cubic-bezier(0.16,1,0.3,1);
        }
        .hv2-video-card:hover {
          border-color: rgba(124, 58, 237, 0.35) !important;
          box-shadow: 0 20px 40px -10px rgba(124, 58, 237, 0.14) !important;
          transform: translateY(-4px);
        }
        .hv2-video-card:hover .hv2-play-btn { transform: scale(1.12); box-shadow: 0 12px 24px rgba(219, 39, 119, 0.4) !important; }
        .hv2-video-card:hover h4 { color: #7c3aed !important; }

        .hv2-book-card { transition: transform 0.4s cubic-bezier(0.16,1,0.3,1), box-shadow 0.4s ease; }
        .hv2-book-card:hover {
          transform: translateY(-8px) rotate(-0.5deg);
          box-shadow: 0 35px 65px -15px rgba(124, 58, 237, 0.28) !important;
        }

        .hv2-footer-link {
          color: #5b4a6b;
          transition: color 0.2s ease, transform 0.2s ease;
          display: inline-block;
        }
        .hv2-footer-link:hover {
          color: #db2777;
          transform: translateX(3px);
        }
      `}</style>

      <div className="hv2-body">

        {/* ══════════════════════════════════════
            HEADER — EDITORIAL LIGHT NAVBAR (SINGLE UNIFIED NAVBAR)
        ══════════════════════════════════════ */}
        <header className={mounted ? 'hv2-nav-enter' : ''} style={{
          position: 'absolute', top: 0, left: 0, right: 0, zIndex: 50,
          background: 'transparent',
          pointerEvents: 'auto',
          opacity: mounted ? undefined : 0,
        }}>
          <div style={{
            width: '100%',
            maxWidth: 1680,
            margin: '0 auto',
            padding: 'clamp(24px, 3.5vh, 40px) clamp(1.75rem, 5vw, 5.5rem) 0',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            {/* Brand — 2-line stacked editorial mark with radiant jewel gradient accent */}
            <Link to="/" style={{ display: 'flex', flexDirection: 'column', textDecoration: 'none', lineHeight: 0.95 }}>
              <span className="hv2-brand-mark" style={{
                fontSize: 'clamp(26px, 2.5vw, 36px)',
                fontWeight: 600,
                color: '#1e0b36',
                letterSpacing: '-0.04em',
                lineHeight: 0.95,
              }}>
                Dr. Dipali
              </span>
              <span className="hv2-brand-mark" style={{
                fontSize: 'clamp(26px, 2.5vw, 36px)',
                fontWeight: 600,
                background: 'linear-gradient(135deg, #1e0b36 30%, #db2777 75%, #7c3aed 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                letterSpacing: '-0.04em',
                lineHeight: 0.95,
              }}>
                Awasekar<span style={{ WebkitTextFillColor: '#db2777' }}>.</span>
              </span>
            </Link>

            {/* Desktop Navigation with Working Platform Components */}
            <nav className="hidden lg:flex" style={{
              alignItems: 'center',
              gap: 'clamp(14px, 1.8vw, 28px)',
              fontSize: 'clamp(13px, 0.95vw, 15px)',
              fontWeight: 600,
              paddingTop: 4,
            }}>
              {/* Courses with Mega Dropdown */}
              <div
                className="relative"
                onMouseEnter={() => setIsCoursesOpen(true)}
                onMouseLeave={() => setIsCoursesOpen(false)}
              >
                <Link
                  to="/courses"
                  className="hv2-nav-link"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 2, textDecoration: 'none' }}
                >
                  <span>Courses</span>
                  <span className={`material-symbols-outlined text-[18px] transition-transform duration-200 ${isCoursesOpen ? 'rotate-180' : ''}`}>
                    expand_more
                  </span>
                </Link>

                <AnimatePresence>
                  {isCoursesOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 4, scale: 0.97 }}
                      transition={{ duration: 0.18 }}
                      className="absolute top-full left-1/2 -translate-x-1/2 w-[480px] bg-white rounded-3xl shadow-[0_12px_40px_-8px_rgba(124,58,237,0.15)] border border-[#ede8f8] p-6 z-50 cursor-default"
                      style={{ marginTop: 12 }}
                    >
                      <h4 className="text-base font-bold text-[#1e0b36] mb-3 font-['Montserrat']">Explore Courses</h4>
                      <div className="w-full h-px bg-[#ede8f8] mb-4" />
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        {courseCategories.map(cat => (
                          <Link
                            key={cat.name}
                            to={`/courses?category=${encodeURIComponent(cat.name)}`}
                            className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-[#faf8fc] transition-colors group"
                            style={{ textDecoration: 'none' }}
                          >
                            <div className="w-9 h-9 rounded-xl bg-[#fdf2f8] flex items-center justify-center text-[#db2777] group-hover:bg-[#db2777] group-hover:text-white transition-colors border border-[#fbcfe8]">
                              <span className="material-symbols-outlined text-[18px]">{cat.icon}</span>
                            </div>
                            <span className="text-sm font-semibold text-[#443850] group-hover:text-[#db2777] transition-colors">{cat.name}</span>
                          </Link>
                        ))}
                      </div>
                      <Link
                        to="/courses"
                        className="block w-full text-center py-2.5 rounded-xl text-white font-semibold text-sm transition-all shadow-sm"
                        style={{ background: 'linear-gradient(135deg, #db2777 0%, #7c3aed 100%)', textDecoration: 'none' }}
                      >
                        All Courses
                      </Link>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <Link to="/community" className="hv2-nav-link" style={{ textDecoration: 'none' }}>Community</Link>
              <Link to="/career-roadmaps" className="hv2-nav-link" style={{ textDecoration: 'none' }}>Career Roadmaps</Link>
              <Link to="/events" className="hv2-nav-link" style={{ textDecoration: 'none' }}>Workshops</Link>
              <Link to="/testimonials" className="hv2-nav-link" style={{ textDecoration: 'none' }}>Testimonials</Link>
              <Link to="/about-elevate" className="hv2-nav-link" style={{ textDecoration: 'none' }}>About Elevate</Link>

              {/* Authentication Actions */}
              {isAuthenticated ? (
                <div className="relative">
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '5px 14px 5px 6px', borderRadius: 9999,
                      background: '#ffffff', border: '1px solid #d8b4fe',
                      cursor: 'pointer', boxShadow: '0 2px 8px rgba(124,58,237,0.08)',
                    }}
                  >
                    <div style={{
                      width: 30, height: 30, borderRadius: '50%',
                      background: 'linear-gradient(135deg, #db2777 0%, #7c3aed 100%)',
                      color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, fontSize: 12,
                    }}>
                      {user?.name?.charAt(0) || 'U'}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#1e0b36' }}>
                      {user?.name?.split(' ')[0] || 'Account'}
                    </span>
                    <span className="material-symbols-outlined text-[16px] text-[#7c3aed]">
                      {isUserMenuOpen ? 'expand_less' : 'expand_more'}
                    </span>
                  </button>

                  <AnimatePresence>
                    {isUserMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.95 }}
                        className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-[#ede8f8] py-2 z-50"
                      >
                        <div className="px-4 py-2 border-b border-[#ede8f8]">
                          <p className="text-xs text-[#7c3aed] font-bold uppercase tracking-wider">{user?.role || 'learner'}</p>
                          <p className="text-sm font-bold text-[#1e0b36] truncate">{user?.name}</p>
                        </div>
                        <Link to="/dashboard" onClick={() => setIsUserMenuOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-[#443850] hover:bg-[#faf8fc] hover:text-[#db2777]" style={{ textDecoration: 'none' }}>
                          <span className="material-symbols-outlined text-[18px]">dashboard</span> Student Dashboard
                        </Link>
                        <Link to="/growth-report" onClick={() => setIsUserMenuOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-[#443850] hover:bg-[#faf8fc] hover:text-[#db2777]" style={{ textDecoration: 'none' }}>
                          <span className="material-symbols-outlined text-[18px]">analytics</span> Growth Report
                        </Link>
                        <Link to="/portfolio" onClick={() => setIsUserMenuOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-[#443850] hover:bg-[#faf8fc] hover:text-[#db2777]" style={{ textDecoration: 'none' }}>
                          <span className="material-symbols-outlined text-[18px]">folder_special</span> My Portfolio
                        </Link>
                        <Link to="/events" onClick={() => setIsUserMenuOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-[#443850] hover:bg-[#faf8fc] hover:text-[#db2777]" style={{ textDecoration: 'none' }}>
                          <span className="material-symbols-outlined text-[18px]">groups</span> Workshops & Events
                        </Link>
                        <Link to="/learning-needs" onClick={() => setIsUserMenuOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-[#443850] hover:bg-[#faf8fc] hover:text-[#db2777]" style={{ textDecoration: 'none' }}>
                          <span className="material-symbols-outlined text-[18px]">psychology</span> Learning Diagnostic
                        </Link>
                        {(user?.role === 'educator' || user?.role === 'admin') && (
                          <Link to="/educator" onClick={() => setIsUserMenuOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-[#7c3aed] hover:bg-[#faf8fc] font-semibold" style={{ textDecoration: 'none' }}>
                            <span className="material-symbols-outlined text-[18px]">school</span> Educator Studio
                          </Link>
                        )}
                        {user?.role === 'admin' && (
                          <Link to="/admin" onClick={() => setIsUserMenuOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-[#7c3aed] hover:bg-[#faf8fc] font-semibold" style={{ textDecoration: 'none' }}>
                            <span className="material-symbols-outlined text-[18px]">admin_panel_settings</span> Admin Console
                          </Link>
                        )}
                        <button
                          onClick={async () => { await logout(); setIsUserMenuOpen(false); }}
                          className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm text-[#ba1a1a] hover:bg-[#ffdad6]/20 border-t border-[#ede8f8] mt-1"
                          style={{ cursor: 'pointer', background: 'none', border: 'none', width: '100%' }}
                        >
                          <span className="material-symbols-outlined text-[18px]">logout</span> Sign out
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Link
                    to="/login"
                    style={{
                      padding: '8px 20px',
                      borderRadius: 9999,
                      border: '1px solid #d8b4fe',
                      color: '#443850',
                      fontFamily: 'Montserrat, sans-serif',
                      fontWeight: 700,
                      fontSize: 13,
                      textDecoration: 'none',
                      background: '#ffffff',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#db2777'; e.currentTarget.style.color = '#db2777'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#d8b4fe'; e.currentTarget.style.color = '#443850'; }}
                  >
                    Login
                  </Link>

                  <Link
                    to="/register"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '9px 20px',
                      borderRadius: 9999,
                      background: 'linear-gradient(135deg, #db2777 0%, #7c3aed 100%)',
                      color: '#ffffff',
                      fontSize: 13,
                      fontWeight: 700,
                      fontFamily: 'Montserrat, sans-serif',
                      textDecoration: 'none',
                      boxShadow: '0 6px 18px rgba(219, 39, 119, 0.28)',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 10px 24px rgba(219, 39, 119, 0.4)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 6px 18px rgba(219, 39, 119, 0.28)';
                    }}
                  >
                    <span>Join ELEVATE</span>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_forward</span>
                  </Link>
                </div>
              )}
            </nav>

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl text-[#1e0b36] hover:bg-white/80 transition-colors"
              style={{ marginTop: 4, background: 'none', border: 'none', cursor: 'pointer' }}
              aria-label="Toggle Navigation Menu"
            >
              <span className="material-symbols-outlined text-[28px]">
                {isMobileMenuOpen ? 'close' : 'menu'}
              </span>
            </button>
          </div>

          {/* Mobile Drawer */}
          <AnimatePresence>
            {isMobileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="lg:hidden bg-white/98 backdrop-blur-md border-b border-[#ede8f8] px-6 py-6 shadow-xl"
              >
                <div className="flex flex-col gap-3 font-semibold text-[#443850]">
                  <Link to="/courses" onClick={() => setIsMobileMenuOpen(false)} className="py-2 hover:text-[#db2777]" style={{ textDecoration: 'none' }}>Courses</Link>
                  <Link to="/community" onClick={() => setIsMobileMenuOpen(false)} className="py-2 hover:text-[#db2777]" style={{ textDecoration: 'none' }}>Community</Link>
                  <Link to="/career-roadmaps" onClick={() => setIsMobileMenuOpen(false)} className="py-2 hover:text-[#db2777]" style={{ textDecoration: 'none' }}>Career Roadmaps</Link>
                  <Link to="/events" onClick={() => setIsMobileMenuOpen(false)} className="py-2 hover:text-[#db2777]" style={{ textDecoration: 'none' }}>Workshops</Link>
                  <Link to="/testimonials" onClick={() => setIsMobileMenuOpen(false)} className="py-2 hover:text-[#db2777]" style={{ textDecoration: 'none' }}>Testimonials</Link>
                  <Link to="/about-elevate" onClick={() => setIsMobileMenuOpen(false)} className="py-2 hover:text-[#db2777]" style={{ textDecoration: 'none' }}>About Elevate</Link>

                  <div className="pt-4 border-t border-[#ede8f8] flex flex-col gap-2.5">
                    {isAuthenticated ? (
                      <>
                        <Link to="/dashboard" onClick={() => setIsMobileMenuOpen(false)} className="w-full text-center py-2.5 rounded-xl bg-gradient-to-r from-[#db2777] to-[#7c3aed] text-white font-bold text-sm" style={{ textDecoration: 'none' }}>Dashboard</Link>
                        <button onClick={async () => { await logout(); setIsMobileMenuOpen(false); }} className="w-full text-center py-2 rounded-xl border border-[#ba1a1a] text-[#ba1a1a] font-semibold text-sm" style={{ background: 'none', cursor: 'pointer' }}>Sign out</button>
                      </>
                    ) : (
                      <>
                        <Link to="/login" onClick={() => setIsMobileMenuOpen(false)} className="w-full text-center py-2.5 rounded-xl border border-[#d8b4fe] text-[#1e0b36] font-bold text-sm bg-white" style={{ textDecoration: 'none' }}>Login</Link>
                        <Link to="/register" onClick={() => setIsMobileMenuOpen(false)} className="w-full text-center py-2.5 rounded-xl bg-gradient-to-r from-[#db2777] to-[#7c3aed] text-white font-bold text-sm shadow-md" style={{ textDecoration: 'none' }}>Join ELEVATE</Link>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </header>

        <main>
          {/* ══════════════════════════════════════
              HERO SECTION — RICH EDITORIAL WITH JEWEL-TONED TYPOGRAPHY
          ══════════════════════════════════════ */}
          <section id="hero" style={{
            position: 'relative',
            width: '100%',
            height: '100vh',
            minHeight: 720,
            maxHeight: 1080,
            display: 'flex',
            alignItems: 'center',
            background: 'radial-gradient(ellipse 95% 85% at 52% 40%, #ffffff 0%, #f9f7fd 52%, #f1ecfa 100%)',
            overflow: 'hidden',
            borderBottom: '1px solid #ede8f8',
          }}>
            {/* Ethereal ambient light glow bubbles */}
            <div style={{
              position: 'absolute', top: '15%', left: '16%',
              width: 580, height: 580,
              background: 'rgba(219, 39, 119, 0.08)', borderRadius: '50%',
              filter: 'blur(140px)', pointerEvents: 'none', zIndex: 1,
            }} />
            <div style={{
              position: 'absolute', bottom: '8%', right: '18%',
              width: 540, height: 540,
              background: 'rgba(124, 58, 237, 0.09)', borderRadius: '50%',
              filter: 'blur(150px)', pointerEvents: 'none', zIndex: 1,
            }} />
            <div style={{
              position: 'absolute', top: '35%', right: '40%',
              width: 320, height: 320,
              background: 'rgba(56, 189, 248, 0.06)', borderRadius: '50%',
              filter: 'blur(110px)', pointerEvents: 'none', zIndex: 1,
            }} />

            {/* Glowing Geometric Magenta/Violet Polygon Accent */}
            <div style={{
              position: 'absolute',
              left: 'clamp(50%, 54vw, 56%)',
              top: '44%',
              transform: 'translate(-50%, -50%)',
              width: 'clamp(440px, 46vw, 680px)',
              height: 'clamp(440px, 46vw, 680px)',
              pointerEvents: 'none',
              zIndex: 4,
            }}>
              <div
                className={
                  !hasLoaded && mounted
                    ? 'hv2-tri-load'
                    : animState === 'exit-left'
                    ? 'hv2-tri-exit-left'
                    : animState === 'exit-right'
                    ? 'hv2-tri-exit-right'
                    : animState === 'enter' && direction > 0
                    ? 'hv2-tri-enter-right'
                    : animState === 'enter' && direction < 0
                    ? 'hv2-tri-enter-left'
                    : ''
                }
                style={{
                  width: '100%',
                  height: '100%',
                  transition: animState === 'idle' ? 'transform 0.7s cubic-bezier(0.16,1,0.3,1)' : undefined,
                  transform: animState === 'idle'
                    ? (slideIdx === 1 ? 'rotate(-10deg) scale(1.05)' : 'rotate(0deg) scale(1)')
                    : undefined,
                }}
              >
                <div
                  className="hv2-polygon-float"
                  style={{
                    width: '100%',
                    height: '100%',
                    filter: slideIdx === 0
                      ? 'drop-shadow(0 20px 50px rgba(219,39,119,0.32)) drop-shadow(0 8px 20px rgba(139,92,246,0.22))'
                      : 'drop-shadow(0 20px 50px rgba(124,58,237,0.32)) drop-shadow(0 8px 20px rgba(236,72,153,0.22))',
                    transition: 'filter 0.6s ease',
                  }}
                >
                  <svg viewBox="0 0 600 600" style={{ width: '100%', height: '100%' }}>
                    <defs>
                      <linearGradient id="hv2LightPoly0" x1="12%" y1="0%" x2="88%" y2="85%">
                        <stop offset="0%" stopColor="#f43f5e" />
                        <stop offset="48%" stopColor="#db2777" />
                        <stop offset="100%" stopColor="#8b5cf6" />
                      </linearGradient>
                      <linearGradient id="hv2LightPoly1" x1="10%" y1="5%" x2="90%" y2="95%">
                        <stop offset="0%" stopColor="#c026d3" />
                        <stop offset="45%" stopColor="#7c3aed" />
                        <stop offset="100%" stopColor="#ec4899" />
                      </linearGradient>
                    </defs>
                    <polygon
                      fill={slideIdx === 0 ? "url(#hv2LightPoly0)" : "url(#hv2LightPoly1)"}
                      points="170,40 570,260 250,560"
                      style={{
                        transition: 'fill 0.6s ease',
                      }}
                    />
                  </svg>
                </div>
              </div>
            </div>

            {/* Atmospheric Back Glow on Head */}
            <div style={{
              position: 'absolute',
              left: 'clamp(50%, 54vw, 56%)',
              top: '40%',
              transform: 'translate(-50%, -50%)',
              width: 400,
              height: 400,
              borderRadius: '50%',
              background: slideIdx === 0 ? 'rgba(219,39,119,0.12)' : 'rgba(124,58,237,0.12)',
              filter: 'blur(80px)',
              zIndex: 3,
              pointerEvents: 'none',
              transition: 'background 0.6s ease',
            }} />

            {/* Left: Giant Editorial Headline with Colored Emphasis & Staggered Reveal */}
            <div style={{
              position: 'relative',
              zIndex: 20,
              paddingLeft: 'clamp(2rem, 6.5vw, 7rem)',
              maxWidth: 'clamp(420px, 50vw, 820px)',
              marginTop: 'clamp(30px, 5vh, 60px)',
              pointerEvents: 'none',
            }}>
              <h1 className="hv2-hero-title" style={{
                fontFamily: "'Montserrat', sans-serif !important",
                fontSize: 'clamp(38px, 4.8vw, 72px)',
                fontWeight: 600,
                letterSpacing: '-0.02em',
                wordSpacing: '-0.06em',
                lineHeight: 1.04,
                margin: 0,
              }}>
                {slides[slideIdx].words.map((word, i) => {
                  const isAccentWord = i === 1;
                  const wordStyle = isAccentWord
                    ? {
                        background: slideIdx === 0
                          ? 'linear-gradient(135deg, #e11d48 0%, #db2777 45%, #7c3aed 100%)'
                          : 'linear-gradient(135deg, #7c3aed 0%, #c026d3 50%, #db2777 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        display: 'inline-block',
                        textShadow: 'none',
                      }
                    : {
                        color: '#1e0b36',
                        display: 'inline-block',
                        textShadow: '0 2px 20px rgba(30, 11, 54, 0.08)',
                      };

                  return (
                    <div
                      key={`${slideIdx}-${i}`}
                      style={{
                        overflow: 'hidden',
                        paddingBottom: '0.10em',
                        marginBottom: '-0.12em',
                        paddingRight: '0.08em',
                      }}
                    >
                      <div
                        className={
                          !hasLoaded && mounted
                            ? `hv2-word-${i}`
                            : animState === 'exit-left' || animState === 'exit-right'
                            ? 'hv2-text-exit'
                            : animState === 'enter'
                            ? 'hv2-text-enter'
                            : ''
                        }
                        style={{
                          fontFamily: "'Montserrat', sans-serif !important",
                          fontWeight: 600,
                          letterSpacing: '-0.02em',
                          wordSpacing: '-0.06em',
                          lineHeight: 1.04,
                          paddingBottom: '0.02em',
                          animationDelay: animState === 'enter'
                            ? `${i * 0.06}s`
                            : undefined,
                          ...wordStyle,
                        }}
                      >
                        {word}
                      </div>
                    </div>
                  );
                })}
              </h1>

              {/* Subline with Dual-Tone Gradient Indicator Bar */}
              <p
                key={`sub-${slideIdx}`}
                className={`hv2-mono ${
                  !hasLoaded && mounted
                    ? 'hv2-sub-enter'
                    : animState === 'exit-left' || animState === 'exit-right'
                    ? 'hv2-text-exit'
                    : animState === 'enter'
                    ? 'hv2-text-enter'
                    : ''
                }`}
                style={{
                  fontSize: 'clamp(11px, 0.9vw, 13px)',
                  fontWeight: 700,
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  color: '#be185d',
                  marginTop: 24,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  animationDelay: animState === 'enter' ? '0.14s' : undefined,
                }}
              >
                <span style={{
                  width: 30, height: 3,
                  background: 'linear-gradient(90deg, #db2777, #7c3aed)',
                  borderRadius: 2, display: 'inline-block', flexShrink: 0,
                }} />
                <span>{slides[slideIdx].sub}</span>
              </p>

              {/* Location ticker in Velvet Heather */}
              <div
                className={!hasLoaded && mounted ? 'hv2-loc-enter' : ''}
                style={{
                  marginTop: 30,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.14em',
                  color: '#6b5b7b',
                }}
              >
                <span className="hv2-ping" style={{ width: 7, height: 7, borderRadius: '50%', background: '#059669', display: 'inline-block', flexShrink: 0 }} />
                <span>NEW DELHI / MUMBAI / GLOBAL EDTECH</span>
              </div>
            </div>

            {/* Center-Right: Portrait Cutout Image */}
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 'clamp(50%, 54vw, 56%)',
              transform: 'translateX(-50%)',
              height: 'clamp(580px, 86vh, 920px)',
              width: 'clamp(480px, 58vw, 880px)',
              zIndex: 10,
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center',
              pointerEvents: 'none',
            }}>
              <img
                key={slideIdx}
                src={slides[slideIdx].img}
                alt="Dr. Dipali Awasekar — Legal AI Researcher and Engineering Educator"
                className={
                  !hasLoaded && mounted
                    ? 'hv2-img-load'
                    : animState === 'exit-left'
                    ? 'hv2-img-exit-left'
                    : animState === 'exit-right'
                    ? 'hv2-img-exit-right'
                    : animState === 'enter' && direction > 0
                    ? 'hv2-img-enter-right'
                    : animState === 'enter' && direction < 0
                    ? 'hv2-img-enter-left'
                    : ''
                }
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  height: '100%',
                  width: 'auto',
                  maxWidth: '100%',
                  objectFit: 'contain',
                  objectPosition: 'bottom center',
                  filter: 'contrast(1.04) brightness(1.0) saturate(1.02) drop-shadow(0 20px 40px rgba(124, 58, 237, 0.14)) drop-shadow(0 10px 20px rgba(0, 0, 0, 0.05))',
                }}
              />

              {/* Seamless light bottom vignette fading into light page surface */}
              <div style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 0,
                height: 'clamp(120px, 18vh, 180px)',
                background: 'linear-gradient(to top, #faf8fc 0%, rgba(250, 248, 252, 0.92) 45%, transparent 100%)',
                pointerEvents: 'none',
                zIndex: 12,
              }} />
            </div>

            {/* Right Flank Slider Controls: PREV / NEXT */}
            <div style={{
              position: 'absolute',
              right: 'clamp(1.5rem, 4vw, 4.5rem)',
              top: '52%',
              transform: 'translateY(-50%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12,
              zIndex: 30,
              userSelect: 'none',
            }}>
              <button
                onClick={() => changeSlide(-1)}
                className="hv2-slider-btn"
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: '0.24em',
                  textTransform: 'uppercase',
                  color: '#6b5b7b',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px 0',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#db2777'; e.currentTarget.style.letterSpacing = '0.28em'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#6b5b7b'; e.currentTarget.style.letterSpacing = '0.24em'; }}
              >
                PREV
              </button>
              <div style={{ width: 38, height: 1.5, background: '#d8b4fe' }} />
              <button
                onClick={() => changeSlide(1)}
                className="hv2-slider-btn"
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: '0.24em',
                  textTransform: 'uppercase',
                  color: '#6b5b7b',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px 0',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#db2777'; e.currentTarget.style.letterSpacing = '0.28em'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#6b5b7b'; e.currentTarget.style.letterSpacing = '0.24em'; }}
              >
                NEXT
              </button>
            </div>
          </section>
          {/* ══════════════════════════════════════
              SECTION 2 — ABOUT
          ══════════════════════════════════════ */}
          <section id="about" style={{
            width: '100%', padding: '112px 0 96px',
            background: '#ffffff', borderBottom: '1px solid #ede8f8',
          }}>
            <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 3rem' }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 52, flexWrap: 'wrap', gap: 24 }}>
                <div>
                  <span className="hv2-mono" style={{
                    fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.15em',
                    color: '#db2777', fontWeight: 800, display: 'block', marginBottom: 8,
                  }}>
                    SECTION 2 — ABOUT
                  </span>
                  <p className="hv2-mono" style={{
                    fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.12em',
                    color: '#7c3aed', fontWeight: 700, marginBottom: 8,
                  }}>
                    An Educator. A Technologist. A Creative Mind. A Voice for Change.
                  </p>
                  <h2 className="hv2-display" style={{
                    fontSize: 'clamp(32px, 3.5vw, 48px)', fontWeight: 800, color: '#1e0b36', letterSpacing: '-0.02em',
                  }}>
                    Who is{' '}
                    <span style={{
                      background: 'linear-gradient(135deg, #db2777 0%, #7c3aed 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}>
                      Dr. Dipali Awasekar?
                    </span>
                  </h2>
                </div>
                <div style={{
                  padding: '8px 20px', borderRadius: 9999,
                  background: '#fdf2f8', border: '1px solid #fbcfe8',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#db2777' }}>verified</span>
                  <span className="hv2-mono" style={{ fontSize: 11.5, color: '#be185d', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 800 }}>
                    16+ Years Engineering Education &amp; Legal AI
                  </span>
                </div>
              </div>

              {/* Grid: Narrative on Left, Sticky Portrait on Right */}
              <div style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', gap: 40, alignItems: 'start' }}>
                {/* About Narrative */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div className="hv2-card" style={{
                    background: '#faf8fc', borderRadius: 20, padding: 36,
                    border: '1px solid #ede8f8',
                    boxShadow: '0 4px 20px -2px rgba(124, 58, 237, 0.05)',
                  }}>
                    <p style={{
                      fontSize: 17, lineHeight: 1.8, color: '#1e0b36', fontWeight: 600,
                      marginBottom: 18,
                    }}>
                      Dr. Dipali Dilip Awasekar is an award-winning Indian academic, Legal AI researcher, technologist, and speaker whose journey reflects the convergence of knowledge, innovation, creativity, and social purpose.
                    </p>
                    <p style={{ fontSize: 15.5, lineHeight: 1.75, color: '#443850', marginBottom: 18 }}>
                      With more than 16 years of experience in engineering education, she has dedicated her career to nurturing future engineers, advancing innovative teaching practices, and empowering young individuals to discover their potential.
                    </p>
                    <p style={{ fontSize: 15.5, lineHeight: 1.75, color: '#443850', marginBottom: 18 }}>
                      Her work extends beyond the boundaries of conventional academia. As the founder of the NyayaSakhi initiative, she explores the transformative potential of responsible Artificial Intelligence in making legal information more accessible to women experiencing domestic violence.
                    </p>
                    <p style={{ fontSize: 15.5, lineHeight: 1.75, color: '#443850', marginBottom: 24 }}>
                      A cybersecurity educator, Dale Carnegie® Certified Faculty Instructor, researcher, mentor, and creative thinker, she brings together disciplines often viewed as separate.
                    </p>

                    {/* Core Credo Box */}
                    <div style={{
                      background: 'linear-gradient(135deg, rgba(219,39,119,0.06) 0%, rgba(124,58,237,0.06) 100%)',
                      borderRadius: 14, padding: '20px 24px',
                      borderLeft: '4px solid #db2777',
                      border: '1px solid #fce7f3', borderLeftWidth: 4,
                    }}>
                      <p style={{
                        color: '#1e0b36', fontSize: 15.5, lineHeight: 1.7, fontStyle: 'italic', fontWeight: 600,
                      }}>
                        "For her, education is a means of empowerment, technology is an instrument of progress, and creativity is a powerful form of expression. Her journey is not defined by one profession, but by a continuing commitment to creating meaningful impact."
                      </p>
                    </div>
                  </div>

                  {/* Highlights Bar */}
                  <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14,
                  }}>
                    {[
                      { icon: 'school', title: '16+ Years', sub: 'Engineering Pedagogy' },
                      { icon: 'balance', title: 'NyayaSakhi', sub: 'Legal AI for Social Impact' },
                      { icon: 'psychology', title: 'Dale Carnegie®', sub: 'Certified Instructor' },
                    ].map((item, idx) => (
                      <div key={idx} style={{
                        background: '#ffffff', borderRadius: 14, padding: '16px 18px',
                        border: '1px solid #ede8f8', display: 'flex', alignItems: 'center', gap: 12,
                        boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
                      }}>
                        <div style={{
                          width: 38, height: 38, borderRadius: 10,
                          background: idx === 0 ? '#fdf2f8' : idx === 1 ? '#f5f3ff' : '#f0fdf4',
                          color: idx === 0 ? '#db2777' : idx === 1 ? '#7c3aed' : '#059669',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0,
                        }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{item.icon}</span>
                        </div>
                        <div>
                          <p className="hv2-display" style={{ fontSize: 14, fontWeight: 700, color: '#1e0b36' }}>{item.title}</p>
                          <p className="hv2-mono" style={{ fontSize: 10.5, color: '#6b5b7b', fontWeight: 600 }}>{item.sub}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sticky Portrait card */}
                <div style={{ position: 'sticky', top: 112 }}>
                  <div style={{
                    background: '#ffffff', borderRadius: 20,
                    border: '1px solid #ede8f8', overflow: 'hidden',
                    boxShadow: '0 20px 45px -12px rgba(124, 58, 237, 0.12), 0 2px 8px rgba(0,0,0,0.03)',
                  }}>
                    <div className="hv2-portrait-card" style={{ position: 'relative', height: 420, overflow: 'hidden', background: '#f5f3ff' }}>
                      <img
                        src="https://lh3.googleusercontent.com/aida/AEtjO1XQu-zUr-Q7_ZP13Jros6Mu3X-2nyLimsYN2nTB9lppyvugWK1-E_TedVujnSBp4gE1TS4vUoYG_-byFRseBIbRZGRcyTpdzHpJu2JIIb7P-FGYlQnuOhGEohtF1Ej6qPnCdA93dqQCc_SQVttYAV7GyA4cXQmVzCnlQd5CY2S1zaRhz1RuQxAJHm6RwXgbe412ZhqY1fMY_sakbgoLPUxZbtabmv8bI_aGEHCwXCqT8SGlxP1VjU4CeF4ZwhXIYgp4R7zbRVEnzA"
                        alt="Dr. Dipali Dilip Awasekar — Academic and Technologist"
                        style={{
                          width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top',
                        }}
                      />
                      <div style={{
                        position: 'absolute', inset: 0,
                        background: 'linear-gradient(to top, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.15) 50%, transparent 100%)',
                      }} />
                      <div style={{
                        position: 'absolute', top: 16, right: 16,
                        background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)',
                        border: '1px solid rgba(219,39,119,0.35)', padding: '6px 14px', borderRadius: 9999,
                        fontSize: 11, fontFamily: 'monospace', textTransform: 'uppercase', color: '#db2777',
                        fontWeight: 800, boxShadow: '0 4px 12px rgba(219,39,119,0.15)',
                      }}>
                        A Voice for Change
                      </div>
                    </div>
                    <div style={{ padding: 30 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                        <div>
                          <h4 className="hv2-display" style={{ fontSize: 20, fontWeight: 700, color: '#1e0b36' }}>Dr. Dipali Dilip Awasekar</h4>
                          <p className="hv2-mono" style={{ fontSize: 11, color: '#7c3aed', marginTop: 2, fontWeight: 700 }}>Academic • Legal AI Researcher • Speaker</p>
                        </div>
                        <div style={{
                          width: 44, height: 44, borderRadius: 12,
                          background: '#fdf2f8', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          border: '1px solid #fce7f3',
                        }}>
                          <span className="material-symbols-outlined" style={{ color: '#db2777', fontSize: 24 }}>auto_stories</span>
                        </div>
                      </div>
                      <p style={{ color: '#26153b', fontSize: 14, lineHeight: 1.65, fontStyle: 'italic', borderLeft: '3px solid #db2777', paddingLeft: 14, marginBottom: 18 }}>
                        "Her journey is not defined by one profession, but by a continuing commitment to creating meaningful impact."
                      </p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {['AICTE Lilavati Award', 'IUCEE Educator Award', 'NyayaSakhi–SWATI', 'Cybersecurity'].map(badge => (
                          <span key={badge} style={{
                            padding: '4px 10px', borderRadius: 6, background: '#f5f3ff', color: '#6d28d9',
                            fontSize: 11, fontWeight: 700, fontFamily: 'monospace', border: '1px solid #ede9fe',
                          }}>{badge}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ══════════════════════════════════════
              SECTION 3 — THREE DEFINING DIMENSIONS
          ══════════════════════════════════════ */}
          <section id="dimensions" style={{
            width: '100%', padding: '112px 0',
            background: '#faf8fc', borderBottom: '1px solid #ede8f8',
          }}>
            <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 3rem' }}>
              <div style={{ textAlign: 'center', maxWidth: 780, margin: '0 auto 64px' }}>
                <span className="hv2-mono" style={{
                  fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.15em',
                  color: '#db2777', fontWeight: 800, display: 'block', marginBottom: 8,
                }}>
                  SECTION 3 — THREE DEFINING DIMENSIONS
                </span>
                <h2 className="hv2-display" style={{
                  fontSize: 'clamp(32px, 3.5vw, 48px)', fontWeight: 800, color: '#1e0b36', letterSpacing: '-0.02em',
                }}>
                  Three Stories of{' '}
                  <span style={{
                    background: 'linear-gradient(135deg, #db2777 0%, #7c3aed 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}>
                    Purpose &amp; Progress.
                  </span>
                </h2>
                <p style={{ color: '#443850', marginTop: 12, fontSize: 16, lineHeight: 1.6 }}>
                  The foundational pillars shaping Dr. Dipali Awasekar's vision across transformative engineering pedagogy, responsible AI innovation, and holistic human leadership.
                </p>
              </div>

              {/* 3 Full Story Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>
                {[
                  {
                    num: '01',
                    category: 'Education & Mentorship',
                    title: 'Rooted in Education',
                    tagline: 'Inspiring Minds. Nurturing Potential. Building Futures.',
                    icon: 'school',
                    color: '#db2777',
                    bg: '#fdf2f8',
                    borderColor: '#fce7f3',
                    hoverClass: 'hv2-card',
                    paragraphs: [
                      "Education has always been at the heart of Dr. Dipali Awasekar's journey.",
                      "As an educator and mentor, she believes that the purpose of learning extends far beyond academic qualifications. True education inspires curiosity, builds confidence, strengthens character, and empowers individuals to shape their own futures.",
                      "Through years of teaching, academic initiatives, student mentorship, and professional development, she has encouraged young engineers to explore opportunities beyond traditional classrooms. Her approach combines technical excellence with experiential learning, communication, creativity, and human values.",
                      "A Dale Carnegie® Certified Faculty Instructor and recipient of recognition for excellence in engineering education, she continues to advocate for learning that is practical, transformative, and future-oriented.",
                      "For her, the greatest achievement of education is not merely producing graduates, but nurturing individuals capable of making a difference.",
                    ],
                  },
                  {
                    num: '02',
                    category: 'Artificial Intelligence & Ethics',
                    title: 'Pioneering Purpose-Driven Innovation',
                    tagline: 'Where Artificial Intelligence Meets Human Responsibility.',
                    icon: 'psychology',
                    color: '#7c3aed',
                    bg: '#f5f3ff',
                    borderColor: '#ede9fe',
                    hoverClass: 'hv2-card-purple',
                    paragraphs: [
                      "Dr. Awasekar's research journey reflects a conviction that technological progress must be accompanied by social responsibility.",
                      "Her work in Legal Artificial Intelligence explores how intelligent systems can support legal awareness, improve access to information, and assist individuals navigating complex legal frameworks.",
                      "Through NyayaSakhi–SWATI, she has developed a research-driven approach combining machine learning, natural language processing, statute-aligned reasoning, and retrieval-augmented generation to investigate AI-assisted legal guidance for women experiencing domestic violence.",
                      "Her broader technical interests include cybersecurity, responsible AI, human-centred design, and technology-enabled decision support. By connecting advanced computational research with real human challenges, she seeks to demonstrate that the most meaningful innovations are those that serve people.",
                      "Her vision is to advance technology that is not only intelligent, but also accessible, responsible, and humane.",
                    ],
                  },
                  {
                    num: '03',
                    category: 'Leadership, Expression & Impact',
                    title: 'Beyond Boundaries',
                    tagline: 'Leadership. Creativity. Expression. Social Impact.',
                    icon: 'palette',
                    color: '#db2777',
                    bg: '#fdf2f8',
                    borderColor: '#fce7f3',
                    hoverClass: 'hv2-card',
                    paragraphs: [
                      "For Dr. Dipali Awasekar, professional identity has never been confined to a single designation.",
                      "Beyond her academic and research contributions, she is passionate about public speaking, women's empowerment, cybersecurity awareness, mentorship, creative expression, and community engagement.",
                      "Her association with theatre, storytelling, design, and cultural initiatives reflects a personality that embraces both analytical thinking and artistic imagination.",
                      "As a speaker and mentor, she believes in the power of meaningful conversations to inspire confidence, challenge conventional thinking, and encourage personal growth. Her work with students, professional communities, and social initiatives reflects a broader commitment to empowering individuals through knowledge and opportunity.",
                      "She represents a belief that excellence need not belong to one discipline—and that the most fulfilling journeys are those that continually evolve.",
                    ],
                  },
                ].map(dim => (
                  <div key={dim.num} className={dim.hoverClass} style={{
                    background: '#ffffff', borderRadius: 22, padding: '40px 48px',
                    border: `1px solid ${dim.borderColor}`,
                    boxShadow: '0 6px 24px -4px rgba(124, 58, 237, 0.06)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <span className="hv2-mono" style={{
                          width: 48, height: 48, borderRadius: 14, background: dim.bg,
                          color: dim.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 800, fontSize: 16, border: `1px solid ${dim.borderColor}`,
                        }}>{dim.num}</span>
                        <div>
                          <span className="hv2-mono" style={{
                            fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em',
                            color: dim.color, fontWeight: 800, display: 'block', marginBottom: 2,
                          }}>{dim.category}</span>
                          <h3 className="hv2-display" style={{ fontSize: 'clamp(22px, 2vw, 26px)', fontWeight: 700, color: '#1e0b36' }}>
                            {dim.title}
                          </h3>
                        </div>
                      </div>
                      <div style={{
                        padding: '6px 14px', borderRadius: 9999, background: dim.bg,
                        border: `1px solid ${dim.borderColor}`, color: dim.color,
                        fontFamily: 'monospace', fontSize: 11.5, fontWeight: 700,
                        display: 'flex', alignItems: 'center', gap: 6,
                      }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{dim.icon}</span>
                        <span>{dim.tagline}</span>
                      </div>
                    </div>

                    <div style={{
                      display: 'flex', flexDirection: 'column', gap: 14,
                      paddingLeft: 'clamp(0px, 4vw, 64px)',
                      borderLeft: `2px solid ${dim.borderColor}`,
                      marginLeft: 24,
                    }}>
                      {dim.paragraphs.map((p, pIdx) => (
                        <p key={pIdx} style={{
                          fontSize: pIdx === 0 ? 16 : 15,
                          fontWeight: pIdx === 0 ? 600 : 400,
                          color: pIdx === 0 ? '#1e0b36' : '#443850',
                          lineHeight: 1.75,
                          margin: 0,
                        }}>
                          {p}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ══════════════════════════════════════
              SECTION 4 — FEATURED WORK (NyayaSakhi–SWATI)
          ══════════════════════════════════════ */}
          <section id="innovation" style={{
            width: '100%', padding: '112px 0',
            background: '#ffffff', borderBottom: '1px solid #ede8f8', overflow: 'hidden',
          }}>
            <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 3rem' }}>
              <div style={{ textAlign: 'center', maxWidth: 720, margin: '0 auto 64px' }}>
                <span className="hv2-mono" style={{
                  fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.15em',
                  color: '#db2777', fontWeight: 800, display: 'block', marginBottom: 8,
                }}>
                  SECTION 4 — FEATURED WORK
                </span>
                <h2 className="hv2-display" style={{
                  fontSize: 'clamp(32px, 3.5vw, 48px)', fontWeight: 800, color: '#1e0b36', letterSpacing: '-0.02em',
                }}>
                  NyayaSakhi–SWATI
                </h2>
                <p className="hv2-mono" style={{
                  fontSize: 15, color: '#7c3aed', fontWeight: 700, letterSpacing: '0.04em', marginTop: 8,
                }}>
                  Intelligence for Justice. Innovation for Humanity.
                </p>
                <p style={{ color: '#443850', marginTop: 12, fontSize: 16 }}>
                  An AI-driven approach to making legal knowledge more accessible.
                </p>
              </div>

              {/* Showcase Container */}
              <div style={{
                background: 'linear-gradient(135deg, #faf8fc 0%, #ffffff 50%, #f5f3ff 100%)',
                border: '1px solid #ede8f8', borderRadius: 24, padding: '52px 64px',
                boxShadow: '0 25px 60px -15px rgba(124, 58, 237, 0.08), 0 2px 10px rgba(0,0,0,0.02)',
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', gap: 48, alignItems: 'center' }}>
                  {/* Left Narrative */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div>
                      <span style={{
                        display: 'inline-block', padding: '5px 14px', borderRadius: 9999,
                        background: '#fdf2f8', color: '#db2777',
                        border: '1px solid #fbcfe8',
                        fontFamily: 'monospace', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', marginBottom: 14,
                      }}>
                        Doctoral Research Initiative • Legal AI
                      </span>
                      <h3 className="hv2-display" style={{ fontSize: 26, fontWeight: 700, color: '#1e0b36', lineHeight: 1.35 }}>
                        Bringing Artificial Intelligence Closer to People Facing Legal Barriers
                      </h3>
                    </div>

                    <p style={{ color: '#443850', lineHeight: 1.75, fontSize: 15.5, margin: 0 }}>
                      NyayaSakhi–SWATI represents Dr. Dipali Awasekar's vision of bringing Artificial Intelligence closer to the needs of people who may face barriers in understanding complex legal systems.
                    </p>
                    <p style={{ color: '#443850', lineHeight: 1.75, fontSize: 15.5, margin: 0 }}>
                      Developed through her doctoral research, the initiative explores intelligent legal guidance under the <strong>Protection of Women from Domestic Violence Act, 2005</strong>. By combining statute-aligned reasoning, machine learning, natural language processing, and retrieval-augmented generation (RAG), the research investigates ways to help women understand potential legal remedies and relevant procedural information.
                    </p>

                    <div style={{
                      padding: '18px 22px', borderRadius: 14,
                      background: 'rgba(219,39,119,0.05)', borderLeft: '4px solid #db2777',
                      border: '1px solid #fce7f3', borderLeftWidth: 4,
                    }}>
                      <p style={{ color: '#1e0b36', fontWeight: 700, fontSize: 15, lineHeight: 1.6, margin: 0 }}>
                        "Technology becomes truly meaningful when it empowers people to understand their rights and make informed decisions."
                      </p>
                    </div>

                    {/* CTAs */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginTop: 12, flexWrap: 'wrap' }}>
                      <a href="#connect" style={{
                        display: 'inline-flex', alignItems: 'center', gap: 8,
                        padding: '13px 28px', borderRadius: 9999,
                        background: 'linear-gradient(135deg, #db2777 0%, #7c3aed 100%)',
                        color: '#ffffff', textDecoration: 'none',
                        fontFamily: 'Montserrat, sans-serif', fontSize: 14, fontWeight: 700,
                        boxShadow: '0 10px 22px rgba(219,39,119,0.3)',
                        transition: 'transform 0.2s',
                      }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
                      >
                        Explore NyayaSakhi
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_forward</span>
                      </a>
                      <a href="#connect" style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '12px 24px', borderRadius: 9999,
                        background: '#ffffff', border: '1px solid #ddd6fe',
                        color: '#7c3aed', textDecoration: 'none',
                        fontFamily: 'Montserrat, sans-serif', fontSize: 14, fontWeight: 700,
                        transition: 'all 0.2s',
                      }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = '#7c3aed'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = '#ddd6fe'; e.currentTarget.style.transform = 'translateY(0)'; }}
                      >
                        Discover the Research
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>open_in_new</span>
                      </a>
                    </div>
                  </div>

                  {/* Right Tech Architecture Spec Card */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{
                      background: '#16072b', borderRadius: 20, padding: 32,
                      border: '1px solid #3b145a', color: '#fff',
                      boxShadow: '0 20px 45px -10px rgba(30,11,54,0.4)',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <span className="hv2-mono" style={{
                          fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em',
                          color: '#f472b6', fontWeight: 800,
                        }}>AI Architecture Pillars</span>
                        <span className="material-symbols-outlined" style={{ color: '#c084fc' }}>neurology</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {[
                          { title: 'Statute-Aligned Legal Reasoning', desc: 'Precise contextual alignment with PWDVA 2005 statutory structures' },
                          { title: 'Retrieval-Augmented Generation (RAG)', desc: 'Grounding AI outputs in verified judicial procedures and remedy guides' },
                          { title: 'Machine Learning & NLP', desc: 'Natural vernacular queries transformed into structured procedural pathways' },
                          { title: 'Responsible, Human-Centred Design', desc: 'Designed for accessibility, confidentiality, and compassionate empowerment' },
                        ].map((spec, i) => (
                          <div key={i} style={{
                            padding: '12px 16px', borderRadius: 12,
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.08)',
                          }}>
                            <p style={{ fontSize: 13.5, fontWeight: 700, color: '#fbcfe8', margin: '0 0 3px' }}>{spec.title}</p>
                            <p style={{ fontSize: 11.5, color: '#cbd5e1', margin: 0, lineHeight: 1.5 }}>{spec.desc}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ══════════════════════════════════════
              SECTION 5 — AUTHOR'S CORNER (Before You Graduate...)
          ══════════════════════════════════════ */}
          <section id="book" style={{
            width: '100%', padding: '112px 0',
            background: '#faf8fc', borderBottom: '1px solid #ede8f8', overflow: 'hidden',
          }}>
            <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 3rem' }}>
              <div style={{ textAlign: 'center', maxWidth: 720, margin: '0 auto 64px' }}>
                <span className="hv2-mono" style={{
                  fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.15em',
                  color: '#db2777', fontWeight: 800, display: 'block', marginBottom: 8,
                }}>
                  SECTION 5 — AUTHOR'S CORNER
                </span>
                <h2 className="hv2-display" style={{
                  fontSize: 'clamp(32px, 3.5vw, 48px)', fontWeight: 800, color: '#1e0b36', letterSpacing: '-0.02em',
                }}>
                  Before You Graduate...
                </h2>
                <p className="hv2-mono" style={{
                  fontSize: 14.5, color: '#be185d', fontWeight: 700, letterSpacing: '0.04em', marginTop: 8,
                }}>
                  Because Life's Most Important Lessons Are Not Always Taught in Classrooms.
                </p>
                <p style={{ color: '#443850', marginTop: 12, fontSize: 16 }}>
                  Education prepares you for a profession. Learning prepares you for life.
                </p>
              </div>

              {/* Book Container */}
              <div style={{
                background: '#ffffff', border: '1px solid #ede8f8', borderRadius: 24, padding: '52px 64px',
                boxShadow: '0 25px 60px -15px rgba(124, 58, 237, 0.08), 0 2px 10px rgba(0,0,0,0.02)',
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '5fr 7fr', gap: 48, alignItems: 'center' }}>
                  {/* Book 3D-Style Card */}
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <div style={{ maxWidth: 320, width: '100%' }}>
                      <div className="hv2-book-card" style={{
                        borderRadius: 16, overflow: 'hidden',
                        boxShadow: '0 25px 50px -12px rgba(219, 39, 119, 0.25), 0 10px 20px rgba(0,0,0,0.1)',
                        borderLeft: '5px solid #db2777',
                        border: '1px solid #2e1045',
                        background: '#16072b',
                      }}>
                        <div style={{
                          padding: 32, minHeight: 440,
                          background: 'linear-gradient(135deg, #130424 0%, #250a3d 50%, #4c1d95 100%)',
                          color: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                        }}>
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                              <span className="hv2-mono" style={{
                                fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em',
                                padding: '4px 10px', borderRadius: 4,
                                background: 'rgba(236,72,153,0.25)', color: '#fbcfe8',
                                border: '1px solid rgba(236,72,153,0.5)', fontWeight: 700,
                              }}>Developing Book Project</span>
                              <span className="material-symbols-outlined" style={{ color: '#d8b4fe' }}>menu_book</span>
                            </div>
                            <p className="hv2-mono" style={{ fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#c084fc', fontWeight: 600, marginBottom: 6 }}>
                              Author's Corner Series
                            </p>
                            <h3 className="hv2-display" style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.25, color: '#fff', marginBottom: 10 }}>
                              Before You Graduate...
                            </h3>
                            <p style={{ fontSize: 12.5, color: '#e2e8f0', lineHeight: 1.6 }}>
                              Because Life's Most Important Lessons Are Not Always Taught in Classrooms.
                            </p>
                          </div>
                          <div style={{ paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <p className="hv2-display" style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Dr. Dipali Dilip Awasekar</p>
                              <p className="hv2-mono" style={{ fontSize: 10, color: '#c4b5fd' }}>Academic Mentor &amp; Certified Educator</p>
                            </div>
                            <span className="material-symbols-outlined" style={{ color: '#f472b6', fontSize: 24 }}>auto_awesome</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Narrative on Book */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div>
                      <span style={{
                        display: 'inline-block', padding: '5px 14px', borderRadius: 9999,
                        background: '#fdf2f8', color: '#db2777',
                        border: '1px solid #fbcfe8',
                        fontFamily: 'monospace', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', marginBottom: 12,
                      }}>
                        A Companion for Navigating Life Beyond College
                      </span>
                      <h3 className="hv2-display" style={{ fontSize: 26, fontWeight: 700, color: '#1e0b36', lineHeight: 1.35 }}>
                        A degree may open doors. But what prepares you for the world beyond them?
                      </h3>
                    </div>

                    <p style={{ color: '#443850', lineHeight: 1.75, fontSize: 15.5, margin: 0 }}>
                      Inspired by years of teaching, mentoring, and interacting with young minds, <strong>Before You Graduate...</strong> is a developing book project that explores the lessons students need beyond academic knowledge.
                    </p>
                    <p style={{ color: '#443850', lineHeight: 1.75, fontSize: 15.5, margin: 0 }}>
                      From confidence and communication to professional readiness, resilience, purpose, and personal growth, the book is envisioned as a companion for young individuals preparing to navigate life beyond college.
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 4 }}>
                      {[
                        'Confidence & Authentic Communication',
                        'Professional Readiness & Career Resilience',
                        'Purpose-Driven Decision Making',
                        'Lifelong Learning Beyond Classrooms',
                      ].map(item => (
                        <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                          <span className="material-symbols-outlined" style={{ color: '#db2777', fontSize: 18, marginTop: 2 }}>check_circle</span>
                          <span style={{ fontSize: 14, color: '#1e0b36', fontWeight: 600 }}>{item}</span>
                        </div>
                      ))}
                    </div>

                    <div style={{ paddingTop: 14, display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
                      <a href="#connect" style={{
                        display: 'inline-flex', alignItems: 'center', gap: 8,
                        padding: '13px 28px', borderRadius: 9999,
                        background: 'linear-gradient(135deg, #1e0b36 0%, #311152 100%)',
                        color: '#ffffff', textDecoration: 'none',
                        fontFamily: 'Montserrat, sans-serif', fontSize: 14, fontWeight: 700,
                        boxShadow: '0 10px 20px -3px rgba(30,11,54,0.3)',
                        transition: 'transform 0.2s',
                        border: '1px solid #4a1d77',
                      }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
                      >
                        Discover the Book
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_forward</span>
                      </a>
                      <span className="hv2-mono" style={{ fontSize: 12, color: '#6b5b7b', fontWeight: 600 }}>
                        Coming Soon • Companion for Student Leaders
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ══════════════════════════════════════
              SECTION 6 — ARTICLES AND PERSPECTIVES
          ══════════════════════════════════════ */}
          <section id="articles" style={{
            width: '100%', padding: '112px 0',
            background: '#ffffff', borderBottom: '1px solid #ede8f8',
          }}>
            <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 3rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 64, flexWrap: 'wrap', gap: 20 }}>
                <div>
                  <span className="hv2-mono" style={{
                    fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.15em',
                    color: '#db2777', fontWeight: 800, display: 'block', marginBottom: 8,
                  }}>
                    SECTION 6 — BLOGS &amp; INSIGHTS
                  </span>
                  <h2 className="hv2-display" style={{
                    fontSize: 'clamp(32px, 3.5vw, 48px)', fontWeight: 800, color: '#1e0b36', letterSpacing: '-0.02em',
                  }}>
                    Ideas Worth Exploring.{' '}
                    <span style={{
                      background: 'linear-gradient(135deg, #db2777 0%, #7c3aed 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}>
                      Conversations Worth Starting.
                    </span>
                  </h2>
                </div>
              </div>

              {/* 6 Curated Article Titles */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 30 }}>
                {[
                  {
                    cat: 'EDUCATION', catColor: '#db2777', catBg: '#fdf2f8', catBorder: '#fbcfe8',
                    title: 'Beyond the Degree: Are We Preparing Students for Life?',
                    body: 'Rethinking pedagogical outcomes beyond academic credentials to nurture resilience, curiosity, authentic confidence, and human values.',
                    hoverClass: 'hv2-article', linkColor: '#db2777',
                  },
                  {
                    cat: 'ARTIFICIAL INTELLIGENCE', catColor: '#7c3aed', catBg: '#f5f3ff', catBorder: '#ddd6fe',
                    title: 'Can AI Make Justice More Accessible?',
                    body: 'Exploring how statute-aligned reasoning, natural language processing, and retrieval-augmented generation assist vulnerable populations navigating the law.',
                    hoverClass: 'hv2-article-purple', linkColor: '#7c3aed',
                  },
                  {
                    cat: 'CYBERSECURITY', catColor: '#059669', catBg: '#f0fdf4', catBorder: '#bbf7d0',
                    title: 'Digital Freedom Begins with Digital Responsibility.',
                    body: 'Why cyber awareness, data privacy, and ethical digital hygiene are non-negotiable foundations for contemporary engineers and citizens.',
                    hoverClass: 'hv2-article', linkColor: '#059669',
                  },
                  {
                    cat: 'WOMEN & LEADERSHIP', catColor: '#db2777', catBg: '#fdf2f8', catBorder: '#fbcfe8',
                    title: 'A Woman Is More Than the Roles She Plays.',
                    body: 'An inquiry into multidimensional identity, self-determination, and the courage required to lead without conforming to conventional stereotypes.',
                    hoverClass: 'hv2-article', linkColor: '#db2777',
                  },
                  {
                    cat: 'CREATIVITY', catColor: '#7c3aed', catBg: '#f5f3ff', catBorder: '#ddd6fe',
                    title: 'Why Engineers Need Imagination as Much as Intelligence.',
                    body: 'Connecting theatre, storytelling, and artistic expression with computational thinking to unlock holistic problem-solving in technological disciplines.',
                    hoverClass: 'hv2-article-purple', linkColor: '#7c3aed',
                  },
                  {
                    cat: 'PERSONAL GROWTH', catColor: '#d97706', catBg: '#fffbeb', catBorder: '#fde68a',
                    title: 'Becoming the Best Version of YOU.',
                    body: 'Actionable frameworks for continuous self-evolution, finding authentic purpose, and discovering that excellence is an evolving journey.',
                    hoverClass: 'hv2-article', linkColor: '#d97706',
                  },
                ].map(a => (
                  <article key={a.title} className={a.hoverClass} style={{
                    background: '#ffffff', borderRadius: 18, padding: 32,
                    border: '1px solid #ede8f8', display: 'flex', flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: '0 4px 20px -2px rgba(124, 58, 237, 0.05), 0 1px 3px rgba(0,0,0,0.02)',
                  }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                        <span className="hv2-mono" style={{
                          padding: '4px 12px', borderRadius: 9999,
                          background: a.catBg, color: a.catColor, border: `1px solid ${a.catBorder}`,
                          fontSize: 10.5, textTransform: 'uppercase', fontWeight: 800,
                        }}>{a.cat}</span>
                        <span className="hv2-mono" style={{ fontSize: 11, color: '#6b5b7b', fontWeight: 600 }}>Perspectives</span>
                      </div>
                      <h3 className="hv2-display" style={{
                        fontSize: 19, fontWeight: 700, color: '#1e0b36', marginBottom: 12, lineHeight: 1.35, transition: 'color 0.2s',
                      }}>
                        {a.title}
                      </h3>
                      <p style={{ fontSize: 14.5, color: '#443850', lineHeight: 1.65, marginBottom: 24 }}>{a.body}</p>
                    </div>
                    <div style={{ paddingTop: 18, borderTop: '1px solid #f1f0f8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="hv2-mono" style={{ fontSize: 12, color: a.linkColor, fontWeight: 800 }}>Read Insight →</span>
                      <span className="material-symbols-outlined" style={{ fontSize: 18, color: a.linkColor }}>arrow_outward</span>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>

          {/* ══════════════════════════════════════
              SECTION 7 — RECOGNITION AND MILESTONES
          ══════════════════════════════════════ */}
          <section id="recognition" style={{
            width: '100%', padding: '112px 0',
            background: '#f8f6fc', borderBottom: '1px solid #ede8f8', overflow: 'hidden',
          }}>
            <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 3rem' }}>
              <div style={{ textAlign: 'center', maxWidth: 780, margin: '0 auto 64px' }}>
                <span className="hv2-mono" style={{
                  fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.15em',
                  color: '#db2777', fontWeight: 800, display: 'block', marginBottom: 8,
                }}>
                  SECTION 7 — AWARDS &amp; RECOGNITION
                </span>
                <h2 className="hv2-display" style={{
                  fontSize: 'clamp(32px, 3.5vw, 48px)', fontWeight: 800, color: '#1e0b36', letterSpacing: '-0.02em',
                }}>
                  Recognised for Excellence.{' '}
                  <span style={{
                    background: 'linear-gradient(135deg, #7c3aed 0%, #db2777 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}>
                    Driven by Purpose.
                  </span>
                </h2>
                <p style={{ color: '#443850', marginTop: 14, fontSize: 16, lineHeight: 1.7 }}>
                  Recognition is an important milestone, but the purpose behind the work remains the greater motivation. Dr. Dipali Awasekar's contributions to engineering education, research, and technology-enabled social initiatives have been acknowledged through professional and academic recognitions.
                </p>
              </div>

              {/* Recognition Milestone Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, marginBottom: 40 }}>
                {[
                  {
                    title: 'AICTE Lilavati Award',
                    subtitle: 'Women Empowerment & Tech Innovation',
                    desc: 'National recognition celebrating impact-driven technological applications and advancing gender equity in STEM.',
                    icon: 'workspace_premium',
                    color: '#db2777', bg: '#fdf2f8', borderColor: '#fce7f3',
                  },
                  {
                    title: 'IUCEE Outstanding Educator',
                    subtitle: 'Engineering Education Excellence',
                    desc: 'Indo-Universal Collaboration for Engineering Education honor recognizing transformative pedagogical contributions.',
                    icon: 'military_tech',
                    color: '#7c3aed', bg: '#f5f3ff', borderColor: '#ede9fe',
                  },
                  {
                    title: 'Research Excellence Honours',
                    subtitle: 'Legal AI & Societal Guidance',
                    desc: 'Academic commendation for pioneering doctoral research combining machine learning, RAG, and statutory justice.',
                    icon: 'school',
                    color: '#db2777', bg: '#fdf2f8', borderColor: '#fce7f3',
                  },
                  {
                    title: 'State-Level Research Innovation',
                    subtitle: 'Initiative Participation & Honors',
                    desc: 'Demonstrated excellence across interdisciplinary research forums and state-level technological initiatives.',
                    icon: 'award_star',
                    color: '#7c3aed', bg: '#f5f3ff', borderColor: '#ede9fe',
                  },
                ].map((item, i) => (
                  <div key={i} className="hv2-card" style={{
                    background: '#ffffff', borderRadius: 18, padding: 28,
                    border: `1px solid ${item.borderColor}`, display: 'flex', flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: '0 4px 18px rgba(124, 58, 237, 0.05)',
                  }}>
                    <div>
                      <div style={{
                        width: 44, height: 44, borderRadius: 12,
                        background: item.bg, color: item.color, border: `1px solid ${item.borderColor}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18,
                      }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 24 }}>{item.icon}</span>
                      </div>
                      <h4 className="hv2-display" style={{ fontSize: 18, fontWeight: 700, color: '#1e0b36', marginBottom: 6 }}>
                        {item.title}
                      </h4>
                      <p className="hv2-mono" style={{ fontSize: 11, color: item.color, fontWeight: 700, textTransform: 'uppercase', marginBottom: 12 }}>
                        {item.subtitle}
                      </p>
                      <p style={{ fontSize: 13.5, color: '#443850', lineHeight: 1.6, margin: 0 }}>
                        {item.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Bottom Credo Quote */}
              <div style={{
                textAlign: 'center', padding: '24px 32px', borderRadius: 16,
                background: '#ffffff', border: '1px solid #ede8f8', maxWidth: 840, margin: '0 auto',
                boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
              }}>
                <p style={{ fontSize: 16, color: '#1e0b36', fontStyle: 'italic', fontWeight: 600, margin: 0 }}>
                  "The recognition celebrates the journey. The purpose continues to drive it."
                </p>
              </div>
            </div>
          </section>

          {/* ══════════════════════════════════════
              SECTION 8 — MEDIA AND FEATURED MOMENTS
          ══════════════════════════════════════ */}
          <section id="media" style={{
            width: '100%', padding: '112px 0',
            background: '#ffffff', borderBottom: '1px solid #ede8f8', overflow: 'hidden',
          }}>
            <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 3rem' }}>
              <div style={{ textAlign: 'center', maxWidth: 780, margin: '0 auto 64px' }}>
                <span className="hv2-mono" style={{
                  fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.15em',
                  color: '#db2777', fontWeight: 800, display: 'block', marginBottom: 8,
                }}>
                  SECTION 8 — MEDIA &amp; MOMENTS
                </span>
                <h2 className="hv2-display" style={{
                  fontSize: 'clamp(32px, 3.5vw, 48px)', fontWeight: 800, color: '#1e0b36', letterSpacing: '-0.02em',
                }}>
                  On the Stage. In the Classroom.{' '}
                  <span style={{
                    background: 'linear-gradient(135deg, #7c3aed 0%, #db2777 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}>
                    Beyond the Ordinary.
                  </span>
                </h2>
                <p style={{ color: '#443850', marginTop: 14, fontSize: 16, lineHeight: 1.7 }}>
                  Every platform offers an opportunity to share knowledge, exchange ideas, and inspire change. From academic conferences and research presentations to speaking engagements, professional development programmes, student innovation initiatives, and community activities, Dr. Awasekar's journey reflects a commitment to lifelong learning and meaningful engagement.
                </p>
              </div>

              {/* 3 Featured Moment Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 32, marginBottom: 48 }}>
                {[
                  {
                    img: 'https://lh3.googleusercontent.com/aida/AEtjO1Xd1maN9JaPsmLdgjhKT7re86KMV4C0Z3xP21kJoIlgi12BD-ZOs2NgySkIPX2ePpM67Y35aUyt-Kjwa9zwJiGQsWCQsb4YRk-pwn6vxlwEnZnkoqalRzk27K2R37cjTjCv8ZAfVSo9yjbK_UtyDXqLLePLXpq1NBmH5KmH0smcA-Uv3wTPOhSngBGci2OXaQ-fnxGJGMSnpj-TufUQBN1cb5QbIIUvwcNLLJtJ63yVG15nh9hxADLCuSJ7bJzBkSnUorCrZpNY4g',
                    objectPosition: '68% 46%',
                    cat: 'Keynote & Conclaves',
                    title: 'Statute-Aligned Legal AI & Ethical Intelligence Presentation',
                    desc: 'Delivering keynote research insights at national academic symposiums on machine learning for social equity.',
                  },
                  {
                    img: 'https://lh3.googleusercontent.com/aida/AEtjO1VD8oBkOhB91ijm4PtOOIJWNTEbKs0gkC6Jt-1N1v2E-oK8QxZZ7I5gapZab6_1LRRQCdIwn_HB9Ejpf4TwQd5IpspY6fzh7uLqzB_H4eZxOkkAgE9uh1niAm4Q02W59OA5DjdPsN360d2c0nvAWYqqmjz3LxxUxAUB3WkemkJhq2XS3_Nq679597ejdW4ASAgoioR25FByOp-8DlK1yHJTP4ldHPp_HbcG63bs5cqjlO24qSUH8szCGl1nhPm0AJocXLgr47R9pg',
                    objectPosition: 'center 18%',
                    cat: 'Faculty & Mentorship',
                    title: 'Dale Carnegie® Masterclass & Pedagogical Innovation',
                    desc: 'Facilitating active-learning development programmes empowering educators and young engineering leaders.',
                  },
                  {
                    img: 'https://lh3.googleusercontent.com/aida/AEtjO1XQu-zUr-Q7_ZP13Jros6Mu3X-2nyLimsYN2nTB9lppyvugWK1-E_TedVujnSBp4gE1TS4vUoYG_-byFRseBIbRZGRcyTpdzHpJu2JIIb7P-FGYlQnuOhGEohtF1Ej6qPnCdA93dqQCc_SQVttYAV7GyA4cXQmVzCnlQd5CY2S1zaRhz1RuQxAJHm6RwXgbe412ZhqY1fMY_sakbgoLPUxZbtabmv8bI_aGEHCwXCqT8SGlxP1VjU4CeF4ZwhXIYgp4R7zbRVEnzA',
                    objectPosition: 'center 10%',
                    cat: 'Creative Expression & Outreach',
                    title: 'Storytelling, Theatre & Women in STEM Leadership',
                    desc: 'Engaging student innovators and social organizations through interactive dialogues on leadership and creativity.',
                  },
                ].map(v => (
                  <div key={v.title} className="hv2-video-card" style={{
                    background: '#ffffff', borderRadius: 18, overflow: 'hidden',
                    border: '1px solid #ede8f8',
                    boxShadow: '0 4px 20px -2px rgba(124, 58, 237, 0.05), 0 1px 3px rgba(0,0,0,0.02)',
                  }}>
                    <div style={{ position: 'relative', height: 230, background: '#ede9fe', overflow: 'hidden' }}>
                      <img
                        src={v.img}
                        alt={v.title}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          objectPosition: v.objectPosition,
                          transition: 'transform 0.5s ease',
                        }}
                      />
                      <div style={{
                        position: 'absolute', inset: 0,
                        background: 'linear-gradient(to top, rgba(30,11,54,0.7) 0%, transparent 60%)',
                      }} />
                      <div style={{
                        position: 'absolute', bottom: 14, left: 16,
                        padding: '4px 10px', borderRadius: 6,
                        background: 'rgba(219,39,119,0.85)', color: '#fff',
                        fontFamily: 'monospace', fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase',
                      }}>{v.cat}</div>
                    </div>
                    <div style={{ padding: 26 }}>
                      <h4 className="hv2-display" style={{ fontSize: 18, fontWeight: 700, color: '#1e0b36', lineHeight: 1.35, marginBottom: 8, transition: 'color 0.2s' }}>
                        {v.title}
                      </h4>
                      <p style={{ fontSize: 13.5, color: '#443850', lineHeight: 1.6, margin: 0 }}>
                        {v.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Bottom Tagline & Actions */}
              <div style={{
                textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
              }}>
                <p className="hv2-mono" style={{ fontSize: 14.5, color: '#7c3aed', fontWeight: 700, letterSpacing: '0.04em' }}>
                  Every Experience Adds a Dimension. Every Dimension Adds a Purpose.
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                  <a href="#media" style={{
                    color: '#db2777', fontWeight: 800, fontFamily: 'monospace', fontSize: 13, textDecoration: 'none',
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                    <span>Explore Media</span>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_forward</span>
                  </a>
                  <span style={{ color: '#d8b4fe' }}>•</span>
                  <Link to="/events" style={{
                    color: '#7c3aed', fontWeight: 800, fontFamily: 'monospace', fontSize: 13, textDecoration: 'none',
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                    <span>View Events</span>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_forward</span>
                  </Link>
                  <span style={{ color: '#d8b4fe' }}>•</span>
                  <a href="#media" style={{
                    color: '#db2777', fontWeight: 800, fontFamily: 'monospace', fontSize: 13, textDecoration: 'none',
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                    <span>Watch Videos</span>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_forward</span>
                  </a>
                </div>
              </div>
            </div>
          </section>

          {/* ══════════════════════════════════════
              SECTION 9 — TESTIMONIALS
          ══════════════════════════════════════ */}
          <section id="testimonials" style={{
            width: '100%', padding: '112px 0',
            background: '#faf8fc', borderBottom: '1px solid #ede8f8',
          }}>
            <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 3rem' }}>
              <div style={{ textAlign: 'center', maxWidth: 780, margin: '0 auto 64px' }}>
                <span className="hv2-mono" style={{
                  fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.15em',
                  color: '#db2777', fontWeight: 800, display: 'block', marginBottom: 8,
                }}>
                  SECTION 9 — TESTIMONIALS
                </span>
                <h2 className="hv2-display" style={{
                  fontSize: 'clamp(32px, 3.5vw, 48px)', fontWeight: 800, color: '#1e0b36', letterSpacing: '-0.02em',
                }}>
                  The Most Meaningful Impact Is Reflected in the{' '}
                  <span style={{
                    background: 'linear-gradient(135deg, #db2777 0%, #7c3aed 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}>
                    Lives We Touch.
                  </span>
                </h2>
                <p className="hv2-mono" style={{
                  fontSize: 14.5, color: '#7c3aed', fontWeight: 700, letterSpacing: '0.04em', marginTop: 10,
                }}>
                  Voices from the Journey
                </p>
                <p style={{ color: '#443850', marginTop: 12, fontSize: 15.5, lineHeight: 1.7 }}>
                  The true influence of an educator, mentor, researcher, or speaker is reflected in the experiences of those who have been part of the journey. Discover perspectives from students, colleagues, collaborators, and professional communities who have engaged with Dr. Dipali Awasekar's work.
                </p>
              </div>

              {/* Testimonial Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 32 }}>
                {[
                  {
                    text: '"Dr. Dipali Awasekar is an extraordinary educator whose belief in student potential transforms how we view engineering. Under her mentorship, learning became experiential, inspiring us to question deeply and build systems with genuine human empathy."',
                    initials: 'SK', color: '#db2777', bg: '#fdf2f8', borderColor: '#fce7f3',
                    name: 'Siddharth Kulkarni', role: 'Former Student & Lead Systems Engineer',
                  },
                  {
                    text: '"Her pioneering work with NyayaSakhi–SWATI proves how machine learning and legal frameworks can unite for direct social good. Dr. Awasekar combines rigorous academic research with relentless empathy for underserved communities."',
                    initials: 'PD', color: '#7c3aed', bg: '#f5f3ff', borderColor: '#ddd6fe',
                    name: 'Dr. Pallavi Deshmukh', role: 'Collaborating Researcher & Associate Professor',
                  },
                  {
                    text: '"As a Dale Carnegie® certified instructor and faculty mentor, Dr. Awasekar brings infectious energy, clarity, and authentic conviction to every session. She has reshaped professional readiness across campuses."',
                    initials: 'RN', color: '#db2777', bg: '#fdf2f8', borderColor: '#fce7f3',
                    name: 'Rajesh Nair', role: 'Dean of Academic Development & Innovation',
                  },
                ].map(t => (
                  <div key={t.name} className="hv2-card" style={{
                    background: '#ffffff', borderRadius: 18, padding: 32,
                    border: '1px solid #ede8f8', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                    boxShadow: '0 4px 20px -2px rgba(124, 58, 237, 0.04)',
                  }}>
                    <div>
                      <div style={{ display: 'flex', gap: 4, marginBottom: 18 }}>
                        {[...Array(5)].map((_, i) => (
                          <span key={i} className="material-symbols-outlined" style={{ color: '#f59e0b', fontSize: 18, fontVariationSettings: "'FILL' 1" }}>star</span>
                        ))}
                      </div>
                      <p style={{ color: '#26153b', fontSize: 14.5, lineHeight: 1.7, fontStyle: 'italic', margin: 0 }}>{t.text}</p>
                    </div>
                    <div style={{ paddingTop: 20, borderTop: '1px solid #ede8f8', marginTop: 24, display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: 12,
                        background: t.bg, color: t.color, border: `1px solid ${t.borderColor}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: 'monospace', fontWeight: 800, fontSize: 13,
                        flexShrink: 0,
                      }}>{t.initials}</div>
                      <div>
                        <h4 className="hv2-display" style={{ fontSize: 15, fontWeight: 700, color: '#1e0b36', margin: 0 }}>{t.name}</h4>
                        <p className="hv2-mono" style={{ fontSize: 11, color: '#6b5b7b', fontWeight: 600, margin: '2px 0 0' }}>{t.role}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Bottom Credo Quote */}
              <div style={{ textAlign: 'center', marginTop: 48 }}>
                <p style={{ fontSize: 15, color: '#6b5b7b', fontStyle: 'italic', margin: 0 }}>
                  "Because the greatest achievements are often the stories of people we have inspired."
                </p>
              </div>
            </div>
          </section>

          {/* ══════════════════════════════════════
              SECTION 10 — CONNECT
          ══════════════════════════════════════ */}
          <section id="connect" style={{
            width: '100%', padding: '112px 0',
            background: 'linear-gradient(180deg, #faf8fc 0%, #f1ecfa 100%)', overflow: 'hidden',
          }}>
            <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 3rem' }}>
              <div style={{
                background: '#ffffff', border: '1px solid #e9d5ff', borderRadius: 24, padding: '56px 64px',
                boxShadow: '0 25px 60px -15px rgba(124, 58, 237, 0.12), 0 4px 14px rgba(0,0,0,0.02)',
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '8fr 4fr', gap: 40, alignItems: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: 8,
                      padding: '6px 16px', borderRadius: 9999,
                      background: '#fdf2f8', border: '1px solid #fbcfe8',
                      color: '#db2777', fontFamily: 'monospace', fontSize: 11, textTransform: 'uppercase', fontWeight: 800,
                      width: 'fit-content',
                    }}>
                      <span className="hv2-ping" style={{ width: 8, height: 8, borderRadius: '50%', background: '#059669', display: 'inline-block' }} />
                      SECTION 10 — LET'S CONNECT
                    </div>
                    <h2 className="hv2-display" style={{
                      fontSize: 'clamp(32px, 3.8vw, 48px)', fontWeight: 800, color: '#1e0b36', letterSpacing: '-0.02em', lineHeight: 1.15,
                    }}>
                      Great Ideas Begin<br />
                      <span style={{
                        background: 'linear-gradient(135deg, #db2777 0%, #7c3aed 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                      }}>
                        With Meaningful Conversations.
                      </span>
                    </h2>
                    <p style={{ color: '#443850', fontSize: 15.5, lineHeight: 1.75, maxWidth: 640, margin: 0 }}>
                      Whether it's education, responsible AI, cybersecurity, legal innovation, women's empowerment, public speaking, or creative collaboration, every opportunity to exchange ideas is an opportunity to create impact.
                    </p>
                    <div style={{
                      padding: '16px 20px', borderRadius: 12, background: '#f5f3ff', border: '1px solid #ede9fe',
                      width: 'fit-content',
                    }}>
                      <p className="hv2-mono" style={{ fontSize: 13, color: '#6d28d9', fontWeight: 800, margin: 0 }}>
                        Let's Connect. Collaborate. Create Change.
                      </p>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, color: '#1e0b36', fontFamily: 'monospace', fontSize: 12, fontWeight: 700 }}>
                      {[
                        { icon: 'school', text: 'Academic Pedagogy' },
                        { icon: 'neurology', text: 'Legal AI Research' },
                        { icon: 'security', text: 'Cybersecurity Awareness' },
                        { icon: 'campaign', text: 'Keynote & Speaking' },
                      ].map(item => (
                        <span key={item.text} style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          background: '#fdf4ff', padding: '7px 16px', borderRadius: 10, border: '1px solid #f0abfc',
                        }}>
                          <span className="material-symbols-outlined" style={{ color: '#db2777', fontSize: 18 }}>{item.icon}</span>
                          <span>{item.text}</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{
                      width: '100%', maxWidth: 320,
                      background: '#faf8fc', borderRadius: 20, padding: 28,
                      border: '1px solid #ede8f8', textAlign: 'center',
                      display: 'flex', flexDirection: 'column', gap: 18,
                      boxShadow: '0 10px 25px -5px rgba(124, 58, 237, 0.08)',
                    }}>
                      <div style={{ width: 72, height: 72, borderRadius: '50%', margin: '0 auto', overflow: 'hidden', border: '3px solid #db2777', boxShadow: '0 6px 16px rgba(219,39,119,0.25)' }}>
                        <img
                          src="https://lh3.googleusercontent.com/aida/AEtjO1VD8oBkOhB91ijm4PtOOIJWNTEbKs0gkC6Jt-1N1v2E-oK8QxZZ7I5gapZab6_1LRRQCdIwn_HB9Ejpf4TwQd5IpspY6fzh7uLqzB_H4eZxOkkAgE9uh1niAm4Q02W59OA5DjdPsN360d2c0nvAWYqqmjz3LxxUxAUB3WkemkJhq2XS3_Nq679597ejdW4ASAgoioR25FByOp-8DlK1yHJTP4ldHPp_HbcG63bs5cqjlO24qSUH8szCGl1nhPm0AJocXLgr47R9pg"
                          alt="Dr. Dipali Dilip Awasekar"
                          style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }}
                        />
                      </div>
                      <div>
                        <h4 className="hv2-display" style={{ fontSize: 17, fontWeight: 700, color: '#1e0b36', margin: 0 }}>Dr. Dipali Awasekar</h4>
                        <p className="hv2-mono" style={{ fontSize: 11, color: '#6b5b7b', marginTop: 4, fontWeight: 600 }}>Direct Advisory &amp; Collaboration</p>
                      </div>
                      <a
                        href="https://topmate.io"
                        target="_blank" rel="noopener noreferrer"
                        style={{
                          width: '100%', padding: '13px 24px', borderRadius: 9999,
                          background: 'linear-gradient(135deg, #db2777 0%, #7c3aed 100%)',
                          color: '#ffffff', fontFamily: 'Montserrat, sans-serif',
                          fontSize: 14, fontWeight: 700, textDecoration: 'none',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                          boxShadow: '0 10px 20px rgba(219,39,119,0.3)',
                          transition: 'transform 0.2s, box-shadow 0.2s',
                          boxSizing: 'border-box',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 14px 28px rgba(219,39,119,0.4)';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 10px 20px rgba(219,39,119,0.3)';
                        }}
                      >
                        Book a 1:1 Conversation
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>calendar_today</span>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>

        {/* ══════════════════════════════════════
            FOOTER — EDITORIAL LIGHT FINISH
        ══════════════════════════════════════ */}
        <footer id="footer" style={{ background: '#f4f1f8', borderTop: '1px solid #e2dded', padding: '64px 0 40px' }}>
          <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 3rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1.2fr', gap: 32 }}>
              <div style={{ paddingRight: 24 }}>
                <div className="hv2-display" style={{ fontSize: 24, fontWeight: 800, color: '#1e0b36', marginBottom: 12 }}>
                  ELEVATE<span style={{ color: '#db2777' }}>.</span>
                </div>
                <p style={{ fontSize: 14, color: '#5b4a6b', maxWidth: 320, marginBottom: 16, lineHeight: 1.6 }}>
                  Empowering engineers and tech visionaries through rigorous academic principles, strategic guidance, and high-impact industry mentorship.
                </p>
                <p className="hv2-mono" style={{ fontSize: 11, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>
                  The Modern Executive Academy
                </p>
              </div>

              {[
                {
                  heading: 'Platform',
                  links: [
                    { name: 'About', path: '/about-elevate' },
                    { name: 'Courses', path: '/courses' },
                    { name: 'Community', path: '/community' },
                    { name: 'Career Roadmaps', path: '/career-roadmaps' },
                    { name: 'Testimonials', path: '/testimonials' },
                  ],
                },
                {
                  heading: 'Resources',
                  links: [
                    { name: 'Blog & Articles', path: '#articles' },
                    { name: 'Masterclasses', path: '/events' },
                    { name: 'Research Papers', path: '#innovation' },
                    { name: 'Case Studies', path: '#dimensions' },
                  ],
                },
                {
                  heading: 'Connect',
                  links: [
                    { name: 'Topmate 1:1', path: 'https://topmate.io', external: true },
                    { name: 'LinkedIn', path: 'https://www.linkedin.com', external: true },
                    { name: 'Twitter', path: 'https://twitter.com', external: true },
                    { name: 'YouTube Channel', path: 'https://www.youtube.com', external: true },
                  ],
                },
              ].map(col => (
                <div key={col.heading}>
                  <h4 className="hv2-display" style={{ fontSize: 14, fontWeight: 700, color: '#1e0b36', marginBottom: 16, letterSpacing: '0.05em' }}>{col.heading}</h4>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {col.links.map(l => (
                      <li key={l.name}>
                        {l.external ? (
                          <a href={l.path} target="_blank" rel="noopener noreferrer" className="hv2-footer-link" style={{ fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>{l.name}</a>
                        ) : l.path.startsWith('#') ? (
                          <a href={l.path} className="hv2-footer-link" style={{ fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>{l.name}</a>
                        ) : (
                          <Link to={l.path} className="hv2-footer-link" style={{ fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>{l.name}</Link>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}

              <div>
                <h4 className="hv2-display" style={{ fontSize: 14, fontWeight: 700, color: '#1e0b36', marginBottom: 16 }}>Newsletter</h4>
                <p style={{ fontSize: 13, color: '#5b4a6b', marginBottom: 14, lineHeight: 1.5 }}>
                  Engineering insights, academic dispatches, and career frameworks—monthly.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <input
                    type="email"
                    placeholder="Enter your email"
                    style={{
                      width: '100%', background: '#ffffff', border: '1px solid #d8b4fe',
                      borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#1e0b36',
                      outline: 'none', boxSizing: 'border-box',
                      boxShadow: '0 1px 3px rgba(124,58,237,0.06)',
                    }}
                  />
                  <button style={{
                    width: '100%', padding: '10px 0', borderRadius: 10,
                    background: 'linear-gradient(135deg, #db2777 0%, #7c3aed 100%)',
                    color: '#ffffff', border: 'none',
                    fontFamily: 'Montserrat, sans-serif', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(219,39,119,0.25)',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                  }}
                    onMouseEnter={e => {
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 6px 18px rgba(219,39,119,0.35)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 14px rgba(219,39,119,0.25)';
                    }}
                  >Subscribe</button>
                </div>
              </div>
            </div>

            <div style={{
              marginTop: 48, paddingTop: 24, borderTop: '1px solid #e2dded',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              fontFamily: 'monospace', fontSize: 12, color: '#6b5b7b', flexWrap: 'wrap', gap: 12,
            }}>
              <p>© 2026 Dr. Dipali Awasekar. All rights reserved.</p>
              <p style={{ textTransform: 'uppercase', letterSpacing: '0.12em', color: '#7c3aed', fontWeight: 700 }}>Knowledge • Innovation • Social Impact</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
