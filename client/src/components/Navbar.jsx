import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import mainLogo from '../assets/main_logo.png';

const courseCategories = [
  { name: 'AI & Digital', icon: 'psychology' },
  { name: 'Career Growth', icon: 'trending_up' },
  { name: 'Communication', icon: 'record_voice_over' },
];

const Navbar = () => {
  const [isScrolledDown, setIsScrolledDown] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isCoursesOpen, setIsCoursesOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY > lastScrollY && currentScrollY > 50) {
        setIsScrolledDown(true); // Scrolling down -> hide
        setIsCoursesOpen(false); // Close dropdown on scroll
      } else if (currentScrollY < lastScrollY) {
        setIsScrolledDown(false); // Scrolling up -> show
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  // Close dropdown on route change
  useEffect(() => {
    setIsCoursesOpen(false);
  }, [location]);

  return (
    <nav className={`fixed top-0 w-full z-50 bg-white/95 backdrop-blur-md border-b border-[#e1e3e4]/50 text-[#191c1e] transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${isScrolledDown ? '-translate-y-full' : 'translate-y-0'} shadow-sm`}>
      <div className="max-w-[1280px] mx-auto px-6 md:px-12 flex items-center justify-between h-20">
        
        <Link to="/" className="text-2xl font-extrabold text-[#24389c] flex items-center gap-2 font-['Manrope'] tracking-tight hover:opacity-90 transition-opacity">
          <img src={mainLogo} alt="ELEVATE Logo" className="h-10 w-auto object-contain" />
          ELEVATE
        </Link>
        
        <div className="hidden md:flex items-center space-x-8 font-medium">
          
          {/* Courses Dropdown Wrapper */}
          <div 
            className="relative h-20 flex items-center"
            onMouseEnter={() => setIsCoursesOpen(true)}
            onMouseLeave={() => setIsCoursesOpen(false)}
          >
            <Link to="/courses" className="hover:text-[#24389c] transition-colors flex items-center gap-1 text-[#454652] font-semibold text-sm">
              Courses 
              <span className={`material-symbols-outlined text-[18px] transition-transform duration-300 ${isCoursesOpen ? 'rotate-180' : ''}`}>
                expand_more
              </span>
            </Link>

            {/* Mega Menu Dropdown */}
            <AnimatePresence>
              {isCoursesOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, x: "-50%", scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, x: "-50%", scale: 1 }}
                  exit={{ opacity: 0, y: 5, x: "-50%", scale: 0.98 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="fixed top-[80px] left-1/2 w-[600px] bg-white rounded-3xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] border border-[#e1e3e4] p-8 cursor-default z-50 overflow-hidden"
                >
                  <h3 className="text-lg font-bold text-[#191c1e] mb-4 font-['Hanken_Grotesk']">Courses Categories</h3>
                  <div className="w-full h-px bg-[#e1e3e4] mb-6"></div>
                  
                  <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                    {courseCategories.map((category, index) => (
                      <Link 
                        key={index} 
                        to={`/courses?category=${encodeURIComponent(category.name)}`} 
                        className="flex items-center gap-3 group hover:bg-[#f3f4f5] p-2 rounded-xl transition-colors"
                      >
                        <div className="w-10 h-10 rounded-xl bg-[#f8f9fa] flex items-center justify-center text-[#454654] group-hover:text-[#24389c] group-hover:bg-[#e0e0ff] transition-colors border border-[#e1e3e4] group-hover:border-transparent">
                          <span className="material-symbols-outlined text-[20px]">{category.icon}</span>
                        </div>
                        <span className="text-sm font-semibold text-[#454652] group-hover:text-[#24389c] transition-colors">
                          {category.name}
                        </span>
                      </Link>
                    ))}
                    
                    {/* All Courses Button */}
                    <div className="flex items-center p-2">
                      <Link 
                        to="/courses" 
                        className="w-full bg-[#4353cf] hover:bg-[#2435b4] text-white py-3 rounded-xl text-sm font-semibold transition-colors shadow-sm text-center"
                      >
                        All Courses
                      </Link>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <Link to="/community" className={`text-sm transition-colors ${location.pathname === '/community' ? 'text-[#24389c] font-semibold border-b-2 border-[#24389c] pb-0.5' : 'text-[#454652] hover:text-[#24389c]'}`}>Community</Link>
          <Link to="/career-roadmaps" className={`text-sm transition-colors ${location.pathname === '/career-roadmaps' ? 'text-[#24389c] font-semibold border-b-2 border-[#24389c] pb-0.5' : 'text-[#454652] hover:text-[#24389c]'}`}>Career Roadmaps</Link>
          <Link to="/testimonials" className={`text-sm transition-colors ${location.pathname === '/testimonials' ? 'text-[#24389c] font-semibold border-b-2 border-[#24389c] pb-0.5' : 'text-[#454652] hover:text-[#24389c]'}`}>Testimonials</Link>
          <Link to="/about-elevate" className={`text-sm transition-colors ${location.pathname === '/about-elevate' ? 'text-[#24389c] font-semibold border-b-2 border-[#24389c] pb-0.5' : 'text-[#454652] hover:text-[#24389c]'}`}>About Elevate</Link>
        </div>
        
        <div className="flex items-center gap-4">
          <button className="hidden md:block text-sm font-semibold text-[#454652] hover:text-[#24389c] transition-colors border border-[#c5c5d4] hover:border-[#24389c] px-8 py-2 rounded-full shadow-sm">
            Login
          </button>
          <button className="md:hidden text-[#191c1e] p-2 hover:bg-[#f3f4f5] rounded-full transition-colors">
            <span className="material-symbols-outlined">menu</span>
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
