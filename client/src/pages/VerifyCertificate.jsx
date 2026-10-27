import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import certificateService from '../services/certificate.service';

/**
 * ELEVATE Phase 5C — Public Certificate Verification Page
 *
 * Publicly verifiable credential page. Accessible without authentication.
 * Reveals only minimum necessary authenticity information to protect learner privacy.
 */
const VerifyCertificate = () => {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [verificationData, setVerificationData] = useState(null);
  const [errorState, setErrorState] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function verify() {
      if (!token) {
        if (mounted) {
          setErrorState({
            title: 'Missing Verification Token',
            message: 'No verification token was provided in the URL.',
          });
          setLoading(false);
        }
        return;
      }

      try {
        setLoading(true);
        const data = await certificateService.verifyCertificatePublic(token);
        if (mounted) {
          setVerificationData(data);
          setErrorState(null);
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setErrorState({
            title: 'Certificate Not Verified',
            message: err.data?.message || err.message || 'This credential token could not be verified in the official ELEVATE registry.',
          });
          setVerificationData(null);
          setLoading(false);
        }
      }
    }

    verify();

    return () => {
      mounted = false;
    };
  }, [token]);

  const formatDate = (isoString) => {
    if (!isoString) return 'N/A';
    try {
      return new Date(isoString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch (_) {
      return isoString;
    }
  };

  return (
    <div className="bg-[#f7f9fc] text-[#191c1e] min-h-screen flex flex-col font-['Inter'] antialiased">
      <Navbar />

      <main className="flex-grow pt-28 pb-16 flex items-center justify-center px-6">
        <div className="w-full max-w-2xl">

          {/* Loading State */}
          {loading && (
            <div className="bg-white rounded-3xl p-12 border border-[#e1e3e4] shadow-sm text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-[#4353cf] border-t-transparent mb-4"></div>
              <h2 className="text-xl font-bold text-[#191c1e] font-['Hanken_Grotesk']">
                Verifying Credential Authenticity...
              </h2>
              <p className="text-xs text-[#757685] mt-2">
                Checking the official ELEVATE platform registry.
              </p>
            </div>
          )}

          {/* Invalid / Error State */}
          {!loading && errorState && (
            <div className="bg-white rounded-3xl p-10 border border-red-200 shadow-sm text-center">
              <div className="w-16 h-16 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-3xl">gpp_bad</span>
              </div>
              <div className="inline-block px-3 py-1 bg-red-100 text-red-800 text-xs font-bold rounded-full uppercase tracking-wider mb-2">
                Verification Failed
              </div>
              <h1 className="text-2xl font-extrabold text-[#191c1e] font-['Hanken_Grotesk'] mt-1">
                {errorState.title}
              </h1>
              <p className="text-sm text-[#757685] max-w-md mx-auto mt-3 leading-relaxed">
                {errorState.message}
              </p>
              <div className="mt-8 pt-6 border-t border-[#e1e3e4] flex items-center justify-center gap-4">
                <Link
                  to="/"
                  className="px-5 py-2.5 bg-[#4353cf] text-white text-xs font-semibold rounded-xl hover:bg-[#2435b4] transition-colors"
                >
                  Return to ELEVATE Home
                </Link>
                <Link
                  to="/courses"
                  className="px-5 py-2.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Explore Growth Journeys
                </Link>
              </div>
            </div>
          )}

          {/* Revoked State */}
          {!loading && verificationData && verificationData.status === 'revoked' && (
            <div className="bg-white rounded-3xl p-10 border border-amber-300 shadow-sm text-center">
              <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-3xl">warning</span>
              </div>
              <div className="inline-block px-3 py-1 bg-amber-100 text-amber-900 text-xs font-bold rounded-full uppercase tracking-wider mb-2">
                Certificate Revoked
              </div>
              <h1 className="text-2xl font-extrabold text-[#191c1e] font-['Hanken_Grotesk'] mt-1">
                This Certificate Is No Longer Valid
              </h1>
              <p className="text-sm text-amber-900 max-w-md mx-auto mt-2 leading-relaxed">
                {verificationData.message}
              </p>

              <div className="mt-6 p-4 rounded-2xl bg-amber-50/60 border border-amber-200 text-left text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-amber-800 font-semibold">Certificate ID:</span>
                  <span className="font-mono font-bold text-amber-950">{verificationData.certificate_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-amber-800 font-semibold">
                    {verificationData.type === 'workshop' ? 'Workshop Masterclass:' : 'Growth Journey:'}
                  </span>
                  <span className="font-bold text-amber-950">{verificationData.journey_title || verificationData.workshop_title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-amber-800 font-semibold">Revocation Date:</span>
                  <span className="text-amber-950">{formatDate(verificationData.revoked_at)}</span>
                </div>
                {verificationData.revocation_reason && (
                  <div className="pt-2 border-t border-amber-200">
                    <span className="text-amber-800 font-semibold block">Reason for Revocation:</span>
                    <span className="text-amber-950 italic mt-0.5 block">"{verificationData.revocation_reason}"</span>
                  </div>
                )}
              </div>

              <div className="mt-8 pt-6 border-t border-[#e1e3e4]">
                <Link
                  to="/"
                  className="px-5 py-2.5 bg-slate-800 text-white text-xs font-semibold rounded-xl hover:bg-slate-900 transition-colors inline-block"
                >
                  Return to ELEVATE Home
                </Link>
              </div>
            </div>
          )}

          {/* Valid & Issued Certificate Card */}
          {!loading && verificationData && verificationData.valid && verificationData.status === 'issued' && (
            <div className="bg-white rounded-3xl p-8 md:p-12 border border-[#e1e3e4] shadow-sm relative overflow-hidden">
              {/* Decorative top strip */}
              <div className="absolute top-0 left-0 right-0 h-3 bg-gradient-to-r from-[#4353cf] via-indigo-500 to-emerald-500"></div>

              {/* Status Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#e1e3e4]">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full uppercase tracking-wider mb-2">
                    <span className="material-symbols-outlined text-sm">verified</span>
                    Verified Authentic Credential
                  </div>
                  <h1 className="text-2xl md:text-3xl font-extrabold text-[#191c1e] font-['Hanken_Grotesk']">
                    {verificationData.type === 'workshop' ? 'Certificate of Participation' : 'Certificate of Completion'}
                  </h1>
                </div>

                <div className="text-left sm:text-right bg-[#f7f9fc] p-3 rounded-2xl border border-[#e1e3e4]">
                  <span className="text-[10px] font-bold uppercase text-[#757685] tracking-wider block">
                    Certificate Number
                  </span>
                  <span className="font-mono font-bold text-sm text-[#4353cf]">
                    {verificationData.certificate_number}
                  </span>
                </div>
              </div>

              {/* Main Credentials Display */}
              <div className="mt-6 space-y-6">
                <div>
                  <span className="text-xs font-semibold text-[#757685] uppercase tracking-wider block">
                    Awarded To
                  </span>
                  <h2 className="text-2xl font-black text-[#191c1e] font-['Hanken_Grotesk'] mt-1">
                    {verificationData.learner_name || verificationData.recipient_name}
                  </h2>
                </div>

                <div className="p-5 rounded-2xl bg-[#f0f2fa] border border-[#d9dff5]">
                  <span className="text-[11px] font-bold text-[#4353cf] uppercase tracking-wider block">
                    {verificationData.type === 'workshop' ? 'Live Workshop Masterclass' : 'Growth Journey Completed'}
                  </span>
                  <h3 className="text-lg md:text-xl font-bold text-[#191c1e] font-['Hanken_Grotesk'] mt-1">
                    {verificationData.journey_title || verificationData.workshop_title || verificationData.title}
                  </h3>
                  {verificationData.facilitator_name && (
                    <p className="text-xs text-[#555664] mt-1 font-medium">
                      Facilitator: <span className="text-[#191c1e] font-semibold">{verificationData.facilitator_name}</span>
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[#757685]">
                    <span className="px-2.5 py-0.5 rounded-md bg-white border border-[#e1e3e4] font-medium text-[#454654]">
                      {verificationData.category || 'Workshop'}
                    </span>
                    <span>•</span>
                    <span className="px-2.5 py-0.5 rounded-md bg-white border border-[#e1e3e4] font-medium text-[#454654]">
                      {verificationData.skillDomain || verificationData.skill_domain || 'Applied Skills'}
                    </span>
                  </div>
                </div>

                {/* Verification Metadata Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 rounded-xl bg-[#fbfcfd] border border-[#e1e3e4]/80">
                    <span className="text-[#757685] block font-semibold uppercase text-[10px]">Date of Issuance</span>
                    <span className="text-sm font-bold text-[#191c1e] mt-0.5 block">
                      {formatDate(verificationData.issued_at)}
                    </span>
                  </div>

                  <div className="p-4 rounded-xl bg-[#fbfcfd] border border-[#e1e3e4]/80">
                    <span className="text-[#757685] block font-semibold uppercase text-[10px]">Pedagogical Model</span>
                    <span className="text-sm font-bold text-[#191c1e] mt-0.5 block">
                      {verificationData.type === 'workshop'
                        ? 'Live Hands-On Workshop & Mentorship'
                        : 'Six-Stage Model (Explore → Transform)'}
                    </span>
                  </div>
                </div>

                {/* Transparency Notice */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs leading-relaxed flex items-start gap-3">
                  <span className="material-symbols-outlined text-base text-[#4353cf] mt-0.5">policy</span>
                  <div>
                    <strong className="text-slate-900">ELEVATE Platform Verification Statement:</strong>{' '}
                    {verificationData.type === 'workshop'
                      ? 'This credential confirms that the learner actively attended and completed the live workshop sessions led by verified ELEVATE facilitators. All attendance and verification records are permanently stored in the official ELEVATE PostgreSQL registry.'
                      : 'This credential confirms that the learner satisfied all curriculum requirements, completed every educator video capsule, and received educator approval for all required hands-on activities. All records are permanently stored in the ELEVATE PostgreSQL registry.'}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-8 pt-6 border-t border-[#e1e3e4] flex flex-wrap items-center justify-between gap-4">
                <Link
                  to="/courses"
                  className="px-5 py-2.5 bg-[#4353cf] text-white text-xs font-semibold rounded-xl hover:bg-[#2435b4] transition-colors inline-flex items-center gap-2 shadow-sm"
                >
                  <span className="material-symbols-outlined text-base">school</span>
                  Explore ELEVATE Journeys
                </Link>

                <Link
                  to="/"
                  className="text-xs font-semibold text-[#757685] hover:text-[#191c1e] transition-colors inline-flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[16px]">home</span>
                  ELEVATE Home
                </Link>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
};

export default VerifyCertificate;
