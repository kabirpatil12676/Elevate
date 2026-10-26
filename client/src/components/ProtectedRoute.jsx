import React from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import mainLogo from '../assets/main_logo.png';

/**
 * Route guard component for authenticated and role-based access control.
 *
 * @param {object} props
 * @param {React.ReactNode} props.children
 * @param {string[]} [props.allowedRoles] - Optional list of permitted roles (e.g., ['educator', 'admin'])
 */
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f9fc] flex flex-col items-center justify-center font-['Inter']">
        <div className="flex items-center gap-3 mb-6">
          <img src={mainLogo} alt="ELEVATE Logo" className="h-10 w-auto animate-pulse" />
          <span className="text-2xl font-extrabold text-[#24389c] font-['Manrope']">ELEVATE</span>
        </div>
        <div className="w-10 h-10 border-4 border-[#4353cf]/20 border-t-[#4353cf] rounded-full animate-spin"></div>
        <p className="mt-4 text-sm text-[#454654] font-medium">Verifying authentication session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to login, preserving intended return route in state
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role authorization if specified
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen bg-[#f7f9fc] flex flex-col items-center justify-center p-6 text-center font-['Inter']">
        <div className="bg-white p-10 rounded-3xl shadow-sm border border-[#e1e3e4] max-w-md w-full">
          <div className="w-16 h-16 rounded-full bg-[#ffdad6] text-[#ba1a1a] flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-3xl">gpp_bad</span>
          </div>
          <h2 className="text-2xl font-bold text-[#191c1e] font-['Hanken_Grotesk'] mb-2">
            Access Restricted
          </h2>
          <p className="text-sm text-[#454654] mb-6 leading-relaxed">
            Your account ({user.role}) does not have permission to view this section.
          </p>
          <Link
            to="/"
            className="inline-block w-full bg-[#4353cf] hover:bg-[#2435b4] text-white font-semibold py-3 px-6 rounded-xl transition-colors shadow-sm text-sm"
          >
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
