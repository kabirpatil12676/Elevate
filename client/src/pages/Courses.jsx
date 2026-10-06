import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import howToFormATeamImg from '../assets/courses page/edited . 4 .jpg';

const COURSES_DATA = [
  {
    id: 1,
    titleLines: ['HOW TO DO', 'ENGINEERING'],
    subtitle: 'A Practical Student Guide',
    duration: '3 hr 30 min',
    badge: 'NEWLY LAUNCHED',
    category: 'Career Growth',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBRG4aT_4k0YkYKchQIJwXsjkBvKIjfqjhTtsP8vfiH_DGWTFEnjU0Buacu_3prd9rVZijD0lQSaRTLgTvKQ-qi5fW4JaFDj10xpARWul4faLDAxv19xAdGkGeXhO0JFaZeI33BnMQPjPRuz2JQOTNqAERwOHoMQazS74QyppKWKLNulmEZqVofNplfEuXybQUw-D3qQrn1cmGUC-pwY9jd1lcPGFKhq4gQsbG7iNKiE91OEZnXhJc-pIKzL_0Ie51gET-2xZ3sNLpg-Qk',
  },
  {
    id: 2,
    titleLines: ['HOW TO ORGANISE', 'AN EVENT'],
    subtitle: 'End-to-End Event Management',
    duration: '4 hr 15 min',
    badge: 'POPULAR COURSE',
    category: 'Communication',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBn6Lct4wfuDXvpC_cVWP62bxCb7vy9qHRX-0fWji2UgB1fstx9H376CxCOkYoMpaLSWz5_insdplkENS9BeIgtdxMByaNYw__8zR-KGCjh_zrBNvdwwL6YX-fdNQRS3v2LI_vEE3tCbmFyi13ZWb27rLl-ikytOD_Z4rdyQIUJZ4uoZzBvZM6LAg3bFs3kWrVQ7CPujcEHnXkxoikmyqDYPDFbRHnmI4MAC-va6Yg7iKoun20ILk5s_sL_nm3nwbDO8Y7GhMMHXFcyHMs',
  },
  {
    id: 3,
    titleLines: ['HOW TO DO', 'ANCHORING'],
    subtitle: 'Stage Confidence & Hosting',
    duration: '2 hr 45 min',
    badge: 'NEWLY LAUNCHED',
    category: 'Communication',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCTfRNgEHeoqVthamolc3WTS2W3WdE0qv0M9UgD7emRfC3HM4dusncpuMbzCw8iXvt59WFpd0ZQYemUOqQiEry2b-UiMaz1vY-v8uhdSJ3jXYlXDE2vELGQNLx5AtpR2XBXSB9H63Xdn9xYTokIrh2aYEJzhgw22c2tQypn5PCCrYmWuub4neoknUzVaRURWO0pOMv_tQWdF1-VVAhRLS7OEkFulAr5-YiIuxW3hU-zuLPK13LoKkLTNBNa84e-o87rZamHiCUbZXbWkA0',
  },
  {
    id: 4,
    titleLines: ['WRITE ANCHORING', 'SCRIPT'],
    subtitle: 'Flow, Transitions & Speeches',
    duration: '2 hr 10 min',
    badge: 'TRENDING NOW',
    category: 'Communication',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCFXlSk4YV7KzJbfT_-KeQUCHOLQwzABJNTwIjeaj_diMPV78ZItiklekKrILAPnUJ7lfwPtaSK1GjmCkWOskdIRu6GMBDQMmFGdo3HiSPpU3xvpObd6eyaz9SLVQ6n-HFFAYKT71mXlykQFM8ZXwz2BCvlmFZcl0EnoVZnMiuI1eOLnfC_P2sv2OC7L3X2aQmFejpgZTT1G-LHAvql9EFVltozzWZl2XI8SCC08taLH4xPz9Wllxd05SCxQ6YUfieBKVAwzVMb9X-PEPk',
  },
  {
    id: 5,
    titleLines: ['WHAT TO DO IN', 'FIRST YEAR'],
    subtitle: 'Building Your Engineering Foundation',
    duration: '3 hr 00 min',
    badge: 'TOP RATED',
    category: 'Career Growth',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCCSUSfNZVVTn8i3hkpKCsOQeu2FVhX3qLdr_6oVau8yEwBz4-eryaTb7doWqMIqI0Fww7kpodqItq33F4u7Y2bNS9rRTLoerr1bsl1KVdb9nvopMMm6CLrIu5G79PK8iJ9JU7jrJ3U1nlR31kZbeE7WFlQTBi-Uq5qxcYGl5pSsltdLRnsrDfLuIkEcN2agHMtzqbxsQqKQd73qBjsjVwzihDFyb25y2ExOaIboO5M0KZ3PsXgY_yozyW-BVNGorzaNqmyKYPH5krViEc',
  },
  {
    id: 6,
    titleLines: ['HOW TO FORM', 'A TEAM'],
    subtitle: 'For an Engineering Project',
    duration: '1 hr 50 min',
    badge: 'MOST ENROLLED',
    category: 'Career Growth',
    image: howToFormATeamImg,
  },
  {
    id: 7,
    titleLines: ['SELECT PROBLEM', 'STATEMENT'],
    subtitle: 'Feasibility & Scope Analysis',
    duration: '2 hr 30 min',
    badge: 'FEATURED GUIDE',
    category: 'AI & Digital',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAb6rc-v19OFof75dN6jK7jClXIwcdSfhsHvylq8nnNyVxncOcWp_3E_FjyGCV6Ma7JM_7HnU4kI6NGqwLR-5toCGswpwbniPgZd3bk4Qy0UGd7TFX5a1xgRe3g0adQk5dbJI-Q0y93K888neO2Zlv-aRINnrOLsR_NkIpjuemokA1iMBy9MjXWHqi0BJlXJhbjTmkjm-g9PwZj0Fn-udQYx6ldedi0gYEXVcWMBmjwLQHYJPmW9v-JzqjSpSlD8SsgpK-IZ184hSVImXY',
  },
  {
    id: 8,
    titleLines: ['SYNOPSIS &', 'REPORT MAKING'],
    subtitle: 'Abstract, Methodology & Documentation',
    duration: '3 hr 15 min',
    badge: 'NEWLY LAUNCHED',
    category: 'AI & Digital',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC8WLJ3wlpHYOLML8HBMvuhSa3y4q5FwHz_dhnBLYqhRXLtTKi1EwcaTOPa2sTtady2AIXfsCDHAu02OkgjdPlZ79RzxA4BWCgAMf0_xNckiwQHs4NFIthmvoK23RBW0EnIAA2TahBeqmgR1dCPPO0r06tlrDXCUO1Xa7w72CqobgG2dMCwP7exaYAWeFIcWeGB-tza0ZBhekq8N4OCMtpczru6JDygZAssIhCGr9UiUIFTGGGUw0--U3z-tjAIjCycedjsKmnSq7PZY-E',
  },
];

const CATEGORIES = ['All Courses', 'AI & Digital', 'Career Growth', 'Communication'];

const Courses = () => {
  const [activeCategory, setActiveCategory] = useState('All Courses');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCourses = useMemo(() => {
    return COURSES_DATA.filter((course) => {
      const fullTitle = course.titleLines.join(' ').toLowerCase();
      const matchesSearch =
        fullTitle.includes(searchQuery.toLowerCase()) ||
        course.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.category.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        activeCategory === 'All Courses' || course.category === activeCategory;

      return matchesSearch && matchesCategory;
    });
  }, [activeCategory, searchQuery]);

  return (
    <div className="bg-[#f7f9fc] text-[#191c1e] min-h-screen flex flex-col font-['Inter'] antialiased selection:bg-primary/20 selection:text-primary">
      {/* Top Navigation Bar */}
      <header className="bg-white/95 backdrop-blur-md border-b border-[#c5c5d4]/40 sticky top-0 z-50">
        <div className="max-w-[1280px] mx-auto px-6 md:px-12 py-4 flex justify-between items-center">
          <Link
            to="/"
            className="text-2xl font-extrabold text-[#24389c] flex items-center gap-2 font-['Manrope'] tracking-tight hover:opacity-90 transition-opacity"
          >
            <span className="material-symbols-outlined text-[#24389c] text-3xl" style={{ fontVariationSettings: '"FILL" 1' }}>
              check_circle
            </span>
            ELEVATE
          </Link>

          <nav className="hidden md:flex items-center gap-8 font-medium">
            <Link
              to="/courses"
              className="text-[#24389c] font-semibold text-sm transition-colors flex items-center gap-1 border-b-2 border-[#24389c] pb-0.5"
            >
              Courses
              <span className="material-symbols-outlined text-[18px]">expand_more</span>
            </Link>
            <Link to="/community" className="text-[#454652] hover:text-[#24389c] text-sm transition-colors">
              Community
            </Link>
            <a href="#" className="text-[#454652] hover:text-[#24389c] text-sm transition-colors">
              Career Roadmaps
            </a>
            <a href="#" className="text-[#454652] hover:text-[#24389c] text-sm transition-colors">
              Testimonials
            </a>
            <a href="#" className="text-[#454652] hover:text-[#24389c] text-sm transition-colors">
              About Elevate
            </a>
          </nav>

          <div className="flex items-center gap-4">
            <button className="hidden md:block text-sm font-semibold text-[#454652] hover:text-[#24389c] transition-colors border border-[#c5c5d4] hover:border-[#24389c] px-8 py-2 rounded-full">
              Login
            </button>
            <button className="md:hidden text-[#191c1e] p-2">
              <span className="material-symbols-outlined">menu</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow pb-28 relative">
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
            className="text-base md:text-lg text-[#454652] max-w-2xl mx-auto mb-8 font-normal"
          >
            Explore practical, expert-led courses designed to accelerate your professional growth.
          </motion.p>

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
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for courses, skills, or mentors..."
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
            {CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-6 py-2.5 rounded-full text-xs md:text-sm font-semibold transition-all duration-200 ${isActive
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
            {filteredCourses.length > 0 ? (
              <motion.div
                layout
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
              >
                {filteredCourses.map((course, idx) => (
                  <motion.div
                    key={course.id}
                    layout
                    initial={{ opacity: 0, y: 25 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.4, delay: idx * 0.05 }}
                    whileHover={{ y: -6 }}
                    className="group relative rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 border border-white/20 bg-white cursor-pointer flex flex-col h-[460px]"
                  >
                    {/* Background Educator Image */}
                    <div className="absolute inset-0 z-0 overflow-hidden">
                      <img
                        src={course.image}
                        alt={course.titleLines.join(' ')}
                        className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                      />
                    </div>

                    {/* Gradient Vignette Overlay for Text Legibility */}
                    <div className="absolute inset-0 card-vignette z-10 pointer-events-none" />

                    {/* Card Body Content */}
                    <div className="relative z-20 flex flex-col h-full justify-end items-center text-center px-4 pb-4 mt-auto">
                      <h3 className="text-white font-['Manrope'] font-extrabold text-[24px] md:text-[25px] leading-tight uppercase drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] tracking-wide mb-1">
                        {course.titleLines.map((line, i) => (
                          <React.Fragment key={i}>
                            {line}
                            {i < course.titleLines.length - 1 && <br />}
                          </React.Fragment>
                        ))}
                      </h3>
                      <p className="text-white/90 text-[13px] font-medium tracking-wide drop-shadow-sm mb-3.5 line-clamp-1">
                        {course.subtitle}
                      </p>

                      {/* Duration Badge */}
                      <div className="inline-flex items-center justify-center gap-1.5 bg-white text-[#24389c] font-bold text-[13px] px-4 py-1.5 rounded-xl shadow-md border border-white/40 mb-3">
                        <span className="material-symbols-outlined text-[17px] text-[#24389c]">
                          schedule
                        </span>
                        <span>{course.duration}</span>
                      </div>
                    </div>

                    {/* Bottom Vibrant Gradient Ribbon */}
                    <div className="relative z-20 w-full py-3 px-4 card-ribbon-vibrant text-white text-center flex items-center justify-center gap-2 border-t border-white/30 rounded-b-3xl">
                      <span className="material-symbols-outlined text-[17px] text-white drop-shadow">
                        auto_awesome
                      </span>
                      <span className="font-extrabold text-[12px] md:text-[13px] tracking-widest uppercase drop-shadow">
                        {course.badge}
                      </span>
                      <span className="material-symbols-outlined text-[17px] text-white drop-shadow">
                        auto_awesome
                      </span>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-20 text-center flex flex-col items-center justify-center bg-white rounded-3xl border border-[#c5c5d4]/40 p-12 max-w-lg mx-auto shadow-sm"
              >
                <div className="w-16 h-16 rounded-full bg-[#24389c]/10 text-[#24389c] flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-3xl">search_off</span>
                </div>
                <h3 className="font-['Manrope'] text-xl font-bold text-[#191c1e] mb-2">
                  No courses found
                </h3>
                <p className="text-sm text-[#454652] mb-6">
                  We couldn't find any courses matching "{searchQuery}". Try searching for another skill or reset filters.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setActiveCategory('All Courses');
                  }}
                  className="bg-[#24389c] text-white px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-[#3f51b5] transition-colors"
                >
                  Reset Filters
                </button>
              </motion.div>
            )}
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
            <button className="bg-[#24389c] hover:bg-[#3f51b5] text-white font-semibold text-xs md:text-sm px-5 md:px-6 py-2.5 md:py-3 rounded-full transition-all shadow-md flex items-center gap-2 flex-shrink-0 group">
              Become A Member
              <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">
                arrow_forward
              </span>
            </button>
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
                <span className="material-symbols-outlined text-[#24389c] text-3xl" style={{ fontVariationSettings: '"FILL" 1' }}>
                  check_circle
                </span>
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
                <li><a href="#" className="hover:text-[#24389c] transition-colors">About Us</a></li>
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
            <p>© 2024 ELEVATE. All rights reserved.</p>
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
