import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import diagnosticService from '../services/diagnostic.service';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [diagnosticState, setDiagnosticState] = useState({
    loading: true,
    submitted: false,
    needs: null,
    recommendations: [],
    catalogueNote: null,
  });

  useEffect(() => {
    let mounted = true;
    async function loadDiagnostic() {
      try {
        const res = await diagnosticService.getLearnerNeeds();
        if (!mounted) return;
        setDiagnosticState({
          loading: false,
          submitted: res.submitted || false,
          needs: res.needs || null,
          recommendations: res.recommendations || [],
          catalogueNote: res.catalogueNote || null,
        });
      } catch (_err) {
        if (!mounted) return;
        setDiagnosticState({
          loading: false,
          submitted: false,
          needs: null,
          recommendations: [],
          catalogueNote: null,
        });
      }
    }
    loadDiagnostic();
    return () => {
      mounted = false;
    };
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="bg-[#f7f9fc] text-[#191c1e] min-h-screen flex flex-col font-['Inter'] antialiased">
      <Navbar />

      <main className="flex-grow pt-28 pb-20">
        <div className="max-w-[1280px] mx-auto px-6 md:px-12">
          {/* Welcome Banner */}
          <div className="bg-white rounded-3xl p-8 md:p-12 border border-[#e1e3e4] shadow-sm mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-[#4353cf] text-white flex items-center justify-center font-bold text-2xl shadow-md">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl md:text-3xl font-bold text-[#191c1e] font-['Hanken_Grotesk']">
                    Welcome, {user?.name || 'Learner'}!
                  </h1>
                  <span className="text-xs uppercase font-bold tracking-wider px-3 py-1 bg-[#4353cf]/10 text-[#4353cf] rounded-full">
                    {user?.role || 'learner'}
                  </span>
                </div>
                <p className="text-sm text-[#454654] mt-1">{user?.email}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <Link
                to="/learning-needs"
                className="flex-1 md:flex-none text-center bg-[#4353cf] hover:bg-[#2435b4] text-white font-semibold px-6 py-2.5 rounded-xl transition-colors shadow-sm text-sm"
              >
                {diagnosticState.submitted ? 'View Diagnostic' : 'Take Questionnaire'}
              </Link>
              <Link
                to="/courses"
                className="flex-1 md:flex-none text-center border border-[#c6c5d6] hover:border-[#4353cf] text-[#4353cf] font-semibold px-6 py-2.5 rounded-xl transition-colors text-sm"
              >
                Browse Journeys
              </Link>
              <button
                onClick={handleLogout}
                className="flex-1 md:flex-none text-center border border-[#c6c5d6] hover:border-[#ba1a1a] text-[#454654] hover:text-[#ba1a1a] font-semibold px-6 py-2.5 rounded-xl transition-colors text-sm"
              >
                Log out
              </button>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <div className="bg-white p-6 rounded-2xl border border-[#e1e3e4] shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-[#757685] uppercase tracking-wider">
                  Diagnostic Status
                </span>
                <span className="material-symbols-outlined text-[#4353cf]">psychology</span>
              </div>
              <div className="text-2xl font-extrabold text-[#191c1e] font-['Hanken_Grotesk']">
                {diagnosticState.loading
                  ? '...'
                  : diagnosticState.submitted
                  ? 'Evaluated'
                  : 'Pending'}
              </div>
              <p className="text-xs text-[#757685] mt-1">
                {diagnosticState.submitted
                  ? `${diagnosticState.needs?.academic_year || 'Undergraduate'} Profile Saved`
                  : 'Complete to unlock tailored recommendations'}
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-[#e1e3e4] shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-[#757685] uppercase tracking-wider">
                  Top Recommended
                </span>
                <span className="material-symbols-outlined text-[#4353cf]">auto_awesome</span>
              </div>
              <div className="text-xl font-extrabold text-[#191c1e] font-['Hanken_Grotesk'] truncate">
                {diagnosticState.loading
                  ? '...'
                  : diagnosticState.recommendations[0]?.journey?.title || 'None yet'}
              </div>
              <p className="text-xs text-[#757685] mt-1">
                {diagnosticState.recommendations[0]
                  ? `Match Score: ${diagnosticState.recommendations[0].score} pts`
                  : 'Based on learning questionnaire'}
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-[#e1e3e4] shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-[#757685] uppercase tracking-wider">
                  Completed Stages
                </span>
                <span className="material-symbols-outlined text-[#4353cf]">task_alt</span>
              </div>
              <div className="text-2xl font-extrabold text-[#191c1e] font-['Hanken_Grotesk']">0 / 6</div>
              <p className="text-xs text-[#757685] mt-1">E-L-E-V-A-T experiential progress</p>
            </div>
          </div>

          {/* Section: Diagnostic Questionnaire Banner or Recommendations List */}
          {!diagnosticState.loading && (
            <div className="mb-10">
              {!diagnosticState.submitted ? (
                /* High-converting Callout when diagnostic is not submitted */
                <div className="bg-gradient-to-br from-[#f0f2fa] to-[#e4e9f7] border border-[#d9dff5] p-8 md:p-10 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-8 shadow-sm">
                  <div className="space-y-3 max-w-2xl">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#4353cf]/10 text-[#4353cf] text-xs font-bold rounded-full uppercase tracking-wider">
                      <span className="material-symbols-outlined text-sm">psychology</span>
                      Personalized Experiential Learning Path
                    </div>
                    <h2 className="text-2xl md:text-3xl font-bold text-[#191c1e] font-['Hanken_Grotesk']">
                      Discover Your Ideal Growth Journey
                    </h2>
                    <p className="text-sm text-[#454654] leading-relaxed">
                      Complete our 2-minute diagnostic questionnaire to identify your practical skill gaps,
                      engineering standing, and project priorities. Receive transparent, rule-matched recommendations
                      across all published ELEVATE Growth Journeys.
                    </p>
                  </div>

                  <Link
                    to="/learning-needs"
                    className="inline-flex items-center gap-2 px-8 py-4 bg-[#4353cf] hover:bg-[#2435b4] text-white font-bold rounded-2xl shadow-md hover:shadow-lg transition-all shrink-0 text-sm group"
                  >
                    Start Questionnaire
                    <span className="material-symbols-outlined text-base group-hover:translate-x-1 transition-transform">
                      arrow_forward
                    </span>
                  </Link>
                </div>
              ) : (
                /* Recommendations Card on Dashboard */
                <div className="bg-white rounded-3xl p-8 border border-[#e1e3e4] shadow-sm space-y-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#e1e3e4] pb-6">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-bold text-[#4353cf] uppercase tracking-wider mb-1">
                        <span className="material-symbols-outlined text-sm">verified</span>
                        Personalized Recommendations
                      </div>
                      <h2 className="text-2xl font-bold text-[#191c1e] font-['Hanken_Grotesk']">
                        Recommended Journeys for Your Profile
                      </h2>
                    </div>

                    <div className="flex items-center gap-3">
                      <Link
                        to="/learning-needs"
                        className="inline-flex items-center gap-2 px-4 py-2 border border-[#c6c5d6] hover:border-[#4353cf] text-[#4353cf] font-semibold text-xs rounded-xl transition-colors"
                      >
                        <span className="material-symbols-outlined text-sm">tune</span>
                        Adjust Responses
                      </Link>
                    </div>
                  </div>

                  {diagnosticState.catalogueNote && (
                    <div className="bg-[#fff9eb] border border-[#f5dfa8] rounded-2xl p-4 text-xs text-[#734900] flex items-start gap-3">
                      <span className="material-symbols-outlined text-[#b87405] text-base mt-0.5">info</span>
                      <div>{diagnosticState.catalogueNote}</div>
                    </div>
                  )}

                  {diagnosticState.recommendations.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-sm text-[#454654] mb-3">
                        No high-confidence matches found in the current catalogue for your specific criteria.
                      </p>
                      <Link
                        to="/courses"
                        className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#4353cf] text-white text-xs font-semibold rounded-xl"
                      >
                        Browse All Courses
                      </Link>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {diagnosticState.recommendations.map((rec, i) => (
                        <div
                          key={rec.journey.id}
                          className="bg-[#f7f9fc] rounded-2xl p-6 border border-[#e1e3e4] hover:border-[#4353cf]/40 transition-all flex flex-col justify-between"
                        >
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="px-2 py-0.5 bg-[#4353cf] text-white text-[10px] font-bold rounded">
                                #{i + 1} Match
                              </span>
                              <span className="text-xs font-bold text-[#4353cf]">
                                {rec.score} pts
                              </span>
                            </div>

                            <h3 className="font-bold text-[#191c1e] text-base font-['Hanken_Grotesk'] line-clamp-1 hover:text-[#4353cf] transition-colors">
                              <Link to={`/courses/${rec.journey.id}`}>{rec.journey.title}</Link>
                            </h3>

                            <p className="text-xs text-[#454654] line-clamp-2">
                              {rec.journey.description}
                            </p>

                            <div className="pt-2 border-t border-[#e1e3e4]">
                              <p className="text-[11px] text-[#757685] font-medium italic line-clamp-2">
                                "{rec.reasons[0]}"
                              </p>
                            </div>
                          </div>

                          <div className="mt-5 pt-3">
                            <Link
                              to={`/courses/${rec.journey.id}`}
                              className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-white hover:bg-[#4353cf] text-[#4353cf] hover:text-white border border-[#c6c5d6] hover:border-transparent font-semibold text-xs rounded-xl transition-all shadow-2xs"
                            >
                              Explore Journey
                              <span className="material-symbols-outlined text-xs">arrow_forward</span>
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Platform Status Notice */}
          <div className="bg-[#f0f2fa] border border-[#d9dff5] p-6 rounded-2xl flex items-start gap-4">
            <span className="material-symbols-outlined text-[#4353cf] text-2xl mt-0.5">info</span>
            <div>
              <h3 className="font-semibold text-sm text-[#191c1e] mb-1">
                Phase 2B Diagnostic & Recommendation System Active
              </h3>
              <p className="text-xs text-[#454654] leading-relaxed">
                Your learning needs are persisted securely in PostgreSQL. Recommendations are generated
                using transparent, deterministic rules without external AI dependencies. Subsequent phases will
                connect lecture video player, activity challenge submissions, and Razorpay enrollment.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
