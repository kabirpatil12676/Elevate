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
    description: 'Build and maintain scalable software applications across domains from fundamental logic to cloud scale.',
    salary: '₹5–12 LPA',
    demand: 'Very High demand',
    category: 'Web Development',
    badgeColor: 'bg-[#dce2f7] text-[#141b2b]',
    link: '/career-roadmaps/software-engineer',
  },
  {
    id: 2,
    track: 'Track 03',
    title: 'Data Scientist',
    description: 'Extract actionable insights from data using advanced statistics, analytics, and predictive modeling.',
    salary: '₹7–15 LPA',
    demand: 'High demand',
    category: 'AI & Data Science',
    badgeColor: 'bg-[#dfe0ff] text-[#2435b4]',
    link: '/career-roadmaps/data-scientist',
  },
  {
    id: 3,
    track: 'Track 03',
    title: 'Machine Learning Engineer',
    description: 'Build, train, and deploy production-ready machine learning models and deep neural networks.',
    salary: '₹8–18 LPA',
    demand: 'High demand',
    category: 'AI & Data Science',
    badgeColor: 'bg-[#dfe0ff] text-[#2435b4]',
    link: '/career-roadmaps/machine-learning-engineer',
  },
  {
    id: 4,
    track: 'Track 02',
    title: 'DevOps Engineer',
    description: 'Automate deployment pipelines, optimize cloud infrastructure, and manage high-reliability systems.',
    salary: '₹7–15 LPA',
    demand: 'High demand',
    category: 'Cloud Computing',
    badgeColor: 'bg-[#dce2f7] text-[#141b2b]',
    link: '/career-roadmaps/devops-engineer',
  },
  {
    id: 5,
    track: 'Track 04',
    title: 'Cloud Engineer',
    description: 'Design, implement, secure, and manage scalable cloud architectures across AWS and Azure.',
    salary: '₹6–14 LPA',
    demand: 'High demand',
    category: 'Cloud Computing',
    badgeColor: 'bg-[#dce2f7] text-[#141b2b]',
    link: '/career-roadmaps/cloud-engineer',
  },
  {
    id: 6,
    track: 'Track 02',
    title: 'Python Developer',
    description: 'Develop high-performance backend services, automation scripts, and analytical web applications.',
    salary: '₹5–12 LPA',
    demand: 'High demand',
    category: 'Web Development',
    badgeColor: 'bg-[#dce2f7] text-[#141b2b]',
    link: '/career-roadmaps/python-developer',
  },
  {
    id: 7,
    track: 'Track 05',
    title: 'Frontend Developer',
    description: 'Create responsive, high-fidelity, and accessible user interfaces using modern React and TypeScript.',
    salary: '₹4–11 LPA',
    demand: 'High demand',
    category: 'Web Development',
    badgeColor: 'bg-[#dce2f7] text-[#141b2b]',
    link: '/career-roadmaps/frontend-developer',
  },
  {
    id: 8,
    track: 'Track 06',
    title: 'Android Developer',
    description: 'Develop modern native Android mobile applications with Kotlin, Jetpack Compose, and clean architecture.',
    salary: '₹5–12 LPA',
    demand: 'Medium-High demand',
    category: 'Mobile Apps',
    badgeColor: 'bg-[#dce2f7] text-[#141b2b]',
    link: '/career-roadmaps/android-developer',
  },
  {
    id: 9,
    track: 'Track 03',
    title: 'AI Engineer',
    description: 'Develop and deploy cutting-edge generative AI, LLM pipelines, and computer vision systems.',
    salary: '₹9–20 LPA',
    demand: 'Very High demand',
    category: 'AI & Data Science',
    badgeColor: 'bg-[#dfe0ff] text-[#2435b4]',
    link: '/career-roadmaps/ai-engineer',
  },
  {
    id: 10,
    track: 'Track 09',
    title: 'UI/UX Designer',
    description: 'Design intuitive wireframes, comprehensive design systems, and beautiful modern user experiences.',
    salary: '₹5–12 LPA',
    demand: 'High demand',
    category: 'UI/UX Design',
    badgeColor: 'bg-[#dce2f7] text-[#141b2b]',
    link: '/career-roadmaps/ui-ux-designer',
  },
];

const POPULAR_TRACKS = [
  'AI & Data Science',
  'Web Development',
  'Cloud Computing',
  'Mobile Apps',
  'UI/UX Design',
];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
};

const cardVariant = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.2 } },
};

export default function CareerRoadmaps() {
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
    <div className="bg-[#ffffff] text-[#191c1d] min-h-screen flex flex-col font-['Inter'] antialiased">
      {/* Top Navigation Bar - Exact same standard component as other pages */}
      <Navbar />

      <main className="flex-grow pt-24 pb-20">
        <div className="max-w-[1280px] mx-auto px-6 md:px-12">
          {/* Breadcrumb Navigation */}
          <nav aria-label="Breadcrumb" className="mb-8">
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
              <li aria-current="page" className="text-[#191c1d] font-semibold">
                Career roadmaps
              </li>
            </ol>
          </nav>

          {/* Hero Section */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center mb-14 pb-12 border-b border-[#e1e3e4] relative">
            <motion.div
              className="max-w-2xl relative z-10"
              initial="hidden"
              animate="visible"
              variants={fadeUp}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#eef2ff] border border-[#c7d2fe] text-[#4353cf] text-xs font-bold uppercase tracking-wider mb-4">
                <span className="material-symbols-outlined text-sm">school</span>
                <span>Verified Curriculum</span>
              </div>
              <h1 className="text-3xl md:text-5xl font-bold text-[#191c1d] mb-4 tracking-tight font-['Hanken_Grotesk'] leading-[1.15]">
                Career roadmaps for India
              </h1>
              <p className="text-base text-[#454654] mb-8 max-w-lg leading-relaxed">
                Browse comprehensive, industry-aligned career roadmaps designed to guide your learning and accelerate your professional growth in tech.
              </p>

              {/* Search Bar */}
              <div className="relative w-full max-w-md group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-[#757685] group-focus-within:text-[#4353cf] transition-colors">
                    search
                  </span>
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search career paths (e.g. SDE, AI, DevOps)..."
                  className="w-full bg-[#f8f9fa] border border-[#e1e3e4] rounded-xl py-3 pl-12 pr-4 text-sm text-[#191c1d] placeholder:text-[#757685] focus:outline-none focus:border-[#4353cf] focus:ring-2 focus:ring-[#4353cf]/20 transition-all shadow-sm"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#757685] hover:text-[#191c1d]"
                  >
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                )}
              </div>
            </motion.div>

            {/* Popular Tracks Box */}
            <motion.div
              className="hidden md:flex flex-col gap-4 p-6 bg-[#f8f9fa] rounded-2xl border border-[#e1e3e4]"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="flex items-center gap-2 text-[#4353cf]">
                <span className="material-symbols-outlined text-base">trending_up</span>
                <span className="text-xs font-bold uppercase tracking-widest font-['Hanken_Grotesk']">
                  Popular Tracks
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setActiveCategory(null)}
                  className={`px-4 py-2 rounded-full text-xs font-medium transition-all ${
                    activeCategory === null
                      ? 'bg-[#4353cf] text-white shadow-sm'
                      : 'bg-white border border-[#e1e3e4] text-[#454654] hover:border-[#4353cf] hover:text-[#4353cf]'
                  }`}
                >
                  All Tracks
                </button>
                {POPULAR_TRACKS.map((track) => (
                  <button
                    key={track}
                    onClick={() => setActiveCategory(activeCategory === track ? null : track)}
                    className={`px-4 py-2 rounded-full text-xs font-medium transition-all ${
                      activeCategory === track
                        ? 'bg-[#4353cf] text-white shadow-sm'
                        : 'bg-white border border-[#e1e3e4] text-[#454654] hover:border-[#4353cf] hover:text-[#4353cf]'
                    }`}
                  >
                    {track}
                  </button>
                ))}
              </div>
              <p className="text-xs text-[#757685] mt-1">
                Join 50,000+ Indian engineers following these structured roadmaps today.
              </p>
            </motion.div>
          </section>

          {/* Listing Section */}
          <section aria-label="Career Roadmap Samples">
            <div className="flex justify-between items-center mb-6">
              <span className="text-sm font-medium text-[#575e70]">
                Showing {filteredTracks.length} curated tech {filteredTracks.length === 1 ? 'path' : 'paths'}
              </span>
              {activeCategory && (
                <button
                  onClick={() => setActiveCategory(null)}
                  className="text-xs text-[#4353cf] hover:underline flex items-center gap-1 font-semibold"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                  Clear filter ({activeCategory})
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
                  <motion.div
                    key={track.id}
                    variants={cardVariant}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    layout
                  >
                    <Link
                      to={track.link}
                      className="group flex flex-col bg-[#f8f9fa] border border-[#e1e3e4] hover:border-[#4353cf] rounded-xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg relative overflow-hidden h-full"
                    >
                      <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="material-symbols-outlined text-[#4353cf]">arrow_forward</span>
                      </div>
                      <div className="mb-6">
                        <span className={`inline-block text-xs font-semibold tracking-wide uppercase px-3 py-1 rounded-full mb-3 ${track.badgeColor}`}>
                          {track.track}
                        </span>
                        <h3 className="text-xl font-bold text-[#191c1e] mb-2 group-hover:text-[#4353cf] transition-colors font-['Hanken_Grotesk']">
                          {track.title}
                        </h3>
                        <p className="text-sm text-[#454654] leading-relaxed line-clamp-2">
                          {track.description}
                        </p>
                      </div>
                      <div className="mt-auto pt-4 border-t border-[#e1e3e4] flex justify-between items-center text-xs">
                        <span className="font-semibold text-[#191c1e] text-sm">{track.salary}</span>
                        <span className="text-[#4353cf] flex items-center gap-1 font-semibold">
                          <span className="material-symbols-outlined text-sm">trending_up</span>
                          {track.demand}
                        </span>
                      </div>
                    </Link>
                  </motion.div>
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
                <p className="text-lg font-bold text-[#191c1d] mb-2">No career paths found</p>
                <p className="text-sm text-[#757685]">Try adjusting your search query or reset the active filter.</p>
              </motion.div>
            )}
          </section>

          {/* CTA Section - Home Page Blue Gradient Theme */}
          <motion.section
            className="mt-20 pt-12 border-t border-[#e1e3e4]"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="bg-[#4353cf] rounded-3xl p-10 md:p-16 flex flex-col items-center text-center max-w-4xl mx-auto shadow-lg relative overflow-hidden">
              {/* Glassmorphic decorative ambient accent */}
              <div
                className="absolute inset-0 opacity-20 pointer-events-none"
                style={{ background: 'radial-gradient(circle at 100% 0%, #ffffff 0%, transparent 60%)' }}
              />
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/15 text-[#d8daff] text-xs font-bold uppercase tracking-wider mb-4 relative z-10 backdrop-blur-sm">
                <span>Personalized Career Guidance</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-4 relative z-10 leading-tight font-['Hanken_Grotesk']">
                Find your best-fit career path
              </h2>
              <p className="text-sm md:text-base text-[#d8daff] max-w-lg mb-8 relative z-10 leading-relaxed font-light">
                Take ELEVATE diagnostic assessments and explore personalized paths matched to your unique background, strengths, and career goals.
              </p>
              <Link to="/diagnostic" className="relative z-10">
                <motion.button
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-2 bg-white text-[#24389c] font-bold rounded-full px-8 py-3.5 hover:bg-[#f7f9fc] transition-all shadow-md text-sm"
                >
                  <span>Take Diagnostic Assessment</span>
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </motion.button>
              </Link>
            </div>
          </motion.section>
        </div>
      </main>

      {/* Standard Elevate Footer */}
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
    </div>
  );
}
