import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Link, useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import eventService from '../services/event.service';

const CATEGORIES = [
  'All Workshops',
  'AI & Digital',
  'Career Growth',
  'Communication',
  'Engineering',
  'Product & Design',
];

function formatEventDateTime(startsAt, endsAt) {
  if (!startsAt) return '';
  const start = new Date(startsAt);
  const end = endsAt ? new Date(endsAt) : null;

  const dateOptions = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
  const timeOptions = { hour: 'numeric', minute: '2-digit', hour12: true };

  const dateStr = start.toLocaleDateString('en-US', dateOptions);
  const startTime = start.toLocaleTimeString('en-US', timeOptions);
  const endTime = end ? end.toLocaleTimeString('en-US', timeOptions) : '';

  return `${dateStr} • ${startTime}${endTime ? ` - ${endTime}` : ''}`;
}

function getDeadlineNotice(deadlineStr) {
  if (!deadlineStr) return null;
  const deadline = new Date(deadlineStr);
  const now = new Date();
  const diffHours = (deadline - now) / (1000 * 60 * 60);

  if (diffHours <= 0) {
    return { text: 'Registration Closed', passed: true };
  }
  if (diffHours < 24) {
    const hours = Math.max(1, Math.round(diffHours));
    return { text: `Closes in ${hours} hour${hours > 1 ? 's' : ''}`, passed: false, urgent: true };
  }
  const days = Math.round(diffHours / 24);
  return { text: `Closes in ${days} day${days > 1 ? 's' : ''}`, passed: false, urgent: false };
}

const Events = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryParam = searchParams.get('category');
  const statusParam = searchParams.get('status') || 'upcoming';

  const [activeCategory, setActiveCategory] = useState(categoryParam || 'All Workshops');
  const [activeStatus, setActiveStatus] = useState(statusParam);
  const [searchQuery, setSearchQuery] = useState('');

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        status: activeStatus,
      };
      if (activeCategory && activeCategory !== 'All Workshops') {
        params.category = activeCategory;
      }
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      const res = await eventService.getEvents(params);
      setEvents(res.events || []);
    } catch (err) {
      setError(err.message || 'Failed to load workshops. Please verify connection.');
    } finally {
      setLoading(false);
    }
  }, [activeStatus, activeCategory, searchQuery]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleCategoryChange = (cat) => {
    setActiveCategory(cat);
    const newParams = new URLSearchParams(searchParams);
    if (cat === 'All Workshops') {
      newParams.delete('category');
    } else {
      newParams.set('category', cat);
    }
    setSearchParams(newParams);
  };

  const handleStatusChange = (status) => {
    setActiveStatus(status);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('status', status);
    setSearchParams(newParams);
  };

  return (
    <div className="bg-[#f7f9fc] text-[#191c1e] min-h-screen flex flex-col font-['Inter'] antialiased">
      <Navbar />

      <main className="flex-grow pt-28 pb-20">
        <div className="max-w-[1280px] mx-auto px-6 md:px-12">
          {/* Hero Banner */}
          <div className="bg-gradient-to-br from-[#24389c] via-[#2f46b8] to-[#4353cf] text-white rounded-3xl p-8 md:p-14 shadow-xl mb-10 relative overflow-hidden">
            <div className="absolute -right-16 -bottom-16 w-80 h-80 bg-white/10 rounded-full blur-2xl pointer-events-none" />
            <div className="relative z-10 max-w-2xl">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold uppercase tracking-wider backdrop-blur-md mb-4 border border-white/20">
                <span className="material-symbols-outlined text-[16px]">groups</span>
                Live Experiential Learning
              </span>
              <h1 className="text-3xl md:text-5xl font-extrabold font-['Hanken_Grotesk'] tracking-tight leading-tight mb-4">
                Workshops & Masterclasses
              </h1>
              <p className="text-white/85 text-base md:text-lg leading-relaxed mb-6 font-normal">
                Join live, interactive cohort sessions guided by experienced practitioners. Bridge conceptual knowledge with real-time feedback and hands-on application.
              </p>

              {/* Search Bar */}
              <div className="relative max-w-xl">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/60">
                  search
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by workshop title, topic, or facilitator..."
                  className="w-full pl-12 pr-10 py-3.5 bg-white/15 backdrop-blur-md border border-white/25 text-white placeholder-white/60 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-white/50 transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
                  >
                    <span className="material-symbols-outlined text-[18px]">close</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Controls: Category Pills & Status Switcher */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            {/* Category Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => handleCategoryChange(cat)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    activeCategory === cat
                      ? 'bg-[#24389c] text-white shadow-sm'
                      : 'bg-white text-[#454654] border border-[#e1e3e4] hover:bg-[#f0f2f5]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Upcoming vs Past Switcher */}
            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-[#e1e3e4] shadow-sm shrink-0 self-start md:self-auto">
              <button
                onClick={() => handleStatusChange('upcoming')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeStatus === 'upcoming'
                    ? 'bg-[#4353cf] text-white shadow-sm'
                    : 'text-[#454654] hover:text-[#191c1e]'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">event_upcoming</span>
                Upcoming
              </button>
              <button
                onClick={() => handleStatusChange('past')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeStatus === 'past'
                    ? 'bg-[#4353cf] text-white shadow-sm'
                    : 'text-[#454654] hover:text-[#191c1e]'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">history</span>
                Past
              </button>
            </div>
          </div>

          {/* Content States */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div
                  key={n}
                  className="bg-white rounded-3xl p-6 border border-[#e1e3e4] shadow-sm animate-pulse flex flex-col justify-between h-[360px]"
                >
                  <div className="space-y-4">
                    <div className="h-4 bg-slate-200 rounded w-1/3" />
                    <div className="h-6 bg-slate-200 rounded w-4/5" />
                    <div className="h-4 bg-slate-200 rounded w-full" />
                    <div className="h-4 bg-slate-200 rounded w-2/3" />
                  </div>
                  <div className="space-y-3 pt-6 border-t border-slate-100">
                    <div className="h-3 bg-slate-200 rounded w-1/2" />
                    <div className="h-10 bg-slate-200 rounded-xl w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 p-8 rounded-3xl text-center max-w-xl mx-auto my-12 shadow-sm">
              <span className="material-symbols-outlined text-4xl text-red-500 mb-2">error</span>
              <h3 className="text-lg font-bold mb-2">Unable to Load Workshops</h3>
              <p className="text-sm mb-4">{error}</p>
              <button
                onClick={fetchEvents}
                className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all"
              >
                Retry
              </button>
            </div>
          ) : events.length === 0 ? (
            <div className="bg-white rounded-3xl border border-[#e1e3e4] p-12 text-center max-w-xl mx-auto my-10 shadow-sm">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-[#4353cf] flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-3xl">event_busy</span>
              </div>
              <h3 className="text-xl font-bold font-['Hanken_Grotesk'] text-[#191c1e] mb-2">
                No Workshops Found
              </h3>
              <p className="text-sm text-[#757685] mb-6">
                {searchQuery || activeCategory !== 'All Workshops'
                  ? 'No events match your selected filters. Try broadening your search or resetting categories.'
                  : activeStatus === 'upcoming'
                  ? 'There are currently no upcoming workshops scheduled. New cohort dates will be published shortly!'
                  : 'No past workshops found in this archive.'}
              </p>
              {(searchQuery || activeCategory !== 'All Workshops') && (
                <button
                  onClick={() => {
                    setActiveCategory('All Workshops');
                    setSearchQuery('');
                  }}
                  className="bg-[#24389c] hover:bg-[#1a2b7a] text-white px-5 py-2.5 rounded-xl font-semibold text-xs transition-all shadow-sm"
                >
                  Reset Filters
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map((ev) => {
                const deadline = getDeadlineNotice(ev.registration_deadline);
                const capacityRatio = ev.max_capacity > 0 ? (ev.registered_count / ev.max_capacity) : 0;
                const capacityPct = Math.min(100, Math.round(capacityRatio * 100));

                return (
                  <motion.div
                    key={ev.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className="bg-white rounded-3xl border border-[#e1e3e4] hover:border-[#24389c]/40 hover:shadow-lg transition-all duration-300 flex flex-col justify-between overflow-hidden group"
                  >
                    <div className="p-7">
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 mb-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-indigo-50 text-[#4353cf] border border-indigo-100">
                            {ev.category || 'General Workshop'}
                          </span>
                          {Number(ev.price) > 0 ? (
                            <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                              ₹{Number(ev.price).toLocaleString('en-IN')}
                            </span>
                          ) : (
                            <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
                              Free
                            </span>
                          )}
                        </div>
                        {ev.is_full ? (
                          <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200">
                            Full
                          </span>
                        ) : ev.is_deadline_passed ? (
                          <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 border border-slate-200">
                            Closed
                          </span>
                        ) : deadline?.urgent ? (
                          <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                            {deadline.text}
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Seats Open
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <h3 className="text-xl font-bold font-['Hanken_Grotesk'] text-[#191c1e] group-hover:text-[#24389c] transition-colors leading-snug mb-3 line-clamp-2">
                        {ev.title}
                      </h3>

                      {/* Description preview */}
                      <p className="text-xs text-[#555664] line-clamp-2 mb-5 leading-relaxed">
                        {ev.description || 'Interactive experiential session focusing on practical implementation and peer feedback.'}
                      </p>

                      {/* Metadata Rows */}
                      <div className="space-y-2.5 text-xs text-[#454654] border-t border-slate-100 pt-4">
                        {/* Facilitator */}
                        <div className="flex items-center gap-2.5">
                          <div className="w-6 h-6 rounded-full bg-[#4353cf]/15 text-[#4353cf] flex items-center justify-center font-bold text-[10px]">
                            {ev.facilitator_name ? ev.facilitator_name.charAt(0).toUpperCase() : 'E'}
                          </div>
                          <span className="font-semibold text-[#191c1e]">
                            {ev.facilitator_name || 'ELEVATE Facilitator'}
                          </span>
                        </div>

                        {/* Date & Time */}
                        <div className="flex items-center gap-2 text-slate-600">
                          <span className="material-symbols-outlined text-[17px] text-[#4353cf]">
                            calendar_today
                          </span>
                          <span className="truncate">{formatEventDateTime(ev.starts_at, ev.ends_at)}</span>
                        </div>

                        {/* Venue / Online */}
                        <div className="flex items-center gap-2 text-slate-600">
                          <span className="material-symbols-outlined text-[17px] text-[#4353cf]">
                            {ev.venue ? 'location_on' : 'videocam'}
                          </span>
                          <span className="truncate">
                            {ev.venue || 'Live Online Interactive Cohort'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Capacity & CTA Section */}
                    <div className="bg-[#fbfcff] px-7 py-5 border-t border-[#e1e3e4] space-y-3.5">
                      {/* Capacity Bar */}
                      <div>
                        <div className="flex items-center justify-between text-[11px] font-semibold text-[#454654] mb-1.5">
                          <span>Capacity</span>
                          <span>
                            {ev.registered_count} / {ev.max_capacity} booked ({ev.seats_available} left)
                          </span>
                        </div>
                        <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
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
                      </div>

                      {/* Action Button */}
                      <Link
                        to={`/events/${ev.id}`}
                        className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm ${
                          ev.is_full
                            ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            : 'bg-[#24389c] hover:bg-[#1a2b7a] text-white'
                        }`}
                      >
                        <span>{ev.is_full ? 'View Details (Full)' : 'View Details & Register'}</span>
                        <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                      </Link>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Events;
