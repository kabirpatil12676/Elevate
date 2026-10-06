import React, { useState } from 'react';
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

const Testimonials = () => {
  const [currentEmailIndex, setCurrentEmailIndex] = useState(0);

  const emailTestimonials = [
    {
      name: "Ria Mittal",
      date: "22 July 2024 at 16:32",
      image: "https://lh3.googleusercontent.com/aida-public/AB6AXuC_JUe8k9AuAX-ogVyRfGt5BD32pmQqPC4btLr_9lTl8grhjg5i6KLw0mvtk4tXDz4kOucEB6Lhwqv8xJUjfBcUYBSlo8n3yxB3NdJeAvgHzq48Jx4wu6N-7N9gM8wPcPdCGeMVH7cOUyPUXf1D7jcPh26OUnY1e2qvpUZ210SiujCuYAE6fhqFJYqMuN5TWBIYD_D6vqGmX0smz1dD-ieLC4utgPfvNxXfKRi8FBrr-Jt3b33tioQkwg",
      text: "\"I have always felt a little lost on Instagram. Sure, I scroll, I like, and sometimes I even post something decent, but I never really felt like I had a strategy. But Elevate's course changed all that for me. This isn't your average how-to manual; this is an incredible, deep dive into everything you could possibly want to know about Instagram. And honestly? Some things you probably didn't even realise you needed to know until now.\""
    },
    {
      name: "Hemendra Killawala",
      date: "18 June 2024 at 09:15",
      image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBb3EKjmWOHGL9UqCrZNC_1a2YdWDjiXrnKJZlpFDBvclwqgaE5wlrL4nFsk7vXW8wrkv8DmOqzBrArELeI2VFU89BDBlFtfmJWY7W0prKNbg3-5weEqdOe8TkzUzZHID38pg1E68Luh7Dyz6bxM2lBLv1FdsQmg6AatffqZHX5I5k9G7Bb3vmN1lMDkrVzk2-pr3uzt-bMO4k_Fa7evzDWcRufDz-sHziDmyMH-VMWYKlGOvdGDCki8w",
      text: "\"The actionable insights provided in this curriculum are top-notch. I immediately applied the engagement techniques to my own page and saw a 40% increase in reach within the first week. The modules on monetization were particularly eye-opening. Highly recommend it to anyone looking to serious up their digital game.\""
    },
    {
      name: "Richa",
      date: "05 May 2024 at 14:20",
      image: "https://lh3.googleusercontent.com/aida-public/AB6AXuB4A13dro2Am1ORgcQZp-iEmm0lulIg_xZf23FU5WCfDWWodsdZvINsOM4LMMR-jLJnAtdJOgQPhArpNrVxHDD5zT49gYHhCmSOUewvX4GxJTai_7Oik6SrznPCmUSUSkBkrYy-aJCMtP3MPQrIRzTlKDfDLyEJlaz6iLarZV9-RhwpJB-uy8jyxDLoDwiR0RFIE5SbNY8uw6ULTDvIkgqkqfnsxzEscz_1t4LizkfF5PRVkzteVlYaWQ",
      text: "\"Absolutely transformative! Before taking the course, I was struggling to find my voice online. Elevate gave me the tools and the confidence to create content that actually resonates with my audience. The community support is just an added bonus that makes the whole experience invaluable.\""
    }
  ];

  const nextEmail = () => {
    setCurrentEmailIndex((prev) => (prev + 1) % emailTestimonials.length);
  };

  const prevEmail = () => {
    setCurrentEmailIndex((prev) => (prev - 1 + emailTestimonials.length) % emailTestimonials.length);
  };

  return (
    <div className="bg-[#f7f9fc] text-[#191c1e] min-h-screen flex flex-col font-['Inter'] antialiased selection:bg-[#4353cf]/20 selection:text-[#4353cf]">
      {/* Top Navigation Bar */}
      <Navbar />

      {/* Main Content */}
      <main className="flex-grow pt-20">
        {/* Hero Section */}
        <section className="pt-24 pb-16 text-center px-4 max-w-4xl mx-auto flex flex-col items-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-4xl md:text-[56px] font-bold text-[#191c1e] mb-2 leading-tight font-['Hanken_Grotesk']"
          >
            What People Are Saying
          </motion.h1>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl md:text-[56px] font-bold mb-6 leading-tight bg-clip-text text-transparent bg-gradient-to-r from-[#2435b4] to-[#4353cf] font-['Hanken_Grotesk']"
          >
            About ELEVATE
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl md:text-2xl text-[#454654] font-normal tracking-wide"
          >
            The Ultimate Growth Ecosystem
          </motion.p>
        </section>

        {/* Main Testimonial Highlight */}
        <section className="px-6 md:px-12 pb-20 max-w-[1280px] mx-auto w-full">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="bg-[#4353cf] rounded-3xl overflow-hidden relative flex flex-col md:flex-row items-center w-full min-h-[460px] shadow-2xl shadow-[#4353cf]/20"
          >
            <div className="absolute inset-0 z-0">
              <img
                alt="Abstract background"
                className="w-full h-full object-cover object-center opacity-40 mix-blend-overlay"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuC9tH5vOeckCODjJGb_IPwIzTr50dpr8pkD-aic6PxHgmbr9O_YCzVToTn7c5M6tPv5zSQB4Sj5UjfBq3K64UIhvwdxXAJ-1jA56CRQ0gdcji0GjAMLv9GKEkF6jCe80956pxoAsPwTvB-s4OowZ-Yw4Nuj-M7B6-ppNTTzd7fAP2MDsfKjs2XlH-qu0sFexfzMfXYBF5SvKCZFvuY3E4XtHVDQKGi86MNCQJwVZZBEeqfgVt53_vwrBg"
              />
            </div>
            <div className="relative z-10 p-8 md:p-12 lg:p-16 flex flex-col justify-center w-full md:w-3/5 text-white h-full">
              <h2 className="text-3xl md:text-4xl font-bold mb-6 font-['Hanken_Grotesk']">957K Accounts Reached</h2>
              <p className="text-lg md:text-xl mb-10 text-white/90 leading-relaxed font-light">
                "I was most excited about high engagement-driven content and monetisation. They both were covered nicely in the curriculum. So happy!"
              </p>
              <div className="mt-auto">
                <p className="text-lg font-semibold text-white mb-1">Rashmi Sheoran</p>
                <p className="text-sm text-[#d8daff]">Enrolled in Instagram Mastery For Creators</p>
              </div>
            </div>
            <div className="relative z-10 w-full md:w-2/5 flex justify-center items-center p-8 md:p-0 h-full">
              <div className="w-64 h-64 md:w-[340px] md:h-[340px] rounded-full overflow-hidden border-4 border-white/20 shadow-2xl relative aspect-square flex items-center justify-center bg-white/10">
                <img
                  alt="Rashmi Sheoran"
                  className="w-full h-full object-cover rounded-full"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBLEM-ARAU47mydwRpOc6i-RpDDn-FxCicKO3kJXMc_SPzBbkGGd8YicABlZ4g11MCupxdN7zVMGQU4DIdA10xA_gcAPzHw0-LrQsq8K8ix-g8atMwKW5IfbynMWQyXaLyKepKcpeko5w9K8i5OURY1MZp8H-ep0tXwEv1pdfgvbMwqn-tTnsa5iyuYlcDHLT2Hie1P-qlAjYuTY8q46JsFMFz6ASKXlX9n_3X3iNTw-FB-gkCOnMPsOA"
                />
              </div>
            </div>
          </motion.div>

          {/* Small Cards Below Highlight */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={staggerContainer}
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mt-8"
          >
            {[
              "https://lh3.googleusercontent.com/aida-public/AB6AXuABdTD7V6SpYOrwhQkyYqyPqOrl8ca3zOJt83IfMujS0DV2xygyb1TmmZ0OeQVHolUIfnB_QnhNrIjeDBxcJtko5eu2cdNu9gUvo1YYmAyssd-Yij7WDaI1H57HWQQNW5MMHq6euc8mc41LqNlVGWECjPbWp1ZIB2Ml0fYzOV43oNhTuaz9p2kzRyMdA_1uFb_xVelKuwQFbuDdfFHMKHR5FZ4yYzRaVJ3R-IMRTibqNVq9Aa_6TKD_fg",
              "https://lh3.googleusercontent.com/aida-public/AB6AXuAxDz67v8qndmRuLlx4HDD8DT-8knzhO1PrhVdJQAAMSFhx-xyirwL0AP8NlnR7uKu9nvLYPOFq9nWYGPvVqtS-fsQVUE13WHsv39fW62YglwsJL9rnF1O70xodfEiLtV3-mjgTkyaLRO2I7BXgp8cSEcfOQi8JacU1cdeSHV1rBjDht942HvK6WsmRc2rCzwr529RgjJkxhVEtX43sTyNgMJnV9kKD_4LdCQPyKBxLmuf8IzCafiWtQg",
              "https://lh3.googleusercontent.com/aida-public/AB6AXuCKXQFLhjWbllozGwPSCwy-i9DINtak-PtmCALCZRiHlURW6hjfa0nm25BqwTHxU3c2fFfjMYfTO1gnUJQ7tkFc5sRJYtjdS_QCY2SfG1WMzHJqH7oYJsEfdwkryyEL48xEEniXSU09t3385e2-k-XooO-wOLNylGchiwm2lSA_rKzdby6s7Yw5uoMNLxLhMyRH_jWeSA0CyUlha6HkVN9-TCdjEowsKvKMi7DC6cnyxzRqKt41cggglw"
            ].map((src, idx) => (
              <motion.div key={idx} variants={fadeUp} className="relative rounded-3xl overflow-hidden aspect-[3/4] group cursor-pointer shadow-md">
                <img alt={`Video Testimonial ${idx + 1}`} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" src={src} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-80"></div>
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/40 text-white">
                    <span className="material-symbols-outlined text-3xl ml-1">play_arrow</span>
                  </div>
                </div>
                <div className="absolute bottom-4 left-4 w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 text-white group-hover:opacity-0 transition-opacity">
                  <span className="material-symbols-outlined text-xl">play_arrow</span>
                </div>
              </motion.div>
            ))}

            <motion.div variants={fadeUp} className="bg-[#2a2b4a] rounded-3xl p-8 text-white flex flex-col justify-between aspect-[3/4] relative overflow-hidden shadow-md group">
              <p className="text-xl md:text-2xl leading-snug font-medium font-['Hanken_Grotesk'] z-10 relative">
                "Will make you question all that you've been doing till now."
              </p>
              <div className="mt-4 relative z-10">
                <p className="text-base font-semibold">Riya Baria</p>
                <p className="text-xs text-[#bcc2ff]">ELEVATE Student</p>
              </div>
              <div className="absolute bottom-4 right-4 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-500">
                <span className="material-symbols-outlined text-8xl text-[#bcc2ff]">format_quote</span>
              </div>
            </motion.div>
          </motion.div>
        </section>

        {/* Case Studies Section */}
        <section className="bg-[#111220] py-24 rounded-t-[40px] w-full text-white">
          <div className="max-w-[1280px] mx-auto px-6 md:px-12">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl md:text-5xl font-bold mb-4 text-white font-['Hanken_Grotesk']">Case Studies</h2>
              <p className="text-xl md:text-2xl text-white/70 font-normal">Real learners sharing real experiences</p>
            </motion.div>

            <div className="grid grid-cols-1 gap-12">
              {/* Case Study 1 */}
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.8 }}
                className="flex flex-col md:flex-row gap-6 w-full"
              >
                <div className="md:w-[40%] rounded-[32px] overflow-hidden relative group min-h-[400px]">
                  <img
                    alt="Parag J. Pawar"
                    className="w-full h-full absolute inset-0 object-cover object-top transition-transform duration-700 group-hover:scale-105"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuBp0ihyOq0IUIBwWVgSs_J6CZoMlqC8gJECcDWAQbByCWky6i_TON__JJuMrN4aF644vCgYvY-3IKKlPicbn_6fKHHg6QcORZkN6p6gfAgS8syDuYS8O9-5iJAQnZpXajb433QBn3VBIbqMjIP1SJ0AJxLEH-Uc-mnZgxwGzwkUA6d8NkPSy77T13Bq_VmOn466mxg7rgm8FFUZ8V5ATSKI5u5I_Rq5h8aGs9KoY0qaAbqhpMPz-uanEQ"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#111220] via-transparent to-transparent opacity-90"></div>
                  <div className="absolute bottom-0 left-0 p-8 w-full z-10">
                    <h3 className="text-3xl font-bold text-white mb-1 font-['Hanken_Grotesk']">Parag J. Pawar</h3>
                    <p className="text-sm text-white/70 font-medium tracking-wide uppercase">Student</p>
                  </div>
                </div>
                <div className="md:w-[60%] flex flex-col min-h-[400px]">
                  <div className="bg-[#24296b] p-8 md:p-12 rounded-[32px] flex-grow relative overflow-hidden flex flex-col justify-center border border-white/5">
                    <div className="absolute -bottom-10 -right-10 opacity-[0.03] transform rotate-12">
                      <span className="material-symbols-outlined text-[200px]">school</span>
                    </div>
                    <h4 className="text-2xl md:text-[32px] font-bold mb-6 leading-tight text-white z-10 font-['Hanken_Grotesk']">
                      I Learned How to Overcome Digital Distractions!
                    </h4>
                    <p className="text-lg leading-relaxed relative z-10 text-white/90 font-light">
                      I learned how to identify time wasters, prioritize tasks, and apply practical techniques to structure my day better. Now, I stay more focused, stick to my schedule, and manage studies and personal goals with greater discipline.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4 mt-6">
                    <div className="bg-white/5 backdrop-blur-md border border-white/10 text-white/90 px-6 py-4 rounded-2xl flex items-center gap-3 text-sm md:text-base font-medium flex-1 justify-center shadow-lg">
                      <span className="material-symbols-outlined text-white/50">cake</span>
                      Age 21 - 30
                    </div>
                    <div className="bg-white/5 backdrop-blur-md border border-white/10 text-white/90 px-6 py-4 rounded-2xl flex items-center gap-3 text-sm md:text-base font-medium flex-1 justify-center shadow-lg">
                      <span className="material-symbols-outlined text-white/50">location_on</span>
                      Mumbai, Maharashtra
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Case Study 2 */}
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.8 }}
                className="flex flex-col md:flex-row gap-6 w-full"
              >
                <div className="md:w-[60%] flex flex-col min-h-[400px] order-2 md:order-1">
                  <div className="bg-[#24296b] p-8 md:p-12 rounded-[32px] flex-grow relative overflow-hidden flex flex-col justify-center border border-white/5">
                    <div className="absolute -top-10 -left-10 opacity-[0.03] transform -rotate-12">
                      <span className="material-symbols-outlined text-[200px]">rocket_launch</span>
                    </div>
                    <h4 className="text-2xl md:text-[32px] font-bold mb-6 leading-tight text-white z-10 font-['Hanken_Grotesk']">
                      I Launched My First Course And Started Working On My Second!
                    </h4>
                    <p className="text-lg leading-relaxed relative z-10 text-white/90 font-light">
                      I successfully created and launched my first course, something I had been wanting to do for a long time. Now, I'm already working on my second one with greater clarity, confidence, and direction.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4 mt-6">
                    <div className="bg-white/5 backdrop-blur-md border border-white/10 text-white/90 px-6 py-4 rounded-2xl flex items-center gap-3 text-sm md:text-base font-medium flex-1 justify-center shadow-lg">
                      <span className="material-symbols-outlined text-white/50">cake</span>
                      Age 31 - 40
                    </div>
                    <div className="bg-white/5 backdrop-blur-md border border-white/10 text-white/90 px-6 py-4 rounded-2xl flex items-center gap-3 text-sm md:text-base font-medium flex-1 justify-center shadow-lg">
                      <span className="material-symbols-outlined text-white/50">location_on</span>
                      Bengaluru, Karnataka
                    </div>
                  </div>
                </div>
                <div className="md:w-[40%] rounded-[32px] overflow-hidden relative group min-h-[400px] order-1 md:order-2">
                  <img
                    alt="Harsha Nagaraj"
                    className="w-full h-full absolute inset-0 object-cover object-top transition-transform duration-700 group-hover:scale-105"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuBDJ6UrIZfQ69vIlMOhzeM7iLJ-waUiFXdizz4mh76Xp_TdzaAtpz2S8_Mgx1YthDvkBbMomeHim-LnX0Az0ARsf9HWlqLxQcsYBLWJ8cvF9oRzYmBD90t_sQ6n7am5Cc3JMxoGX5SXjm4wqlzQtXyFQ3bkY28gTntZsahsRu50v6E1jdAgLlCAUWsebTxNF0i0EieEAsfxeG8InvjClwkiLMfNPtXwhQjpZ3tDuAikVgmg1G8x4epYkQ"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#111220] via-transparent to-transparent opacity-90"></div>
                  <div className="absolute bottom-0 left-0 p-8 w-full z-10">
                    <h3 className="text-3xl font-bold text-white mb-1 font-['Hanken_Grotesk']">Harsha Nagaraj</h3>
                    <p className="text-sm text-white/70 font-medium tracking-wide">Harsha Yoga - Founder, Yoga Trainer</p>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Pagination */}
            <div className="flex justify-between items-center mt-16 text-sm md:text-base font-semibold text-white/80 border-t border-white/10 pt-8">
              <span>Page 1 of 4</span>
              <div className="flex gap-3">
                <button className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors cursor-not-allowed opacity-50 border border-white/10">
                  <span className="material-symbols-outlined">chevron_left</span>
                </button>
                <button className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors text-white border border-white/10">
                  <span className="material-symbols-outlined">chevron_right</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Email Testimonials */}
        <section className="py-24 px-6 md:px-12 bg-white relative">
          <div className="max-w-[1280px] mx-auto flex flex-col lg:flex-row gap-12 lg:gap-24">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6 }}
              className="lg:w-1/3 lg:sticky lg:top-24 h-fit"
            >
              <h2 className="text-4xl md:text-5xl font-bold mb-2 leading-tight font-['Hanken_Grotesk']">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#2435b4] to-[#4353cf]">Email</span>
              </h2>
              <h2 className="text-4xl md:text-5xl font-bold mb-6 leading-tight text-[#191c1e] font-['Hanken_Grotesk']">
                Testimonials
              </h2>
              <p className="text-lg text-[#454654] mb-8 font-medium">Direct feedback from learners via email</p>
              <div className="flex gap-4">
                <button
                  onClick={prevEmail}
                  className="w-12 h-12 rounded-full border border-[#c5c5d4] flex items-center justify-center hover:bg-[#f7f9fc] hover:border-[#24389c] hover:text-[#24389c] transition-all text-[#454652]"
                >
                  <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <button
                  onClick={nextEmail}
                  className="w-12 h-12 rounded-full bg-[#24389c] text-white flex items-center justify-center hover:bg-[#4353cf] shadow-md shadow-[#24389c]/20 transition-all"
                >
                  <span className="material-symbols-outlined">arrow_forward</span>
                </button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="lg:w-2/3"
            >
              <div className="bg-white rounded-3xl border border-[#e1e3e4] shadow-xl shadow-black/5 overflow-hidden">
                <motion.div
                  key={currentEmailIndex}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.4 }}
                  className="w-full p-8 md:p-12"
                >
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-14 h-14 rounded-full bg-[#4353cf]/10 flex items-center justify-center overflow-hidden shrink-0 border border-[#4353cf]/20">
                      <img
                        alt={emailTestimonials[currentEmailIndex].name}
                        className="w-full h-full object-cover"
                        src={emailTestimonials[currentEmailIndex].image}
                      />
                    </div>
                    <div className="flex-grow">
                      <h4 className="font-bold text-xl text-[#191c1e] font-['Hanken_Grotesk']">
                        {emailTestimonials[currentEmailIndex].name}
                      </h4>
                      <p className="text-sm text-[#757685] font-medium">{emailTestimonials[currentEmailIndex].date}</p>
                    </div>
                  </div>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute -top-4 -left-4 text-4xl text-[#e1e3e4] opacity-50 transform -scale-x-100">format_quote</span>
                    <p className="text-[#454654] leading-relaxed text-lg md:text-xl font-light italic relative z-10">
                      {emailTestimonials[currentEmailIndex].text}
                    </p>
                  </div>
                </motion.div>
              </div>
              
              {/* Pagination indicators */}
              <div className="flex justify-center gap-2 mt-6">
                {emailTestimonials.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentEmailIndex(idx)}
                    className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                      currentEmailIndex === idx ? 'bg-[#24389c] w-8' : 'bg-[#c5c5d4] hover:bg-[#8f8f9f]'
                    }`}
                    aria-label={`Go to slide ${idx + 1}`}
                  />
                ))}
              </div>
            </motion.div>
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

export default Testimonials;
