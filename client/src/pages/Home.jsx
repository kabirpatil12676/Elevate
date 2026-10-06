import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import mainBgImage from '../assets/main_bg_image.png';

const Home = () => {
  const [isScrolledDown, setIsScrolledDown] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY > lastScrollY && currentScrollY > 50) {
        setIsScrolledDown(true); // Scrolling down -> hide
      } else if (currentScrollY < lastScrollY) {
        setIsScrolledDown(false); // Scrolling up -> show
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  // Animation variants for scroll reveals
  const fadeUp = {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2 }
    }
  };

  return (
    <div className="bg-surface-container-lowest text-on-surface min-h-screen flex flex-col font-['Inter']">
      {/* TopNavBar */}
      <nav className={`fixed top-0 w-full z-50 bg-surface-container-lowest/90 backdrop-blur-md border-b border-outline-variant/30 text-on-surface transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${isScrolledDown ? '-translate-y-full' : 'translate-y-0'}`}>
        <div className="max-w-container-max mx-auto px-margin-desktop flex items-center justify-between h-20">
          <Link to="/" className="font-headline-md text-headline-md font-bold tracking-tighter text-primary flex items-center gap-2">
            <span className="material-symbols-outlined text-3xl">check_circle</span>
            ELEVATE
          </Link>
          <div className="hidden md:flex items-center space-x-8 font-medium">
            <Link to="/courses" className="hover:text-primary transition-colors flex items-center gap-1 text-on-surface">
              Courses <span className="material-symbols-outlined text-sm">expand_more</span>
            </Link>
            <Link to="/community" className="hover:text-primary transition-colors text-on-surface">Community</Link>
            <a className="hover:text-primary transition-colors text-on-surface" href="#">Career Roadmaps</a>
            <a className="hover:text-primary transition-colors text-on-surface" href="#">Testimonials</a>
            <a className="hover:text-primary transition-colors text-on-surface" href="#">About Elevate</a>
          </div>
          <div className="flex items-center gap-4">
            <button className="border border-outline-variant text-on-surface hover:border-primary hover:text-primary font-button text-button px-8 py-2 rounded-full transition-all duration-300">
              Login
            </button>
          </div>
        </div>
      </nav>

      <main className="flex-grow pt-20 overflow-hidden">
        {/* Hero Section */}
        <section 
          className="relative w-full text-white" 
          style={{
            backgroundImage: `linear-gradient(to right, rgba(0, 0, 0, 0.75) 0%, rgba(0, 0, 0, 0.4) 45%, transparent 100%), url(${mainBgImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'right top'
          }}
        >
          <div className="max-w-container-max mx-auto grid grid-cols-1 min-h-[500px] lg:min-h-[600px]">
            <motion.div 
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
              className="flex flex-col justify-center px-margin-desktop py-12 md:py-16 z-10 rounded-3xl md:w-1/2 max-w-2xl"
            >
              <motion.div variants={fadeUp} className="flex items-center gap-3 mb-6 bg-white/10 w-fit px-4 py-2 rounded-full backdrop-blur-sm">
                <div className="flex -space-x-2">
                  <img alt="Member" className="w-6 h-6 rounded-full border border-[#3b3a38]" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAZmjMLjc1Lx7NCelRQeRQKgq1PwYkTsd7A_1MgD2SMUwJDkcYZEyXymrAKyqP_2JdPe22o2fsBZ68304QUGgB0aYFoFvXApgT6xDQ7brpKoy5dJwU-4I6zhy2kIDxljqjenRobl8n2Ba4N4XiB91cDj0zDN4kbF3klg4hBGyDUdnEkNFaBMC5_il5ztPOgGto6xr1eRgbEXy-aTft4QQG4ncm2bb2OEV91UUliysx9hXN8Pp5PVNQ3bQ" />
                  <img alt="Member" className="w-6 h-6 rounded-full border border-[#3b3a38]" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDfepQ8DiWzLX0DzTHtxCqk2dF5pcBBunsakyFlQJOSlbsRBmr75R7v-X4ZIUfPDOXfjnohmadtcABcue25iAHCStBc0nU-rjxW86-_IiSP7ftD1lP9PPDroFZ7xQRQ4oZWJalOf2srYBuWR5P2jS5d7hCdrryLzBE2bHvGzaL9j5cTOPKHjvcdHqkhtEl87JVMsZGbhALrF6rtdgn9ABZUXaLQVYcBPtM2nBbn40GH6xRnAnqzd0k7Gg" />
                  <img alt="Member" className="w-6 h-6 rounded-full border border-[#3b3a38]" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB0Ip8n933mVUr64b3aIgzRruCFH_mHsuYlT9UXYMuo-bt_FpaZ45rCTv2EiacbE8VDwMV0hbVmK02uQl88CYXws_PI2EpTln6VsRt39ZtIUm6jgN68ySlIkn-DhppoIwY4GRncckJ1Ps_NJh5xQaZT16uEsS_j8rT9oC0Mt_8FuFU8W5Mfwg5gz9H22ArACo21oDkFN0MPhR37ECN_MFFFgyUI1XcAyQLZ4UvOUEO88zPmJQogFiUE5A" />
                </div>
                <span className="text-sm font-medium text-white/90">| 508,287+ ELEVATE Members</span>
              </motion.div>
              
              <motion.h1 variants={fadeUp} className="text-4xl md:text-5xl lg:text-6xl font-bold mb-5 leading-[1.15] tracking-tight font-['Playfair_Display']">
                <span className="inline-block text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(180deg, #FFFFFF 0%, #FAF0DE 30%, #E2BA7F 70%, #BC8A48 100%)' }}>
                  Become The Best
                </span><br />
                <span className="inline-block text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(180deg, #FFFFFF 0%, #FAF0DE 30%, #E2BA7F 70%, #BC8A48 100%)' }}>
                  Version Of <span className="tracking-wide" style={{ letterSpacing: '0.04em' }}>YOU</span>
                </span>
              </motion.h1>
              
              <motion.p variants={fadeUp} className="font-body-lg text-lg md:text-xl text-white/90 mb-8 max-w-lg font-light">
                Acquire practical, high-demand skills from industry leaders. The smartest membership for the smartest people.
              </motion.p>
              
              <motion.button variants={fadeUp} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="bg-[#4353cf] hover:bg-[#4353cf]/90 text-white font-button text-base md:text-lg px-8 py-3 rounded-full w-fit transition-colors duration-300 shadow-lg mb-10">
                Become An ELEVATE Member
              </motion.button>
              
              <motion.div variants={fadeUp} className="flex flex-wrap gap-6 text-sm font-medium">
                <div className="flex items-center gap-2"><span className="material-symbols-outlined text-white">diamond</span>High-Quality Courses</div>
                <div className="flex items-center gap-2"><span className="material-symbols-outlined text-white">groups</span>Like-Minded Community</div>
                <div className="flex items-center gap-2"><span className="material-symbols-outlined text-white">work</span>Personalized Jobs</div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Social Proof Section */}
        <section className="max-w-container-max mx-auto px-margin-desktop py-24 text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
          >
            <motion.h2 variants={fadeUp} className="font-headline-lg text-4xl font-bold text-on-surface mb-6">Message From <span className="text-primary">Founder</span></motion.h2>
            <motion.div variants={fadeUp} className="flex flex-wrap justify-center gap-8 mb-12 font-medium text-on-surface-variant">
              <div className="flex items-center gap-2"><span className="material-symbols-outlined text-primary">account_balance</span>3X Founder</div>
              <div className="flex items-center gap-2"><span className="material-symbols-outlined text-primary">edit</span>6X Author</div>
              <div className="flex items-center gap-2"><span className="material-symbols-outlined text-primary">groups</span>16M Community</div>
            </motion.div>
            
            <motion.div variants={fadeUp} className="relative max-w-4xl mx-auto rounded-3xl overflow-hidden shadow-2xl mb-12 aspect-video bg-surface-container group">
              <img alt="Video Placeholder" className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-700" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAlQBIJqpueUMBn2oSDGcGZpDTHgCChietR2-n1R4FdXM7072Pq36PKD6gsxcyMllvsLCnaHY2_Vg-9NKqcxBo-_p5cwbh81xAALawM0E1Wm1H6mnmJV1-2Ql1Y44zH13Wa-8AJy9aISngpAuxt_xdfJb9C41WYRzfjXK3_NXcijoLJ5EwsHwD_wvfRnnx4w2ucX5gry7dla8UeGpu-Hwdi65S2xpvxw7P6p5pNikvVPlOSSXSMf-M1xw" />
              <div className="absolute inset-0 flex items-center justify-center">
                <button className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-lg border border-white/30">
                  <span className="material-symbols-outlined text-white text-4xl">play_arrow</span>
                </button>
              </div>
            </motion.div>
            
            <motion.button variants={fadeUp} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="bg-[#4353cf] hover:bg-[#4353cf]/90 text-white font-button text-lg px-8 py-4 rounded-full transition-colors duration-300 shadow-md">
              Become An ELEVATE Member
            </motion.button>
          </motion.div>
        </section>

        {/* Subscription Benefits */}
        <section className="bg-surface-container-low py-24 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary via-transparent to-transparent"></div>
          <div className="max-w-container-max mx-auto px-margin-desktop relative z-10">
            <motion.div 
              className="text-center mb-16"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={staggerContainer}
            >
              <motion.div variants={fadeUp} className="flex items-center justify-center gap-2 mb-4 text-primary">
                <span className="material-symbols-outlined text-sm">cell_tower</span>
                <span className="text-xs font-bold tracking-widest uppercase">THE ELEVATE SUBSCRIPTION</span>
              </motion.div>
              <motion.h2 variants={fadeUp} className="font-display-lg text-4xl md:text-5xl lg:text-[48px] font-bold mb-4 leading-[56px] tracking-tight text-on-surface">
                <span className="text-[#4353cf]">One Subscription.</span><br/>Infinite Possibilities.
              </motion.h2>
              <motion.p variants={fadeUp} className="font-body-md text-base md:text-lg text-on-surface-variant">The Ultimate Growth Ecosystem</motion.p>
            </motion.div>
            
            <motion.div 
              className="grid grid-cols-1 md:grid-cols-3 gap-8"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={staggerContainer}
            >
              {/* Card 1 */}
              <motion.div variants={fadeUp} className="bg-surface-container-lowest rounded-3xl overflow-hidden shadow-sm border border-outline-variant/20 flex flex-col p-6 transition-transform hover:-translate-y-2 duration-300 card-hover">
                <img alt="Unlimited Learning" className="w-full h-48 object-cover rounded-2xl mb-6" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCYM2HvAfobAaCjwzCaVj_ZuX8ZPNAspmIzEzzdfuyPkg4oWxIJ8T9n4GAh9ALI9sSL6PJXdYj8FbsEy-xgYYnY4ZCWXBjhBMYuSsSicHzkaAUrdyEanzI4BUKB-X-sWlmzy6GeHolUTL44u-kiNPKwb_ReW9BM8QXblKa-W1neICkG7Ng3UmygdaG2hGisb5gH9is1w6avmpPyGYm9gVkEhc0E_eHP6X8wIimyIVT9H4yU2P5ZfvEbjA" />
                <div className="text-center">
                  <h3 className="font-headline-md text-xl font-bold mb-2">Unlimited Learning</h3>
                  <p className="font-body-md text-on-surface-variant">A new expert course launched every week.</p>
                </div>
              </motion.div>
              {/* Card 2 */}
              <motion.div variants={fadeUp} className="bg-surface-container-lowest rounded-3xl overflow-hidden shadow-sm border border-outline-variant/20 flex flex-col p-6 transition-transform hover:-translate-y-2 duration-300 card-hover">
                <img alt="Members-only Community" className="w-full h-48 object-cover rounded-2xl mb-6" src="https://lh3.googleusercontent.com/aida-public/AB6AXuC8dyCJw8OTIDAce0btXuisLrGl6vRlYmbqTl-cX1cuw1XQHOQLB-DJux7EFrHoAZZZl9bkhGU5HIE7-CECrFNdGgo6MbNELTwTcbZLjFcll9dSy3O-GG6n3EP0oggc4hUxgcOKTIu1tl2ayJZEmadJraDT9qmI4fCopanaa0_c7EReyIiKjDHF_g-WjgaivmSjs5A4RmHlXaBbCxFY5yAkp08kAnx90RnfhcYls0rUMejLx3hekzuJhg" />
                <div className="text-center">
                  <h3 className="font-headline-md text-xl font-bold mb-2">Members-only Community</h3>
                  <p className="font-body-md text-on-surface-variant">Ask questions, get feedback, connect through online and offline events.</p>
                </div>
              </motion.div>
              {/* Card 3 */}
              <motion.div variants={fadeUp} className="bg-surface-container-lowest rounded-3xl overflow-hidden shadow-sm border border-outline-variant/20 flex flex-col p-6 transition-transform hover:-translate-y-2 duration-300 card-hover">
                <img alt="Personalised Jobs" className="w-full h-48 object-cover rounded-2xl mb-6" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCm9MLJdyrPK7gVjqmqTMuDtLHp69MCrIb6komM7wYQoZ2DMo6XHwbjTocjf38rF9jyFwhaYDCWWZIQbarhPthm9HX3GRMv4XKflrb9cK9LMOjp92-tOsslYjVhln5mThOGD6CnjFWyCzq5K1voemtGZ4vm4EQ1TgA17ETXs_8oSwsnNS39XqJwo6sBKrirUFerH5b9CmVIshih403bDh4r0XN34km3OQYFXQefwaBmoy6nQSpS_AVGGQ" />
                <div className="text-center">
                  <h3 className="font-headline-md text-xl font-bold mb-2">Personalised Jobs</h3>
                  <p className="font-body-md text-on-surface-variant">Find job opportunities aligned with your skills and resume.</p>
                </div>
              </motion.div>
            </motion.div>

            {/* Promotional Banner */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="mt-16 bg-[#4353cf] text-white rounded-3xl flex flex-col md:flex-row items-stretch justify-between shadow-xl relative overflow-hidden min-h-[240px]"
            >
              <div className="p-10 relative z-10 md:w-3/5 flex flex-col justify-center">
                <h3 className="font-headline-lg text-3xl md:text-4xl font-bold mb-8">Get Access to Skills, Community and Jobs For A Full Year!</h3>
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="bg-white text-[#4353cf] hover:bg-surface-container-lowest font-button text-lg px-8 py-4 rounded-full transition-colors duration-300 shadow-md w-fit">
                  Become An ELEVATE Member
                </motion.button>
              </div>
              <div className="relative md:w-2/5 min-h-[200px]">
                <img alt="Team" className="absolute inset-0 w-full h-full object-cover opacity-40" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBh5bf8CFOysGIz08JKfg0OVBFp9s1v-qn8-1Q7UqZ6KVADu-vjJRumJO0XsasTSCwqB3M8q2w31nksraOKwAGP5e4P-Q0wA_OqogFTIy6ilLBg775FyDMmlAziTEfrNM7rFCntAsjL7bq3kS68q2xaJ_S9xObYGVu9KPhpvQawarjuiDarZ6kfbfqiHNJcoWYslKpjtr6Z_5QXTakc4IMlQeiIVnuq8HKLPhjFOgefx8U1-z_makA-iQ" />
                <div className="absolute inset-0 bg-gradient-to-r from-[#4353cf] via-transparent to-transparent"></div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* The Promise Section */}
        <section className="bg-[#1f2355] text-white py-24">
          <div className="max-w-container-max mx-auto px-margin-desktop">
            <motion.div 
              className="text-center mb-16 flex flex-col items-center"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={staggerContainer}
            >
              <motion.div variants={fadeUp} className="bg-white/10 rounded-full px-4 py-1 flex items-center gap-2 mb-6 border border-white/20">
                <span className="material-symbols-outlined text-sm">verified_user</span>
                <span className="text-sm font-semibold tracking-wide uppercase">100% Risk Free Investment</span>
              </motion.div>
              <motion.h2 variants={fadeUp} className="font-headline-lg text-4xl md:text-5xl font-bold">The ELEVATE Promise</motion.h2>
            </motion.div>
            
            <motion.div 
              className="max-w-3xl mx-auto space-y-6"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
              variants={staggerContainer}
            >
              {/* Promise 1 */}
              <motion.div variants={fadeUp} className="bg-white/5 border border-white/10 rounded-3xl p-8 flex items-center gap-8 hover:bg-white/10 transition-colors">
                <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-3xl text-[#8b9cff]">all_inclusive</span>
                </div>
                <div>
                  <h3 className="font-headline-md text-2xl font-bold mb-2">Pay Once. Full Access.</h3>
                  <p className="text-white/70 font-body-md">Unlock all courses, entire community and all jobs with one yearly subscription.</p>
                </div>
              </motion.div>
              {/* Promise 2 */}
              <motion.div variants={fadeUp} className="bg-white/5 border border-white/10 rounded-3xl p-8 flex items-center gap-8 hover:bg-white/10 transition-colors">
                <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-3xl text-[#8b9cff]">money_off</span>
                </div>
                <div>
                  <h3 className="font-headline-md text-2xl font-bold mb-2">No Upsells. No Surprises.</h3>
                  <p className="text-white/70 font-body-md">What you see is what you pay, no hidden costs.</p>
                </div>
              </motion.div>
              {/* Promise 3 */}
              <motion.div variants={fadeUp} className="bg-white/5 border border-white/10 rounded-3xl p-8 flex items-center gap-8 hover:bg-white/10 transition-colors">
                <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-3xl text-[#8b9cff]">currency_exchange</span>
                </div>
                <div>
                  <h3 className="font-headline-md text-2xl font-bold mb-2">Full Refund. No Questions Asked.</h3>
                  <p className="text-white/70 font-body-md">Get your money back if you choose to cancel the subscription in 14 days.</p>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-surface-container-low w-full mt-auto">
        <div className="max-w-container-max mx-auto px-margin-desktop py-16 grid grid-cols-1 md:grid-cols-4 gap-12">
          <div>
            <a className="font-headline-md text-headline-md text-on-surface mb-6 flex items-center gap-2 font-bold tracking-tighter" href="#">
              <span className="material-symbols-outlined text-3xl text-primary">check_circle</span>
              ELEVATE
            </a>
            <p className="font-body-md text-body-md text-on-surface-variant mb-6 max-w-xs">
              Empowering the next generation of digital leaders with expert-led, practical education.
            </p>
          </div>
          <div className="md:col-span-2 grid grid-cols-2 gap-8">
            <div>
              <h4 className="font-label-md text-label-md text-on-surface mb-6 uppercase tracking-widest font-semibold">Company</h4>
              <ul className="space-y-4 font-body-md text-body-md text-on-surface-variant">
                <li><a className="hover:text-primary transition-colors duration-200" href="#">About Us</a></li>
                <li><a className="hover:text-primary transition-colors duration-200" href="#">Contact</a></li>
                <li><a className="hover:text-primary transition-colors duration-200" href="#">Careers</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-label-md text-label-md text-on-surface mb-6 uppercase tracking-widest font-semibold">Legal</h4>
              <ul className="space-y-4 font-body-md text-body-md text-on-surface-variant">
                <li><a className="hover:text-primary transition-colors duration-200" href="#">Privacy Policy</a></li>
                <li><a className="hover:text-primary transition-colors duration-200" href="#">Terms of Service</a></li>
                <li><a className="hover:text-primary transition-colors duration-200" href="#">FAQ</a></li>
              </ul>
            </div>
          </div>
          <div>
            <h4 className="font-label-md text-label-md text-on-surface mb-6 uppercase tracking-widest font-semibold">Subscribe</h4>
            <div className="flex flex-col gap-3">
              <input 
                className="bg-surface-container-lowest text-body-md font-body-md text-on-surface border border-outline-variant/50 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary w-full p-4 placeholder:text-on-surface-variant/70 transition-all" 
                placeholder="Enter your email" 
                type="email" 
              />
              <button className="bg-[#4353cf] hover:bg-[#4353cf]/90 text-white font-button py-4 rounded-full transition-colors shadow-sm w-full">
                Subscribe
              </button>
            </div>
          </div>
          
          <div className="col-span-1 md:col-span-4 mt-12 pt-8 border-t border-outline-variant/30 flex flex-col md:flex-row justify-between items-center text-sm font-body-md text-on-surface-variant">
            <p>© 2024 ELEVATE. All rights reserved.</p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <a className="hover:text-primary transition-colors" href="#">
                <span className="material-symbols-outlined">share</span>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
