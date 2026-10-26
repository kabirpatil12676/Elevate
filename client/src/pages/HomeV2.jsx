import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import mentoringImg from '../assets/home page option 2/image for Mentoring India\'s Future.png';

/* ─────────────────────────────────────────
   HomeV2 — "Sleek Editorial Dark" design
   Based on: src/assets/home page option 2/code.html
   Route: /home-v2
───────────────────────────────────────── */

export default function HomeV2() {
  const [slideIdx, setSlideIdx] = useState(0);
  const [animState, setAnimState] = useState('idle'); // 'idle' | 'exit-left' | 'exit-right'
  const [direction, setDirection] = useState(1);      // 1 = forward (next), -1 = backward (prev)
  const [mounted, setMounted] = useState(false);

  // Three distinct images — one per slide
  const slides = [
    {
      title: (<>Defining<br />India's Digital<br />Space.</>),
      words: ['Defining', "India's Digital", 'Space.'],
      sub: 'Academic Innovator & Strategic Tech Mentor',
      img: 'https://lh3.googleusercontent.com/aida/AEtjO1VD8oBkOhB91ijm4PtOOIJWNTEbKs0gkC6Jt-1N1v2E-oK8QxZZ7I5gapZab6_1LRRQCdIwn_HB9Ejpf4TwQd5IpspY6fzh7uLqzB_H4eZxOkkAgE9uh1niAm4Q02W59OA5DjdPsN360d2c0nvAWYqqmjz3LxxUxAUB3WkemkJhq2XS3_Nq679597ejdW4ASAgoioR25FByOp-8DlK1yHJTP4ldHPp_HbcG63bs5cqjlO24qSUH8szCGl1nhPm0AJocXLgr47R9pg',
    },
    {
      title: (<>Mentoring<br />India's Future<br />Engineers.</>),
      words: ['Mentoring', "India's Future", 'Engineers.'],
      sub: 'Empowering 12,000+ Builders & Tech Leaders',
      img: mentoringImg,
    },
    {
      title: (<>Architecting<br />AI Research &<br />Ventures.</>),
      words: ['Architecting', 'AI Research &', 'Ventures.'],
      sub: 'From Campus Capstones to Global Platforms',
      img: 'https://lh3.googleusercontent.com/aida/AEtjO1Xd1maN9JaPsmLdgjhKT7re86KMV4C0Z3xP21kJoIlgi12BD-ZOs2NgySkIPX2ePpM67Y35aUyt-Kjwa9zwJiGQsWCQsb4YRk-pwn6vxlwEnZnkoqalRzk27K2R37cjTjCv8ZAfVSo9yjbK_UtyDXqLLePLXpq1NBmH5KmH0smcA-Uv3wTPOhSngBGci2OXaQ-fnxGJGMSnpj-TufUQBN1cb5QbIIUvwcNLLJtJ63yVG15nh9hxADLCuSJ7bJzBkSnUorCrZpNY4g',
    },
  ];

  // Staggered entrance on mount
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 80);
    return () => clearTimeout(t);
  }, []);

  function changeSlide(delta) {
    if (animState !== 'idle') return; // prevent spamming
    setDirection(delta);
    setAnimState(delta > 0 ? 'exit-left' : 'exit-right');
    setTimeout(() => {
      setSlideIdx((prev) => (prev + delta + slides.length) % slides.length);
      setAnimState('enter');
      setTimeout(() => setAnimState('idle'), 600);
    }, 350);
  }

  return (
    <>
      {/* ── Google Fonts & Material Symbols ── */}
      <link
        href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&family=Manrope:wght@300;400;500;600;700&display=swap"
        rel="stylesheet"
      />
      <link
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
        rel="stylesheet"
      />

      <style>{`
        .hv2-body {
          min-height: 100vh;
          background-color: #0b0314;
          color: #f7d8fe;
          font-family: 'Manrope', sans-serif;
          -webkit-font-smoothing: antialiased;
        }
        .hv2-display { font-family: 'Montserrat', sans-serif; }
        .hv2-mono   { font-family: 'ui-monospace', 'SFMono-Regular', monospace; }

        /* ── Polygon float ── */
        @keyframes hv2PolygonFloat {
          0%, 100% { transform: rotate(0deg) scale(1) translateY(0px); }
          50%       { transform: rotate(2deg) scale(1.025) translateY(-8px); }
        }
        .hv2-polygon-float { animation: hv2PolygonFloat 8s ease-in-out infinite; }

        /* ── Ping dot ── */
        @keyframes hv2Ping {
          75%, 100% { transform: scale(2); opacity: 0; }
        }
        .hv2-ping { animation: hv2Ping 1s cubic-bezier(0,0,0.2,1) infinite; }

        /* ══════════════════════════════════════
           PAGE-LOAD ENTRANCE ANIMATIONS
        ══════════════════════════════════════ */

        /* Header slides down */
        @keyframes hv2NavEnter {
          from { opacity: 0; transform: translateY(-24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .hv2-nav-enter {
          animation: hv2NavEnter 0.7s cubic-bezier(0.16,1,0.3,1) 0.1s both;
        }

        /* Word lines clip up out of a hidden container */
        @keyframes hv2WordUp {
          from { opacity: 0; transform: translateY(110%); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .hv2-word-0 { animation: hv2WordUp 0.8s cubic-bezier(0.16,1,0.3,1) 0.35s both; }
        .hv2-word-1 { animation: hv2WordUp 0.8s cubic-bezier(0.16,1,0.3,1) 0.5s  both; }
        .hv2-word-2 { animation: hv2WordUp 0.8s cubic-bezier(0.16,1,0.3,1) 0.65s both; }

        /* Subline fades+slides up */
        @keyframes hv2SubEnter {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .hv2-sub-enter  { animation: hv2SubEnter 0.7s cubic-bezier(0.16,1,0.3,1) 0.85s both; }
        .hv2-loc-enter  { animation: hv2SubEnter 0.7s cubic-bezier(0.16,1,0.3,1) 1.0s  both; }

        /* Portrait slides up from below on load */
        @keyframes hv2ImgEnterLoad {
          from { opacity: 0; transform: translateX(-50%) translateY(60px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        .hv2-img-load {
          animation: hv2ImgEnterLoad 1s cubic-bezier(0.16,1,0.3,1) 0.4s both;
        }

        /* ══════════════════════════════════════
           PREV / NEXT SLIDE TRANSITIONS
        ══════════════════════════════════════ */

        /* Text exit — slides UP and fades out */
        @keyframes hv2TextExitUp {
          from { opacity: 1; transform: translateY(0); }
          to   { opacity: 0; transform: translateY(-40px); }
        }
        /* Text enter — comes from BELOW */
        @keyframes hv2TextEnterUp {
          from { opacity: 0; transform: translateY(50px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* Image EXIT left (going forward) */
        @keyframes hv2ImgExitLeft {
          from { opacity: 1; transform: translateX(-50%) translateY(0)   scale(1); }
          to   { opacity: 0; transform: translateX(calc(-50% - 120px)) translateY(0) scale(0.92); }
        }
        /* Image EXIT right (going backward) */
        @keyframes hv2ImgExitRight {
          from { opacity: 1; transform: translateX(-50%) translateY(0)   scale(1); }
          to   { opacity: 0; transform: translateX(calc(-50% + 120px)) translateY(0) scale(0.92); }
        }
        /* Image ENTER from right (going forward) */
        @keyframes hv2ImgEnterRight {
          from { opacity: 0; transform: translateX(calc(-50% + 120px)) translateY(0) scale(0.92); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0)   scale(1); }
        }
        /* Image ENTER from left (going backward) */
        @keyframes hv2ImgEnterLeft {
          from { opacity: 0; transform: translateX(calc(-50% - 120px)) translateY(0) scale(0.92); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0)   scale(1); }
        }

        .hv2-text-exit    { animation: hv2TextExitUp  0.35s cubic-bezier(0.4,0,1,1)    both; }
        .hv2-text-enter   { animation: hv2TextEnterUp 0.55s cubic-bezier(0.16,1,0.3,1) 0.05s both; }

        .hv2-img-exit-left  { animation: hv2ImgExitLeft  0.35s cubic-bezier(0.4,0,1,1)    both; }
        .hv2-img-exit-right { animation: hv2ImgExitRight 0.35s cubic-bezier(0.4,0,1,1)    both; }
        .hv2-img-enter-right{ animation: hv2ImgEnterRight 0.6s cubic-bezier(0.16,1,0.3,1) 0.05s both; }
        .hv2-img-enter-left { animation: hv2ImgEnterLeft  0.6s cubic-bezier(0.16,1,0.3,1) 0.05s both; }

        /* ── Hover / card effects ── */
        .hv2-card:hover         { border-color: rgba(236,72,153,0.4); }
        .hv2-card-purple:hover  { border-color: rgba(168,85,247,0.4); }
        .hv2-article:hover h3        { color: #f9a8d4; }
        .hv2-article-purple:hover h3 { color: #d8b4fe; }
        .hv2-portrait-card:hover img { transform: scale(1.05); }
        .hv2-video-card:hover .hv2-play-btn { transform: scale(1.1); }
        .hv2-video-card:hover img           { transform: scale(1.05); }
        .hv2-book-card { transition: transform 0.3s ease; }
        .hv2-book-card:hover { transform: translateY(-8px); }
        .hv2-nav-link { color: #d1d5db; transition: color 0.2s; }
        .hv2-nav-link:hover { color: #ffffff; }
        .hv2-footer-link { color: #9ca3af; transition: color 0.2s; }
        .hv2-footer-link:hover { color: #f472b6; }
      `}</style>

      <div className="hv2-body">

        {/* ══════════════════════════════════════
            HEADER — Clean editorial dark navigation matching reference
        ══════════════════════════════════════ */}
        <header className={mounted ? 'hv2-nav-enter' : ''} style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
          background: 'rgba(9, 2, 17, 0.75)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          opacity: mounted ? undefined : 0,
          transition: 'background 0.3s',
        }}>
          <div style={{
            width: '100%',
            padding: '16px clamp(1.5rem, 5vw, 5rem)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            {/* Brand — 2-line stacked editorial mark matching reference */}
            <Link to="/" style={{ display: 'flex', flexDirection: 'column', textDecoration: 'none', lineHeight: 1.05 }}>
              <span className="hv2-display" style={{
                fontSize: 'clamp(20px, 2vw, 26px)',
                fontWeight: 800,
                color: '#fff',
                letterSpacing: '-0.03em',
              }}>
                Prof.
              </span>
              <span className="hv2-display" style={{
                fontSize: 'clamp(20px, 2vw, 26px)',
                fontWeight: 800,
                color: '#fff',
                letterSpacing: '-0.03em',
              }}>
                Dipali<span style={{ color: '#ec4899' }}>.</span>
              </span>
            </Link>

            {/* Desktop Nav — clean typography matching reference */}
            <nav style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'clamp(20px, 3vw, 42px)',
              fontSize: 'clamp(13px, 1.05vw, 15px)',
              fontWeight: 600,
            }}>
              <a href="#about" className="hv2-nav-link" style={{ textDecoration: 'none' }}>About</a>
              <a href="#articles" className="hv2-nav-link" style={{ textDecoration: 'none' }}>Blogs</a>
              <a href="#consultation" className="hv2-nav-link" style={{ textDecoration: 'none' }}>Schedule a Call</a>
              <a href="#footer" className="hv2-nav-link" style={{ textDecoration: 'none' }}>Contact</a>
            </nav>
          </div>
        </header>

        <main>
          {/* ══════════════════════════════════════
              HERO SECTION — 1:1 match to image reference for home page.png
              Atmospheric Aubergine, Giant Typography, Magenta Geometric Triangle, Centered Bottom-Anchored Portrait & Right Flank Slider Controls
          ══════════════════════════════════════ */}
          <section id="hero" style={{
            position: 'relative',
            width: '100%',
            height: '100vh',
            minHeight: 700,
            maxHeight: 1080,
            display: 'flex',
            alignItems: 'center',
            background: 'radial-gradient(ellipse 90% 80% at 52% 45%, #160626 0%, #0c0316 55%, #06010b 100%)',
            overflow: 'hidden',
            borderBottom: '1px solid #210c33',
          }}>
            {/* Atmospheric ambient background glow */}
            <div style={{
              position: 'absolute', top: '20%', left: '20%',
              width: 580, height: 580,
              background: 'rgba(88,28,135,0.22)', borderRadius: '50%',
              filter: 'blur(150px)', pointerEvents: 'none', zIndex: 1,
            }} />
            <div style={{
              position: 'absolute', bottom: '10%', right: '20%',
              width: 520, height: 520,
              background: 'rgba(190,24,93,0.18)', borderRadius: '50%',
              filter: 'blur(160px)', pointerEvents: 'none', zIndex: 1,
            }} />

            {/* Glowing Geometric Magenta Polygon Accent — positioned right behind head/torso matching reference */}
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
              <div className="hv2-polygon-float" style={{
                width: '100%',
                height: '100%',
                filter: 'drop-shadow(0 0 65px rgba(224,37,133,0.45)) drop-shadow(0 0 25px rgba(168,36,178,0.35))',
              }}>
                <svg viewBox="0 0 600 600" style={{ width: '100%', height: '100%' }}>
                  <defs>
                    <linearGradient id="hv2PolyGrad" x1="12%" y1="0%" x2="88%" y2="85%">
                      <stop offset="0%" stopColor="#a824b2" />
                      <stop offset="50%" stopColor="#e02585" />
                      <stop offset="100%" stopColor="#db2777" />
                    </linearGradient>
                  </defs>
                  {/* Triangle precisely matching geometry in image reference for home page.png */}
                  <polygon fill="url(#hv2PolyGrad)" points="170,40 570,260 250,560" />
                </svg>
              </div>
            </div>

            {/* Atmospheric Back Glow on Head */}
            <div style={{
              position: 'absolute',
              left: 'clamp(50%, 54vw, 56%)',
              top: '40%',
              transform: 'translate(-50%, -50%)',
              width: 380,
              height: 380,
              borderRadius: '50%',
              background: 'rgba(168,85,247,0.25)',
              filter: 'blur(70px)',
              zIndex: 3,
              pointerEvents: 'none',
            }} />

            {/* Left: Giant Editorial Headline with Staggered Word Reveal */}
            <div style={{
              position: 'relative',
              zIndex: 20,
              paddingLeft: 'clamp(2rem, 7vw, 7.5rem)',
              maxWidth: 'clamp(380px, 48vw, 760px)',
              marginTop: 'clamp(20px, 3vh, 50px)',
              pointerEvents: 'none',
            }}>
              <h1 className="hv2-display" style={{
                fontSize: 'clamp(46px, 5.8vw, 92px)',
                fontWeight: 800,
                color: '#fff',
                letterSpacing: '-0.035em',
                lineHeight: 1.04,
                margin: 0,
                textShadow: '0 4px 30px rgba(0,0,0,0.85)',
              }}>
                {slides[slideIdx].words.map((word, i) => (
                  <div key={`${slideIdx}-${i}`} style={{ overflow: 'hidden' }}>
                    <div
                      className={
                        animState === 'idle' && mounted
                          ? `hv2-word-${i}`
                          : animState === 'exit-left' || animState === 'exit-right'
                          ? 'hv2-text-exit'
                          : animState === 'enter'
                          ? 'hv2-text-enter'
                          : ''
                      }
                      style={{
                        animationDelay: animState === 'enter'
                          ? `${i * 0.07}s`
                          : animState === 'idle' && mounted
                          ? undefined
                          : '0s',
                      }}
                    >
                      {word}
                    </div>
                  </div>
                ))}
              </h1>

              {/* Subline */}
              <p
                className={`hv2-mono ${
                  animState === 'idle' && mounted ? 'hv2-sub-enter'
                  : animState === 'exit-left' || animState === 'exit-right' ? 'hv2-text-exit'
                  : animState === 'enter' ? 'hv2-text-enter'
                  : ''
                }`}
                style={{
                  fontSize: 'clamp(11px, 0.9vw, 13px)',
                  fontWeight: 700,
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  color: 'rgba(244,114,182,0.9)',
                  marginTop: 24,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  animationDelay: animState === 'enter' ? '0.18s' : undefined,
                }}
              >
                <span style={{ width: 28, height: 2, background: '#ec4899', display: 'inline-block', flexShrink: 0 }} />
                {slides[slideIdx].sub}
              </p>

              {/* Location ticker */}
              <div
                className={mounted && animState === 'idle' ? 'hv2-loc-enter' : ''}
                style={{
                  marginTop: 32,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '0.12em',
                  color: '#9ca3af',
                }}
              >
                <span className="hv2-ping" style={{ width: 7, height: 7, borderRadius: '50%', background: '#34d399', display: 'inline-block', flexShrink: 0 }} />
                <span>NEW DELHI / MUMBAI / GLOBAL EDTECH</span>
              </div>
            </div>

            {/* Center-Right: Portrait Cutout Image — anchored to bottom edge matching reference */}
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
                alt="Prof. Dipali — Academic Mentor and Technology Visionary"
                className={
                  animState === 'idle' && mounted
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
                  filter: 'contrast(1.06) brightness(0.95) saturate(0.94) drop-shadow(0 25px 45px rgba(0,0,0,0.85))',
                }}
              />

              {/* Seamless dark bottom vignette fading into page background */}
              <div style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 0,
                height: 'clamp(120px, 18vh, 180px)',
                background: 'linear-gradient(to top, #0b0314 0%, rgba(11,3,20,0.85) 40%, transparent 100%)',
                pointerEvents: 'none',
                zIndex: 12,
              }} />
            </div>

            {/* Right Flank Slider Controls: PREV / NEXT — faithful to reference */}
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
                className="hv2-mono"
                style={{
                  fontSize: 12,
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                  color: '#9ca3af',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '6px 0',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.letterSpacing = '0.28em'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#9ca3af'; e.currentTarget.style.letterSpacing = '0.22em'; }}
              >
                PREV
              </button>
              <div style={{ width: 34, height: 1.5, background: '#6b7280' }} />
              <button
                onClick={() => changeSlide(1)}
                className="hv2-mono"
                style={{
                  fontSize: 12,
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                  color: '#9ca3af',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '6px 0',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.letterSpacing = '0.28em'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#9ca3af'; e.currentTarget.style.letterSpacing = '0.22em'; }}
              >
                NEXT
              </button>
            </div>
          </section>

          {/* ══════════════════════════════════════
              WHO IS PROF. DIPALI?
          ══════════════════════════════════════ */}
          <section id="about" style={{
            width: '100%', padding: '112px 0',
            background: '#0b0314', borderBottom: '1px solid #210c33',
          }}>
            <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 3rem' }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 64 }}>
                <div>
                  <span className="hv2-mono" style={{
                    fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.15em',
                    color: '#f472b6', fontWeight: 700, display: 'block', marginBottom: 8,
                  }}>About The Mentor</span>
                  <h2 className="hv2-display" style={{
                    fontSize: 48, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em',
                  }}>Who is Prof. Dipali?</h2>
                  <p style={{ color: '#d1d5db', maxWidth: 576, marginTop: 12, lineHeight: 1.6, fontSize: 15 }}>
                    Coach to Engineers, Innovators &amp; Student Leaders. Defining academic innovation and the Indian technology educational landscape.
                  </p>
                </div>
                <span className="hv2-mono" style={{ fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  14+ Yrs Academic &amp; Industry Advisory
                </span>
              </div>

              {/* Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', gap: 32, alignItems: 'start' }}>
                {/* Pillars */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  {[
                    {
                      num: '01', color: '#f472b6', bg: 'rgba(244,114,182,0.2)',
                      hoverClass: 'hv2-card',
                      title: 'Rooted Foundations',
                      body: "Prof. Dipali's journey is anchored in persistent dedication and relentless academic curiosity. From the earliest days of conducting peer workshops and laboratory mentorship to building campus-wide coding circles, she realized that talent is everywhere, but tailored mentorship is rare. Through over a decade of deep classroom engagement, she has instilled rigorous engineering principles into thousands of young minds across India, instilling the resilience required to thrive in high-stakes technological environments.",
                    },
                    {
                      num: '02', color: '#c084fc', bg: 'rgba(192,132,252,0.2)',
                      hoverClass: 'hv2-card-purple',
                      title: 'Digital & Technical Visionary',
                      body: 'Standing at the bleeding edge of AI tools, modern system architecture, and tech entrepreneurship, Prof. Dipali bridges the traditional curriculum gap with industry demands. She collaborates closely with incubation centers, venture studios, and tech founders to modernize how student engineers architect scalable systems, contribute to open-source software, and transform raw semester projects into fundable ventures and production-grade software platforms.',
                    },
                    {
                      num: '03', color: '#f9a8d4', bg: 'rgba(249,168,212,0.2)',
                      hoverClass: 'hv2-card',
                      title: 'Shaping Engineering Excellence',
                      body: 'Beyond university lecture halls, Prof. Dipali serves as a national keynote speaker at prominent developer conferences and hackathons, advocating for equitable tech education and ethical artificial intelligence. She continually authors curriculum roadmaps and career frameworks that empower graduates to transition smoothly from university labs to top-tier international tech firms.',
                    },
                  ].map(p => (
                    <div key={p.num} className={p.hoverClass} style={{
                      background: '#140722', borderRadius: 12, padding: 32,
                      border: '1px solid #26103b', transition: 'border-color 0.2s',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                        <span className="hv2-mono" style={{
                          width: 32, height: 32, borderRadius: 8, background: p.bg,
                          color: p.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 700, fontSize: 13,
                        }}>{p.num}</span>
                        <h3 className="hv2-display" style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>{p.title}</h3>
                      </div>
                      <p style={{ color: '#d1d5db', lineHeight: 1.65, fontSize: 15 }}>{p.body}</p>
                    </div>
                  ))}
                </div>

                {/* Portrait card */}
                <div style={{ position: 'sticky', top: 112 }}>
                  <div style={{
                    background: '#140722', borderRadius: 16,
                    border: '1px solid #26103b', overflow: 'hidden',
                    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.9)',
                  }}>
                    <div className="hv2-portrait-card" style={{ position: 'relative', height: 420, overflow: 'hidden', background: '#090211' }}>
                      <img
                        src="https://lh3.googleusercontent.com/aida/AEtjO1XQu-zUr-Q7_ZP13Jros6Mu3X-2nyLimsYN2nTB9lppyvugWK1-E_TedVujnSBp4gE1TS4vUoYG_-byFRseBIbRZGRcyTpdzHpJu2JIIb7P-FGYlQnuOhGEohtF1Ej6qPnCdA93dqQCc_SQVttYAV7GyA4cXQmVzCnlQd5CY2S1zaRhz1RuQxAJHm6RwXgbe412ZhqY1fMY_sakbgoLPUxZbtabmv8bI_aGEHCwXCqT8SGlxP1VjU4CeF4ZwhXIYgp4R7zbRVEnzA"
                        alt="Prof. Dipali in academic consultation"
                        style={{
                          width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top',
                          opacity: 0.9, transition: 'transform 0.7s ease',
                        }}
                      />
                      <div style={{
                        position: 'absolute', inset: 0,
                        background: 'linear-gradient(to top, #140722, transparent)',
                        opacity: 0.9,
                      }} />
                      <div style={{
                        position: 'absolute', top: 16, right: 16,
                        background: 'rgba(9,2,17,0.85)', backdropFilter: 'blur(8px)',
                        border: '1px solid #26103b', padding: '4px 12px', borderRadius: 9999,
                        fontSize: 11, fontFamily: 'monospace', textTransform: 'uppercase', color: '#f472b6',
                      }}>
                        Leadership in Action
                      </div>
                    </div>
                    <div style={{ padding: 32 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <div>
                          <h4 className="hv2-display" style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>Shaping Digital India</h4>
                          <p className="hv2-mono" style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>Keynote Speaker &amp; Engineering Strategist</p>
                        </div>
                        <span className="material-symbols-outlined" style={{ color: '#f472b6', fontSize: 30 }}>school</span>
                      </div>
                      <p style={{ color: '#d1d5db', fontSize: 14, lineHeight: 1.6, fontStyle: 'italic' }}>
                        "True engineering is not merely passing tests—it is the courageous practice of shaping the future through disciplined problem solving, humane technology, and unbounded curiosity."
                      </p>
                      <div style={{
                        marginTop: 16, display: 'flex', alignItems: 'center', gap: 6,
                        color: '#f472b6', fontFamily: 'monospace', fontSize: 11, fontWeight: 600,
                        cursor: 'pointer', transition: 'color 0.2s',
                      }}
                        onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                        onMouseLeave={e => e.currentTarget.style.color = '#f472b6'}
                      >
                        <span>View Full Academic Bio &amp; Research</span>
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>north_east</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ══════════════════════════════════════
              FLAGSHIP BOOK / GUIDE
          ══════════════════════════════════════ */}
          <section id="flagship-guide" style={{
            width: '100%', padding: '112px 0',
            background: '#090211', borderBottom: '1px solid #210c33', overflow: 'hidden',
          }}>
            <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 3rem' }}>
              <div style={{ textAlign: 'center', maxWidth: 672, margin: '0 auto 64px' }}>
                <span className="hv2-mono" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#f472b6', fontWeight: 700, display: 'block', marginBottom: 8 }}>
                  National Bestseller &amp; Reference Guide
                </span>
                <h2 className="hv2-display" style={{ fontSize: 48, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
                  Mastering Engineering &amp; Tech Careers
                </h2>
                <p style={{ color: '#d1d5db', marginTop: 12, fontSize: 15 }}>
                  Behind the scenes of India's prominent tech builders, academic visionaries, and high-velocity engineers.
                </p>
              </div>

              <div style={{ background: '#140722', border: '1px solid #26103b', borderRadius: 16, padding: '48px 64px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.9)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '5fr 7fr', gap: 32, alignItems: 'center' }}>
                  {/* Book visual */}
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <div style={{ maxWidth: 320, width: '100%' }}>
                      <div className="hv2-book-card" style={{
                        borderRadius: 8, overflow: 'hidden',
                        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.9)',
                        borderLeft: '4px solid #ec4899',
                        border: '1px solid #26103b',
                        background: '#1a0b2c',
                      }}>
                        <div style={{
                          padding: 32, minHeight: 440,
                          background: 'linear-gradient(135deg, #090211, #140722, rgba(91,33,182,0.6))',
                          color: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                        }}>
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                              <span className="hv2-mono" style={{
                                fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em',
                                padding: '4px 10px', borderRadius: 4,
                                background: 'rgba(236,72,153,0.2)', color: '#f472b6',
                                border: '1px solid rgba(236,72,153,0.4)', fontWeight: 700,
                              }}>Official Handbook</span>
                              <span className="material-symbols-outlined" style={{ color: '#c084fc' }}>menu_book</span>
                            </div>
                            <p className="hv2-mono" style={{ fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#c084fc', fontWeight: 600, marginBottom: 4 }}>
                              Academic Master Series
                            </p>
                            <h3 className="hv2-display" style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.3, color: '#fff', marginBottom: 8 }}>
                              Mastering Engineering &amp; Tech Careers
                            </h3>
                            <p style={{ fontSize: 12, color: '#d1d5db' }}>
                              From Campus to Global Tech. Architecting high-impact careers in the AI era.
                            </p>
                          </div>
                          <div style={{ paddingTop: 24, borderTop: '1px solid #26103b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <p className="hv2-display" style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Prof. Dipali</p>
                              <p className="hv2-mono" style={{ fontSize: 10, color: '#9ca3af' }}>Foreword by Leading Silicon Valley Founders</p>
                            </div>
                            <span className="material-symbols-outlined" style={{ color: '#f472b6', fontSize: 24 }}>auto_awesome</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Book narrative */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    <div>
                      <span style={{
                        display: 'inline-block', padding: '4px 12px', borderRadius: 9999,
                        background: 'rgba(236,72,153,0.2)', color: '#f472b6',
                        border: '1px solid rgba(236,72,153,0.3)',
                        fontFamily: 'monospace', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', marginBottom: 12,
                      }}>
                        Essential Reading for Engineering Students &amp; Junior Leaders
                      </span>
                      <h3 className="hv2-display" style={{ fontSize: 28, fontWeight: 700, color: '#fff' }}>
                        From Campus Projects to Seed Ventures &amp; Global Engineering Roles
                      </h3>
                    </div>
                    <p style={{ color: '#d1d5db', lineHeight: 1.65, fontSize: 15 }}>
                      Co-authored with leading Indian industry architects and university deans, this comprehensive compendium chronicles how modern students can break through traditional academic ceilings. It breaks down systemic thinking, open-source portfolio development, AI augmentation, and how to stand out in an evolving global workforce.
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      {[
                        'The 2026 Developer Blueprint & Core Stacks',
                        'Cracking High-Yield Technical Interviews',
                        'Campus Incubators: From Pitch to Deployment',
                        'Building Long-Term Mentorship Circles',
                      ].map(item => (
                        <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                          <span className="material-symbols-outlined" style={{ color: '#f472b6', fontSize: 18, marginTop: 2 }}>check_circle</span>
                          <span style={{ fontSize: 14, color: '#e5e7eb' }}>{item}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ paddingTop: 16, display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
                      <a href="#consultation" style={{
                        display: 'inline-flex', alignItems: 'center',
                        padding: '12px 28px', borderRadius: 9999,
                        background: '#fff', color: '#111827',
                        textDecoration: 'none',
                        fontFamily: 'Montserrat, sans-serif', fontSize: 14, fontWeight: 700,
                        boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)',
                        transition: 'background 0.2s',
                        gap: 8,
                      }}
                        onMouseEnter={e => e.currentTarget.style.background = '#e5e7eb'}
                        onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                      >
                        Get Your Copy on Amazon
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>open_in_new</span>
                      </a>
                      <span className="hv2-mono" style={{ fontSize: 12, color: '#d1d5db', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span className="material-symbols-outlined" style={{ color: '#fbbf24', fontSize: 16, fontVariationSettings: "'FILL' 1" }}>star</span>
                        4.9 / 5 Rating (850+ Verified Reviews)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ══════════════════════════════════════
              EDITORIAL ARTICLES
          ══════════════════════════════════════ */}
          <section id="articles" style={{
            width: '100%', padding: '112px 0',
            background: '#0b0314', borderBottom: '1px solid #210c33',
          }}>
            <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 3rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 64 }}>
                <div>
                  <span className="hv2-mono" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#f472b6', fontWeight: 700, display: 'block', marginBottom: 8 }}>
                    Articles &amp; Dispatches
                  </span>
                  <h2 className="hv2-display" style={{ fontSize: 48, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
                    Curated Thought Leadership.
                  </h2>
                </div>
                <a href="#articles" style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  fontFamily: 'monospace', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em',
                  color: '#f472b6', textDecoration: 'none', transition: 'color 0.2s',
                }}
                  onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                  onMouseLeave={e => e.currentTarget.style.color = '#f472b6'}
                >
                  Explore All 24+ Articles
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>arrow_forward</span>
                </a>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 32 }}>
                {[
                  {
                    cat: 'Artificial Intelligence', catColor: '#f472b6', catBg: 'rgba(244,114,182,0.2)',
                    date: 'Oct 2024',
                    title: 'AI Coding in 2026: Why Fundamentals Matter More Than Ever',
                    body: 'LLMs can write syntax in seconds, but debugging architectural flaws, race conditions, and telemetry demands human mastery.',
                    readTime: '6 min read', linkColor: '#f472b6', hoverClass: 'hv2-article',
                  },
                  {
                    cat: 'Algorithms', catColor: '#c084fc', catBg: 'rgba(192,132,252,0.2)',
                    date: 'Sep 2024',
                    title: 'Instagram Algorithms vs Creator Platforms: The Next Shift',
                    body: 'Deconstructing recommendation engines, short-form graph algorithms, and why engineering students must master platform dynamics.',
                    readTime: '4 min read', linkColor: '#c084fc', hoverClass: 'hv2-article-purple',
                  },
                  {
                    cat: 'Economics', catColor: '#f472b6', catBg: 'rgba(244,114,182,0.2)',
                    date: 'Sep 2024',
                    title: 'The Orange Economy & Digital Creator Space',
                    body: "India's creative intellectual property ecosystem is unlocking billions in technical infrastructure and micro-SaaS opportunities.",
                    readTime: '5 min read', linkColor: '#f472b6', hoverClass: 'hv2-article',
                  },
                ].map(a => (
                  <article key={a.title} className={a.hoverClass} style={{
                    background: '#140722', borderRadius: 12, padding: 32,
                    border: '1px solid #26103b', display: 'flex', flexDirection: 'column',
                    justifyContent: 'space-between', transition: 'border-color 0.2s',
                  }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <span className="hv2-mono" style={{
                          padding: '2px 10px', borderRadius: 9999,
                          background: a.catBg, color: a.catColor,
                          fontSize: 11, textTransform: 'uppercase', fontWeight: 700,
                        }}>{a.cat}</span>
                        <span className="hv2-mono" style={{ fontSize: 12, color: '#9ca3af' }}>{a.date}</span>
                      </div>
                      <h3 className="hv2-display" style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 12, transition: 'color 0.2s' }}>
                        {a.title}
                      </h3>
                      <p style={{ fontSize: 14, color: '#d1d5db', lineHeight: 1.6, marginBottom: 24 }}>{a.body}</p>
                    </div>
                    <div style={{ paddingTop: 16, borderTop: '1px solid #26103b', display: 'flex', justifyContent: 'space-between' }}>
                      <span className="hv2-mono" style={{ fontSize: 12, color: a.linkColor }}>Read More →</span>
                      <span className="hv2-mono" style={{ fontSize: 12, color: '#9ca3af' }}>{a.readTime}</span>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>

          {/* ══════════════════════════════════════
              MEDIA RECOGNITION & KEYNOTES
          ══════════════════════════════════════ */}
          <section style={{
            width: '100%', padding: '112px 0',
            background: '#090211', borderBottom: '1px solid #210c33', overflow: 'hidden',
          }}>
            {/* Marquee */}
            <div style={{ overflow: 'hidden', opacity: 0.2, padding: '12px 0', borderTop: '1px solid #26103b', borderBottom: '1px solid #26103b', marginBottom: 64 }}>
              <div style={{ display: 'flex', whiteSpace: 'nowrap', gap: 48, fontFamily: 'monospace', fontSize: 22, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#d1d5db' }}>
                {['Featured in National Media', '•', 'Academic Conclaves', '•', 'IEEE Keynotes', '•', 'EdTech Summits', '•', 'Featured in National Media', '•', 'Academic Conclaves'].map((t, i) => (
                  <span key={i}>{t}</span>
                ))}
              </div>
            </div>

            <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 3rem' }}>
              <div style={{ textAlign: 'center', maxWidth: 672, margin: '0 auto 64px' }}>
                <span className="hv2-mono" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#f472b6', fontWeight: 700, display: 'block', marginBottom: 8 }}>
                  Keynote &amp; Media Broadcasts
                </span>
                <h2 className="hv2-display" style={{ fontSize: 48, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
                  Featured Masterclasses &amp; Press
                </h2>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 32 }}>
                {[
                  {
                    img: 'https://lh3.googleusercontent.com/aida/AEtjO1Xd1maN9JaPsmLdgjhKT7re86KMV4C0Z3xP21kJoIlgi12BD-ZOs2NgySkIPX2ePpM67Y35aUyt-Kjwa9zwJiGQsWCQsb4YRk-pwn6vxlwEnZnkoqalRzk27K2R37cjTjCv8ZAfVSo9yjbK_UtyDXqLLePLXpq1NBmH5KmH0smcA-Uv3wTPOhSngBGci2OXaQ-fnxGJGMSnpj-TufUQBN1cb5QbIIUvwcNLLJtJ63yVG15nh9hxADLCuSJ7bJzBkSnUorCrZpNY4g',
                    playColor: 'rgba(236,72,153,0.9)', duration: '38:22',
                    cat: 'National EdTech Summit', catColor: '#f472b6',
                    title: 'Engineering in the Era of Autonomous AI Agents',
                  },
                  {
                    img: 'https://lh3.googleusercontent.com/aida/AEtjO1VD8oBkOhB91ijm4PtOOIJWNTEbKs0gkC6Jt-1N1v2E-oK8QxZZ7I5gapZab6_1LRRQCdIwn_HB9Ejpf4TwQd5IpspY6fzh7uLqzB_H4eZxOkkAgE9uh1niAm4Q02W59OA5DjdPsN360d2c0nvAWYqqmjz3LxxUxAUB3WkemkJhq2XS3_Nq679597ejdW4ASAgoioR25FByOp-8DlK1yHJTP4ldHPp_HbcG63bs5cqjlO24qSUH8szCGl1nhPm0AJocXLgr47R9pg',
                    playColor: 'rgba(124,58,237,0.9)', duration: '44:15',
                    cat: 'IEEE Conclave Keynote', catColor: '#c084fc',
                    title: 'First Principles of Scalable Software Architecture',
                  },
                  {
                    img: 'https://lh3.googleusercontent.com/aida/AEtjO1XQu-zUr-Q7_ZP13Jros6Mu3X-2nyLimsYN2nTB9lppyvugWK1-E_TedVujnSBp4gE1TS4vUoYG_-byFRseBIbRZGRcyTpdzHpJu2JIIb7P-FGYlQnuOhGEohtF1Ej6qPnCdA93dqQCc_SQVttYAV7GyA4cXQmVzCnlQd5CY2S1zaRhz1RuQxAJHm6RwXgbe412ZhqY1fMY_sakbgoLPUxZbtabmv8bI_aGEHCwXCqT8SGlxP1VjU4CeF4ZwhXIYgp4R7zbRVEnzA',
                    playColor: 'rgba(236,72,153,0.9)', duration: '52:10',
                    cat: "Founders & Fellows Podcast", catColor: '#f472b6',
                    title: 'Bridging Campus Labs with Global Seed Venture',
                  },
                ].map(v => (
                  <div key={v.title} className="hv2-video-card" style={{
                    background: '#140722', borderRadius: 12, overflow: 'hidden',
                    border: '1px solid #26103b',
                  }}>
                    <div style={{ position: 'relative', height: 192, background: '#1f0b35', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <img src={v.img} alt={v.title} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.7, transition: 'transform 0.5s ease' }} />
                      <div className="hv2-play-btn" style={{
                        position: 'absolute', width: 48, height: 48, borderRadius: '50%',
                        background: v.playColor, backdropFilter: 'blur(4px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.5)',
                        transition: 'transform 0.2s', cursor: 'pointer',
                      }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 24 }}>play_arrow</span>
                      </div>
                      <div style={{
                        position: 'absolute', bottom: 12, right: 12,
                        padding: '2px 8px', borderRadius: 4,
                        background: 'rgba(0,0,0,0.8)', color: '#fff',
                        fontFamily: 'monospace', fontSize: 10,
                      }}>{v.duration}</div>
                    </div>
                    <div style={{ padding: 24 }}>
                      <p className="hv2-mono" style={{ fontSize: 11, color: v.catColor, textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>{v.cat}</p>
                      <h4 className="hv2-display" style={{ fontSize: 18, fontWeight: 600, color: '#fff' }}>{v.title}</h4>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ══════════════════════════════════════
              TESTIMONIALS
          ══════════════════════════════════════ */}
          <section id="testimonials" style={{
            width: '100%', padding: '112px 0',
            background: '#0b0314', borderBottom: '1px solid #210c33',
          }}>
            <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 3rem' }}>
              <div style={{ marginBottom: 64 }}>
                <span className="hv2-mono" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#f472b6', fontWeight: 700, display: 'block', marginBottom: 8 }}>
                  Endorsements &amp; Voices
                </span>
                <h2 className="hv2-display" style={{ fontSize: 48, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
                  What They Say About Prof. Dipali.
                </h2>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 32 }}>
                {[
                  {
                    text: '"Prof. Dipali is one of the most intellectually passionate mentors I have encountered. She transformed our hackathon concept into a validated software product, guiding our architecture with extreme precision. Her relentless belief in students is an unparalleled gift."',
                    initials: 'RM', color: '#f472b6', bg: 'rgba(244,114,182,0.2)',
                    name: 'Dr. Ritesh Malhotra', role: 'Forbes 30U30 Asia | Founder, TechNext',
                  },
                  {
                    text: '"A true kingmaker in engineering education. Her deep clarity, commitment to fundamentals, and selfless support provide young coders with lifelong confidence. India\'s engineering campuses need ten thousand mentors like Prof. Dipali."',
                    initials: 'AJ', color: '#c084fc', bg: 'rgba(192,132,252,0.2)',
                    name: 'Ayush Joshi', role: 'Head of Platform, Global Cloud AI',
                  },
                  {
                    text: '"Her mentorship on our senior capstone project unlocked our first institutional seed round. Prof. Dipali possesses that rare blend of rigorous academic standards and practical silicon-valley execution acumen."',
                    initials: 'AG', color: '#f9a8d4', bg: 'rgba(249,168,212,0.2)',
                    name: 'Aditi Goel', role: "Co-founder, Edubridge AI (YC '23)",
                  },
                ].map(t => (
                  <div key={t.name} style={{
                    background: '#140722', borderRadius: 12, padding: 32,
                    border: '1px solid #26103b', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                  }}>
                    <div>
                      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
                        {[...Array(5)].map((_, i) => (
                          <span key={i} className="material-symbols-outlined" style={{ color: '#fbbf24', fontSize: 16, fontVariationSettings: "'FILL' 1" }}>star</span>
                        ))}
                      </div>
                      <p style={{ color: '#e5e7eb', fontSize: 14, lineHeight: 1.65 }}>{t.text}</p>
                    </div>
                    <div style={{ paddingTop: 24, borderTop: '1px solid #26103b', marginTop: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: '50%',
                        background: t.bg, color: t.color,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: 'monospace', fontWeight: 700, fontSize: 12,
                        flexShrink: 0,
                      }}>{t.initials}</div>
                      <div>
                        <h4 className="hv2-display" style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{t.name}</h4>
                        <p className="hv2-mono" style={{ fontSize: 10, color: '#9ca3af' }}>{t.role}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ══════════════════════════════════════
              CONSULTATION BANNER
          ══════════════════════════════════════ */}
          <section id="consultation" style={{
            width: '100%', padding: '112px 0',
            background: 'linear-gradient(to bottom, #090211, #040108)', overflow: 'hidden',
          }}>
            <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 3rem' }}>
              <div style={{ background: '#140722', border: '1px solid #26103b', borderRadius: 16, padding: '56px 64px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.9)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '8fr 4fr', gap: 32, alignItems: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: 8,
                      padding: '4px 12px', borderRadius: 9999,
                      background: 'rgba(236,72,153,0.2)', border: '1px solid rgba(236,72,153,0.3)',
                      color: '#f472b6', fontFamily: 'monospace', fontSize: 11, textTransform: 'uppercase', fontWeight: 600,
                      width: 'fit-content',
                    }}>
                      <span className="hv2-ping" style={{ width: 8, height: 8, borderRadius: '50%', background: '#34d399', display: 'inline-block' }} />
                      Weekly Consultation Slots Open
                    </div>
                    <h2 className="hv2-display" style={{ fontSize: 48, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                      Talk to Prof. Dipali —<br />
                      <span style={{ color: '#f472b6' }}>Book a 1:1 Consultation / Strategy Call</span>
                    </h2>
                    <p style={{ color: '#d1d5db', fontSize: 15, lineHeight: 1.6, maxWidth: 640 }}>
                      Whether you are an aspiring student engineer seeking clarity on your career roadmap, a campus founder validating your architecture, or an institution seeking keynote advisory—connect directly.
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, color: '#d1d5db', fontFamily: 'monospace', fontSize: 12 }}>
                      {[
                        { icon: 'schedule', text: '45-Min Advisory' },
                        { icon: 'architecture', text: 'Architecture Review' },
                        { icon: 'school', text: 'Fellowship Guidance' },
                      ].map(item => (
                        <span key={item.text} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span className="material-symbols-outlined" style={{ color: '#f472b6', fontSize: 16 }}>{item.icon}</span>
                          {item.text}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{
                      width: '100%', maxWidth: 320,
                      background: '#090211', borderRadius: 16, padding: 24,
                      border: '1px solid #26103b', textAlign: 'center',
                      display: 'flex', flexDirection: 'column', gap: 16,
                    }}>
                      <div style={{ width: 64, height: 64, borderRadius: '50%', margin: '0 auto', overflow: 'hidden', border: '2px solid #ec4899' }}>
                        <img
                          src="https://lh3.googleusercontent.com/aida/AEtjO1VD8oBkOhB91ijm4PtOOIJWNTEbKs0gkC6Jt-1N1v2E-oK8QxZZ7I5gapZab6_1LRRQCdIwn_HB9Ejpf4TwQd5IpspY6fzh7uLqzB_H4eZxOkkAgE9uh1niAm4Q02W59OA5DjdPsN360d2c0nvAWYqqmjz3LxxUxAUB3WkemkJhq2XS3_Nq679597ejdW4ASAgoioR25FByOp-8DlK1yHJTP4ldHPp_HbcG63bs5cqjlO24qSUH8szCGl1nhPm0AJocXLgr47R9pg"
                          alt="Prof. Dipali Profile"
                          style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }}
                        />
                      </div>
                      <div>
                        <h4 className="hv2-display" style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Direct Advisory via Topmate</h4>
                        <p className="hv2-mono" style={{ fontSize: 11, color: '#9ca3af' }}>Verified Academic Mentor</p>
                      </div>
                      <a
                        href="https://topmate.io"
                        target="_blank" rel="noopener noreferrer"
                        style={{
                          width: '100%', padding: '12px 24px', borderRadius: 9999,
                          background: '#fff', color: '#111827', fontFamily: 'Montserrat, sans-serif',
                          fontSize: 14, fontWeight: 700, textDecoration: 'none',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)',
                          transition: 'background 0.2s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#e5e7eb'}
                        onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                      >
                        Book a Mentorship Call
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
            FOOTER
        ══════════════════════════════════════ */}
        <footer style={{ background: '#06020a', borderTop: '1px solid #1a0828', padding: '64px 0' }}>
          <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 3rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: 32 }}>
              <div style={{ paddingRight: 24 }}>
                <div className="hv2-display" style={{ fontSize: 24, fontWeight: 800, color: '#fff', marginBottom: 12 }}>
                  ELEVATE<span style={{ color: '#ec4899' }}>.</span>
                </div>
                <p style={{ fontSize: 14, color: '#9ca3af', maxWidth: 320, marginBottom: 16, lineHeight: 1.6 }}>
                  Empowering engineers and tech visionaries through rigorous academic principles, strategic guidance, and high-impact industry mentorship.
                </p>
                <p className="hv2-mono" style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  The Modern Executive Academy
                </p>
              </div>

              {[
                { heading: 'Platform', links: ['About', 'Courses', 'Community', 'Career Roadmaps', 'Testimonials'] },
                { heading: 'Resources', links: ['Blog & Articles', 'Masterclasses', 'Research Papers', 'Case Studies'] },
                { heading: 'Connect', links: ['Topmate 1:1', 'LinkedIn', 'Twitter', 'YouTube Channel'] },
              ].map(col => (
                <div key={col.heading}>
                  <h4 className="hv2-display" style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 16, letterSpacing: '0.05em' }}>{col.heading}</h4>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {col.links.map(l => (
                      <li key={l}>
                        <a href="#" className="hv2-footer-link" style={{ fontSize: 14, fontWeight: 500, textDecoration: 'none' }}>{l}</a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}

              <div>
                <h4 className="hv2-display" style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 16 }}>Newsletter</h4>
                <p style={{ fontSize: 13, color: '#9ca3af', marginBottom: 12, lineHeight: 1.5 }}>
                  Engineering insights, academic dispatches, and career frameworks—monthly.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <input
                    type="email"
                    placeholder="Enter your email"
                    style={{
                      width: '100%', background: '#140722', border: '1px solid #26103b',
                      borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#fff',
                      outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                  <button style={{
                    width: '100%', padding: '8px 0', borderRadius: 8,
                    background: '#db2777', color: '#fff', border: 'none',
                    fontFamily: 'Montserrat, sans-serif', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    transition: 'background 0.2s',
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = '#ec4899'}
                    onMouseLeave={e => e.currentTarget.style.background = '#db2777'}
                  >Subscribe</button>
                </div>
              </div>
            </div>

            <div style={{
              marginTop: 48, paddingTop: 24, borderTop: '1px solid #1a0828',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              fontFamily: 'monospace', fontSize: 12, color: '#6b7280',
            }}>
              <p>© 2024 ELEVATE Learning Inc. Prof. Dipali. All rights reserved.</p>
              <p style={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}>Defined for Technical Mastery</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
