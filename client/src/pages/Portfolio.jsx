import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import portfolioService from '../services/portfolio.service';
import learnerService from '../services/learner.service';

const Portfolio = () => {
  const [activeTab, setActiveTab] = useState('featured'); // 'featured' | 'curate' | 'reflections'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successToast, setSuccessToast] = useState(null);

  // Data states
  const [portfolios, setPortfolios] = useState([]);
  const [approvedProjects, setApprovedProjects] = useState([]);
  const [reflections, setReflections] = useState([]);
  const [enrolledJourneys, setEnrolledJourneys] = useState([]);

  // Modal / Form edit states
  const [editingProject, setEditingProject] = useState(null);
  const [projectDescriptionInput, setProjectDescriptionInput] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  // Reflection form state
  const [selectedJourneyId, setSelectedJourneyId] = useState('');
  const [selectedStageId, setSelectedStageId] = useState('');
  const [journeyStages, setJourneyStages] = useState([]);
  const [reflectionForm, setReflectionForm] = useState({
    reflection_text: '',
    learned: '',
    challenge: '',
    evidence: '',
    improvement: '',
  });

  const showToast = (message) => {
    setSuccessToast(message);
    setTimeout(() => {
      setSuccessToast(null);
    }, 4000);
  };

  const loadAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [portRes, appRes, refRes, dashRes] = await Promise.all([
        portfolioService.getPortfolio(),
        portfolioService.getApprovedProjects(),
        portfolioService.getReflections(),
        learnerService.getLearnerDashboard(),
      ]);

      setPortfolios(portRes.portfolios || []);
      setApprovedProjects(appRes.projects || []);
      setReflections(refRes.reflections || []);

      const list = dashRes.enrollments || [];
      setEnrolledJourneys(list);
      if (list.length > 0 && !selectedJourneyId) {
        setSelectedJourneyId(list[0].journey.id);
      }
    } catch (err) {
      console.error('Failed to load portfolio data:', err);
      setError(err.response?.data?.message || 'Unable to load portfolio. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // When selected journey changes in reflections tab, load its stages
  useEffect(() => {
    if (!selectedJourneyId) {
      setJourneyStages([]);
      return;
    }
    const current = enrolledJourneys.find(e => e.journey.id === selectedJourneyId);
    if (current) {
      // Fetch full journey stages if needed
      learnerService.getJourneyPlayerData(selectedJourneyId)
        .then(res => {
          setJourneyStages(res.stages || []);
        })
        .catch(() => {
          setJourneyStages([]);
        });
    }
  }, [selectedJourneyId, enrolledJourneys]);

  // Handle Feature Project
  const handleFeatureProject = async (project, customDesc = '') => {
    setSubmittingAction(true);
    try {
      await portfolioService.featureProject({
        submission_id: project.submission_id,
        description: customDesc,
      });
      showToast(`"${project.activity_title}" featured in your portfolio!`);
      await loadAllData();
      setEditingProject(null);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to feature project.');
    } finally {
      setSubmittingAction(false);
    }
  };

  // Handle Unfeature Project
  const handleUnfeatureProject = async (submissionId, title) => {
    if (!window.confirm(`Remove "${title}" from your featured portfolio?\n\nNote: The underlying submission and official educator feedback will remain intact in your academic record.`)) {
      return;
    }

    setSubmittingAction(true);
    try {
      await portfolioService.unfeatureProject(submissionId);
      showToast(`Removed "${title}" from featured portfolio. Assessment history preserved.`);
      await loadAllData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to remove project from portfolio.');
    } finally {
      setSubmittingAction(false);
    }
  };

  // Handle Save Reflection
  const handleSaveReflection = async (e) => {
    e.preventDefault();
    if (!selectedJourneyId) {
      alert('Please select a Growth Journey.');
      return;
    }

    setSubmittingAction(true);
    try {
      await portfolioService.saveReflection({
        journey_id: selectedJourneyId,
        stage_id: selectedStageId || null,
        reflection_text: reflectionForm.reflection_text,
        learned: reflectionForm.learned,
        challenge: reflectionForm.challenge,
        evidence: reflectionForm.evidence,
        improvement: reflectionForm.improvement,
      });

      showToast('Your private reflection has been saved!');
      setReflectionForm({
        reflection_text: '',
        learned: '',
        challenge: '',
        evidence: '',
        improvement: '',
      });
      await loadAllData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save reflection.');
    } finally {
      setSubmittingAction(false);
    }
  };

  // Flatten all featured artifacts across portfolios
  const allFeaturedArtifacts = [];
  portfolios.forEach(p => {
    if (Array.isArray(p.artifacts)) {
      p.artifacts.forEach(a => {
        allFeaturedArtifacts.push({
          ...a,
          journey_title: a.journey_title || p.journey_title,
        });
      });
    }
  });

  return (
    <div className="bg-[#f7f9fc] text-[#191c1e] min-h-screen flex flex-col font-['Inter'] antialiased">
      <Navbar />

      <main className="flex-grow pt-24 md:pt-28 pb-16">
        <div className="max-w-[1280px] mx-auto px-6 md:px-12">
          
          {/* Top Breadcrumb & Switcher */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2 text-sm text-[#757685]">
              <Link to="/dashboard" className="hover:text-[#4353cf] transition-colors flex items-center gap-1">
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                Dashboard
              </Link>
              <span>/</span>
              <span className="text-[#191c1e] font-semibold">Personal Portfolio</span>
            </div>

            <div className="flex items-center gap-3">
              <Link
                to="/growth-report"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-[#4353cf] bg-[#4353cf]/10 hover:bg-[#4353cf]/20 rounded-xl transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">analytics</span>
                View Full Growth Report
              </Link>
            </div>
          </div>

          {/* Toast Notification */}
          {successToast && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl flex items-center gap-3 shadow-sm transition-all">
              <span className="material-symbols-outlined text-emerald-600">check_circle</span>
              <span className="text-sm font-semibold">{successToast}</span>
            </div>
          )}

          {/* Header Banner */}
          <div className="bg-white rounded-3xl p-8 md:p-10 border border-[#e1e3e4] shadow-sm mb-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#4353cf] mb-1">
                  <span className="material-symbols-outlined text-sm">lock</span>
                  Private & Learner-Curated
                </div>
                <h1 className="text-2xl md:text-3xl font-extrabold text-[#191c1e] font-['Hanken_Grotesk']">
                  My Growth Portfolio
                </h1>
                <p className="text-sm text-[#757685] mt-1 max-w-2xl leading-relaxed">
                  Curate your best educator-approved practical work into an authentic showcase of your skills.
                  Add personal reflections, track feedback scores, and organize evidence by Growth Journey.
                </p>
              </div>

              <div className="flex items-center gap-4 bg-[#f7f9fc] p-4 rounded-2xl border border-[#e1e3e4]">
                <div className="text-center px-3 border-r border-[#e1e3e4]">
                  <p className="text-2xl font-black text-[#4353cf] font-['Hanken_Grotesk']">
                    {allFeaturedArtifacts.length}
                  </p>
                  <span className="text-[11px] font-semibold text-[#757685] uppercase tracking-wider">
                    Featured
                  </span>
                </div>
                <div className="text-center px-3">
                  <p className="text-2xl font-black text-emerald-600 font-['Hanken_Grotesk']">
                    {approvedProjects.length}
                  </p>
                  <span className="text-[11px] font-semibold text-[#757685] uppercase tracking-wider">
                    Approved
                  </span>
                </div>
              </div>
            </div>

            {/* Privacy notice */}
            <div className="mt-6 pt-4 border-t border-[#e1e3e4]/60 flex items-center gap-2 text-xs text-[#757685]">
              <span className="material-symbols-outlined text-[16px] text-gray-500">security</span>
              <span>
                Your portfolio is strictly private by default. Removing an item from this showcase preserves the underlying educator feedback and submission history.
              </span>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-[#e1e3e4] mb-8 gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setActiveTab('featured')}
              className={`flex items-center gap-2 px-5 py-3 font-semibold text-sm rounded-t-xl transition-all border-b-2 whitespace-nowrap ${
                activeTab === 'featured'
                  ? 'border-[#4353cf] text-[#4353cf] bg-white shadow-sm'
                  : 'border-transparent text-[#757685] hover:text-[#191c1e] hover:bg-white/50'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">star</span>
              Featured Projects ({allFeaturedArtifacts.length})
            </button>

            <button
              onClick={() => setActiveTab('curate')}
              className={`flex items-center gap-2 px-5 py-3 font-semibold text-sm rounded-t-xl transition-all border-b-2 whitespace-nowrap ${
                activeTab === 'curate'
                  ? 'border-[#4353cf] text-[#4353cf] bg-white shadow-sm'
                  : 'border-transparent text-[#757685] hover:text-[#191c1e] hover:bg-white/50'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              Curate Approved Work ({approvedProjects.length})
            </button>

            <button
              onClick={() => setActiveTab('reflections')}
              className={`flex items-center gap-2 px-5 py-3 font-semibold text-sm rounded-t-xl transition-all border-b-2 whitespace-nowrap ${
                activeTab === 'reflections'
                  ? 'border-[#4353cf] text-[#4353cf] bg-white shadow-sm'
                  : 'border-transparent text-[#757685] hover:text-[#191c1e] hover:bg-white/50'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">edit_note</span>
              My Self-Reflections ({reflections.length})
            </button>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="bg-white rounded-3xl p-16 border border-[#e1e3e4] shadow-sm text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-[#4353cf] border-t-transparent mb-4"></div>
              <p className="text-sm text-[#757685]">Loading your personal portfolio...</p>
            </div>
          )}

          {/* Error State */}
          {!loading && error && (
            <div className="bg-white rounded-3xl p-12 border border-red-200 shadow-sm text-center">
              <p className="text-red-700 text-sm mb-4">{error}</p>
              <button
                onClick={loadAllData}
                className="px-5 py-2 bg-[#4353cf] text-white text-sm font-semibold rounded-xl"
              >
                Retry
              </button>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════════
              TAB 1: FEATURED PORTFOLIO PROJECTS
          ════════════════════════════════════════════════════════════════════ */}
          {!loading && !error && activeTab === 'featured' && (
            <div className="space-y-6">
              {allFeaturedArtifacts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {allFeaturedArtifacts.map((project, idx) => (
                    <div
                      key={idx}
                      className="bg-white rounded-3xl p-7 border border-[#e1e3e4] shadow-sm flex flex-col justify-between hover:border-[#4353cf]/40 transition-all"
                    >
                      <div>
                        {/* Header badge & title */}
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-[#4353cf] bg-[#4353cf]/10 px-2.5 py-0.5 rounded-md">
                            {project.journey_title}
                          </span>
                          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                            Approved
                          </span>
                        </div>

                        <h3 className="text-lg font-bold text-[#191c1e] font-['Hanken_Grotesk'] mt-1">
                          {project.activity_title}
                        </h3>
                        <p className="text-xs text-[#757685] mt-0.5">
                          Stage: {project.stage_title || project.stage_type}
                        </p>

                        {/* Deliverable link */}
                        {project.project_url && (
                          <div className="mt-4 p-3 rounded-xl bg-[#f7f9fc] border border-[#e1e3e4]">
                            <span className="text-[10px] font-bold uppercase text-[#757685] block">
                              Verified Deliverable Link
                            </span>
                            <a
                              href={project.project_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-semibold text-[#4353cf] hover:underline inline-flex items-center gap-1.5 break-all mt-0.5"
                            >
                              <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                              {project.project_url}
                            </a>
                          </div>
                        )}

                        {/* Personal Description / Reflection */}
                        <div className="mt-4">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold text-[#454654] uppercase tracking-wider">
                              Personal Reflection & Highlights
                            </span>
                            <button
                              onClick={() => {
                                setEditingProject(project);
                                setProjectDescriptionInput(project.description || '');
                              }}
                              className="text-xs font-semibold text-[#4353cf] hover:underline flex items-center gap-1"
                            >
                              <span className="material-symbols-outlined text-[14px]">edit</span>
                              Edit Notes
                            </button>
                          </div>
                          <p className="text-xs text-[#191c1e] bg-[#fbfcfd] p-3 rounded-xl border border-[#e1e3e4]/80 leading-relaxed italic">
                            {project.description ? `"${project.description}"` : 'No reflection notes added yet. Click edit to describe your achievements or learnings on this project.'}
                          </p>
                        </div>

                        {/* Educator Feedback section (read-only) */}
                        {project.feedback_comments && (
                          <div className="mt-4 p-3.5 rounded-xl bg-purple-50/60 border border-purple-200 text-xs">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold text-purple-950 flex items-center gap-1">
                                <span className="material-symbols-outlined text-[16px] text-purple-700">verified</span>
                                Educator Evaluation ({project.reviewer_name || 'Educator'})
                              </span>
                              {project.feedback_score !== null && project.feedback_score !== undefined && (
                                <span className="font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                                  Score: {project.feedback_score}/100
                                </span>
                              )}
                            </div>
                            <p className="text-purple-900 mt-1 italic">
                              "{project.feedback_comments}"
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Card Footer Actions */}
                      <div className="mt-6 pt-4 border-t border-[#e1e3e4] flex items-center justify-between">
                        <span className="text-[11px] text-[#757685]">
                          Featured {project.featured_at ? new Date(project.featured_at).toLocaleDateString() : ''}
                        </span>

                        <button
                          onClick={() => handleUnfeatureProject(project.submission_id, project.activity_title)}
                          disabled={submittingAction}
                          className="text-xs font-semibold text-gray-500 hover:text-red-600 transition-colors flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-red-50"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete_outline</span>
                          Remove from Portfolio
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-3xl p-16 border border-[#e1e3e4] shadow-sm text-center">
                  <div className="w-16 h-16 rounded-full bg-[#4353cf]/10 text-[#4353cf] flex items-center justify-center mx-auto mb-4">
                    <span className="material-symbols-outlined text-3xl">star_outline</span>
                  </div>
                  <h3 className="text-xl font-bold text-[#191c1e] font-['Hanken_Grotesk']">
                    No Projects Featured Yet
                  </h3>
                  <p className="text-sm text-[#757685] max-w-md mx-auto mt-2 mb-6">
                    You have not added any approved projects to your showcase. Browse your approved work to feature your best achievements.
                  </p>
                  <button
                    onClick={() => setActiveTab('curate')}
                    className="px-6 py-2.5 bg-[#4353cf] text-white font-semibold rounded-xl hover:bg-[#2435b4] transition-colors"
                  >
                    Curate Approved Work
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════════
              TAB 2: CURATE APPROVED PRACTICAL WORK
          ════════════════════════════════════════════════════════════════════ */}
          {!loading && !error && activeTab === 'curate' && (
            <div className="space-y-6">
              <div className="bg-white rounded-3xl p-6 border border-[#e1e3e4] shadow-sm">
                <h3 className="text-lg font-bold text-[#191c1e] font-['Hanken_Grotesk']">
                  Approved Practical Submissions
                </h3>
                <p className="text-xs text-[#757685] mt-1">
                  Only practical activities reviewed and verified as "Approved" by your educator are eligible for inclusion in your portfolio.
                </p>
              </div>

              {approvedProjects.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {approvedProjects.map((project) => (
                    <div
                      key={project.submission_id}
                      className="bg-white rounded-3xl p-7 border border-[#e1e3e4] shadow-sm flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-[#4353cf] bg-[#4353cf]/10 px-2.5 py-0.5 rounded-md">
                            {project.journey_title}
                          </span>
                          {project.is_featured ? (
                            <span className="text-[11px] font-bold uppercase tracking-wider text-[#4353cf] bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">star</span>
                              Currently Featured
                            </span>
                          ) : (
                            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                              Eligible to Feature
                            </span>
                          )}
                        </div>

                        <h4 className="text-lg font-bold text-[#191c1e] font-['Hanken_Grotesk'] mt-1">
                          {project.activity_title}
                        </h4>
                        <p className="text-xs text-[#757685] mt-0.5">
                          {project.stage_title || project.stage_type} • Attempt #{project.attempt_num}
                        </p>

                        {/* Project deliverable */}
                        {project.content_url && (
                          <div className="mt-3 p-3 rounded-xl bg-[#f7f9fc] border border-[#e1e3e4] text-xs">
                            <span className="text-[10px] font-bold uppercase text-[#757685] block">Deliverable URL</span>
                            <a
                              href={project.content_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#4353cf] font-semibold hover:underline inline-flex items-center gap-1 break-all mt-0.5"
                            >
                              <span className="material-symbols-outlined text-[14px]">link</span>
                              {project.content_url}
                            </a>
                          </div>
                        )}

                        {/* Educator review comments */}
                        {project.feedback_comments && (
                          <div className="mt-3 p-3 rounded-xl bg-purple-50/50 border border-purple-200 text-xs">
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-bold text-purple-900">
                                Review by {project.reviewer_name || 'Educator'}
                              </span>
                              {project.feedback_score !== null && project.feedback_score !== undefined && (
                                <span className="font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded text-[10px]">
                                  {project.feedback_score}/100
                                </span>
                              )}
                            </div>
                            <p className="text-purple-950 italic">"{project.feedback_comments}"</p>
                          </div>
                        )}
                      </div>

                      {/* Bottom action */}
                      <div className="mt-6 pt-4 border-t border-[#e1e3e4] flex items-center justify-between">
                        <span className="text-[11px] text-[#757685]">
                          Approved {new Date(project.updated_at).toLocaleDateString()}
                        </span>

                        {project.is_featured ? (
                          <button
                            onClick={() => handleUnfeatureProject(project.submission_id, project.activity_title)}
                            disabled={submittingAction}
                            className="px-4 py-2 border border-[#e1e3e4] text-red-600 hover:bg-red-50 font-semibold text-xs rounded-xl transition-colors"
                          >
                            Unfeature Project
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingProject(project);
                              setProjectDescriptionInput('');
                            }}
                            disabled={submittingAction}
                            className="px-4 py-2 bg-[#4353cf] hover:bg-[#2435b4] text-white font-semibold text-xs rounded-xl transition-colors flex items-center gap-1.5"
                          >
                            <span className="material-symbols-outlined text-[16px]">add_circle</span>
                            Feature in Portfolio
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-3xl p-16 border border-[#e1e3e4] shadow-sm text-center">
                  <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4">
                    <span className="material-symbols-outlined text-3xl">assignment_turned_in</span>
                  </div>
                  <h3 className="text-xl font-bold text-[#191c1e] font-['Hanken_Grotesk']">
                    No Approved Work Available Yet
                  </h3>
                  <p className="text-sm text-[#757685] max-w-md mx-auto mt-2 mb-6">
                    Practical activities you submit will appear here once your educator reviews and approves them.
                  </p>
                  <Link
                    to="/dashboard"
                    className="px-6 py-2.5 bg-[#4353cf] text-white font-semibold rounded-xl hover:bg-[#2435b4] transition-colors inline-block"
                  >
                    View Active Journeys
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════════
              TAB 3: MY SELF-REFLECTIONS
          ════════════════════════════════════════════════════════════════════ */}
          {!loading && !error && activeTab === 'reflections' && (
            <div className="space-y-8">
              {/* Add / Edit Reflection Form */}
              <div className="bg-white rounded-3xl p-8 border border-[#e1e3e4] shadow-sm">
                <div className="border-b border-[#e1e3e4] pb-4 mb-6">
                  <h3 className="text-xl font-bold text-[#191c1e] font-['Hanken_Grotesk'] flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#4353cf]">psychology_alt</span>
                    Record Private Learning Reflection
                  </h3>
                  <p className="text-xs text-[#757685] mt-1">
                    Guided reflection prompts inspired by Kolb's experiential cycle and Schön's reflective practice.
                  </p>
                </div>

                <form onSubmit={handleSaveReflection} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase text-[#454654] mb-1.5">
                        Growth Journey *
                      </label>
                      <select
                        value={selectedJourneyId}
                        onChange={(e) => setSelectedJourneyId(e.target.value)}
                        className="w-full bg-[#f7f9fc] border border-[#e1e3e4] rounded-xl px-4 py-2.5 text-sm font-medium text-[#191c1e] focus:outline-none focus:border-[#4353cf]"
                        required
                      >
                        <option value="">Select Enrolled Journey</option>
                        {enrolledJourneys.map(e => (
                          <option key={e.journey.id} value={e.journey.id}>
                            {e.journey.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase text-[#454654] mb-1.5">
                        Specific Stage (Optional)
                      </label>
                      <select
                        value={selectedStageId}
                        onChange={(e) => setSelectedStageId(e.target.value)}
                        className="w-full bg-[#f7f9fc] border border-[#e1e3e4] rounded-xl px-4 py-2.5 text-sm font-medium text-[#191c1e] focus:outline-none focus:border-[#4353cf]"
                      >
                        <option value="">Whole Journey Reflection (Overall)</option>
                        {journeyStages.map(st => (
                          <option key={st.id} value={st.id}>
                            {st.stage_type.toUpperCase()}: {st.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Guided Prompt Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#191c1e] mb-1">
                        1. What did I learn?
                      </label>
                      <input
                        type="text"
                        maxLength={1000}
                        placeholder="Key concepts or models understood..."
                        value={reflectionForm.learned}
                        onChange={(e) => setReflectionForm({ ...reflectionForm, learned: e.target.value })}
                        className="w-full bg-[#f7f9fc] border border-[#e1e3e4] rounded-xl px-4 py-2 text-xs text-[#191c1e] focus:outline-none focus:border-[#4353cf]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#191c1e] mb-1">
                        2. What challenge did I overcome?
                      </label>
                      <input
                        type="text"
                        maxLength={1000}
                        placeholder="Hesitations faced, technical friction, or communication hurdles..."
                        value={reflectionForm.challenge}
                        onChange={(e) => setReflectionForm({ ...reflectionForm, challenge: e.target.value })}
                        className="w-full bg-[#f7f9fc] border border-[#e1e3e4] rounded-xl px-4 py-2 text-xs text-[#191c1e] focus:outline-none focus:border-[#4353cf]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#191c1e] mb-1">
                        3. What practical evidence demonstrates my progress?
                      </label>
                      <input
                        type="text"
                        maxLength={1000}
                        placeholder="Activity submission, code repo, project artifact..."
                        value={reflectionForm.evidence}
                        onChange={(e) => setReflectionForm({ ...reflectionForm, evidence: e.target.value })}
                        className="w-full bg-[#f7f9fc] border border-[#e1e3e4] rounded-xl px-4 py-2 text-xs text-[#191c1e] focus:outline-none focus:border-[#4353cf]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#191c1e] mb-1">
                        4. What do I want to improve next?
                      </label>
                      <input
                        type="text"
                        maxLength={1000}
                        placeholder="Next target milestone or habit..."
                        value={reflectionForm.improvement}
                        onChange={(e) => setReflectionForm({ ...reflectionForm, improvement: e.target.value })}
                        className="w-full bg-[#f7f9fc] border border-[#e1e3e4] rounded-xl px-4 py-2 text-xs text-[#191c1e] focus:outline-none focus:border-[#4353cf]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#191c1e] mb-1">
                      Comprehensive Reflection Narrative (Max 2000 chars)
                    </label>
                    <textarea
                      rows={4}
                      maxLength={2000}
                      placeholder="Write your deeper thoughts and synthesis on this learning milestone..."
                      value={reflectionForm.reflection_text}
                      onChange={(e) => setReflectionForm({ ...reflectionForm, reflection_text: e.target.value })}
                      className="w-full bg-[#f7f9fc] border border-[#e1e3e4] rounded-xl p-4 text-xs text-[#191c1e] focus:outline-none focus:border-[#4353cf] leading-relaxed"
                    />
                    <div className="flex justify-between text-[11px] text-[#757685] mt-1">
                      <span>Reflections remain private and are clearly labelled as self-reported in growth reports.</span>
                      <span>{reflectionForm.reflection_text.length} / 2000</span>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={submittingAction}
                      className="px-6 py-2.5 bg-[#4353cf] hover:bg-[#2435b4] text-white font-semibold text-sm rounded-xl transition-colors shadow-sm disabled:opacity-50"
                    >
                      {submittingAction ? 'Saving...' : 'Save Reflection'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Existing Reflections List */}
              <div className="space-y-4">
                <h4 className="text-base font-bold text-[#191c1e] font-['Hanken_Grotesk']">
                  Saved Self-Reflections ({reflections.length})
                </h4>

                {reflections.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {reflections.map((ref, idx) => (
                      <div
                        key={idx}
                        className="bg-white rounded-2xl p-6 border border-[#e1e3e4] shadow-sm text-xs space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold uppercase text-[#4353cf] bg-[#4353cf]/10 px-2.5 py-0.5 rounded-md">
                            {ref.scope === 'journey' ? ref.journey_title : `${ref.journey_title} • ${ref.stage_title}`}
                          </span>
                          <span className="text-[10px] uppercase font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                            Self-Reported
                          </span>
                        </div>

                        {ref.reflection_text && (
                          <p className="text-gray-900 leading-relaxed italic bg-[#fbfcfd] p-3 rounded-xl border border-[#e1e3e4]/60">
                            "{ref.reflection_text}"
                          </p>
                        )}

                        <div className="space-y-1.5 pt-1 text-[11px]">
                          {ref.learned && (
                            <p><strong className="text-gray-700">Learned:</strong> {ref.learned}</p>
                          )}
                          {ref.challenge && (
                            <p><strong className="text-gray-700">Challenge:</strong> {ref.challenge}</p>
                          )}
                          {ref.evidence && (
                            <p><strong className="text-gray-700">Evidence:</strong> {ref.evidence}</p>
                          )}
                          {ref.improvement && (
                            <p><strong className="text-gray-700">Next Target:</strong> {ref.improvement}</p>
                          )}
                        </div>

                        <div className="text-[10px] text-[#757685] pt-2 border-t border-[#e1e3e4]">
                          Saved {ref.updated_at ? new Date(ref.updated_at).toLocaleDateString() : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center bg-white rounded-2xl border border-dashed border-[#e1e3e4]">
                    <p className="text-xs text-[#757685]">
                      No reflections saved yet. Use the form above to record your first reflection.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════════
              EDIT PROJECT DESCRIPTION MODAL
          ════════════════════════════════════════════════════════════════════ */}
          {editingProject && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
              <div className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full border border-[#e1e3e4] shadow-2xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#e1e3e4]">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-[#4353cf]">
                      Feature in Portfolio
                    </span>
                    <h3 className="text-lg font-bold text-[#191c1e] font-['Hanken_Grotesk'] mt-0.5">
                      {editingProject.activity_title}
                    </h3>
                  </div>
                  <button
                    onClick={() => setEditingProject(null)}
                    className="text-gray-400 hover:text-gray-700 p-1"
                  >
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#191c1e] mb-1.5">
                    Personal Project Description / Reflection (Max 1000 chars)
                  </label>
                  <textarea
                    rows={4}
                    maxLength={1000}
                    value={projectDescriptionInput}
                    onChange={(e) => setProjectDescriptionInput(e.target.value)}
                    placeholder="Briefly describe what you built, what tools you used, and what key skills this demonstrates..."
                    className="w-full bg-[#f7f9fc] border border-[#e1e3e4] rounded-xl p-3 text-xs text-[#191c1e] focus:outline-none focus:border-[#4353cf] leading-relaxed"
                  />
                  <div className="flex justify-between text-[11px] text-[#757685] mt-1">
                    <span>This description will appear alongside your verified project deliverable.</span>
                    <span>{projectDescriptionInput.length} / 1000</span>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-[#e1e3e4]">
                  <button
                    onClick={() => setEditingProject(null)}
                    className="px-4 py-2 border border-[#e1e3e4] text-[#454654] text-xs font-semibold rounded-xl hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleFeatureProject(editingProject, projectDescriptionInput)}
                    disabled={submittingAction}
                    className="px-5 py-2 bg-[#4353cf] hover:bg-[#2435b4] text-white text-xs font-semibold rounded-xl transition-colors shadow-sm disabled:opacity-50"
                  >
                    {submittingAction ? 'Saving...' : 'Save to Portfolio'}
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
};

export default Portfolio;
