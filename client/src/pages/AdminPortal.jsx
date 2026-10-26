import React from 'react';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';

const AdminPortal = () => {
  const { user } = useAuth();

  return (
    <div className="bg-[#f7f9fc] text-[#191c1e] min-h-screen flex flex-col font-['Inter'] antialiased">
      <Navbar />
      <main className="flex-grow pt-28 pb-20">
        <div className="max-w-[1280px] mx-auto px-6 md:px-12">
          <div className="bg-white rounded-3xl p-8 md:p-12 border border-[#e1e3e4] shadow-sm mb-8">
            <span className="text-xs uppercase font-bold tracking-wider px-3 py-1 bg-[#ba1a1a]/10 text-[#ba1a1a] rounded-full inline-block mb-3">
              Administrator Console
            </span>
            <h1 className="text-3xl font-bold font-['Hanken_Grotesk'] text-[#191c1e] mb-2">
              Platform Administration
            </h1>
            <p className="text-sm text-[#454654]">
              Logged in as administrator: <span className="font-semibold text-[#191c1e]">{user?.name}</span> ({user?.email})
            </p>
          </div>
          <div className="bg-white p-8 rounded-2xl border border-[#e1e3e4] text-center text-[#757685] text-sm">
            Platform governance and cohort monitoring will connect in Phase 6.
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminPortal;
