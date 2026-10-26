import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useSearchParams } from 'react-router-dom';
import howToFormATeamImg from '../assets/courses page/edited . 4 .jpg';
import mainLogo from '../assets/main_logo.png';
import Navbar from '../components/Navbar';
import journeyService from '../services/journey.service';

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Convert decimal hours (e.g. "3.5") to a readable string like "3 hr 30 min".
 */
function formatDuration(hoursStr) {
  const total = parseFloat(hoursStr) || 0;
  const h = Math.floor(total);
  const m = Math.round((total - h) * 60);
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} hr`;
  return `${h} hr ${String(m).padStart(2, '0')} min`;
}

/**
 * Split a plain title string into at most two display lines.
 * Tries to break near the middle of the word list.
 */
function splitTitleLines(title) {
  const words = title.split(' ');
  if (words.length <= 3) return [title];
  const mid = Math.ceil(words.length / 2);
  return [words.slice(0, mid).join(' '), words.slice(mid).join(' ')];
}

/**
 * Fallback thumbnail for journeys without a thumbnail URL.
 */
const FALLBACK_THUMBNAIL = howToFormATeamImg;

// Dynamic categories derived from the API response, but seeded with a fixed
// base list so the UI is stable even while loading.
const BASE_CATEGORIES = ['All Courses', 'AI & Digital', 'Career Growth', 'Communication'];

// ─── Component ───────────────────────────────────────────────────────────────

const Courses = () => {
  const [searchParams] = useSearchParams();
  const categoryParam = searchParams.get('category');

  const [activeCategory, setActiveCategory] = useState(categoryParam || 'All Courses');
  const [searchQuery, setSearchQuery] = useState('');

  // API state
  const [journeys, setJourneys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Sync category filter with URL param
  useEffect(() => {
    setActiveCategory(categoryParam || 'All Courses');
  }, [categoryParam]);

  // Fetch journeys from backend
  const fetchJourneys = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await journeyService.getAllJourneys();
      setJourneys(data);
    } catch (err) {
      setError(err.message || 'Failed to load courses. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJourneys();
  }, [fetchJourneys]);

  // Derive category list from fetched journeys (union with base list)
  const categories = useMemo(() => {
    const fromData = journeys.map((j) => j.category).filter(Boolean);
    const unique = [...new Set([...BASE_CATEGORIES.slice(1), ...fromData])];
    return ['All Courses', ...unique.sort()];
  }, [journeys]);

  // Filter courses client-side
  const filteredCourses = useMemo(() => {
    return journeys.filter((j) => {
      const titleLower = j.title.toLowerCase();
      const descLower = (j.description || '').toLowerCase();
      const catLower = (j.category || '').toLowerCase();
      const matchesSearch =
        titleLower.includes(searchQuery.toLowerCase()) ||
        descLower.includes(searchQuery.toLowerCase()) ||
        catLower.includes(searchQuery.toLowerCase());
      const matchesCategory =
        activeCategory === 'All Courses' || j.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [journeys, activeCategory, searchQuery]);

  // ─── Render States ──────────────────────────────────────────────────────────

  const renderGrid = () => {
    if (loading) {
      return (
        <motion.div
          key="loading"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="py-20 flex flex-col items-center justify-center gap-4"
        >
          {/* Skeleton cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="rounded-3xl overflow-hidden bg-white shadow-md border border-[#e0e3e6] h-[460px] animate-pulse"
              >
                <div className="w-full h-full bg-gradient-to-br from-[#eceef1] to-[#d8dbe0]" />
              </div>
            ))}
          </div>
          <p className="text-sm text-[#757684] mt-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] animate-spin">
              autorenew
            </span>
            Loading courses from database…
          </p>
        </motion.div>
      );
    }

    if (error) {
      return (
        <motion.div
          key="error"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="py-20 text-center flex flex-col items-center justify-center bg-white rounded-3xl border border-red-100 p-12 max-w-lg mx-auto shadow-sm"
        >
          <div className="w-16 h-16 rounded-full bg-red-50 text-red-500 flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-3xl">wifi_off</span>
          </div>
          <h3 className="font-['Manrope'] text-xl font-bold text-[#191c1e] mb-2">
            Couldn't load courses
          </h3>
          <p className="text-sm text-[#757684] mb-6">{error}</p>
          <button
            onClick={fetchJourneys}
            className="bg-[#24389c] text-white px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-[#3f51b5] transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">refresh</span>
            Try Again
          </button>
        </motion.div>
      );
    }

    if (filteredCourses.length === 0) {
      return (
        <motion.div
          key="empty"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="py-20 text-center flex flex-col items-center justify-center bg-white rounded-3xl border border-[#c5c5d4]/40 p-12 max-w-lg mx-auto shadow-sm"
        >
          <div className="w-16 h-16 rounded-full bg-[#24389c]/10 text-[#24389c] flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-3xl">search_off</span>
          </div>
          <h3 className="font-['Manrope'] text-xl font-bold text-[#191c1e] mb-2">
            No courses found
          </h3>
          <p className="text-sm text-[#454652] mb-6">
            {journeys.length === 0
              ? 'No published courses are available yet. Check back soon!'
              : `We couldn't find any courses matching "${searchQuery}". Try searching for another skill or reset filters.`}
          </p>
          {journeys.length > 0 && (
            <button
              onClick={() => {
                setSearchQuery('');
                setActiveCategory('All Courses');
              }}
              className="bg-[#24389c] text-white px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-[#3f51b5] transition-colors"
            >
              Reset Filters
            </button>
          )}
        </motion.div>
      );
    }

    return (
      <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {filteredCourses.map((journey, idx) => {
          const titleLines = splitTitleLines(journey.title);
          const thumbnail = journey.thumbnail_url || FALLBACK_THUMBNAIL;
          const duration = formatDuration(journey.duration_hours);
          const badge = journey.badge || journey.difficulty?.toUpperCase() || 'COURSE';

          return (
            <Link
              key={journey.id}
              to={`/courses/${journey.id}`}
              className="contents"
              aria-label={`View course: ${journey.title}`}
            >
              <motion.div
                layout
                initial={{ opacity: 0, y: 25 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4, delay: idx * 0.05 }}
                whileHover={{ y: -6 }}
                className="group relative rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 border border-white/20 bg-white cursor-pointer flex flex-col h-[460px]"
              >
              {/* Background Thumbnail */}
              <div className="absolute inset-0 z-0 overflow-hidden">
                <img
                  src={thumbnail}
                  alt={journey.title}
                  className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                />
              </div>

              {/* Gradient Vignette */}
              <div className="absolute inset-0 card-vignette z-10 pointer-events-none" />

              {/* Card Body */}
              <div className="relative z-20 flex flex-col h-full justify-end items-center text-center px-4 pb-4 mt-auto">
                <h3 className="text-white font-['Manrope'] font-extrabold text-[24px] md:text-[25px] leading-tight uppercase drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] tracking-wide mb-1">
                  {titleLines.map((line, i) => (
                    <React.Fragment key={i}>
                      {line}
                      {i < titleLines.length - 1 && <br />}
                    </React.Fragment>
                  ))}
                </h3>
                <p className="text-white/90 text-[13px] font-medium tracking-wide drop-shadow-sm mb-3.5 line-clamp-1">
                  {journey.description}
                </p>

                {/* Duration and Price Badges */}
                <div className="flex items-center justify-center gap-2 mb-3">
                  <div className="inline-flex items-center justify-center gap-1.5 bg-white text-[#24389c] font-bold text-[13px] px-3.5 py-1.5 rounded-xl shadow-md border border-white/40">
                    <span className="material-symbols-outlined text-[17px] text-[#24389c]">
                      schedule
                    </span>
                    <span>{duration}</span>
                  </div>
                  <div className={`inline-flex items-center justify-center gap-1 font-bold text-[13px] px-3.5 py-1.5 rounded-xl shadow-md border ${
                    Number(journey.price) > 0
                      ? 'bg-[#24389c] text-white border-white/30'
                      : 'bg-[#1b7a47] text-white border-white/30'
                  }`}>
                    <span>{Number(journey.price) > 0 ? `₹${Number(journey.price).toLocaleString('en-IN')}` : 'Free'}</span>
                  </div>
                </div>
              </div>

              {/* Bottom Ribbon */}
              <div className="relative z-20 w-full py-3 px-4 card-ribbon-vibrant text-white text-center flex items-center justify-center gap-2 border-t border-white/30 rounded-b-3xl">
                <span className="material-symbols-outlined text-[17px] text-white drop-shadow">
                  auto_awesome
                </span>
                <span className="font-extrabold text-[12px] md:text-[13px] tracking-widest uppercase drop-shadow">
                  {badge}
                </span>
                <span className="material-symbols-outlined text-[17px] text-white drop-shadow">
                  auto_awesome
                </span>
              </div>
              </motion.div>
            </Link>
          );
        })}
      </motion.div>
    );
  };

  // ─── JSX ────────────────────────────────────────────────────────────────────

  return (
    <div className="bg-[#f7f9fc] text-[#191c1e] min-h-screen flex flex-col font-['Inter'] antialiased selection:bg-primary/20 selection:text-primary">
      {/* Top Navigation Bar */}
      <Navbar />

      {/* Main Content Area */}
      <main className="flex-grow pb-28 pt-20 relative">
        {/* Hero & Filter Section */}
        <section className="px-6 md:px-12 pt-12 pb-8 max-w-[1280px] mx-auto text-center">
          <motion.h1
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="font-['Manrope'] font-bold text-3xl md:text-5xl text-[#191c1e] tracking-tight mb-4"
          >
            Master the Skills of Tomorrow
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="text-base md:text-lg text-[#454652] max-w-2xl mx-auto mb-4 font-normal"
          >
            Explore practical, expert-led courses designed to accelerate your professional growth.
          </motion.p>

          {/* Diagnostic Recommendation Entry Banner */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.12 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#4353cf]/10 hover:bg-[#4353cf]/15 border border-[#4353cf]/20 rounded-full text-xs font-semibold text-[#4353cf] mb-8 transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">psychology</span>
            <span>Unsure where to start?</span>
            <Link to="/learning-needs" className="underline font-bold hover:text-[#2435b4]">
              Take our 2-Minute Diagnostic Questionnaire →
            </Link>
          </motion.div>

          {/* Search Box */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="max-w-xl mx-auto mb-8 relative"
          >
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#757684]">
              search
            </span>
            <input
              type="text"
              id="course-search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for courses, skills, or topics..."
              className="w-full bg-[#eceef1] pl-12 pr-10 py-3.5 rounded-full border border-[#c5c5d4]/70 focus:border-[#24389c] focus:bg-white focus:ring-4 focus:ring-[#24389c]/15 outline-none transition-all text-sm md:text-base text-[#191c1e] placeholder:text-[#757684]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#757684] hover:text-[#191c1e] transition-colors"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            )}
          </motion.div>

          {/* Category Filter Pills */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex flex-wrap justify-center gap-2.5 md:gap-3"
          >
            {categories.map((cat) => {
              const isActive = activeCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-6 py-2.5 rounded-full text-xs md:text-sm font-semibold transition-all duration-200 ${
                    isActive
                      ? 'bg-[#24389c] text-white shadow-md shadow-[#24389c]/25 scale-105'
                      : 'bg-[#eceef1] text-[#454652] hover:bg-[#e0e3e6] border border-[#c5c5d4]/50'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </motion.div>
        </section>

        {/* Course Cards Grid */}
        <section className="px-6 md:px-12 max-w-[1280px] mx-auto mt-4">
          <AnimatePresence mode="popLayout">
            {renderGrid()}
          </AnimatePresence>
        </section>

        {/* Floating CTA Banner */}
        <div className="fixed bottom-8 inset-x-0 z-40 flex justify-center px-4 pointer-events-none">
          <motion.aside
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-auto cta-banner rounded-full px-6 md:px-8 py-3.5 md:py-4 shadow-2xl border border-[#e6e8eb] w-full max-w-[800px] flex items-center justify-between gap-4"
          >
            <p className="font-['Manrope'] font-bold text-sm md:text-lg text-[#191c1e]">
              Get access to Skills, Jobs, Community
            </p>
            <Link to="/register">
              <button className="bg-[#24389c] hover:bg-[#3f51b5] text-white font-semibold text-xs md:text-sm px-5 md:px-6 py-2.5 md:py-3 rounded-full transition-all shadow-md flex items-center gap-2 flex-shrink-0 group">
                Become A Member
                <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">
                  arrow_forward
                </span>
              </button>
            </Link>
          </motion.aside>
        </div>
      </main>

      {/* Footer */}
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
                <li><Link to="/about-elevate" className="hover:text-[#24389c] transition-colors">About Us</Link></li>
                <li><a href="#" className="hover:text-[#24389c] transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-[#24389c] transition-colors">Careers</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold text-[#191c1e] uppercase tracking-widest mb-4">
                Legal
              </h4>
              <ul className="space-y-3 text-sm text-[#454652]">
                <li><a href="#" className="hover:text-[#24389c] transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-[#24389c] transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-[#24389c] transition-colors">FAQ</a></li>
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
                  className="w-full px-4 py-2.5 rounded-lg border border-[#c5c5d4] bg-[#f7f9fc] text-sm text-[#191c1e] focus:border-[#24389c] focus:outline-none focus:ring-2 focus:ring-[#24389c]/20"
                />
                <button className="w-full bg-[#24389c] hover:bg-[#3f51b5] text-white py-2.5 rounded-lg text-sm font-semibold transition-colors shadow-sm">
                  Subscribe
                </button>
              </div>
            </div>
          </div>

          <div className="border-t border-[#e0e3e6] pt-8 flex justify-between items-center text-xs md:text-sm text-[#454652]">
            <p>© 2026 ELEVATE. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <span className="material-symbols-outlined cursor-pointer hover:text-[#24389c] transition-colors">
                share
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Courses;
