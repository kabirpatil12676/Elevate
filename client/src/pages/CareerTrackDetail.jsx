import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useParams, Navigate } from 'react-router-dom';
import mainLogo from '../assets/main_logo.png';
import Navbar from '../components/Navbar';
import { ALL_CAREER_ROADMAPS } from '../data/careerRoadmapsData';

export default function CareerTrackDetail({ forcedSlug }) {
  const params = useParams();
  const trackSlug = forcedSlug || params.trackSlug;
  const track = ALL_CAREER_ROADMAPS[trackSlug];

  const [activePhaseIndex, setActivePhaseIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  // If track not found, redirect to roadmaps list
  if (!track) {
    return <Navigate to="/career-roadmaps" replace />;
  }

  const currentPhase = track.phases[activePhaseIndex] || track.phases[0];

  return (
    <div className="min-h-screen bg-[#ffffff] text-[#191c1d] font-['Inter'] antialiased flex flex-col">
      {/* ── Top Navigation Bar: Exact standard navbar from other pages ── */}
      <Navbar />

      <main className="flex-grow pt-24 pb-20">
        <div className="max-w-[1280px] mx-auto px-6 md:px-12">
          {/* ── Breadcrumb Navigation ── */}
          <nav aria-label="Breadcrumb" className="mb-6">
            <ol className="flex items-center space-x-2 text-sm text-[#575e70]">
              <li>
                <Link to="/" className="hover:text-[#4353cf] transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <span className="material-symbols-outlined text-sm text-[#757685]">
                  chevron_right
                </span>
              </li>
              <li>
                <Link to="/career-roadmaps" className="hover:text-[#4353cf] transition-colors">
                  Career roadmaps
                </Link>
              </li>
              <li>
                <span className="material-symbols-outlined text-sm text-[#757685]">
                  chevron_right
                </span>
              </li>
              <li aria-current="page" className="text-[#191c1d] font-semibold">
                {track.title}
              </li>
            </ol>
          </nav>

          {/* ── Hero Section ── */}
          <section className="mb-10">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#eef2ff] border border-[#c7d2fe] text-[#4353cf] text-xs font-bold uppercase tracking-wider">
                <span className="material-symbols-outlined text-sm">route</span>
                {track.track} • {track.category}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ecfdf5] border border-[#a7f3d0] text-[#059669] text-xs font-bold uppercase tracking-wider">
                <span className="material-symbols-outlined text-sm">verified</span>
                Verified 2026 Industry Curriculum
              </span>
            </div>

            <h1 className="text-3xl md:text-5xl font-extrabold text-[#191c1e] mb-4 tracking-tight font-['Hanken_Grotesk'] leading-tight">
              {track.title} Roadmap
            </h1>

            <p className="text-base md:text-lg text-[#454654] max-w-3xl leading-relaxed mb-8">
              {track.description} Follow this step-by-step sequential blueprint designed by senior tech mentors to build real-world competency.
            </p>

            {/* Metric Strip (Blue & White Theme) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-[#f8f9fa] border border-[#e1e3e4] rounded-2xl p-4 sm:p-5">
                <div className="flex items-center gap-2 text-[#757685] text-xs font-bold uppercase tracking-wider mb-1">
                  <span className="material-symbols-outlined text-[#4353cf] text-base">payments</span>
                  <span>Target Salary</span>
                </div>
                <div className="text-xl sm:text-2xl font-black text-[#191c1e]">
                  {track.salaryBenchmark}
                </div>
                <div className="text-xs text-[#575e70] mt-1 font-medium">Fresher to Mid-Level</div>
              </div>

              <div className="bg-[#f8f9fa] border border-[#e1e3e4] rounded-2xl p-4 sm:p-5">
                <div className="flex items-center gap-2 text-[#757685] text-xs font-bold uppercase tracking-wider mb-1">
                  <span className="material-symbols-outlined text-[#4353cf] text-base">work</span>
                  <span>Openings</span>
                </div>
                <div className="text-xl sm:text-2xl font-black text-[#191c1e]">
                  {track.openings}
                </div>
                <div className="text-xs text-[#575e70] mt-1 font-medium">Across Indian tech hubs</div>
              </div>

              <div className="bg-[#f8f9fa] border border-[#e1e3e4] rounded-2xl p-4 sm:p-5">
                <div className="flex items-center gap-2 text-[#757685] text-xs font-bold uppercase tracking-wider mb-1">
                  <span className="material-symbols-outlined text-[#4353cf] text-base">schedule</span>
                  <span>Curriculum Depth</span>
                </div>
                <div className="text-xl sm:text-2xl font-black text-[#191c1e]">
                  10 Phases
                </div>
                <div className="text-xs text-[#575e70] mt-1 font-medium">{track.studyHours} structured study</div>
              </div>

              <div className="bg-[#f8f9fa] border border-[#e1e3e4] rounded-2xl p-4 sm:p-5">
                <div className="flex items-center gap-2 text-[#757685] text-xs font-bold uppercase tracking-wider mb-1">
                  <span className="material-symbols-outlined text-[#4353cf] text-base">trending_up</span>
                  <span>Industry Demand</span>
                </div>
                <div className="text-xl sm:text-2xl font-black text-[#4353cf]">
                  {track.demand}
                </div>
                <div className="text-xs text-[#575e70] mt-1 font-medium">High hiring velocity</div>
              </div>
            </div>
          </section>

          {/* ── Roadmap Infographic Card ── */}
          <section id="roadmap-diagram" className="mb-14">
            <div className="bg-[#ffffff] border border-[#e1e3e4] rounded-3xl p-4 sm:p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-[#e1e3e4]">
                <div>
                  <h2 className="text-lg font-bold text-[#191c1e] flex items-center gap-2 font-['Hanken_Grotesk']">
                    <span className="material-symbols-outlined text-[#4353cf]">account_tree</span>
                    {track.title} Sequential Flowchart
                  </h2>
                  <p className="text-xs text-[#575e70]">
                    Official 16:9 high-resolution vector roadmap. Click the diagram to inspect fullscreen.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsLightboxOpen(true)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#f8f9fa] hover:bg-[#eef2ff] border border-[#e1e3e4] hover:border-[#c7d2fe] text-[#4353cf] text-xs font-bold transition-all"
                  >
                    <span className="material-symbols-outlined text-sm">fullscreen</span>
                    <span>View Fullscreen</span>
                  </button>
                  <a
                    href={track.image}
                    download={`${track.slug}-roadmap.svg`}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#4353cf] hover:bg-[#3444b8] text-white text-xs font-bold transition-all shadow-sm"
                  >
                    <span className="material-symbols-outlined text-sm">download</span>
                    <span>Download SVG</span>
                  </a>
                </div>
              </div>

              {/* Roadmap Graphic Display */}
              <div
                className="relative overflow-hidden rounded-2xl border border-[#e1e3e4] bg-[#f8faff] cursor-zoom-in group"
                onClick={() => setIsLightboxOpen(true)}
              >
                <img
                  src={track.image}
                  alt={`${track.title} Roadmap`}
                  className="w-full h-auto object-contain transition-transform duration-300 group-hover:scale-[1.01]"
                />
                <div className="absolute inset-0 bg-[#4353cf]/0 group-hover:bg-[#4353cf]/5 transition-colors flex items-center justify-center pointer-events-none">
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/95 text-[#4353cf] text-xs font-bold px-4 py-2 rounded-full shadow-lg border border-[#c7d2fe] flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-base">zoom_in</span>
                    <span>Click to zoom & explore full roadmap</span>
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* ── Interactive 10-Phase Curriculum Breakdown ── */}
          <section id="career-details" className="mb-14">
            <div className="mb-6">
              <div className="inline-flex items-center gap-2 text-xs font-bold text-[#4353cf] uppercase tracking-wider mb-1">
                <span className="material-symbols-outlined text-sm">menu_book</span>
                <span>Structured Phase-by-Phase Syllabus</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-[#191c1e] font-['Hanken_Grotesk']">
                Complete 10-Phase Curriculum Breakdown
              </h2>
              <p className="text-sm text-[#454654] mt-1">
                Select any phase below to examine topics covered, hands-on milestones, and toolsets.
              </p>
            </div>

            {/* Quick-Select Phase Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2 mb-6">
              {track.phases.map((p, idx) => {
                const isActive = idx === activePhaseIndex;
                return (
                  <button
                    key={p.phase}
                    onClick={() => setActivePhaseIndex(idx)}
                    className={`py-2.5 px-3 rounded-xl text-center transition-all flex flex-col items-center justify-center gap-0.5 border ${
                      isActive
                        ? 'bg-[#4353cf] border-[#4353cf] text-white shadow-sm font-bold'
                        : 'bg-[#f8f9fa] border-[#e1e3e4] text-[#454654] hover:border-[#4353cf] hover:text-[#4353cf]'
                    }`}
                  >
                    <span className="text-xs font-black uppercase tracking-wider">
                      {p.phase}
                    </span>
                    <span className={`text-[11px] truncate max-w-full ${isActive ? 'text-[#d8daff]' : 'text-[#757685]'}`}>
                      {p.time}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Active Phase Detail Card */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activePhaseIndex}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="bg-[#ffffff] border border-[#e1e3e4] rounded-2xl p-6 sm:p-8 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-4 border-b border-[#e1e3e4]">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="px-3 py-1 rounded-full bg-[#eef2ff] text-[#4353cf] border border-[#c7d2fe] text-xs font-bold uppercase tracking-wider">
                        Phase {currentPhase.phase} • {currentPhase.badge}
                      </span>
                      <span className="text-xs font-semibold text-[#575e70] flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">schedule</span>
                        {currentPhase.time} ({currentPhase.totalHours})
                      </span>
                    </div>
                    <h3 className="text-2xl font-bold text-[#191c1e] font-['Hanken_Grotesk']">
                      {currentPhase.title}
                    </h3>
                  </div>

                  <div className="text-xs text-[#575e70]">
                    Phase {activePhaseIndex + 1} of {track.phases.length}
                  </div>
                </div>

                <p className="text-sm text-[#454654] leading-relaxed mb-6">
                  {currentPhase.description}
                </p>

                {/* Modules Grid */}
                <div className="mb-6">
                  <h4 className="text-xs font-bold text-[#191c1e] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-[#4353cf]">checklist</span>
                    <span>Core Learning Modules & Competencies</span>
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {currentPhase.modules.map((mod, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2.5 p-3 rounded-xl bg-[#f8f9fa] border border-[#e1e3e4]"
                      >
                        <span className="material-symbols-outlined text-[#4353cf] text-base mt-0.5 shrink-0">
                          check_circle
                        </span>
                        <span className="text-xs sm:text-sm text-[#191c1e] font-medium leading-snug">
                          {mod}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Milestone & Tools */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-[#e1e3e4]">
                  <div className="p-4 rounded-xl bg-[#f0f4ff] border border-[#d8daff]">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#24389c] uppercase tracking-wider mb-1.5">
                      <span className="material-symbols-outlined text-sm">military_tech</span>
                      <span>Target Milestone Deliverable</span>
                    </div>
                    <p className="text-xs sm:text-sm text-[#191c1e] font-medium leading-relaxed">
                      {currentPhase.milestone}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-[#f8f9fa] border border-[#e1e3e4]">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#575e70] uppercase tracking-wider mb-2">
                      <span className="material-symbols-outlined text-sm text-[#4353cf]">build</span>
                      <span>Required Tools & Libraries</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {currentPhase.tools.map((tool, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 rounded-lg bg-white border border-[#e1e3e4] text-xs font-semibold text-[#191c1e] shadow-2xs"
                        >
                          {tool}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </section>

          {/* ── Salary & Career Trajectory ── */}
          <section id="career-trajectory" className="mb-14">
            <div className="mb-6">
              <div className="inline-flex items-center gap-2 text-xs font-bold text-[#4353cf] uppercase tracking-wider mb-1">
                <span className="material-symbols-outlined text-sm">trending_up</span>
                <span>Compensation Benchmark</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-[#191c1e] font-['Hanken_Grotesk']">
                Salary & Experience Progression in India
              </h2>
              <p className="text-sm text-[#454654] mt-1">
                Median compensation packages across product startups, MNC tech hubs, and tier-1 tech firms.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-[#ffffff] border border-[#e1e3e4] hover:border-[#4353cf] transition-all shadow-sm">
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#f8f9fa] border border-[#e1e3e4] text-[#575e70]">
                  Entry Level (0–2 yrs)
                </span>
                <div className="text-2xl font-black text-[#191c1e] mt-4 mb-1">
                  ₹5–10 LPA
                </div>
                <p className="text-xs text-[#575e70] leading-relaxed">
                  Junior Engineer building features under direct mentorship.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-[#ffffff] border border-[#e1e3e4] hover:border-[#4353cf] transition-all shadow-sm">
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#eef2ff] border border-[#c7d2fe] text-[#4353cf]">
                  Mid Level (2–5 yrs)
                </span>
                <div className="text-2xl font-black text-[#4353cf] mt-4 mb-1">
                  ₹12–22 LPA
                </div>
                <p className="text-xs text-[#575e70] leading-relaxed">
                  Independent contributor owning end-to-end service modules.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-[#ffffff] border border-[#e1e3e4] hover:border-[#4353cf] transition-all shadow-sm">
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#f8f9fa] border border-[#e1e3e4] text-[#575e70]">
                  Senior Level (5–8 yrs)
                </span>
                <div className="text-2xl font-black text-[#191c1e] mt-4 mb-1">
                  ₹24–42 LPA
                </div>
                <p className="text-xs text-[#575e70] leading-relaxed">
                  Senior engineer driving architecture and mentoring junior devs.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-[#ffffff] border border-[#e1e3e4] hover:border-[#4353cf] transition-all shadow-sm">
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#f8f9fa] border border-[#e1e3e4] text-[#575e70]">
                  Principal / Lead (8+ yrs)
                </span>
                <div className="text-2xl font-black text-[#191c1e] mt-4 mb-1">
                  ₹45–80+ LPA
                </div>
                <p className="text-xs text-[#575e70] leading-relaxed">
                  Staff architect driving cross-functional org standards.
                </p>
              </div>
            </div>
          </section>

          {/* ── CTA Banner ── */}
          <section className="mt-16 pt-10 border-t border-[#e1e3e4]">
            <div className="bg-[#4353cf] rounded-3xl p-10 md:p-14 text-center max-w-4xl mx-auto shadow-lg relative overflow-hidden text-white">
              <div
                className="absolute inset-0 opacity-20 pointer-events-none"
                style={{ background: 'radial-gradient(circle at 100% 0%, #ffffff 0%, transparent 60%)' }}
              />
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/15 text-[#d8daff] text-xs font-bold uppercase tracking-wider mb-4 relative z-10 backdrop-blur-sm">
                <span>Start Learning Today</span>
              </div>
              <h2 className="text-2xl md:text-4xl font-bold text-white mb-4 relative z-10 font-['Hanken_Grotesk'] leading-tight">
                Ready to master the {track.title} pathway?
              </h2>
              <p className="text-sm md:text-base text-[#d8daff] max-w-lg mx-auto mb-8 relative z-10 leading-relaxed font-light">
                Enroll in ELEVATE guided learning cohorts or take a diagnostic assessment to test your baseline skills.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4 relative z-10">
                <Link
                  to="/courses"
                  className="bg-white text-[#24389c] font-bold rounded-full px-8 py-3.5 hover:bg-[#f7f9fc] transition-all shadow-md text-sm flex items-center gap-2"
                >
                  <span>Explore Associated Courses</span>
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </Link>
                <Link
                  to="/career-roadmaps"
                  className="bg-white/10 hover:bg-white/20 text-white font-semibold rounded-full px-6 py-3.5 transition-all text-sm border border-white/20"
                >
                  <span>Browse Other Tracks</span>
                </Link>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* ── Standard Elevate Footer ── */}
      <footer className="bg-white border-t border-[#e0e3e6] mt-auto">
        <div className="max-w-[1280px] mx-auto px-6 md:px-12 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
            <div>
              <Link
                to="/"
                className="font-['Manrope'] text-2xl font-bold text-[#191c1e] flex items-center gap-2 mb-4"
              >
                <img src={mainLogo} alt="ELEVATE Logo" className="h-10 w-auto object-contain" />
                ELEVATE
              </Link>
              <p className="text-sm text-[#454652] leading-relaxed">
                Empowering the next generation of digital leaders with expert-led, practical education.
              </p>
            </div>

            <div>
              <h4 className="text-xs font-bold text-[#191c1e] uppercase tracking-widest mb-4">
                Company
              </h4>
              <ul className="space-y-3 text-sm text-[#454652]">
                <li><Link to="/about-elevate" className="hover:text-[#4353cf] transition-colors">About Us</Link></li>
                <li><Link to="/courses" className="hover:text-[#4353cf] transition-colors">Courses</Link></li>
                <li><Link to="/career-roadmaps" className="hover:text-[#4353cf] transition-colors">Career Roadmaps</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold text-[#191c1e] uppercase tracking-widest mb-4">
                Legal
              </h4>
              <ul className="space-y-3 text-sm text-[#454652]">
                <li><a href="#" className="hover:text-[#4353cf] transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-[#4353cf] transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-[#4353cf] transition-colors">FAQ</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold text-[#191c1e] uppercase tracking-widest mb-4">
                Subscribe
              </h4>
              <div className="flex flex-col gap-3">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="w-full px-4 py-2.5 rounded-lg border border-[#c5c5d4] bg-[#f7f9fc] text-sm text-[#191c1e] focus:border-[#4353cf] focus:outline-none focus:ring-2 focus:ring-[#4353cf]/20"
                />
                <button className="w-full bg-[#4353cf] hover:bg-[#3444b8] text-white py-2.5 rounded-lg text-sm font-semibold transition-colors shadow-sm">
                  Subscribe
                </button>
              </div>
            </div>
          </div>

          <div className="border-t border-[#e0e3e6] pt-8 flex justify-between items-center text-xs md:text-sm text-[#454652]">
            <p>© 2026 ELEVATE. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <span className="material-symbols-outlined cursor-pointer hover:text-[#4353cf] transition-colors">
                share
              </span>
            </div>
          </div>
        </div>
      </footer>

      {/* ── Lightbox Modal for Fullscreen Roadmap Graphic ── */}
      <AnimatePresence>
        {isLightboxOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col p-4 sm:p-8"
            onClick={() => setIsLightboxOpen(false)}
          >
            <div className="flex items-center justify-between text-white mb-4">
              <div className="flex items-center gap-3">
                <span className="font-bold text-lg font-['Hanken_Grotesk']">
                  {track.title} Roadmap (High-Definition Vector)
                </span>
                <span className="text-xs text-white/70">Press ESC or click outside to close</span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={track.image}
                  download={`${track.slug}-roadmap.svg`}
                  onClick={(e) => e.stopPropagation()}
                  className="px-4 py-2 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">download</span>
                  <span>Download</span>
                </a>
                <button
                  onClick={() => setIsLightboxOpen(false)}
                  className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>
            </div>

            <div
              className="flex-grow flex items-center justify-center overflow-auto max-h-[85vh] bg-white rounded-2xl p-4 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={track.image}
                alt={`${track.title} Roadmap Fullscreen`}
                className="max-h-full max-w-full object-contain rounded-xl"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
