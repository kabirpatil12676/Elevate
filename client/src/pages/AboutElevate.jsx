import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import mainLogo from '../assets/main_logo.png';
import Navbar from '../components/Navbar';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const AboutElevate = () => {
  return (
    <div className="bg-[#f7f9fc] text-[#191c1e] min-h-screen flex flex-col font-['Inter'] antialiased selection:bg-[#4353cf]/20 selection:text-[#4353cf]">
      {/* Top Navigation Bar */}
      <Navbar />

      {/* Main Content */}
      <main className="flex-grow pt-20">
        {/* Hero Section */}
        <section className="relative pt-24 pb-32 overflow-hidden bg-white border-b border-[#e1e3e4]">
          <div className="absolute inset-0 z-0 opacity-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_#4353cf_0%,_transparent_50%)]"></div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_#4353cf_0%,_transparent_50%)]"></div>
          </div>
          <div className="max-w-[1280px] mx-auto px-6 md:px-12 relative z-10 flex flex-col items-center text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#4353cf]/10 text-[#4353cf] text-xs font-semibold uppercase tracking-[0.05em] mb-8 border border-[#4353cf]/20"
            >
              <span className="material-symbols-outlined text-sm">psychology</span>
              <span>OUR PHILOSOPHY</span>
            </motion.div>
            
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl md:text-[48px] font-bold mb-6 max-w-4xl tracking-tight text-[#191c1e] font-['Hanken_Grotesk'] leading-[1.15]"
            >
              Growth Beyond <span className="text-[#4353cf]">Knowledge</span>
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-base md:text-lg text-[#454654] max-w-2xl mb-12 leading-relaxed"
            >
              ELEVATE is an Educator-Led Experiential Pedagogical Model designed for holistic student growth. We bridge the gap between theoretical knowledge and practical life skills.
            </motion.p>
            
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="w-full max-w-5xl rounded-3xl overflow-hidden shadow-2xl border border-[#e1e3e4] aspect-video bg-[#f8f9fa]"
            >
              <img
                alt="Students collaborating"
                className="w-full h-full object-cover"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDXBVj8BpNpNQlrP0qaq-c-bPUM2WF8j5a1PsWC2xbO2qexH4rqtr0nHQnG8S_UsDnaie0TSoJwrnQ3YGnWOgtB686MuucWzwJgpRkq6zD3pYnGZXMzp777Zz_wbMMc8ZVbFQ0rcho1LP1sWJr2jde1J6-QQzvjFUIvjw6szR-Bf0ye0vYpUSruW6JYRHt2XKgO6-EzGcRiM6Td2nOAKMroHphuq7TG4j12Q-L4bagx3_bQo-mzY0K5Ag"
              />
            </motion.div>
          </div>
        </section>

        {/* The ELEVATE Difference */}
        <section className="py-24 bg-[#f7f9fc] border-b border-[#e1e3e4]/50">
          <div className="max-w-[1280px] mx-auto px-6 md:px-12">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={staggerContainer}
              className="text-center max-w-3xl mx-auto mb-16"
            >
              <motion.h2 variants={fadeUp} className="text-3xl md:text-[32px] font-semibold mb-4 text-[#191c1e] font-['Hanken_Grotesk']">
                The ELEVATE Difference
              </motion.h2>
              <motion.p variants={fadeUp} className="text-base text-[#454654]">
                Moving beyond traditional learning management systems to active, experiential growth.
              </motion.p>
            </motion.div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
              {/* Traditional LMS */}
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.6 }}
                className="bg-[#f3f4f5] border border-[#e1e3e4] rounded-3xl p-8 lg:p-12"
              >
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 rounded-full bg-[#e1e3e4] flex items-center justify-center text-[#454654]">
                    <span className="material-symbols-outlined text-2xl">history</span>
                  </div>
                  <h3 className="text-2xl font-semibold text-[#191c1e] font-['Hanken_Grotesk']">Traditional LMS</h3>
                </div>
                <ul className="space-y-6">
                  {[
                    { title: 'Passive Content', desc: 'Focus on reading text and passive absorption.' },
                    { title: 'Videos & Quizzes', desc: 'Standardized testing and one-way lectures.' },
                    { title: 'Static Certificates', desc: 'Generic proof of completion without context.' }
                  ].map((item, idx) => (
                    <li key={idx} className="flex items-start gap-4">
                      <span className="material-symbols-outlined text-[#ba1a1a] mt-1 bg-[#ba1a1a]/10 rounded-full p-1 text-sm">close</span>
                      <div>
                        <h4 className="text-sm font-semibold text-[#191c1e] mb-1">{item.title}</h4>
                        <p className="text-sm text-[#454654]">{item.desc}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </motion.div>

              {/* ELEVATE */}
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="bg-[#4353cf]/5 border border-[#4353cf]/20 rounded-3xl p-8 lg:p-12 relative overflow-hidden shadow-lg shadow-[#4353cf]/5"
              >
                <div className="absolute -right-12 -top-12 w-64 h-64 bg-[#4353cf]/10 rounded-full blur-3xl"></div>
                <div className="flex items-center gap-4 mb-8 relative z-10">
                  <div className="w-12 h-12 rounded-full bg-[#4353cf] text-white flex items-center justify-center shadow-md">
                    <span className="material-symbols-outlined text-2xl">rocket_launch</span>
                  </div>
                  <h3 className="text-2xl font-semibold text-[#4353cf] font-['Hanken_Grotesk']">ELEVATE</h3>
                </div>
                <ul className="space-y-6 relative z-10">
                  {[
                    { title: 'Active Experiential Learning', desc: 'Immersive challenges requiring synthesis.' },
                    { title: 'Activity Challenges', desc: 'Real-world scenarios solving practical problems.' },
                    { title: 'Dynamic Growth Portfolios', desc: 'A comprehensive artifact of individual evolution.' }
                  ].map((item, idx) => (
                    <li key={idx} className="flex items-start gap-4">
                      <span className="material-symbols-outlined text-[#4353cf] mt-1 bg-[#4353cf]/10 rounded-full p-1 text-sm border border-[#4353cf]/20">check</span>
                      <div>
                        <h4 className="text-sm font-semibold text-[#191c1e] mb-1">{item.title}</h4>
                        <p className="text-sm text-[#454654]">{item.desc}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Mission Section */}
        <section className="py-24 bg-[#f7f9fc]">
          <div className="max-w-[1280px] mx-auto px-6 md:px-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.6 }}
              >
                <h2 className="text-3xl md:text-[32px] font-semibold mb-6 text-[#191c1e] font-['Hanken_Grotesk']">The Mission</h2>
                <p className="text-base text-[#454654] mb-6 leading-relaxed">
                  At ELEVATE, our mission is to fundamentally transform how learning is internalized and applied. We recognize a critical gap in traditional education: the disconnect between acquiring technical knowledge and developing the essential real-world life skills necessary to thrive in a complex society.
                </p>
                <p className="text-base text-[#454654] leading-relaxed">
                  We exist to close that gap. By immersing students in experiential challenges that require critical thinking, emotional intelligence, and adaptable problem-solving, we prepare them not just for tests, but for the unpredictable challenges of the modern professional landscape.
                </p>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="relative"
              >
                <div className="absolute inset-0 bg-[#4353cf]/5 rounded-[2rem] transform translate-x-4 translate-y-4"></div>
                <div className="bg-white/70 backdrop-blur-md rounded-3xl p-8 md:p-12 relative z-10 border border-white/40 shadow-xl shadow-black/5">
                  <div className="flex items-center gap-4 mb-10">
                    <div className="w-12 h-12 rounded-full bg-[#4353cf]/10 flex items-center justify-center text-[#4353cf] border border-[#4353cf]/20">
                      <span className="material-symbols-outlined text-2xl">balance</span>
                    </div>
                    <h3 className="text-2xl font-semibold text-[#191c1e] font-['Hanken_Grotesk']">Closing the Gap</h3>
                  </div>
                  
                  <div className="space-y-8">
                    <div className="flex flex-col">
                      <div className="flex justify-between mb-3 items-end">
                        <span className="text-base font-semibold text-[#191c1e]">Technical Knowledge</span>
                        <span className="text-xs font-semibold text-[#4353cf] bg-[#4353cf]/10 px-2 py-1 rounded-md uppercase tracking-wider">Current Focus</span>
                      </div>
                      <div className="h-3 w-full bg-[#edeeef] rounded-full overflow-hidden shadow-inner">
                        <motion.div
                          initial={{ width: 0 }}
                          whileInView={{ width: '85%' }}
                          viewport={{ once: true }}
                          transition={{ duration: 1, delay: 0.5 }}
                          className="h-full bg-[#4353cf]/40 rounded-full relative"
                        >
                          <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-[#4353cf]/30 to-transparent"></div>
                        </motion.div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col">
                      <div className="flex justify-between mb-3 items-end">
                        <span className="text-base font-semibold text-[#191c1e]">Real-World Life Skills</span>
                        <span className="text-xs font-semibold text-[#ba1a1a] bg-[#ba1a1a]/10 px-2 py-1 rounded-md uppercase tracking-wider">The Deficit</span>
                      </div>
                      <div className="h-3 w-full bg-[#edeeef] rounded-full overflow-hidden shadow-inner">
                        <motion.div
                          initial={{ width: 0 }}
                          whileInView={{ width: '35%' }}
                          viewport={{ once: true }}
                          transition={{ duration: 1, delay: 0.5 }}
                          className="h-full bg-[#ba1a1a]/50 rounded-full relative"
                        >
                          <div className="absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-[#ba1a1a]/30 to-transparent"></div>
                        </motion.div>
                      </div>
                    </div>
                    
                    <div className="mt-8 pt-6 border-t border-[#e1e3e4]/50">
                      <p className="text-sm italic text-[#454654] text-center">"Knowledge is power, but application is impact."</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Framework Section */}
        <section className="py-24 bg-white border-y border-[#e1e3e4]/50">
          <div className="max-w-[1280px] mx-auto px-6 md:px-12">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={staggerContainer}
              className="text-center max-w-3xl mx-auto mb-16"
            >
              <motion.h2 variants={fadeUp} className="text-3xl md:text-[32px] font-semibold mb-4 text-[#191c1e] font-['Hanken_Grotesk']">
                The ELEVATE Framework
              </motion.h2>
              <motion.p variants={fadeUp} className="text-base text-[#454654]">
                A structured, six-stage pedagogical journey designed to transform raw information into deeply internalized capability.
              </motion.p>
            </motion.div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { stage: '01', icon: 'search', title: 'EXPLORE', desc: 'Diagnostic baseline assessment to understand starting proficiencies and contextual knowledge gaps.' },
                { stage: '02', icon: 'menu_book', title: 'LEARN', desc: 'Focused learning capsules delivering high-yield theoretical frameworks and essential concepts.' },
                { stage: '03', icon: 'science', title: 'EXPERIENCE', desc: 'Practical activity challenges simulating real-world scenarios to test comprehension through action.' },
                { stage: '04', icon: 'fact_check', title: 'VALIDATE', desc: 'Multi-source feedback combining objective AI analysis with nuanced human expert review.' },
                { stage: '05', icon: 'build', title: 'APPLY', desc: 'Execution of authentic real-world tasks requiring independent synthesis of learned materials.' },
              ].map((item, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                  className="bg-[#f8f9fa] border border-[#e1e3e4] rounded-[2rem] p-8 hover:shadow-lg transition-all duration-300 group hover:-translate-y-1"
                >
                  <div className="w-12 h-12 rounded-2xl bg-[#e7e8e9] flex items-center justify-center text-[#191c1e] mb-6 group-hover:bg-[#4353cf] group-hover:text-white transition-colors shadow-sm">
                    <span className="material-symbols-outlined text-2xl">{item.icon}</span>
                  </div>
                  <h3 className="text-[#4353cf] mb-2 text-xs font-semibold uppercase tracking-wider">Stage {item.stage}</h3>
                  <h4 className="text-lg font-semibold text-[#191c1e] mb-3 font-['Hanken_Grotesk']">{item.title}</h4>
                  <p className="text-sm text-[#454654] leading-relaxed">{item.desc}</p>
                </motion.div>
              ))}
              
              {/* Stage 6 - Highlighted */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="bg-[#4353cf] rounded-[2rem] p-8 shadow-xl shadow-[#4353cf]/20 text-white relative overflow-hidden group hover:-translate-y-1 transition-all duration-300 border border-[#4353cf]/30"
              >
                <div className="absolute -right-12 -top-12 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white mb-6 border border-white/30 shadow-sm">
                  <span className="material-symbols-outlined text-2xl">stars</span>
                </div>
                <h3 className="text-[#bcc2ff] mb-2 text-xs font-semibold uppercase tracking-wider">Stage 06</h3>
                <h4 className="text-lg font-semibold mb-3 font-['Hanken_Grotesk']">TRANSFORM</h4>
                <p className="text-sm text-[#d8daff] leading-relaxed">
                  Culminating in the Growth Portfolio artifact—a tangible demonstration of internalized mastery and personal evolution.
                </p>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Measuring What Matters Section */}
        <section className="py-24 bg-[#f7f9fc]">
          <div className="max-w-[1280px] mx-auto px-6 md:px-12">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={staggerContainer}
              className="text-center max-w-3xl mx-auto mb-16"
            >
              <motion.h2 variants={fadeUp} className="text-3xl md:text-[32px] font-semibold mb-4 text-[#191c1e] font-['Hanken_Grotesk']">
                Measuring What Matters
              </motion.h2>
              <motion.p variants={fadeUp} className="text-base text-[#454654]">
                We track progress across three fundamental dimensions of development.
              </motion.p>
            </motion.div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
              <div className="hidden md:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#e1e3e4] to-transparent -translate-y-1/2 z-0"></div>
              
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="flex flex-col items-center text-center p-10 rounded-3xl bg-[#f8f9fa] border border-[#e1e3e4] shadow-sm relative z-10 hover:shadow-md transition-shadow"
              >
                <div className="w-16 h-16 rounded-full bg-[#4353cf]/10 text-[#4353cf] flex items-center justify-center mb-6 border border-[#4353cf]/20">
                  <span className="material-symbols-outlined text-3xl">lightbulb</span>
                </div>
                <h3 className="text-xl font-bold text-[#191c1e] mb-4 font-['Hanken_Grotesk']">Know</h3>
                <p className="text-base text-[#454654] leading-relaxed">Conceptual Understanding assessed through rigorous diagnostics and knowledge checks.</p>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="flex flex-col items-center text-center p-10 rounded-3xl bg-[#f8f9fa] border border-[#e1e3e4] shadow-sm relative z-10 hover:shadow-md transition-shadow"
              >
                <div className="w-16 h-16 rounded-full bg-[#4353cf]/10 text-[#4353cf] flex items-center justify-center mb-6 border border-[#4353cf]/20">
                  <span className="material-symbols-outlined text-3xl">handyman</span>
                </div>
                <h3 className="text-xl font-bold text-[#191c1e] mb-4 font-['Hanken_Grotesk']">Do</h3>
                <p className="text-base text-[#454654] leading-relaxed">Demonstrated Performance via hands-on activity challenges and real-world application.</p>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="flex flex-col items-center text-center p-10 rounded-3xl bg-[#4353cf] text-white shadow-xl shadow-[#4353cf]/20 transform md:-translate-y-4 relative z-10 border border-[#4353cf]/30"
              >
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent opacity-50 rounded-3xl pointer-events-none"></div>
                <div className="w-16 h-16 rounded-full bg-white/20 text-white flex items-center justify-center mb-6 border border-white/30 backdrop-blur-sm">
                  <span className="material-symbols-outlined text-3xl">psychology_alt</span>
                </div>
                <h3 className="text-xl font-bold mb-4 font-['Hanken_Grotesk']">Become</h3>
                <p className="text-base text-[#d8daff] leading-relaxed">Measurable Behavioral Growth reflected over time within the holistic growth portfolio.</p>
              </motion.div>
            </div>
          </div>
        </section>
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

export default AboutElevate;
