import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import mainLogo from '../assets/main_logo.png';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Client-side validation
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      const signedIn = await login(email.trim(), password);
      const intended = location.state?.from?.pathname;
      const roleHome =
        signedIn?.role === 'admin' ? '/admin' : signedIn?.role === 'educator' ? '/educator' : '/dashboard';
      const next =
        intended && intended !== '/dashboard' && intended !== '/'
          ? intended
          : roleHome;
      navigate(next, { replace: true });
    } catch (err) {
      // Show specific backend message or fallback
      setError(err.message || 'Invalid credentials. Please verify your email and password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f9fc] flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-['Inter'] antialiased">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link to="/" className="inline-flex items-center gap-2 mb-6 group">
          <img src={mainLogo} alt="ELEVATE Logo" className="h-10 w-auto object-contain transition-transform group-hover:scale-105" />
          <span className="text-2xl font-extrabold text-[#24389c] font-['Manrope'] tracking-tight">ELEVATE</span>
        </Link>
        <h2 className="text-3xl font-bold text-[#191c1e] font-['Hanken_Grotesk'] tracking-tight">
          Welcome back
        </h2>
        <p className="mt-2 text-sm text-[#454654]">
          Sign in to access your Growth Journeys and portfolio
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0"
      >
        <div className="bg-white py-10 px-6 sm:px-10 shadow-[0_10px_35px_-5px_rgba(0,0,0,0.06)] rounded-3xl border border-[#e1e3e4]">
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mb-6 p-4 rounded-xl bg-[#ffdad6] border border-[#ba1a1a]/20 flex items-start gap-3 text-[#93000a] text-sm"
              role="alert"
            >
              <span className="material-symbols-outlined text-lg shrink-0 mt-0.5">error</span>
              <span className="leading-snug">{error}</span>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-[#191c1e] mb-1.5">
                Email address
              </label>
              <div className="relative">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-[#f8f9fa] border border-[#c6c5d6] rounded-xl py-3 px-4 text-[#191c1e] text-sm focus:outline-none focus:border-[#4353cf] focus:bg-white focus:ring-4 focus:ring-[#4353cf]/15 transition-all placeholder:text-[#757685]"
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-sm font-semibold text-[#191c1e]">
                  Password
                </label>
              </div>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#f8f9fa] border border-[#c6c5d6] rounded-xl py-3 pl-4 pr-11 text-[#191c1e] text-sm focus:outline-none focus:border-[#4353cf] focus:bg-white focus:ring-4 focus:ring-[#4353cf]/15 transition-all placeholder:text-[#757685]"
                  disabled={loading}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#757685] hover:text-[#191c1e] p-1 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#4353cf] hover:bg-[#2435b4] text-white font-semibold py-3.5 px-6 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm mt-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Signing in...</span>
                </>
              ) : (
                <span>Sign in</span>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-[#e1e3e4] text-center text-sm text-[#454654]">
            Don't have an account?{' '}
            <Link to="/register" className="font-semibold text-[#4353cf] hover:text-[#2435b4] hover:underline">
              Create an account
            </Link>
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link to="/" className="text-xs text-[#757685] hover:text-[#191c1e] transition-colors inline-flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Back to ELEVATE Home
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
