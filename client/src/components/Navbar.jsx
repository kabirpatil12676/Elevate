import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
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
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY > lastScrollY && currentScrollY > 50) {
        setIsScrolledDown(true); // Scrolling down -> hide
        setIsCoursesOpen(false);
        setIsUserMenuOpen(false);
      } else if (currentScrollY < lastScrollY) {
        setIsScrolledDown(false); // Scrolling up -> show
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  // Close menus on route change
  useEffect(() => {
    setIsCoursesOpen(false);
    setIsUserMenuOpen(false);
    setIsMobileMenuOpen(false);
  }, [location]);

  const handleLogout = async () => {
    await logout();
    setIsUserMenuOpen(false);
    navigate('/');
  };

  return (
    <nav className={`fixed top-0 w-full z-50 bg-white/95 backdrop-blur-md border-b border-[#e1e3e4]/50 text-[#191c1e] transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${isScrolledDown ? '-translate-y-full' : 'translate-y-0'} shadow-sm font-['Inter']`}>
      <div className="max-w-[1280px] mx-auto px-6 md:px-12 flex items-center justify-between h-20">
        
        <Link to="/" className="text-2xl font-extrabold text-[#24389c] flex items-center gap-2 font-['Manrope'] tracking-tight hover:opacity-90 transition-opacity">
          <img src={mainLogo} alt="ELEVATE Logo" className="h-10 w-auto object-contain" />
          ELEVATE
        </Link>
        
        {/* Desktop Navigation Links */}
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
          <Link to="/events" className={`text-sm transition-colors ${location.pathname.startsWith('/events') ? 'text-[#24389c] font-semibold border-b-2 border-[#24389c] pb-0.5' : 'text-[#454652] hover:text-[#24389c]'}`}>Workshops</Link>
          <Link to="/testimonials" className={`text-sm transition-colors ${location.pathname === '/testimonials' ? 'text-[#24389c] font-semibold border-b-2 border-[#24389c] pb-0.5' : 'text-[#454652] hover:text-[#24389c]'}`}>Testimonials</Link>
          <Link to="/about-elevate" className={`text-sm transition-colors ${location.pathname === '/about-elevate' ? 'text-[#24389c] font-semibold border-b-2 border-[#24389c] pb-0.5' : 'text-[#454652] hover:text-[#24389c]'}`}>About Elevate</Link>
        </div>
        
        {/* Right Action: Auth Buttons or User Avatar Dropdown */}
        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2.5 p-1.5 pl-3 pr-2.5 rounded-full border border-[#c5c5d4] hover:border-[#24389c] transition-all bg-[#f8f9fa] shadow-sm group"
                aria-label="User menu"
              >
                <div className="w-8 h-8 rounded-full bg-[#4353cf] text-white flex items-center justify-center font-bold text-xs uppercase shadow-sm">
                  {user?.name ? user.name.charAt(0) : 'U'}
                </div>
                <div className="hidden lg:flex flex-col text-left">
                  <span className="text-xs font-bold text-[#191c1e] line-clamp-1 max-w-[110px]">
                    {user?.name?.split(' ')[0] || 'Account'}
                  </span>
                  <span className="text-[10px] uppercase font-semibold text-[#4353cf] tracking-wider leading-none">
                    {user?.role || 'learner'}
                  </span>
                </div>
                <span className={`material-symbols-outlined text-[18px] text-[#757685] transition-transform duration-200 ${isUserMenuOpen ? 'rotate-180' : ''}`}>
                  expand_more
                </span>
              </button>

              {/* User Dropdown Menu */}
              <AnimatePresence>
                {isUserMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-[#e1e3e4] py-2 z-50"
                  >
                    <div className="px-4 py-3 border-b border-[#e1e3e4]">
                      <p className="text-xs text-[#757685]">Signed in as</p>
                      <p className="text-sm font-bold text-[#191c1e] truncate">{user?.name}</p>
                      <p className="text-xs text-[#757685] truncate">{user?.email}</p>
                      <span className="inline-block mt-1.5 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-[#4353cf]/10 text-[#4353cf] rounded-md">
                        {user?.role}
                      </span>
                    </div>

                    <div className="py-1">
                      <Link
                        to="/dashboard"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-[#454652] hover:bg-[#f3f4f5] hover:text-[#24389c] transition-colors"
                      >
                        <span className="material-symbols-outlined text-[18px]">dashboard</span>
                        Student Dashboard
                      </Link>

                      <Link
                        to="/growth-report"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-[#454652] hover:bg-[#f3f4f5] hover:text-[#24389c] transition-colors"
                      >
                        <span className="material-symbols-outlined text-[18px]">analytics</span>
                        Growth Report
                      </Link>

                      <Link
                        to="/portfolio"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-[#454652] hover:bg-[#f3f4f5] hover:text-[#24389c] transition-colors"
                      >
                        <span className="material-symbols-outlined text-[18px]">folder_special</span>
                        My Portfolio
                      </Link>

                      <Link
                        to="/events"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-[#454652] hover:bg-[#f3f4f5] hover:text-[#24389c] transition-colors"
                      >
                        <span className="material-symbols-outlined text-[18px]">groups</span>
                        Workshops & Events
                      </Link>

                      <Link
                        to="/learning-needs"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-[#454652] hover:bg-[#f3f4f5] hover:text-[#24389c] transition-colors"
                      >
                        <span className="material-symbols-outlined text-[18px]">psychology</span>
                        Learning Diagnostic
                      </Link>

                      {(user?.role === 'educator' || user?.role === 'admin') && (
                        <Link
                          to="/educator"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-[#454652] hover:bg-[#f3f4f5] hover:text-[#24389c] transition-colors"
                        >
                          <span className="material-symbols-outlined text-[18px]">school</span>
                          Educator Studio
                        </Link>
                      )}

                      {user?.role === 'admin' && (
                        <Link
                          to="/admin"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-[#454652] hover:bg-[#f3f4f5] hover:text-[#24389c] transition-colors"
                        >
                          <span className="material-symbols-outlined text-[18px]">admin_panel_settings</span>
                          Admin Console
                        </Link>
                      )}
                    </div>

                    <div className="border-t border-[#e1e3e4] pt-1">
                      <button
                        onClick={handleLogout}
                        className="w-full text-left flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-[#ba1a1a] hover:bg-[#ffdad6]/30 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[18px]">logout</span>
                        Sign out
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                to="/login"
                className="hidden md:block text-sm font-semibold text-[#454652] hover:text-[#24389c] transition-colors border border-[#c5c5d4] hover:border-[#24389c] px-7 py-2 rounded-full shadow-sm"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="hidden lg:block text-sm font-semibold bg-[#4353cf] hover:bg-[#2435b4] text-white px-6 py-2 rounded-full shadow-sm transition-colors"
              >
                Join ELEVATE
              </Link>
            </div>
          )}

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden text-[#191c1e] p-2 hover:bg-[#f3f4f5] rounded-full transition-colors"
            aria-label="Toggle mobile menu"
          >
            <span className="material-symbols-outlined">
              {isMobileMenuOpen ? 'close' : 'menu'}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-b border-[#e1e3e4] px-6 py-6 shadow-lg overflow-hidden"
          >
            <div className="flex flex-col space-y-4">
              <Link to="/courses" className="text-base font-semibold text-[#191c1e] hover:text-[#24389c]">Courses</Link>
              <Link to="/community" className="text-base font-semibold text-[#191c1e] hover:text-[#24389c]">Community</Link>
              <Link to="/career-roadmaps" className="text-base font-semibold text-[#191c1e] hover:text-[#24389c]">Career Roadmaps</Link>
              <Link to="/events" className="text-base font-semibold text-[#191c1e] hover:text-[#24389c]">Workshops & Events</Link>
              <Link to="/testimonials" className="text-base font-semibold text-[#191c1e] hover:text-[#24389c]">Testimonials</Link>
              <Link to="/about-elevate" className="text-base font-semibold text-[#191c1e] hover:text-[#24389c]">About Elevate</Link>

              <div className="pt-4 border-t border-[#e1e3e4] flex flex-col gap-3">
                {isAuthenticated ? (
                  <>
                    <div className="flex items-center gap-3 py-2">
                      <div className="w-9 h-9 rounded-full bg-[#4353cf] text-white flex items-center justify-center font-bold text-sm">
                        {user?.name?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[#191c1e]">{user?.name}</p>
                        <p className="text-xs text-[#757685]">{user?.email}</p>
                      </div>
                    </div>
                    <Link
                      to="/dashboard"
                      className="w-full text-center bg-[#4353cf] text-white py-2.5 rounded-xl font-semibold text-sm"
                    >
                      Dashboard
                    </Link>
                    <Link
                      to="/growth-report"
                      className="w-full text-center border border-[#4353cf] text-[#4353cf] py-2.5 rounded-xl font-semibold text-sm"
                    >
                      Growth Report
                    </Link>
                    <Link
                      to="/portfolio"
                      className="w-full text-center border border-[#4353cf] text-[#4353cf] py-2.5 rounded-xl font-semibold text-sm"
                    >
                      My Portfolio
                    </Link>
                    <Link
                      to="/events"
                      className="w-full text-center border border-[#4353cf] text-[#4353cf] py-2.5 rounded-xl font-semibold text-sm"
                    >
                      Workshops & Events
                    </Link>
                    <Link
                      to="/learning-needs"
                      className="w-full text-center border border-[#c6c5d6] text-[#454652] py-2.5 rounded-xl font-semibold text-sm"
                    >
                      Learning Diagnostic
                    </Link>
                    {(user?.role === 'educator' || user?.role === 'admin') && (
                      <Link
                        to="/educator"
                        className="w-full text-center bg-[#f0f4ff] border border-[#4353cf]/30 text-[#4353cf] py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-[18px]">school</span>
                        Educator Studio
                      </Link>
                    )}
                    <button
                      onClick={handleLogout}
                      className="w-full text-center border border-[#ba1a1a] text-[#ba1a1a] py-2.5 rounded-xl font-semibold text-sm"
                    >
                      Sign out
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      to="/login"
                      className="w-full text-center border border-[#c5c5d4] text-[#191c1e] py-2.5 rounded-xl font-semibold text-sm"
                    >
                      Login
                    </Link>
                    <Link
                      to="/register"
                      className="w-full text-center bg-[#4353cf] text-white py-2.5 rounded-xl font-semibold text-sm"
                    >
                      Create Free Account
                    </Link>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
