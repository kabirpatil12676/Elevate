import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import portfolioService from '../services/portfolio.service';
import certificateService from '../services/certificate.service';

const GrowthReport = () => {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'timeline' | 'journeys' | 'portfolio'
  const [downloadingCertId, setDownloadingCertId] = useState(null);

  const handleDownloadCertificate = async (cert, journeyTitle) => {
    setDownloadingCertId(cert.id);
    try {
      const cleanTitle = (journeyTitle || 'Growth_Journey').replace(/[^a-zA-Z0-9_-]/g, '_');
      await certificateService.downloadCertificatePdf(cert.id, `${cleanTitle}_Certificate.pdf`);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to download certificate PDF.');
    } finally {
      setDownloadingCertId(null);
    }
  };

  const fetchReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await portfolioService.getGrowthReport();
      setReportData(data);
    } catch (err) {
      console.error('Failed to load growth report:', err);
      setError(err.response?.data?.message || 'Unable to load growth report. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const formatDate = (isoString) => {
    if (!isoString) return 'N/A';
    try {
      return new Date(isoString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="bg-[#f7f9fc] text-[#191c1e] min-h-screen flex flex-col font-['Inter'] antialiased print:bg-white print:text-black">
      {/* Hide navbar on print */}
      <div className="print:hidden">
        <Navbar />
      </div>

      <main className="flex-grow pt-24 md:pt-28 pb-16 print:pt-4 print:pb-0">
        <div className="max-w-[1280px] mx-auto px-6 md:px-12 print:px-2 print:max-w-none">
          
          {/* Top Actions & Breadcrumbs (Screen Only) */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6 print:hidden">
            <div className="flex items-center gap-2 text-sm text-[#757685]">
              <Link to="/dashboard" className="hover:text-[#4353cf] transition-colors flex items-center gap-1">
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                Dashboard
              </Link>
              <span>/</span>
              <span className="text-[#191c1e] font-semibold">Growth Report</span>
            </div>

            <div className="flex items-center gap-3">
              <Link
                to="/portfolio"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-[#4353cf] bg-[#4353cf]/10 hover:bg-[#4353cf]/20 rounded-xl transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">folder_special</span>
                Curate Portfolio
              </Link>
              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-[#4353cf] hover:bg-[#2435b4] rounded-xl shadow-sm transition-all"
                title="Print or Save as PDF"
              >
                <span className="material-symbols-outlined text-[18px]">print</span>
                Print Report / Save PDF
              </button>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="bg-white rounded-3xl p-16 border border-[#e1e3e4] shadow-sm text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-[#4353cf] border-t-transparent mb-4"></div>
              <h2 className="text-xl font-bold text-[#191c1e] font-['Hanken_Grotesk']">
                Compiling Learner Growth Evidence...
              </h2>
              <p className="text-sm text-[#757685] mt-1">
                Aggregating real lesson progress, practical submissions, and educator evaluations.
              </p>
            </div>
          )}

          {/* Error State */}
          {!loading && error && (
            <div className="bg-white rounded-3xl p-12 border border-[#ba1a1a]/30 shadow-sm text-center">
              <div className="w-16 h-16 rounded-full bg-[#ba1a1a]/10 text-[#ba1a1a] flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-3xl">error_outline</span>
              </div>
              <h2 className="text-xl font-bold text-[#191c1e] font-['Hanken_Grotesk']">
                Could Not Load Growth Report
              </h2>
              <p className="text-sm text-[#757685] max-w-md mx-auto mt-2 mb-6">
                {error}
              </p>
              <button
                onClick={fetchReport}
                className="px-6 py-2.5 bg-[#4353cf] text-white font-semibold rounded-xl hover:bg-[#2435b4] transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          {/* Report Content */}
          {!loading && !error && reportData && (
            <div className="space-y-8">
              
              {/* Printable Document Header (Formatted for PDF/Print) */}
              <div className="bg-white rounded-3xl p-8 md:p-10 border border-[#e1e3e4] shadow-sm print:border-b-2 print:border-gray-800 print:shadow-none print:p-0 print:rounded-none">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-[#e1e3e4] print:pb-4">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#4353cf] mb-1 print:text-black">
                      <span className="material-symbols-outlined text-sm">workspace_premium</span>
                      ELEVATE Pedagogical Platform
                    </div>
                    <h1 className="text-2xl md:text-3xl font-extrabold text-[#191c1e] font-['Hanken_Grotesk'] print:text-2xl">
                      Learner Growth & Evidence Report
                    </h1>
                    <p className="text-xs text-[#757685] mt-1 print:text-gray-600">
                      Six-Stage Experiential Model: Explore → Learn → Experience → Validate → Apply → Transform
                    </p>
                  </div>

                  <div className="text-left md:text-right bg-[#f7f9fc] p-4 rounded-2xl border border-[#e1e3e4] print:bg-white print:border-none print:p-0">
                    <p className="text-xs font-semibold text-[#757685] uppercase tracking-wider">Report Generated</p>
                    <p className="text-sm font-bold text-[#191c1e] font-mono mt-0.5">
                      {formatDate(reportData.generated_at)}
                    </p>
                    <span className="inline-block mt-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 print:border-gray-400">
                      Authoritative Database Record
                    </span>
                  </div>
                </div>

                {/* Learner Identity & Overview */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mt-6 print:grid-cols-5 print:gap-2">
                  <div className="p-4 bg-[#fbfcfd] rounded-2xl border border-[#e1e3e4]/70 print:border-gray-300">
                    <span className="text-xs text-[#757685] font-medium uppercase tracking-wider">Learner Name</span>
                    <p className="text-base font-bold text-[#191c1e] truncate mt-1">
                      {reportData.learner?.name || 'Registered Learner'}
                    </p>
                    <p className="text-xs text-[#757685] truncate">{reportData.learner?.email}</p>
                  </div>

                  <div className="p-4 bg-[#fbfcfd] rounded-2xl border border-[#e1e3e4]/70 print:border-gray-300">
                    <span className="text-xs text-[#757685] font-medium uppercase tracking-wider">Enrolled Journeys</span>
                    <p className="text-2xl font-black text-[#191c1e] font-['Hanken_Grotesk'] mt-1">
                      {reportData.overview?.enrolled_journeys_count || 0}
                    </p>
                    <p className="text-xs text-[#757685]">Active growth curricula</p>
                  </div>

                  <div className="p-4 bg-[#fbfcfd] rounded-2xl border border-[#e1e3e4]/70 print:border-gray-300">
                    <span className="text-xs text-[#757685] font-medium uppercase tracking-wider">Lesson Progress</span>
                    <p className="text-2xl font-black text-[#191c1e] font-['Hanken_Grotesk'] mt-1">
                      {reportData.overview?.completed_lessons || 0} / {reportData.overview?.total_lessons || 0}
                    </p>
                    <p className="text-xs text-[#757685]">
                      {reportData.overview?.lesson_completion_pct || 0}% video capsules completed
                    </p>
                  </div>

                  <div className="p-4 bg-[#fbfcfd] rounded-2xl border border-[#e1e3e4]/70 print:border-gray-300">
                    <span className="text-xs text-[#757685] font-medium uppercase tracking-wider">Practical Activities</span>
                    <p className="text-2xl font-black text-emerald-600 font-['Hanken_Grotesk'] mt-1 print:text-black">
                      {reportData.overview?.approved_activities || 0} Approved
                    </p>
                    <p className="text-xs text-[#757685]">
                      {reportData.overview?.pending_review_activities || 0} in review • {reportData.overview?.revision_requested_activities || 0} in revision
                    </p>
                  </div>

                  <div className="p-4 bg-[#fbfcfd] rounded-2xl border border-[#e1e3e4]/70 print:border-gray-300">
                    <span className="text-xs text-[#757685] font-medium uppercase tracking-wider">Certificates Earned</span>
                    <p className="text-2xl font-black text-amber-600 font-['Hanken_Grotesk'] mt-1 print:text-black">
                      {reportData.overview?.certificates_issued_count || 0} Issued
                    </p>
                    <p className="text-xs text-[#757685]">
                      Cryptographically verifiable credentials
                    </p>
                  </div>
                </div>

                {/* Honest Zero-State Starter Report Alert if Applicable */}
                {reportData.is_starter_report && (
                  <div className="mt-6 p-6 bg-blue-50/60 border border-blue-200 rounded-2xl text-blue-900 print:hidden">
                    <div className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-blue-600 mt-0.5">info</span>
                      <div>
                        <h3 className="font-bold text-sm">Welcome to Your ELEVATE Starter Growth Report</h3>
                        <p className="text-xs text-blue-800 mt-1 leading-relaxed">
                          This is an authentic zero-state baseline report. ELEVATE never fabricates achievements or generates fictitious metrics.
                          To record genuine growth evidence, enroll in a Growth Journey and complete learning capsules and hands-on activity challenges.
                        </p>
                        <div className="mt-3 flex gap-3">
                          <Link
                            to="/courses"
                            className="text-xs font-bold text-white bg-[#4353cf] px-4 py-1.5 rounded-lg hover:bg-[#2435b4] transition-colors"
                          >
                            Explore Growth Journeys
                          </Link>
                          <Link
                            to="/learning-needs"
                            className="text-xs font-bold text-[#4353cf] bg-white border border-[#4353cf]/30 px-4 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                          >
                            Complete Diagnostic
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Navigation Tabs (Screen Only) */}
              <div className="flex border-b border-[#e1e3e4] print:hidden gap-2 overflow-x-auto pb-1">
                {[
                  { id: 'overview', label: 'Overview & Metrics', icon: 'analytics' },
                  { id: 'timeline', label: '6-Stage Growth Timeline', icon: 'timeline' },
                  { id: 'journeys', label: 'Enrolled Journeys', icon: 'school' },
                  { id: 'portfolio', label: 'Featured Portfolio & Reflections', icon: 'grade' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-5 py-3 font-semibold text-sm rounded-t-xl transition-all border-b-2 whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'border-[#4353cf] text-[#4353cf] bg-white shadow-sm'
                        : 'border-transparent text-[#757685] hover:text-[#191c1e] hover:bg-white/50'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Section 1: Detailed Metrics & Audit Breakdown */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                <div className="bg-white rounded-3xl p-8 border border-[#e1e3e4] shadow-sm print:border-none print:shadow-none print:p-0">
                    <h2 className="text-xl font-bold text-[#191c1e] font-['Hanken_Grotesk'] mb-4 flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#4353cf]">fact_check</span>
                      Transparent Growth Audit & Measurement Summary
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="p-5 rounded-2xl bg-[#f7f9fc] border border-[#e1e3e4] print:bg-white print:border-gray-300">
                        <span className="text-xs font-bold text-[#757685] uppercase tracking-wider">
                          Video Capsules (Learn Stage)
                        </span>
                        <div className="mt-3 flex items-baseline gap-2">
                          <span className="text-3xl font-extrabold text-[#191c1e] font-['Hanken_Grotesk']">
                            {reportData.overview?.completed_lessons || 0}
                          </span>
                          <span className="text-sm font-semibold text-[#757685]">
                            / {reportData.overview?.total_lessons || 0} available
                          </span>
                        </div>
                        <div className="w-full bg-[#e1e3e4] h-2 rounded-full overflow-hidden mt-3">
                          <div
                            className="bg-[#4353cf] h-full rounded-full transition-all"
                            style={{ width: `${reportData.overview?.lesson_completion_pct || 0}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-[#757685] mt-2">
                          Tracked via persistent lesson progress records in PostgreSQL.
                        </p>
                      </div>

                      <div className="p-5 rounded-2xl bg-[#f7f9fc] border border-[#e1e3e4] print:bg-white print:border-gray-300">
                        <span className="text-xs font-bold text-[#757685] uppercase tracking-wider">
                          Practical Activities (Experience Stage)
                        </span>
                        <div className="mt-3 flex items-baseline gap-2">
                          <span className="text-3xl font-extrabold text-emerald-600 font-['Hanken_Grotesk'] print:text-black">
                            {reportData.overview?.approved_activities || 0}
                          </span>
                          <span className="text-sm font-semibold text-[#757685]">
                            / {reportData.overview?.total_activities || 0} required
                          </span>
                        </div>
                        <p className="text-xs text-[#757685] mt-3">
                          • {reportData.overview?.submitted_activities || 0} total submissions logged<br />
                          • {reportData.overview?.pending_review_activities || 0} awaiting educator review<br />
                          • {reportData.overview?.revision_requested_activities || 0} revisions requested
                        </p>
                      </div>

                      <div className="p-5 rounded-2xl bg-[#f7f9fc] border border-[#e1e3e4] print:bg-white print:border-gray-300">
                        <span className="text-xs font-bold text-[#757685] uppercase tracking-wider">
                          Curated Evidence (Transform Stage)
                        </span>
                        <div className="mt-3 flex items-baseline gap-2">
                          <span className="text-3xl font-extrabold text-[#4353cf] font-['Hanken_Grotesk'] print:text-black">
                            {reportData.overview?.featured_projects_count || 0}
                          </span>
                          <span className="text-sm font-semibold text-[#757685]">
                            portfolio projects
                          </span>
                        </div>
                        <p className="text-xs text-[#757685] mt-3 leading-relaxed">
                          Learner-selected approved projects featured in personal portfolio with associated educator assessments.
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 p-4 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 leading-relaxed print:border-gray-300 print:bg-white print:text-black">
                      <strong>ELEVATE Measurement Transparency Note:</strong> In accordance with our pedagogical framework, completed learning activities are strictly distinguished from educator-verified outcomes. Only activities genuinely reviewed and approved by educators are marked as approved. No arbitrary employability or skill improvements are claimed without recorded rubric evidence.
                    </div>

                    {/* Issued Certificates Section in Overview */}
                    {reportData.certificates?.length > 0 && (
                      <div className="mt-8 pt-6 border-t border-[#e1e3e4] print:border-gray-300">
                        <div className="flex items-center gap-2 mb-4">
                          <span className="material-symbols-outlined text-amber-600">workspace_premium</span>
                          <h3 className="font-bold text-base text-[#191c1e] font-['Hanken_Grotesk']">
                            Verified Growth Certificates ({reportData.certificates.length})
                          </h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {reportData.certificates.map((cert) => (
                            <div
                              key={cert.id}
                              className="p-5 rounded-2xl bg-[#fbfcfd] border border-emerald-200 text-xs flex flex-col justify-between print:border-gray-400"
                            >
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800">
                                    {cert.status === 'revoked' ? 'Revoked' : 'Verified'}
                                  </span>
                                  <span className="font-mono font-semibold text-slate-600 text-[11px]">
                                    {cert.certificate_number}
                                  </span>
                                </div>
                                <div className="font-bold text-sm text-[#191c1e] font-['Hanken_Grotesk']">
                                  {cert.journey_title || 'Growth Journey'}
                                </div>
                                <div className="text-[#757685] mt-1 text-[11px]">
                                  Issued: {formatDate(cert.issued_at)}
                                </div>
                              </div>
                              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 print:hidden">
                                <button
                                  onClick={() => handleDownloadCertificate(cert, cert.journey_title)}
                                  disabled={downloadingCertId === cert.id}
                                  className="flex-1 py-1.5 px-3 bg-[#4353cf] hover:bg-[#2435b4] text-white rounded-lg font-semibold text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer"
                                >
                                  <span className="material-symbols-outlined text-[14px]">download</span>
                                  {downloadingCertId === cert.id ? 'Downloading...' : 'Download Certificate PDF'}
                                </button>
                                <Link
                                  to={`/verify-certificate/${cert.verification_token}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="py-1.5 px-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg font-semibold text-xs flex items-center justify-center gap-1 transition-colors"
                                >
                                  <span className="material-symbols-outlined text-[14px]">verified</span>
                                  Verify
                                </Link>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Section 2: Six-Stage Growth Timeline (Core Pedagogical Framework) */}
              {activeTab === 'timeline' && (
                <div className="space-y-6">
                  <div className="bg-white rounded-3xl p-8 border border-[#e1e3e4] shadow-sm print:border-none print:shadow-none print:p-0">
                    <div className="border-b border-[#e1e3e4] pb-4 mb-6">
                      <h2 className="text-xl font-bold text-[#191c1e] font-['Hanken_Grotesk'] flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#4353cf]">route</span>
                        Six-Stage Experiential Growth Timeline
                      </h2>
                      <p className="text-xs text-[#757685] mt-1">
                        Comprehensive chronological progression across the ELEVATE pedagogical stages.
                      </p>
                    </div>

                    <div className="space-y-8">
                      {/* 1. Explore */}
                      <div className="relative pl-8 border-l-2 border-[#4353cf] pb-2">
                        <div className="absolute -left-[17px] top-0 w-8 h-8 rounded-full bg-[#4353cf] text-white flex items-center justify-center font-bold text-xs shadow-sm">
                          1
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-bold text-[#191c1e] font-['Hanken_Grotesk']">
                              Stage 1: Explore (Diagnostic Assessment & Baseline)
                            </h3>
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-blue-100 text-blue-800 rounded">
                              Diagnostic
                            </span>
                          </div>
                          <p className="text-xs text-[#757685] mt-0.5 mb-4">
                            Identifies prior competencies, academic situation, hesitation areas, and personalized learning goals.
                          </p>

                          {reportData.stages_timeline?.explore?.has_activity ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {reportData.stages_timeline.explore.evidence.map((ev, idx) => (
                                <div key={idx} className="p-4 rounded-xl bg-[#f7f9fc] border border-[#e1e3e4] text-xs space-y-2">
                                  <div className="flex items-center justify-between font-semibold text-[#191c1e]">
                                    <span>{ev.source || 'Diagnostic Profile'}</span>
                                    <span className="text-[#757685]">{formatDate(ev.created_at)}</span>
                                  </div>
                                  {ev.academic_year && (
                                    <p><strong className="text-[#454654]">Academic Year / Branch:</strong> {ev.academic_year} • {ev.branch}</p>
                                  )}
                                  {ev.learning_goals && (
                                    <p><strong className="text-[#454654]">Declared Goals:</strong> {ev.learning_goals}</p>
                                  )}
                                  {ev.competency_level && (
                                    <p><strong className="text-[#454654]">Baseline Competency:</strong> {ev.competency_level}</p>
                                  )}
                                  {ev.hesitation_areas && Array.isArray(ev.hesitation_areas) && ev.hesitation_areas.length > 0 && (
                                    <p><strong className="text-[#454654]">Focus / Hesitation Areas:</strong> {ev.hesitation_areas.join(', ')}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="p-4 rounded-xl bg-gray-50 border border-dashed border-gray-300 text-xs text-gray-500">
                              No diagnostic profile recorded yet. Complete the learning needs questionnaire to establish your baseline.
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 2. Learn */}
                      <div className="relative pl-8 border-l-2 border-[#4353cf] pb-2">
                        <div className="absolute -left-[17px] top-0 w-8 h-8 rounded-full bg-[#4353cf] text-white flex items-center justify-center font-bold text-xs shadow-sm">
                          2
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-bold text-[#191c1e] font-['Hanken_Grotesk']">
                              Stage 2: Learn (Educator-Led Learning Capsules)
                            </h3>
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded">
                              Knowledge
                            </span>
                          </div>
                          <p className="text-xs text-[#757685] mt-0.5 mb-4">
                            Focused video capsules authored by educators delivering concepts, frameworks, and practical demonstrations.
                          </p>

                          {reportData.stages_timeline?.learn?.has_activity ? (
                            <div className="space-y-2">
                              <p className="text-xs font-semibold text-emerald-700 mb-2">
                                ✅ {reportData.stages_timeline.learn.evidence.length} Lessons Completed & Verified
                              </p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                {reportData.stages_timeline.learn.evidence.map((l, idx) => (
                                  <div key={idx} className="p-3 bg-[#f7f9fc] rounded-xl border border-[#e1e3e4] text-xs">
                                    <div className="font-semibold text-[#191c1e] line-clamp-1">{l.title}</div>
                                    <div className="text-[11px] text-[#757685] mt-1 flex justify-between">
                                      <span>{l.journey_title}</span>
                                      <span>{l.duration_min} min</span>
                                    </div>
                                    <div className="text-[10px] text-emerald-600 mt-1">
                                      Completed {formatDate(l.completed_at)}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="p-4 rounded-xl bg-gray-50 border border-dashed border-gray-300 text-xs text-gray-500">
                              No video lessons completed yet in enrolled journeys.
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 3. Experience */}
                      <div className="relative pl-8 border-l-2 border-[#4353cf] pb-2">
                        <div className="absolute -left-[17px] top-0 w-8 h-8 rounded-full bg-[#4353cf] text-white flex items-center justify-center font-bold text-xs shadow-sm">
                          3
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-bold text-[#191c1e] font-['Hanken_Grotesk']">
                              Stage 3: Experience (Practical Activity Challenges)
                            </h3>
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-amber-100 text-amber-800 rounded">
                              Demonstrated Performance
                            </span>
                          </div>
                          <p className="text-xs text-[#757685] mt-0.5 mb-4">
                            Hands-on tasks and practical problem-solving submissions demonstrating real skill application.
                          </p>

                          {reportData.stages_timeline?.experience?.has_activity ? (
                            <div className="space-y-3">
                              {reportData.stages_timeline.experience.evidence.map((act, idx) => (
                                <div key={idx} className="p-4 bg-[#f7f9fc] rounded-xl border border-[#e1e3e4] text-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                                  <div>
                                    <span className="font-bold text-[#191c1e] text-sm">{act.title}</span>
                                    <p className="text-[#757685] mt-0.5">
                                      {act.journey_title} • Attempt #{act.attempt_num} • Submitted {formatDate(act.submitted_at)}
                                    </p>
                                    {act.project_url && (
                                      <a
                                        href={act.project_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[#4353cf] hover:underline inline-flex items-center gap-1 mt-1 text-xs"
                                      >
                                        <span className="material-symbols-outlined text-[14px]">link</span>
                                        {act.project_url}
                                      </a>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                                      act.submission_status === 'approved'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : act.submission_status === 'revision_requested'
                                        ? 'bg-amber-100 text-amber-800'
                                        : 'bg-blue-100 text-blue-800'
                                    }`}>
                                      {act.submission_status === 'approved' ? 'Approved' : act.submission_status === 'revision_requested' ? 'Revision Requested' : 'Awaiting Review'}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="p-4 rounded-xl bg-gray-50 border border-dashed border-gray-300 text-xs text-gray-500">
                              No practical activity submissions recorded yet.
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 4. Validate */}
                      <div className="relative pl-8 border-l-2 border-[#4353cf] pb-2">
                        <div className="absolute -left-[17px] top-0 w-8 h-8 rounded-full bg-[#4353cf] text-white flex items-center justify-center font-bold text-xs shadow-sm">
                          4
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-bold text-[#191c1e] font-['Hanken_Grotesk']">
                              Stage 4: Validate (Educator Feedback & Assessment)
                            </h3>
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-purple-100 text-purple-800 rounded">
                              Evaluated Outcome
                            </span>
                          </div>
                          <p className="text-xs text-[#757685] mt-0.5 mb-4">
                            Official educator assessment notes, rubric scores, and structured feedback records.
                          </p>

                          {reportData.stages_timeline?.validate?.has_activity ? (
                            <div className="space-y-4">
                              {reportData.stages_timeline.validate.evidence.map((val, idx) => (
                                <div key={idx} className="p-4 rounded-xl bg-purple-50/40 border border-purple-200 text-xs space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="font-bold text-[#191c1e] text-sm">{val.activity_title}</span>
                                    <span className="text-[#757685]">{formatDate(val.reviewed_at)}</span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className="text-xs font-semibold text-purple-900">
                                      Evaluator: {val.reviewer_name}
                                    </span>
                                    {val.feedback_score !== null && val.feedback_score !== undefined && (
                                      <span className="font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                                        Score: {val.feedback_score}/100
                                      </span>
                                    )}
                                  </div>
                                  {val.feedback_comments && (
                                    <div className="bg-white p-3 rounded-lg border border-purple-100 text-gray-800 italic">
                                      "{val.feedback_comments}"
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="p-4 rounded-xl bg-gray-50 border border-dashed border-gray-300 text-xs text-gray-500">
                              No educator feedback recorded yet. Submissions currently in review will appear here once assessed.
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 5. Apply */}
                      <div className="relative pl-8 border-l-2 border-[#4353cf] pb-2">
                        <div className="absolute -left-[17px] top-0 w-8 h-8 rounded-full bg-[#4353cf] text-white flex items-center justify-center font-bold text-xs shadow-sm">
                          5
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-bold text-[#191c1e] font-['Hanken_Grotesk']">
                              Stage 5: Apply (Authentic Tasks & Verified Projects)
                            </h3>
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded">
                              Real-World Application
                            </span>
                          </div>
                          <p className="text-xs text-[#757685] mt-0.5 mb-4">
                            Demonstrated application of skills through educator-approved project deliverables and live links.
                          </p>

                          {reportData.stages_timeline?.apply?.has_activity ? (
                            <div className="space-y-3">
                              {reportData.stages_timeline.apply.evidence.map((appItem, idx) => (
                                <div key={idx} className="p-4 rounded-xl bg-emerald-50/40 border border-emerald-200 text-xs space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="font-bold text-[#191c1e] text-sm">{appItem.activity_title}</span>
                                    <span className="text-emerald-700 font-bold bg-emerald-100 px-2.5 py-0.5 rounded-full">
                                      Verified Approved
                                    </span>
                                  </div>
                                  <p className="text-[#757685]">{appItem.journey_title}</p>
                                  {appItem.project_url && (
                                    <div className="mt-1">
                                      <a
                                        href={appItem.project_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[#4353cf] font-semibold hover:underline inline-flex items-center gap-1.5"
                                      >
                                        <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                                        {appItem.project_url}
                                      </a>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="p-4 rounded-xl bg-gray-50 border border-dashed border-gray-300 text-xs text-gray-500">
                              No approved project artifacts recorded yet. Complete activities and receive educator approval to build this evidence.
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 6. Transform */}
                      <div className="relative pl-8">
                        <div className="absolute -left-[17px] top-0 w-8 h-8 rounded-full bg-[#4353cf] text-white flex items-center justify-center font-bold text-xs shadow-sm">
                          6
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-bold text-[#191c1e] font-['Hanken_Grotesk']">
                              Stage 6: Transform (Curated Portfolio & Self-Reflections)
                            </h3>
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-blue-100 text-blue-800 rounded">
                              Growth Synthesis
                            </span>
                          </div>
                          <p className="text-xs text-[#757685] mt-0.5 mb-4">
                            Curated portfolio entries selected by learner, paired with personal reflections on learning milestones.
                          </p>

                          {reportData.stages_timeline?.transform?.has_activity ? (
                            <div className="space-y-4">
                              {/* Featured projects */}
                              {reportData.featured_portfolio?.length > 0 && (
                                <div className="space-y-3">
                                  <p className="text-xs font-bold uppercase tracking-wider text-[#4353cf]">
                                    Curated Portfolio Projects ({reportData.featured_portfolio.length})
                                  </p>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {reportData.featured_portfolio.map((item, idx) => (
                                      <div key={idx} className="p-4 rounded-xl bg-[#f7f9fc] border border-[#e1e3e4] text-xs space-y-2">
                                        <div className="flex items-center justify-between">
                                          <span className="font-bold text-[#191c1e] text-sm">{item.activity_title}</span>
                                          <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                                            Approved
                                          </span>
                                        </div>
                                        <p className="text-[#757685]">{item.journey_title}</p>
                                        {item.project_url && (
                                          <a
                                            href={item.project_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-[#4353cf] hover:underline inline-flex items-center gap-1 font-medium"
                                          >
                                            <span className="material-symbols-outlined text-[14px]">link</span>
                                            {item.project_url}
                                          </a>
                                        )}
                                        {item.description && (
                                          <div className="mt-2 p-2.5 bg-white rounded-lg border border-[#e1e3e4] text-[#454654]">
                                            <span className="text-[10px] font-bold uppercase text-[#757685] block mb-0.5">
                                              Learner Project Reflection:
                                            </span>
                                            "{item.description}"
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Reflections */}
                              {reportData.reflections?.length > 0 && (
                                <div className="space-y-3 mt-4">
                                  <p className="text-xs font-bold uppercase tracking-wider text-[#4353cf]">
                                    Learner Self-Reflections ({reportData.reflections.length})
                                  </p>
                                  <div className="space-y-3">
                                    {reportData.reflections.map((ref, idx) => (
                                      <div key={idx} className="p-4 rounded-xl bg-amber-50/50 border border-amber-200 text-xs space-y-2">
                                        <div className="flex items-center justify-between">
                                          <span className="font-bold text-[#191c1e]">
                                            {ref.scope === 'journey' ? `Journey: ${ref.journey_title}` : `Stage: ${ref.stage_title || 'Learning Stage'}`}
                                          </span>
                                          <span className="text-[10px] uppercase font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                                            Self-Reported
                                          </span>
                                        </div>

                                        {ref.reflection_text && (
                                          <p className="text-gray-800 leading-relaxed italic">
                                            "{ref.reflection_text}"
                                          </p>
                                        )}

                                        {ref.learned && (
                                          <p><strong className="text-amber-900">What I Learned:</strong> {ref.learned}</p>
                                        )}
                                        {ref.challenge && (
                                          <p><strong className="text-amber-900">Challenge Overcome:</strong> {ref.challenge}</p>
                                        )}
                                        {ref.evidence && (
                                          <p><strong className="text-amber-900">Practical Evidence:</strong> {ref.evidence}</p>
                                        )}
                                        {ref.improvement && (
                                          <p><strong className="text-amber-900">Next Growth Target:</strong> {ref.improvement}</p>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="p-4 rounded-xl bg-gray-50 border border-dashed border-gray-300 text-xs text-gray-500">
                              No curated portfolio entries or reflections added yet. Visit "Curate Portfolio" to add your approved projects and write reflections.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Section 3: Enrolled Journeys & Per-Journey Stages */}
              {activeTab === 'journeys' && (
                <div className="space-y-6">
                  <div className="bg-white rounded-3xl p-8 border border-[#e1e3e4] shadow-sm print:border-none print:shadow-none print:p-0">
                    <h2 className="text-xl font-bold text-[#191c1e] font-['Hanken_Grotesk'] mb-6 flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#4353cf]">school</span>
                      Enrolled Growth Journeys & Stage Audit
                    </h2>

                    {reportData.journeys?.length > 0 ? (
                      <div className="space-y-6">
                        {reportData.journeys.map((j) => (
                          <div key={j.journey_id} className="p-6 rounded-2xl bg-[#f7f9fc] border border-[#e1e3e4] print:bg-white print:border-gray-300">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#e1e3e4]">
                              <div>
                                <span className="text-xs uppercase font-bold text-[#4353cf] tracking-wider">
                                  {j.category || 'Engineering & Growth'} • {j.skill_domain || 'Experiential Track'}
                                </span>
                                <h3 className="text-xl font-bold text-[#191c1e] font-['Hanken_Grotesk'] mt-0.5">
                                  {j.title}
                                </h3>
                                <p className="text-xs text-[#757685] mt-1">
                                  Enrolled: {formatDate(j.enrolled_at)} • Badge: {j.badge || 'Verified Participant'}
                                </p>
                              </div>

                              <div className="flex items-center gap-4">
                                <div className="text-right">
                                  <span className="text-sm font-bold text-[#191c1e]">
                                    {j.completed_lessons} / {j.total_lessons} Lessons
                                  </span>
                                  <div className="text-xs text-[#757685]">{j.lesson_progress_pct}% completed</div>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                                  j.completed ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                                }`}>
                                  {j.completed ? 'Journey Completed' : 'In Progress'}
                                </span>
                              </div>
                            </div>

                            {/* Journey Certificate Status Banner */}
                            {j.certificate ? (
                              <div className="mt-4 p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                                <div className="flex items-center gap-2">
                                  <span className="material-symbols-outlined text-emerald-700 text-xl">verified</span>
                                  <div>
                                    <span className="font-bold text-emerald-900">
                                      Verified Growth Certificate Issued:
                                    </span>{' '}
                                    <span className="font-mono font-semibold text-emerald-800">
                                      {j.certificate.certificate_number}
                                    </span>
                                    <div className="text-[11px] text-emerald-700 mt-0.5">
                                      Issued on {formatDate(j.certificate.issued_at)}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 print:hidden">
                                  <button
                                    onClick={() => handleDownloadCertificate(j.certificate, j.title)}
                                    disabled={downloadingCertId === j.certificate.id}
                                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-xs inline-flex items-center gap-1 cursor-pointer"
                                  >
                                    <span className="material-symbols-outlined text-[14px]">download</span>
                                    {downloadingCertId === j.certificate.id ? 'Downloading...' : 'PDF'}
                                  </button>
                                  <Link
                                    to={`/verify-certificate/${j.certificate.verification_token}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3 py-1.5 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg font-semibold text-xs inline-flex items-center gap-1"
                                  >
                                    <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                                    Verify
                                  </Link>
                                </div>
                              </div>
                            ) : j.completed ? (
                              <div className="mt-4 p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-900 flex items-center justify-between">
                                <span className="flex items-center gap-1.5">
                                  <span className="material-symbols-outlined text-[#4353cf] text-sm">workspace_premium</span>
                                  All requirements fulfilled. You are eligible to claim your Verified Certificate from the Dashboard.
                                </span>
                                <Link
                                  to="/dashboard"
                                  className="text-[11px] font-bold text-[#4353cf] hover:underline print:hidden shrink-0 ml-2"
                                >
                                  Go to Dashboard →
                                </Link>
                              </div>
                            ) : null}

                            {/* Stage Progress Breakdown */}
                            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-center">
                              {j.stages?.map((st) => (
                                <div
                                  key={st.stage_id}
                                  className={`p-3 rounded-xl border text-xs ${
                                    st.completed
                                      ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                                      : 'bg-white border-[#e1e3e4] text-[#454654]'
                                  }`}
                                >
                                  <div className="text-[10px] uppercase font-bold text-[#757685]">
                                    {st.stage_type}
                                  </div>
                                  <div className="font-bold text-xs mt-1 truncate" title={st.title}>
                                    {st.title.split(':')[0] || st.title}
                                  </div>
                                  <div className="text-[10px] mt-1">
                                    {st.total_lessons > 0 ? `${st.completed_lessons}/${st.total_lessons} done` : `${st.activities?.length || 0} tasks`}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-300">
                        <p className="text-sm text-gray-500">No active journey enrollments found.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Section 4: Curated Portfolio & Self-Reflections View */}
              {activeTab === 'portfolio' && (
                <div className="space-y-6">
                  <div className="bg-white rounded-3xl p-8 border border-[#e1e3e4] shadow-sm print:border-none print:shadow-none print:p-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-[#e1e3e4]">
                      <div>
                        <h2 className="text-xl font-bold text-[#191c1e] font-['Hanken_Grotesk'] flex items-center gap-2">
                          <span className="material-symbols-outlined text-[#4353cf]">folder_special</span>
                          Curated Personal Portfolio Artifacts
                        </h2>
                        <p className="text-xs text-[#757685] mt-1">
                          Educator-approved practical projects handpicked by the learner as authentic demonstration of skill.
                        </p>
                      </div>

                      <div className="print:hidden">
                        <Link
                          to="/portfolio"
                          className="px-4 py-2 bg-[#4353cf] text-white text-xs font-semibold rounded-xl hover:bg-[#2435b4] transition-colors inline-flex items-center gap-1.5"
                        >
                          <span className="material-symbols-outlined text-[16px]">edit</span>
                          Manage Featured Items
                        </Link>
                      </div>
                    </div>

                    {reportData.featured_portfolio?.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {reportData.featured_portfolio.map((proj, idx) => (
                          <div key={idx} className="p-6 rounded-2xl bg-[#f7f9fc] border border-[#e1e3e4] text-xs space-y-3">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <span className="text-[10px] uppercase font-bold text-[#4353cf] tracking-wider">
                                  {proj.journey_title}
                                </span>
                                <h3 className="text-base font-bold text-[#191c1e] font-['Hanken_Grotesk'] mt-0.5">
                                  {proj.activity_title}
                                </h3>
                              </div>
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
                                Approved
                              </span>
                            </div>

                            {proj.project_url && (
                              <div className="p-2.5 bg-white rounded-xl border border-[#e1e3e4]">
                                <span className="text-[10px] text-[#757685] font-semibold block uppercase">Project Deliverable Link:</span>
                                <a
                                  href={proj.project_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[#4353cf] hover:underline font-medium break-all mt-0.5 inline-block"
                                >
                                  {proj.project_url}
                                </a>
                              </div>
                            )}

                            {proj.description && (
                              <div className="p-3 bg-white rounded-xl border border-[#e1e3e4] text-[#454654] leading-relaxed">
                                <span className="text-[10px] font-bold text-[#757685] uppercase block mb-1">
                                  Learner Reflection & Notes:
                                </span>
                                "{proj.description}"
                              </div>
                            )}

                            {proj.feedback_comments && (
                              <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-200 text-purple-950">
                                <span className="text-[10px] font-bold text-purple-800 uppercase block mb-0.5">
                                  Educator Feedback ({proj.reviewer_name || 'Educator'}):
                                </span>
                                "{proj.feedback_comments}"
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-10 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-300">
                        <span className="material-symbols-outlined text-4xl text-gray-400 mb-2">folder_open</span>
                        <p className="text-sm font-semibold text-gray-700">No Projects Featured in Portfolio Yet</p>
                        <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                          Once an educator approves your practical activity work, you can select it to feature in your personal portfolio.
                        </p>
                        <div className="mt-4 print:hidden">
                          <Link
                            to="/portfolio"
                            className="px-4 py-2 bg-[#4353cf] text-white text-xs font-semibold rounded-xl hover:bg-[#2435b4] transition-colors inline-block"
                          >
                            Browse Approved Work
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Printable Document Footer */}
              <div className="text-center pt-8 border-t border-[#e1e3e4] text-xs text-[#757685] print:pt-4 print:text-black">
                <p className="font-semibold">ELEVATE Experiential Learning Platform • Growth Evidence Summary</p>
                <p className="text-[11px] mt-0.5">
                  This report summarizes genuine learner activity recorded in PostgreSQL. Self-reflections are clearly demarcated as self-reported.
                </p>
              </div>

            </div>
          )}

        </div>
      </main>
    </div>
  );
};

export default GrowthReport;
