import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import mainLogo from '../assets/main_logo.png';
import Navbar from '../components/Navbar';

const CAREER_TRACKS = [
  {
    id: 1,
    track: 'Track 01',
    title: 'Software Engineer',
    description: 'Build and maintain scalable software applications across domains.',
    salary: '₹5–12 LPA',
    demand: 'Very High demand',
    category: 'Web Development',
    badgeColor: 'bg-[#d9dff5] text-[#5c6274]',
  },
  {
    id: 2,
    track: 'Track 03',
    title: 'Data Scientist',
    description: 'Extract insights from data using statistics and machine learning.',
    salary: '₹7–15 LPA',
    demand: 'High demand',
    category: 'AI & Data Science',
    badgeColor: 'bg-[#5a616f] text-[#d6dced]',
  },
  {
    id: 3,
    track: 'Track 03',
    title: 'Machine Learning Engineer',
    description: 'Build and deploy production-ready ML models.',
    salary: '₹8–18 LPA',
    demand: 'High demand',
    category: 'AI & Data Science',
    badgeColor: 'bg-[#5a616f] text-[#d6dced]',
  },
  {
    id: 4,
    track: 'Track 02',
    title: 'DevOps Engineer',
    description: 'Automate and optimize software delivery pipelines.',
    salary: '₹7–15 LPA',
    demand: 'High demand',
    category: 'Cloud Computing',
    badgeColor: 'bg-[#d9dff5] text-[#5c6274]',
  },
  {
    id: 5,
    track: 'Track 04',
    title: 'Cloud Engineer',
    description: 'Design, implement and manage cloud infrastructure.',
    salary: '₹6–14 LPA',
    demand: 'High demand',
    category: 'Cloud Computing',
    badgeColor: 'bg-[#4353cf] text-[#d8daff]',
  },
  {
    id: 6,
    track: 'Track 02',
    title: 'Python Developer',
    description: 'Develop backend services, automation scripts, and data applications.',
    salary: '₹5–12 LPA',
    demand: 'High demand',
    category: 'Web Development',
    badgeColor: 'bg-[#d9dff5] text-[#5c6274]',
  },
  {
    id: 7,
    track: 'Track 05',
    title: 'Frontend Developer',
    description: 'Create beautiful and responsive user interfaces.',
    salary: '₹4–11 LPA',
    demand: 'High demand',
    category: 'Web Development',
    badgeColor: 'bg-[#d9dff5] text-[#5c6274]',
  },
  {
    id: 8,
    track: 'Track 06',
    title: 'Android Developer',
    description: 'Develop native Android mobile applications.',
    salary: '₹5–12 LPA',
    demand: 'Medium-High demand',
    category: 'Mobile Apps',
    badgeColor: 'bg-[#4353cf] text-[#d8daff]',
  },
  {
    id: 9,
    track: 'Track 03',
    title: 'AI Engineer',
    description: 'Develop and deploy AI-powered applications.',
    salary: '₹9–20 LPA',
    demand: 'Very High demand',
    category: 'AI & Data Science',
    badgeColor: 'bg-[#5a616f] text-[#d6dced]',
  },
  {
    id: 10,
    track: 'Track 09',
    title: 'UI/UX Designer',
    description: 'Design intuitive and beautiful user experiences.',
    salary: '₹5–12 LPA',
    demand: 'High demand',
    category: 'UI/UX Design',
    badgeColor: 'bg-[#d9dff5] text-[#5c6274]',
  },
];

const POPULAR_TRACKS = [
  'AI & Data Science',
  'Web Development',
  'Cloud Computing',
  'Mobile Apps',
  'Cybersecurity',
  'UI/UX Design',
];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const cardVariant = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.3 } },
};

const CareerRoadmaps = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState(null);

  const filteredTracks = useMemo(() => {
    return CAREER_TRACKS.filter((track) => {
      const matchesSearch =
        searchQuery === '' ||
        track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        track.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = !activeCategory || track.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, activeCategory]);

  return (
    <div className="bg-[#f7f9fc] text-[#191c1e] min-h-screen flex flex-col font-['Inter'] antialiased selection:bg-[#4353cf]/20 selection:text-[#4353cf]">
      {/* Top Navigation Bar */}
      <Navbar />

      {/* Main Content */}
      <main className="flex-grow pt-20">
        <div className="max-w-[1280px] mx-auto px-6 md:px-12 py-8 md:py-12">
          {/* Breadcrumbs */}
          <motion.nav
            aria-label="Breadcrumb"
            className="mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            <ol className="flex items-center space-x-2 text-sm text-[#575e70]">
              <li><Link to="/" className="hover:text-[#24389c] transition-colors">Home</Link></li>
              <li><span className="material-symbols-outlined text-sm">chevron_right</span></li>
              <li aria-current="page" className="text-[#191c1e] font-semibold">Career roadmaps</li>
            </ol>
          </motion.nav>

          {/* Hero Section */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center mb-12 pb-12 border-b border-[#e1e3e4]">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
              className="max-w-2xl"
            >
              <motion.h1
                variants={fadeUp}
                className="text-4xl md:text-[48px] font-bold text-[#191c1e] mb-4 leading-[1.15] tracking-tight font-['Hanken_Grotesk']"
              >
                Career roadmaps for India
              </motion.h1>
              <motion.p variants={fadeUp} className="text-base text-[#454654] mb-8 max-w-lg leading-relaxed">
                Browse comprehensive, industry-aligned career roadmaps designed to guide your learning and accelerate your professional growth in tech.
              </motion.p>
              <motion.div variants={fadeUp} className="relative w-full max-w-sm group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-[#575e70] group-focus-within:text-[#24389c] transition-colors">search</span>
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#f3f4f5] border border-[#c6c5d6] rounded-xl py-3 pl-12 pr-6 text-base text-[#191c1e] focus:outline-none focus:border-[#24389c] focus:ring-2 focus:ring-[#4353cf]/30 transition-all placeholder:text-[#757685]"
                  placeholder="Search career paths..."
                />
              </motion.div>
            </motion.div>

            {/* Popular Tracks Panel */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
              className="hidden md:flex flex-col gap-4 p-8 bg-[#f3f4f5] rounded-2xl border border-[#c6c5d6]/30"
            >
              <div className="flex items-center gap-2 text-[#24389c]">
                <span className="material-symbols-outlined text-base">trending_up</span>
                <span className="text-xs font-semibold uppercase tracking-[0.05em] font-['Geist']">Popular Tracks</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {POPULAR_TRACKS.map((track) => (
                  <button
                    key={track}
                    onClick={() => setActiveCategory(activeCategory === track ? null : track)}
                    className={`px-4 py-2 rounded-full text-sm transition-all duration-200 border ${
                      activeCategory === track
                        ? 'bg-[#24389c] text-white border-[#24389c] shadow-md'
                        : 'bg-white border-[#c6c5d6] text-[#191c1e] hover:border-[#24389c] hover:text-[#24389c]'
                    }`}
                  >
                    {track}
                  </button>
                ))}
              </div>
              <p className="text-sm text-[#454654] mt-2">Join 50,000+ learners following these paths today.</p>
            </motion.div>
          </section>

          {/* Listing Section */}
          <section aria-label="Career Roadmap Tracks">
            <div className="flex justify-between items-center mb-8">
              <span className="text-sm text-[#575e70]">
                Showing {filteredTracks.length} curated tech path{filteredTracks.length !== 1 ? 's' : ''}
              </span>
              {activeCategory && (
                <button
                  onClick={() => setActiveCategory(null)}
                  className="text-sm text-[#24389c] hover:underline flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-base">close</span>
                  Clear filter
                </button>
              )}
            </div>

            {/* Career Track Cards Grid */}
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              layout
            >
              <AnimatePresence mode="popLayout">
                {filteredTracks.map((track) => (
                  <motion.a
                    key={track.id}
                    href="#"
                    variants={cardVariant}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    layout
                    className="group flex flex-col bg-[#f8f9fa] border border-[#e1e3e4] hover:border-[#24389c] rounded-xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="material-symbols-outlined text-[#24389c]">arrow_forward</span>
                    </div>
                    <div className="mb-6">
                      <span className={`inline-block text-xs font-semibold tracking-[0.05em] uppercase px-3 py-1 rounded-full mb-3 ${track.badgeColor}`}>
                        {track.track}
                      </span>
                      <h3 className="text-xl font-semibold text-[#191c1e] mb-2 group-hover:text-[#24389c] transition-colors font-['Hanken_Grotesk']">
                        {track.title}
                      </h3>
                      <p className="text-sm text-[#454654] leading-relaxed line-clamp-2">
                        {track.description}
                      </p>
                    </div>
                    <div className="mt-auto pt-4 border-t border-[#e1e3e4] flex justify-between items-center">
                      <span className="text-sm font-semibold text-[#191c1e]">{track.salary}</span>
                      <span className="text-sm text-[#24389c] flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">trending_up</span>
                        {track.demand}
                      </span>
                    </div>
                  </motion.a>
                ))}
              </AnimatePresence>
            </motion.div>

            {filteredTracks.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-20"
              >
                <span className="material-symbols-outlined text-6xl text-[#c6c5d6] mb-4 block">search_off</span>
                <p className="text-lg text-[#454654] mb-2">No career paths found</p>
                <p className="text-sm text-[#757685]">Try adjusting your search or filter criteria.</p>
              </motion.div>
            )}
          </section>

          {/* CTA Section */}
          <motion.section
            className="mt-16 pt-12 border-t border-[#e1e3e4]"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="bg-[#4353cf] rounded-2xl p-12 md:p-24 flex flex-col items-center text-center max-w-4xl mx-auto shadow-lg relative overflow-hidden">
              {/* Glassmorphism accent */}
              <div
                className="absolute inset-0 opacity-20 pointer-events-none"
                style={{ background: 'radial-gradient(circle at 100% 0%, #ffffff 0%, transparent 50%)' }}
              />
              <h2 className="text-2xl md:text-[32px] font-semibold text-[#d8daff] mb-4 relative z-10 leading-[1.25] font-['Hanken_Grotesk']">
                Find your best-fit career path
              </h2>
              <p className="text-base text-[#d8daff]/90 max-w-lg mb-8 relative z-10 leading-relaxed">
                Take ELEVATE career assessments and explore personalized paths matched to your profile and goals.
              </p>
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-2 bg-white text-[#24389c] font-semibold rounded-full px-8 py-3 hover:bg-[#f7f9fc] transition-all shadow-sm relative z-10"
              >
                Explore career paths
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </motion.button>
            </div>
          </motion.section>
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

export default CareerRoadmaps;
