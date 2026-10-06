import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const STATS = [
  { value: '50k+', label: 'Active Members' },
  { value: '120+', label: 'Cities Reached' },
  { value: '500+', label: 'Events Hosted' },
];

const VALUE_PROPS = [
  {
    icon: 'groups',
    title: 'Build Connections',
    desc: 'Join a community built for learning, interaction and growth. Network with peers and mentors who share your drive.',
  },
  {
    icon: 'event',
    title: 'Invite-Only Events',
    desc: 'Participate in virtual and offline events, workshops, and exclusive networking sessions curated for members.',
  },
  {
    icon: 'diamond',
    title: 'Get Recognized',
    desc: 'Earn rewards, recognition, and stand out among your peers through our monthly leadership boards and community highlights.',
  },
  {
    icon: 'work',
    title: 'Get Opportunities',
    desc: 'Access exclusive freelancing gigs, job postings, and collaboration opportunities shared directly by community members.',
  },
];

const COMMUNITY_PILLARS = [
  {
    icon: 'workspace_premium',
    title: 'Monthly Recognition',
    desc: 'Top learners on the leaderboard get public recognition and exclusive invites to advanced sessions.',
  },
  {
    icon: 'forum',
    title: 'Community Sessions',
    desc: 'Join 1:1 or group sessions, participate in AMAs, and host challenges with fellow learners globally.',
  },
  {
    icon: 'handshake',
    title: 'Engagement Drives',
    desc: 'Active community interaction, daily tasks, and monthly collaborative challenges to earn platform points.',
  },
];

const GALLERY_IMAGES = [
  {
    src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA9EHfXuy90mh4m78mTLAC9pvHjOLf8o68fOFAmQ050eo_05K8WoO0znj2BhLKgnih_wDcF4RxPS3FlMQA1FxEJXsbYHsppeeTlkwhF3jDUzdD9wGAcJDkhEWFLvPOO2Ic_tP8Y0z-j7qtKlaW9xsztHQJ6fehqgflQwAZiOZmB6zUDL8NHkLcF_I-ySTRKEBqkAZ_OaXpktzQ9e4btz8YJc751MyH7yOKmYP6iqxXXUFEssjbQJugwKA',
    alt: 'Young professionals collaborating in a modern workspace',
  },
  {
    src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDGBX0OYDC75YU_eR1orYuxQifQ78FPHNUq3jM3tRTQt6GTvm6VsYHWo_ailImfs1kA5GfQKwiDGYMU21ffq2WvgwWeeFULl5O-2SZZZ9lgL5J3MBJE-vx2TsLXLojmYGEvrLt9lDtOriOTrDIfgmdVXVOs5JJoRkwHS_ApvPiFtyeuX1nzzCp_nbwzoVY48U9R5eL8xLUum7dYHIb5N4xhOx99RdvcwaJnDSiiBQn60Qo0nmPN02Ulsg',
    alt: 'Community group photo at an outdoor meetup',
  },
  {
    src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBVeryjLQwHO_VhvLY03lOntujULoZdnpo1q0Ui4slrjFv4M9XFHzy46WZzOOEwkNot0rjvaqaCdfVy5v5nSIyPwRvHr9nWZmsRUqrnA2y-6AiMgT6XU9j0C_yTerhtwfDPiI6NZzICpgkEyIXGMUlx_GVYzm-YJqcEGSGxzhmwDEAXhzB_BViCT-tfQeGaoL-Dm2s9rsejRQHtPo5TCZqDlzyOCRoztLoDu-hV1fRumjS1zsvMYIOHMQ',
    alt: 'Smiling graduate celebrating achievement',
  },
  {
    src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBCZEpstlui0XuqNQl1FrKL6Lk7zyuRZuKfYcH2dYvrzcK0wiajcpIQSSAzuLyq7508sLy2mRyM7D0a9wmauVKszGwezuI17Oo8kPZuc8l2NaVrVwSLU0c9BOJ9JsbP_B8NFiw9qgCLwzxrq_7F4xk4WGS-dxBafClNrY56tO3YIGUT61V1Xt4x82y6LuBICg6ZTi8alZQl4UMWRI9KZlSfH9oqlGMSPG5HJ1HJky1nj_FYBAF4yu8egw',
    alt: 'Interactive workshop presentation and discussion',
  },
];

const Community = () => {
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  const handleNextPhoto = () => {
    setActivePhotoIndex((prev) => (prev + 1) % GALLERY_IMAGES.length);
  };

  const handlePrevPhoto = () => {
    setActivePhotoIndex((prev) => (prev - 1 + GALLERY_IMAGES.length) % GALLERY_IMAGES.length);
  };

  return (
    <div className="bg-[#f7f9fc] text-[#191c1e] min-h-screen flex flex-col font-['Inter'] antialiased selection:bg-primary/20 selection:text-primary">
      {/* Top Navigation Bar */}
      <header className="bg-white/95 backdrop-blur-md border-b border-[#c5c5d4]/40 sticky top-0 z-50">
        <div className="max-w-[1280px] mx-auto px-6 md:px-12 py-4 flex justify-between items-center">
          <Link
            to="/"
            className="text-2xl font-extrabold text-[#24389c] flex items-center gap-2 font-['Manrope'] tracking-tight hover:opacity-90 transition-opacity"
          >
            <span
              className="material-symbols-outlined text-[#24389c] text-3xl"
              style={{ fontVariationSettings: '"FILL" 1' }}
            >
              check_circle
            </span>
            ELEVATE
          </Link>

          <nav className="hidden md:flex items-center gap-8 font-medium">
            <Link
              to="/courses"
              className="text-[#454652] hover:text-[#24389c] text-sm transition-colors flex items-center gap-1"
            >
              Courses
              <span className="material-symbols-outlined text-[18px]">expand_more</span>
            </Link>
            <Link
              to="/community"
              className="text-[#24389c] font-semibold text-sm transition-colors border-b-2 border-[#24389c] pb-0.5"
            >
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
        {/* Hero Section */}
        <section className="relative pt-20 pb-24 overflow-hidden bg-[#f7f9fc]">
          <div className="max-w-[1280px] mx-auto px-6 md:px-12 text-center relative z-10">
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="font-['Manrope'] font-extrabold text-3xl md:text-5xl lg:text-[54px] text-[#191c1e] leading-[1.2] tracking-tight max-w-4xl mx-auto mb-6"
            >
              The Smartest Community for the{' '}
              <span className="text-[#24389c] block sm:inline">Smartest People!</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="text-base md:text-lg text-[#454652] max-w-2xl mx-auto mb-10 leading-relaxed"
            >
              Join a network of driven individuals, expert mentors, and lifelong learners.
              Elevate your career with real connections that drive real impact.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex justify-center"
            >
              <button className="bg-[#24389c] hover:bg-[#3f51b5] text-white font-semibold text-base px-8 py-4 rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center gap-2 group">
                Become a Member
                <span className="material-symbols-outlined text-[20px] group-hover:translate-x-1 transition-transform" style={{ fontVariationSettings: "'FILL' 1" }}>
                  arrow_forward
                </span>
              </button>
            </motion.div>
          </div>

          {/* Decorative Background Glows */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 opacity-30 pointer-events-none">
            <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-[#3f51b5]/30 rounded-full mix-blend-multiply filter blur-3xl" />
            <div className="absolute top-[20%] left-[-10%] w-72 h-72 bg-[#959efd]/30 rounded-full mix-blend-multiply filter blur-3xl" />
            <div className="absolute bottom-[-20%] left-[20%] w-80 h-80 bg-[#bac3ff]/30 rounded-full mix-blend-multiply filter blur-3xl" />
          </div>
        </section>

        {/* Stats Section */}
        <section className="pb-20 max-w-[1280px] mx-auto px-6 md:px-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {STATS.map((stat, idx) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className="bg-[#eceef1] rounded-2xl p-8 text-center shadow-sm hover:shadow-md transition-shadow border border-[#e0e3e6]/60"
              >
                <div className="font-['Manrope'] font-extrabold text-4xl md:text-5xl text-[#24389c] mb-2 tracking-tight">
                  {stat.value}
                </div>
                <div className="text-sm md:text-base font-semibold text-[#454652]">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* The ELEVATE Community Value Props */}
        <section className="py-20 bg-white border-y border-[#e6e8eb]">
          <div className="max-w-[1280px] mx-auto px-6 md:px-12">
            <div className="text-center mb-16">
              <h2 className="font-['Manrope'] font-bold text-3xl md:text-4xl text-[#191c1e] mb-3">
                The ELEVATE Community
              </h2>
              <p className="text-base md:text-lg text-[#454652]">
                Everything you need to grow, connect, and succeed.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {VALUE_PROPS.map((prop, idx) => (
                <motion.div
                  key={prop.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                  whileHover={{ y: -4 }}
                  className="flex gap-6 items-start p-8 rounded-2xl border border-[#c5c5d4]/50 bg-[#f7f9fc] hover:shadow-lg transition-all"
                >
                  <div className="flex-shrink-0 w-16 h-16 bg-[#3f51b5] text-white rounded-xl flex items-center justify-center shadow-md">
                    <span
                      className="material-symbols-outlined text-3xl"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      {prop.icon}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-['Manrope'] font-bold text-xl text-[#191c1e] mb-2">
                      {prop.title}
                    </h3>
                    <p className="text-sm md:text-base text-[#454652] leading-relaxed">
                      {prop.desc}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Real Connections. Real Impact. (Gallery Section) */}
        <section className="py-20 max-w-[1280px] mx-auto px-6 md:px-12">
          <div className="flex justify-between items-end mb-10">
            <div>
              <h2 className="font-['Manrope'] font-bold text-3xl md:text-4xl text-[#191c1e] mb-2">
                Real Connections. Real Impact.
              </h2>
              <p className="text-base text-[#454652]">
                Glimpses from our offline meetups and networking events.
              </p>
            </div>
            <div className="hidden md:flex gap-3">
              <button
                onClick={handlePrevPhoto}
                className="w-12 h-12 rounded-full bg-[#eceef1] hover:bg-[#e0e3e6] text-[#191c1e] flex items-center justify-center transition-colors shadow-sm"
                aria-label="Previous image"
              >
                <span className="material-symbols-outlined">arrow_back</span>
              </button>
              <button
                onClick={handleNextPhoto}
                className="w-12 h-12 rounded-full bg-[#eceef1] hover:bg-[#e0e3e6] text-[#191c1e] flex items-center justify-center transition-colors shadow-sm"
                aria-label="Next image"
              >
                <span className="material-symbols-outlined">arrow_forward</span>
              </button>
            </div>
          </div>

          {/* Bento Asymmetric Photo Mosaic */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 min-h-[560px]">
            {/* Left Large Vertical Photo */}
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="md:col-span-5 h-[420px] md:h-full rounded-2xl overflow-hidden relative group shadow-md"
            >
              <img
                src={GALLERY_IMAGES[0].src}
                alt={GALLERY_IMAGES[0].alt}
                className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </motion.div>

            {/* Right Sub-grid */}
            <div className="md:col-span-7 flex flex-col gap-6">
              {/* Top Wide Photo */}
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="h-[240px] md:h-[260px] rounded-2xl overflow-hidden relative group shadow-md"
              >
                <img
                  src={GALLERY_IMAGES[1].src}
                  alt={GALLERY_IMAGES[1].alt}
                  className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </motion.div>

              {/* Bottom 2 Split Photos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 h-[240px] md:h-[260px]">
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="rounded-2xl overflow-hidden relative group shadow-md h-full"
                >
                  <img
                    src={GALLERY_IMAGES[2].src}
                    alt={GALLERY_IMAGES[2].alt}
                    className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                  className="rounded-2xl overflow-hidden relative group shadow-md h-full"
                >
                  <img
                    src={GALLERY_IMAGES[3].src}
                    alt={GALLERY_IMAGES[3].alt}
                    className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </motion.div>
              </div>
            </div>
          </div>
        </section>

        {/* The Community Never Sleeps */}
        <section className="py-20 bg-[#f7f9fc]">
          <div className="max-w-[1280px] mx-auto px-6 md:px-12 text-center">
            <h2 className="font-['Manrope'] font-bold text-3xl md:text-4xl text-[#191c1e] mb-14">
              The Community Never Sleeps
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {COMMUNITY_PILLARS.map((pillar, idx) => (
                <motion.div
                  key={pillar.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                  whileHover={{ y: -6 }}
                  className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-lg transition-all border border-[#c5c5d4]/40 flex flex-col items-center"
                >
                  <div className="w-14 h-14 rounded-2xl bg-[#24389c]/10 text-[#24389c] flex items-center justify-center mb-6">
                    <span className="material-symbols-outlined text-3xl">
                      {pillar.icon}
                    </span>
                  </div>
                  <h3 className="font-['Manrope'] font-bold text-xl text-[#191c1e] mb-3">
                    {pillar.title}
                  </h3>
                  <p className="text-sm md:text-base text-[#454652] leading-relaxed">
                    {pillar.desc}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
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
              Become An ELEVATE Member
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
                <span
                  className="material-symbols-outlined text-[#24389c] text-3xl"
                  style={{ fontVariationSettings: '"FILL" 1' }}
                >
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

export default Community;
