import { useState, useEffect } from 'react';

// ── API base URL from environment (.env → VITE_API_URL)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function App() {
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  // Enhancement States
  const [searchTerm, setSearchTerm] = useState('');
  const [scoreFilter, setScoreFilter] = useState('all');
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  // Toast Notification States
  const [toast, setToast] = useState(null);
  const [toastTimeout, setToastTimeout] = useState(null);

  const showToast = (message, type = 'success') => {
    if (toastTimeout) clearTimeout(toastTimeout);
    setToast({ message, type });
    const timeout = setTimeout(() => setToast(null), 3000);
    setToastTimeout(timeout);
  };

  useEffect(() => {
    return () => {
      if (toastTimeout) clearTimeout(toastTimeout);
    };
  }, [toastTimeout]);

  useEffect(() => {
    fetchJobs(true);
  }, []);

  // Theme Sync Effect
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark-theme');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark-theme');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const fetchJobs = async (silent = false) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/jobs`);
      if (!response.ok) {
        throw new Error('Failed to fetch matched jobs from backend server.');
      }
      const data = await response.json();
      setJobs(data);
      setError(null);
      if (!silent) {
        showToast('Refreshed job listings successfully!');
      }
    } catch (err) {
      console.error(err);
      setError('Could not connect to backend server. Make sure it is running on port 5000 and MONGODB_URI is set.');
      showToast('Could not fetch jobs from server.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const deleteJob = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this job application?')) return;
    try {
      const response = await fetch(`${API_URL}/api/jobs/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setJobs(jobs.filter(job => job._id !== id));
        if (selectedJob && selectedJob._id === id) {
          setSelectedJob(null);
        }
        showToast('Job application deleted successfully.');
      } else {
        showToast('Failed to delete job.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error connecting to backend server.', 'error');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    showToast('Cover letter copied to clipboard!');
  };

  // Stats calculation
  const totalScanned = jobs.length;
  const highMatches = jobs.filter(j => j.match_score >= 85).length;
  const avgScore = totalScanned > 0 ? Math.round(jobs.reduce((acc, curr) => acc + curr.match_score, 0) / totalScanned) : 0;

  // Search & Filter Logic
  const filteredJobs = jobs.filter(job => {
    const searchContent = `${job.title} ${job.fit_summary} ${job.gaps || ''} ${job.tailored_resume_tips || ''}`.toLowerCase();
    const matchesSearch = searchContent.includes(searchTerm.toLowerCase());
    if (scoreFilter === 'high')   return matchesSearch && job.match_score >= 85;
    if (scoreFilter === 'medium') return matchesSearch && job.match_score >= 75 && job.match_score < 85;
    return matchesSearch;
  });

  // Distribution metrics
  const dist95_100 = jobs.filter(j => j.match_score >= 95).length;
  const dist90_94  = jobs.filter(j => j.match_score >= 90 && j.match_score < 95).length;
  const dist85_89  = jobs.filter(j => j.match_score >= 85 && j.match_score < 90).length;
  const dist80_84  = jobs.filter(j => j.match_score >= 80 && j.match_score < 85).length;
  const dist75_79  = jobs.filter(j => j.match_score >= 75 && j.match_score < 80).length;
  const maxCount   = Math.max(dist95_100, dist90_94, dist85_89, dist80_84, dist75_79, 1);

  // Top keywords
  const getKeywordStats = () => {
    const keywords = ['Node.js','React','TypeScript','JavaScript','Python','AWS','Docker','Kubernetes','Backend','Full-Stack','Frontend','Remote'];
    const stats = {};
    keywords.forEach(kw => { stats[kw] = 0; });
    jobs.forEach(job => {
      const text = `${job.title} ${job.fit_summary} ${job.gaps || ''} ${job.tailored_resume_tips || ''}`.toLowerCase();
      keywords.forEach(kw => { if (text.includes(kw.toLowerCase())) stats[kw]++; });
    });
    return Object.entries(stats).filter(([_, c]) => c > 0).sort((a,b)=>b[1]-a[1]).slice(0,5);
  };
  const topKeywords = getKeywordStats();

  /* ─── Shared class shorthands ──────────────────────────── */
  // Light: translucent white glass | Dark: deep-sapphire glass
  const glassCard  = 'bg-white/75 dark:bg-[rgba(18,27,61,0.6)] border border-[rgba(168,229,253,0.45)] dark:border-[rgba(139,92,246,0.18)] backdrop-blur-xl';
  const glassHover = 'hover:bg-white/92 dark:hover:bg-[rgba(28,39,81,0.75)] hover:border-[rgba(37,99,235,0.55)] dark:hover:border-[rgba(0,242,254,0.55)]';
  const textMain   = 'text-[#0c182b] dark:text-[#f1f5f9]';
  const textMuted  = 'text-[#4e6178] dark:text-[#64748b]';
  const textBody   = 'text-[#203147] dark:text-[#94a3b8]';

  return (
    <div className="max-w-[1150px] mx-auto px-4 sm:px-6 py-14">

      {/* ── Header ────────────────────────────────────────── */}
      <header className="flex flex-col sm:flex-row justify-between items-center pb-8 border-b border-[rgba(168,229,253,0.45)] dark:border-[rgba(139,92,246,0.18)] mb-14 gap-5 sm:gap-0">
        <div className="flex items-center gap-3 sm:gap-5">
          <div className={`text-3xl w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-2xl sm:rounded-[20px] flex items-center justify-center cursor-pointer transition-all duration-500 ${glassCard} shadow-md shadow-sky-200/30 dark:shadow-violet-900/20 hover:scale-110 hover:rotate-12 hover:-translate-y-1 hover:shadow-lg hover:shadow-sky-300/40 dark:hover:shadow-violet-500/25 animate-logo-float`}>
            <span className="inline-block transition-transform duration-300 hover:animate-logo-spark">🔄</span>
          </div>
          <div className="text-left">
            <h1 className="text-3xl sm:text-[36px] font-extrabold tracking-tight leading-tight py-1 bg-gradient-to-r from-violet-600 via-blue-500 to-cyan-400 bg-clip-text text-transparent dark:from-violet-400 dark:via-cyan-300 dark:to-sky-300">
              CareerSync AI
            </h1>
            <p className={`${textMuted} text-sm sm:text-[16.5px] font-medium mt-0.5`}>
              AI-Powered Career Intelligence &amp; Automation Hub
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
          <button
            className={`${glassCard} ${glassHover} ${textMain} px-5 py-3 rounded-xl font-bold text-sm sm:text-[15.5px] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:shadow-sky-200/30 dark:hover:shadow-cyan-900/30 cursor-pointer`}
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            title="Toggle Light/Dark Theme"
          >
            {theme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode'}
          </button>
          <button
            onClick={fetchJobs}
            className={`${glassCard} ${glassHover} ${textMain} px-7 py-3 rounded-xl font-bold text-sm sm:text-[15.5px] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:shadow-sky-200/30 dark:hover:shadow-cyan-900/30 cursor-pointer`}
          >
            🔄 Refresh
          </button>
        </div>
      </header>

      {/* ── Stats Section ─────────────────────────────────── */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {/* Total Matched */}
        <div className={`${glassCard} p-7 rounded-2xl relative overflow-hidden transition-all duration-300 shadow-lg shadow-sky-200/20 dark:shadow-black/25 hover:-translate-y-1.5 ${glassHover} hover:shadow-xl hover:shadow-sky-300/20 dark:hover:shadow-black/50`}>
          <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-violet-400 via-blue-400 to-cyan-400" />
          <h3 className={`text-[14px] uppercase tracking-widest ${textMuted} font-bold mb-1`}>Total Matched Jobs</h3>
          <p className={`text-5xl font-black tracking-tight ${textMain} my-2`}>{totalScanned}</p>
          <span className={`text-[14px] ${textMuted}`}>Found by n8n Agent</span>
        </div>

        {/* High Matches */}
        <div className={`${glassCard} p-7 rounded-2xl relative overflow-hidden transition-all duration-300 shadow-lg shadow-sky-200/20 dark:shadow-black/25 hover:-translate-y-1.5 ${glassHover} hover:shadow-xl hover:shadow-sky-300/20 dark:hover:shadow-black/50`}>
          <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400" />
          <h3 className={`text-[14px] uppercase tracking-widest ${textMuted} font-bold mb-1`}>High Probability Match</h3>
          <p className="text-5xl font-black tracking-tight text-emerald-600 dark:text-emerald-400 my-2">{highMatches}</p>
          <span className={`text-[14px] ${textMuted}`}>Score ≥ 85%</span>
        </div>

        {/* Avg Score */}
        <div className={`${glassCard} p-7 rounded-2xl relative overflow-hidden transition-all duration-300 shadow-lg shadow-sky-200/20 dark:shadow-black/25 hover:-translate-y-1.5 ${glassHover} hover:shadow-xl hover:shadow-sky-300/20 dark:hover:shadow-black/50`}>
          <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-blue-400 via-violet-500 to-fuchsia-500" />
          <h3 className={`text-[14px] uppercase tracking-widest ${textMuted} font-bold mb-1`}>Average Match Score</h3>
          <p className="text-5xl font-black tracking-tight text-blue-600 dark:text-cyan-400 my-2">{avgScore}%</p>
          <span className={`text-[14px] ${textMuted}`}>Overall Alignment</span>
        </div>
      </section>

      {/* ── Analytics Toggle ───────────────────────────────── */}
      {jobs.length > 0 && (
        <div className="flex justify-center mb-10">
          <button
            className={`${glassCard} ${glassHover} ${textMain} px-7 py-3 rounded-2xl font-bold text-[15px] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-sky-200/25 dark:hover:shadow-cyan-900/25 cursor-pointer ${showAnalytics ? 'border-blue-400/60 dark:border-cyan-400/50 shadow-blue-200/30 dark:shadow-cyan-900/30' : ''}`}
            onClick={() => setShowAnalytics(!showAnalytics)}
          >
            {showAnalytics ? '📊 Hide Analytics Insights' : '📊 View Analytics Insights'}
          </button>
        </div>
      )}

      {/* ── Analytics Drawer ───────────────────────────────── */}
      {showAnalytics && jobs.length > 0 && (
        <section className="grid grid-cols-1 md:grid-cols-[1.2fr_1fr] gap-6 mb-10 animate-slide-down">
          {/* Score Distribution */}
          <div className={`${glassCard} rounded-2xl p-7 shadow-lg shadow-sky-200/15 dark:shadow-black/25 transition-all`}>
            <h3 className={`text-[13px] uppercase tracking-widest ${textMuted} font-bold mb-6`}>Match Score Distribution</h3>
            <div className="flex flex-col gap-3.5">
              {[
                { label: '95 – 100%', count: dist95_100, grad: 'from-emerald-400 to-emerald-600' },
                { label: '90 – 94%',  count: dist90_94,  grad: 'from-emerald-400 to-teal-500' },
                { label: '85 – 89%',  count: dist85_89,  grad: 'from-blue-400 to-violet-500' },
                { label: '80 – 84%',  count: dist80_84,  grad: 'from-violet-400 to-fuchsia-500' },
                { label: '75 – 79%',  count: dist75_79,  grad: 'from-rose-400 to-pink-600' },
              ].map(({ label, count, grad }) => (
                <div key={label} className="flex items-center gap-4 text-sm sm:text-[15px]">
                  <span className={`w-[90px] ${textMuted} font-semibold text-left shrink-0`}>{label}</span>
                  <div className="flex-grow h-3 bg-sky-100/50 dark:bg-slate-800/50 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full animate-grow-bar bg-gradient-to-r ${grad}`}
                      style={{ width: `${(count / maxCount) * 100}%` }}
                    />
                  </div>
                  <span className={`w-7 font-bold ${textMain} text-right shrink-0`}>{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Keywords */}
          <div className={`${glassCard} rounded-2xl p-7 shadow-lg shadow-sky-200/15 dark:shadow-black/25 transition-all`}>
            <h3 className={`text-[13px] uppercase tracking-widest ${textMuted} font-bold mb-6`}>Top Stack Keywords Identified</h3>
            <div className="flex flex-col gap-3.5">
              {topKeywords.length > 0 ? (
                topKeywords.map(([kw, count]) => (
                  <div key={kw} className="flex items-center gap-4 text-sm sm:text-[15px]">
                    <span className={`w-[100px] ${textMain} font-semibold text-left shrink-0`}>{kw}</span>
                    <div className="flex-grow h-2 bg-sky-100/50 dark:bg-slate-800/50 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full animate-grow-bar bg-gradient-to-r from-blue-400 via-violet-500 to-cyan-400"
                        style={{ width: `${(count / jobs.length) * 100}%` }}
                      />
                    </div>
                    <span className={`w-[56px] font-semibold ${textMuted} text-right shrink-0`}>{count} {count === 1 ? 'job' : 'jobs'}</span>
                  </div>
                ))
              ) : (
                <p className={`${textMuted} text-sm text-center py-10`}>No tech stack keywords matched yet.</p>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── Search & Filter ─────────────────────────────────── */}
      {jobs.length > 0 && (
        <section className={`flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 mb-10 ${glassCard} rounded-2xl p-4 sm:px-6 shadow-md shadow-sky-200/20 dark:shadow-black/25 transition-all`}>
          {/* Search input */}
          <div className={`flex items-center gap-3 flex-grow max-w-full md:max-w-[480px] bg-white/50 dark:bg-[rgba(10,15,40,0.5)] border border-[rgba(168,229,253,0.5)] dark:border-[rgba(139,92,246,0.2)] rounded-xl px-4 py-2.5 transition-all focus-within:border-blue-500/70 dark:focus-within:border-cyan-400/60 focus-within:shadow-sm focus-within:shadow-blue-200/30 dark:focus-within:shadow-cyan-900/30`}>
            <span className={`text-base ${textMuted}`}>🔍</span>
            <input
              type="text"
              placeholder="Search by title, stack, or keywords..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`border-none bg-transparent outline-none w-full ${textMain} font-semibold text-[15px] placeholder:text-[#4e6178]/50 dark:placeholder:text-[#64748b]/60`}
            />
            {searchTerm && (
              <button className={`${textMuted} hover:${textMain} cursor-pointer text-base p-0.5`} onClick={() => setSearchTerm('')}>✕</button>
            )}
          </div>

          {/* Filter tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0 justify-start">
            {[
              { key: 'all',    label: 'All Matches',     count: jobs.length },
              { key: 'high',   label: 'High (≥85%)',     count: jobs.filter(j => j.match_score >= 85).length },
              { key: 'medium', label: 'Medium (75–84%)', count: jobs.filter(j => j.match_score >= 75 && j.match_score < 85).length },
            ].map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setScoreFilter(key)}
                className={`px-4 py-2 rounded-xl text-sm sm:text-[14.5px] font-bold cursor-pointer flex items-center gap-2 transition-all duration-200 flex-shrink-0 ${
                  scoreFilter === key
                    ? 'bg-gradient-to-r from-blue-500 to-violet-500 dark:from-cyan-500 dark:to-violet-500 text-white border border-transparent shadow-md shadow-blue-400/25 dark:shadow-cyan-500/20'
                    : `${glassCard} ${glassHover} ${textBody}`
                }`}
              >
                {label}
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                  scoreFilter === key
                    ? 'bg-white/20 text-white'
                    : 'bg-sky-100/70 dark:bg-[rgba(139,92,246,0.15)] text-[#203147] dark:text-[#94a3b8]'
                }`}>{count}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ── Main Content ─────────────────────────────────────── */}
      <main className="w-full">
        {loading ? (
          <div className={`flex flex-col items-center justify-center text-center py-24 ${glassCard} rounded-3xl shadow-md shadow-sky-200/20 dark:shadow-black/30`}>
            <div className="w-10 h-10 border-2 border-sky-200/30 border-t-blue-500 dark:border-t-cyan-400 rounded-full animate-spin mb-5" />
            <p className={`${textMuted} font-medium`}>Loading matching job applications...</p>
          </div>
        ) : error ? (
          <div className={`flex flex-col items-center justify-center text-center py-24 ${glassCard} rounded-3xl shadow-md shadow-sky-200/20 dark:shadow-black/30`}>
            <p className={`${textMain} font-bold mb-5 px-4`}>{error}</p>
            <button onClick={fetchJobs} className="bg-gradient-to-r from-blue-500 to-violet-500 dark:from-cyan-500 dark:to-violet-500 text-white font-bold px-6 py-2.5 rounded-xl cursor-pointer transition-all hover:opacity-90 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-400/30">Retry Connection</button>
          </div>
        ) : jobs.length === 0 ? (
          <div className={`flex flex-col items-center justify-center text-center py-24 ${glassCard} rounded-3xl shadow-md shadow-sky-200/20 dark:shadow-black/30`}>
            <div className="text-5xl mb-4 opacity-40">📁</div>
            <h3 className={`text-2xl font-bold mb-1.5 ${textMain}`}>No jobs matched yet</h3>
            <p className={`${textMuted} max-w-[400px] text-[16px]`}>Your n8n automation agent is monitoring RSS feeds and will add matched jobs here soon.</p>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className={`flex flex-col items-center justify-center text-center py-[70px] ${glassCard} rounded-3xl shadow-md shadow-sky-200/20 dark:shadow-black/30`}>
            <div className="text-5xl mb-4 opacity-40">🔍</div>
            <h3 className={`text-2xl font-bold mb-1.5 ${textMain}`}>No results found</h3>
            <p className={`${textMuted} max-w-[400px] text-[16px] mb-5`}>We couldn't find any matched jobs matching your current search or filter criteria.</p>
            <button
              className="bg-gradient-to-r from-blue-500 to-violet-500 dark:from-cyan-500 dark:to-violet-500 text-white font-bold px-6 py-2.5 rounded-xl cursor-pointer transition-all hover:opacity-90 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-400/30"
              onClick={() => { setSearchTerm(''); setScoreFilter('all'); }}
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredJobs.map((job) => {
              const score = job.match_score;
              const badgeClass = score >= 85
                ? 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/25'
                : score >= 75
                  ? 'bg-blue-500/10 text-blue-700 border border-blue-500/25 dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-500/25'
                  : 'bg-rose-500/10 text-rose-700 border border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/25';
              return (
                <div
                  key={job._id}
                  className={`group ${glassCard} p-6 rounded-2xl cursor-pointer transition-all duration-300 flex flex-col justify-between min-h-[255px] shadow-md shadow-sky-200/15 dark:shadow-black/25 hover:-translate-y-2 hover:border-[rgba(37,99,235,0.55)] dark:hover:border-[rgba(0,242,254,0.55)] hover:shadow-xl hover:shadow-blue-300/20 dark:hover:shadow-cyan-900/30`}
                  onClick={() => setSelectedJob(job)}
                >
                  <div className="flex justify-between items-center mb-4">
                    <span className={`text-[14px] font-bold px-3 py-1.5 rounded-full tracking-tight ${badgeClass}`}>{score}% Match</span>
                    <button
                      onClick={(e) => deleteJob(job._id, e)}
                      className={`bg-white/40 dark:bg-[rgba(10,15,40,0.5)] border border-[rgba(168,229,253,0.4)] dark:border-[rgba(139,92,246,0.18)] w-[38px] h-[38px] rounded-full flex items-center justify-center cursor-pointer opacity-50 transition-all hover:opacity-100 hover:bg-rose-500/10 hover:border-rose-500/35 text-base`}
                      title="Delete job"
                    >
                      🗑️
                    </button>
                  </div>
                  <h2 className={`text-xl sm:text-[22px] font-bold leading-snug mb-2 ${textMain} line-clamp-2 text-left`}>{job.title}</h2>
                  <p className={`${textMuted} text-sm sm:text-[15px] font-medium mb-3 text-left`}>🌐 {job.url?.split('/')?.[2] || 'Remote Job Board'}</p>
                  <p className={`${textBody} text-sm sm:text-[15.5px] leading-relaxed mb-5 line-clamp-3 text-left`}>{job.fit_summary}</p>
                  <div className="text-[14px] font-semibold text-blue-600 dark:text-cyan-400 text-left flex items-center gap-1">
                    <span>View Details &amp; Cover Letter</span>
                    <span className="transition-transform duration-300 group-hover:translate-x-1">➔</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className={`mt-24 p-6 sm:p-8 ${glassCard} rounded-3xl shadow-lg shadow-sky-200/15 dark:shadow-black/30 transition-all`}>
        <div className={`grid grid-cols-1 md:grid-cols-[2fr_1.2fr_1fr] gap-10 pb-8 border-b border-[rgba(168,229,253,0.35)] dark:border-[rgba(139,92,246,0.15)]`}>
          <div className="flex flex-col items-center md:items-start gap-3">
            <div className="flex items-center gap-2.5 text-xl">
              <span>🔄</span>
              <strong className={`${textMain} font-extrabold tracking-tight`}>CareerSync AI</strong>
            </div>
            <p className={`${textMuted} text-sm sm:text-[15px] leading-relaxed max-w-sm text-center md:text-left`}>
              Autonomous resume-matching and career intelligence automation hub.
            </p>
            <div className="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25 px-3.5 py-1.5 rounded-full text-[13px] font-bold mt-1">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block animate-pulse-dot" />
              <span>System Active &amp; Monitoring</span>
            </div>
          </div>

          <div className="flex flex-col items-center md:items-start gap-2">
            <h4 className={`text-[12px] uppercase tracking-widest ${textMuted} font-bold mb-3`}>Orchestration Stack</h4>
            <div className="flex flex-wrap gap-2 justify-center md:justify-start">
              {['n8n Workflow','Express Server','MongoDB Atlas','Groq AI Engine'].map(tag => (
                <span
                  key={tag}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-xl ${glassCard} ${glassHover} ${textBody} transition-all hover:-translate-y-0.5 cursor-pointer`}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="flex flex-col items-center md:items-start gap-2">
            <h4 className={`text-[12px] uppercase tracking-widest ${textMuted} font-bold mb-3`}>System Metrics</h4>
            <ul className="flex flex-col gap-2.5 w-full max-w-[200px]">
              <li className="flex justify-between text-[14px]">
                <span className={textMuted}>API Server</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">Online</span>
              </li>
              <li className="flex justify-between text-[14px]">
                <span className={textMuted}>Database</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">Stable</span>
              </li>
              <li className="flex justify-between text-[14px]">
                <span className={textMuted}>Match Engine</span>
                <span className={`font-bold ${textMain}`}>Active</span>
              </li>
            </ul>
          </div>
        </div>
        <div className={`flex justify-center items-center pt-5 text-sm ${textMuted} text-center`}>
          <p>© {new Date().getFullYear()} CareerSync AI. Created for modern career development.</p>
        </div>
      </footer>

      {/* ── Detail Modal ─────────────────────────────────────── */}
      {selectedJob && (
        <div
          className="fixed inset-0 bg-[rgba(8,13,33,0.45)] dark:bg-[rgba(5,8,20,0.7)] backdrop-blur-md flex items-center justify-center z-50 p-4 sm:p-6"
          onClick={() => setSelectedJob(null)}
        >
          <div
            className={`${glassCard} w-full max-w-[860px] max-h-[92vh] sm:max-h-[85vh] rounded-3xl shadow-2xl shadow-sky-300/15 dark:shadow-[rgba(0,242,254,0.08)] flex flex-col overflow-hidden animate-modal-slide-up`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <header className={`p-6 sm:p-7 border-b border-[rgba(168,229,253,0.35)] dark:border-[rgba(139,92,246,0.18)] flex justify-between items-start`}>
              <div className="text-left">
                <h2 className={`text-2xl sm:text-3xl font-bold leading-snug ${textMain}`}>{selectedJob.title}</h2>
                {selectedJob.url && (
                  <a href={selectedJob.url} target="_blank" rel="noreferrer" className="text-blue-600 dark:text-cyan-400 text-sm sm:text-[14.5px] font-bold hover:underline">
                    Open Job Posting 🔗
                  </a>
                )}
              </div>
              <button
                className={`bg-white/40 dark:bg-[rgba(10,15,40,0.5)] border border-[rgba(168,229,253,0.4)] dark:border-[rgba(139,92,246,0.18)] ${textMuted} w-10 h-10 rounded-full flex items-center justify-center cursor-pointer transition-all hover:bg-blue-100/60 dark:hover:bg-[rgba(0,242,254,0.1)] hover:text-blue-700 dark:hover:text-cyan-300 text-base`}
                onClick={() => setSelectedJob(null)}
              >✕</button>
            </header>

            {/* Modal Body */}
            <div className="p-6 sm:p-7 overflow-y-auto flex flex-col gap-5 sm:gap-6">
              {/* Score & Fit */}
              <section className={`flex flex-col sm:flex-row items-center gap-5 sm:gap-6 bg-sky-50/50 dark:bg-[rgba(10,15,40,0.6)] border border-[rgba(168,229,253,0.45)] dark:border-[rgba(139,92,246,0.2)] p-5 rounded-2xl`}>
                <div className="bg-gradient-to-br from-blue-500 via-violet-500 to-cyan-400 w-24 h-24 sm:w-[96px] sm:h-[96px] rounded-full flex flex-col items-center justify-center flex-shrink-0 shadow-lg shadow-blue-400/25 text-white">
                  <span className="text-[26px] sm:text-[28px] font-extrabold">{selectedJob.match_score}%</span>
                  <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider opacity-90">Match</p>
                </div>
                <div className="flex-grow text-left">
                  <h4 className={`text-[12px] uppercase tracking-widest ${textMuted} font-bold mb-1`}>AI Fit Analysis</h4>
                  <p className={`text-[15px] sm:text-lg leading-relaxed ${textBody}`}>{selectedJob.fit_summary}</p>
                </div>
              </section>

              {/* Gaps & Tips */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <section className="bg-rose-500/5 dark:bg-rose-500/8 border border-rose-400/20 dark:border-rose-500/20 p-5 rounded-2xl text-left">
                  <h4 className="text-[12px] uppercase tracking-widest text-rose-600 dark:text-rose-400 font-bold mb-2">⚠️ Gaps Identified</h4>
                  <p className={`text-[15px] sm:text-[16px] leading-relaxed ${textBody}`}>{selectedJob.gaps || 'No significant gaps identified!'}</p>
                </section>
                <section className={`bg-sky-50/50 dark:bg-[rgba(10,15,40,0.5)] border border-[rgba(168,229,253,0.4)] dark:border-[rgba(139,92,246,0.18)] p-5 rounded-2xl text-left`}>
                  <h4 className="text-[12px] uppercase tracking-widest text-blue-600 dark:text-cyan-400 font-bold mb-2">💡 Resume Alignment Tips</h4>
                  <p className={`text-[15px] sm:text-[16px] leading-relaxed ${textBody}`}>{selectedJob.tailored_resume_tips || 'Your resume is already highly aligned for this role!'}</p>
                </section>
              </div>

              {/* Cover Letter */}
              <section className="flex flex-col">
                <div className="flex justify-between items-center mb-3">
                  <h4 className={`text-[12px] uppercase tracking-widest ${textMuted} font-bold`}>✉️ Tailored Cover Letter</h4>
                  <button
                    onClick={() => copyToClipboard(selectedJob.cover_letter)}
                    className="bg-gradient-to-r from-blue-500 to-violet-500 dark:from-cyan-500 dark:to-violet-500 text-white font-bold hover:opacity-90 px-5 py-2.5 rounded-lg text-sm sm:text-[15px] cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5"
                  >
                    {copied ? '✅ Copied!' : '📋 Copy to Clipboard'}
                  </button>
                </div>
                <pre className={`bg-sky-50/40 dark:bg-[rgba(10,15,40,0.6)] border border-[rgba(168,229,253,0.4)] dark:border-[rgba(139,92,246,0.18)] p-5 rounded-2xl font-mono text-sm sm:text-[14px] leading-relaxed whitespace-pre-wrap max-h-[250px] overflow-y-auto ${textBody}`}>
                  {selectedJob.cover_letter}
                </pre>
              </section>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast Notification ───────────────────────────────── */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-2xl shadow-xl border backdrop-blur-md animate-toast-slide-in ${
            toast.type === 'error'
              ? 'bg-rose-500/90 text-white border-rose-400/30'
              : toast.type === 'info'
              ? 'bg-sky-500/90 text-white border-sky-400/30'
              : 'bg-emerald-600/90 text-white border-emerald-500/30'
          }`}
        >
          <span className="text-xl">
            {toast.type === 'error' ? '❌' : toast.type === 'info' ? 'ℹ️' : '✅'}
          </span>
          <span className="font-bold text-sm sm:text-[14.5px]">{toast.message}</span>
        </div>
      )}
    </div>
  );
}

export default App;
