'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { get, post } from '@/lib/api';
import { getAuth, clearAuth } from '@/lib/auth';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

/* ─── Constants ──────────────────────────────────────────────── */

const TYPE_LABELS = {
  behavioral: 'Behavioral',
  technical: 'Technical',
  system_design: 'System Design',
  hr_culture_fit: 'HR / Culture Fit',
};

const TYPE_COLORS = {
  behavioral: '#c0c0c0',
  technical: '#e2e8f0',
  system_design: '#94a3b8',
  hr_culture_fit: '#f59e0b',
};

const TYPE_ICONS = {
  behavioral: '💬',
  technical: '⚡',
  system_design: '🏗️',
  hr_culture_fit: '🤝',
};

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: '◻' },
  { key: 'new', label: 'New Interview', icon: '＋' },
];

const QUICK_ACTIONS = [
  { type: 'behavioral', icon: '💬', title: 'Behavioral', desc: 'Practice STAR answers & leadership stories' },
  { type: 'technical', icon: '⚡', title: 'Technical', desc: 'Sharpen problem-solving & coding logic' },
  { type: 'system_design', icon: '🏗️', title: 'System Design', desc: 'Design scalable architectures' },
];

/* ─── Helpers ────────────────────────────────────────────────── */

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit',
  });
}

function getDuration(start, end) {
  if (!start || !end) return '—';
  const mins = Math.round((new Date(end) - new Date(start)) / 60000);
  return `${mins} min`;
}

function getScoreColor(s) {
  if (s == null) return '#64748b';
  if (s >= 80) return '#10b981';
  if (s >= 60) return '#c0c0c0';
  if (s >= 40) return '#f59e0b';
  return '#ef4444';
}

/* ─── Sub-components ─────────────────────────────────────────── */

function MiniGauge({ score, size = 48 }) {
  const radius = (size - 6) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = score != null ? circ - (score / 100) * circ : circ;
  const color = getScoreColor(score);

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={4} />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={4}
        strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)' }} />
    </svg>
  );
}

function ScoreTrendChart({ sessions }) {
  const completed = sessions
    .filter((s) => s.overallScore != null)
    .slice(0, 8) // sessions arrive newest first: take the latest 8, then show them oldest → newest
    .reverse();

  if (completed.length < 2) {
    return (
      <div style={S.chartEmpty}>
        <span style={{ fontSize: 28, marginBottom: 8 }}>📈</span>
        <span style={{ fontSize: 13, color: '#64748b' }}>Complete 2+ interviews to see your trend</span>
      </div>
    );
  }

  // Format data for recharts
  const data = completed.map((s, i) => {
    return {
      name: `Session ${i + 1}`,
      score: s.overallScore,
      date: new Date(s.startedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    };
  });

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          background: 'rgba(10, 10, 10, 0.95)',
          border: '1px solid rgba(255,255,255,0.1)',
          padding: '10px 14px',
          borderRadius: '8px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        }}>
          <p style={{ color: '#94a3b8', fontSize: 12, marginBottom: 4 }}>{payload[0].payload.date}</p>
          <p style={{ color: '#f1f5f9', fontSize: 15, fontWeight: 600 }}>
            Score: <span style={{ color: '#c0c0c0' }}>{payload[0].value}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ width: '100%', height: 180, position: 'relative', left: -10, top: 10 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#c0c0c0" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#c0c0c0" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dy={10} />
          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1, strokeDasharray: '4 4' }} />
          <Area 
            type="monotone" 
            dataKey="score" 
            stroke="#c0c0c0" 
            strokeWidth={2}
            fillOpacity={1} 
            fill="url(#colorScore)" 
            activeDot={{ r: 5, fill: '#050505', stroke: '#c0c0c0', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function TypeDistribution({ sessions }) {
  const counts = {};
  let total = 0;
  sessions.forEach((s) => {
    counts[s.interviewType] = (counts[s.interviewType] || 0) + 1;
    total++;
  });

  if (total === 0) return null;

  const types = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {types.map(([type, count]) => (
        <div key={type}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 13, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>{TYPE_ICONS[type] || '📋'}</span>
              {TYPE_LABELS[type] || type}
            </span>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9' }}>{count}</span>
          </div>
          <div style={{ height: 6, background: 'rgba(255,255,255,0.04)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${(count / total) * 100}%`,
              background: TYPE_COLORS[type] || '#c0c0c0',
              borderRadius: 3,
              transition: 'width 1s ease',
            }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Styles ─────────────────────────────────────────────────── */

const S = {
  // Layout
  layout: { display: 'flex', minHeight: '100vh', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", background: '#050505' },

  // Sidebar
  sidebar: { width: 240, borderRight: '1px solid rgba(255,255,255,0.06)', padding: '24px 0', display: 'flex', flexDirection: 'column', background: 'rgba(8,8,8,0.95)', position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 50 },
  sidebarLogo: { display: 'flex', alignItems: 'center', gap: 10, padding: '0 24px', marginBottom: 40, cursor: 'pointer' },
  sidebarLogoIcon: { width: 28, height: 28, borderRadius: 7, background: 'linear-gradient(135deg,#e2e8f0,#c0c0c0,#94a3b8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, color: '#050505' },
  sidebarLogoText: { fontWeight: 700, fontSize: 17, color: '#f1f5f9', letterSpacing: '-0.02em' },
  sidebarNav: { flex: 1 },
  sidebarItem: (active) => ({
    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 24px', margin: '2px 12px', borderRadius: 8,
    fontSize: 14, fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s',
    color: active ? '#f1f5f9' : '#64748b',
    background: active ? 'rgba(255,255,255,0.06)' : 'transparent',
    border: 'none', fontFamily: 'inherit', width: 'calc(100% - 24px)', textAlign: 'left',
  }),
  sidebarItemIcon: { fontSize: 16, width: 20, textAlign: 'center' },
  sidebarUser: { padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 12 },
  sidebarAvatar: { width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg,#e2e8f0,#c0c0c0)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#050505', flexShrink: 0 },
  sidebarUserInfo: { flex: 1, minWidth: 0 },
  sidebarUserName: { fontSize: 13, fontWeight: 600, color: '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  sidebarUserRole: { fontSize: 11, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  logoutBtn: { background: 'none', border: 'none', color: '#64748b', fontSize: 13, cursor: 'pointer', padding: '4px 8px', borderRadius: 6, transition: 'color 0.2s', fontFamily: 'inherit' },

  // Main
  main: { flex: 1, marginLeft: 240, padding: '32px 40px', maxWidth: 1100 },

  // Mobile sidebar toggle
  mobileToggle: { display: 'none', position: 'fixed', top: 16, left: 16, zIndex: 60, background: 'rgba(12,12,12,0.9)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '8px 10px', color: '#f1f5f9', fontSize: 18, cursor: 'pointer', fontFamily: 'inherit' },
  mobileOverlay: { display: 'none', position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 40 },

  // Top bar
  topBar: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32, gap: 16, flexWrap: 'wrap' },
  greeting: { fontSize: 24, fontWeight: 700, color: '#f1f5f9', lineHeight: 1.3, letterSpacing: '-0.02em' },
  greetingSub: { fontSize: 13, color: '#64748b', marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 },
  dateBadge: { fontSize: 12, color: '#64748b', padding: '4px 10px', background: 'rgba(255,255,255,0.04)', borderRadius: 6 },
  ctaBtn: { background: 'linear-gradient(135deg,#e2e8f0,#c0c0c0,#94a3b8)', color: '#050505', padding: '10px 24px', borderRadius: 10, fontWeight: 600, fontSize: 14, border: 'none', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.3s', display: 'flex', alignItems: 'center', gap: 8 },

  // Stats
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 },
  statCard: { background: 'rgba(12,12,12,0.6)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '20px 22px', position: 'relative', overflow: 'hidden', transition: 'all 0.3s ease' },
  statCardAccent: { position: 'absolute', top: 0, left: 0, right: 0, height: 2 },
  statLabel: { fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: '#64748b', marginBottom: 12, textTransform: 'uppercase' },
  statValue: { fontSize: 28, fontWeight: 700, color: '#f1f5f9', lineHeight: 1 },
  statSub: { fontSize: 12, color: '#64748b', marginTop: 6 },
  statGaugeWrap: { display: 'flex', alignItems: 'center', gap: 14 },

  // Performance section
  perfGrid: { display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 16, marginBottom: 32 },
  perfCard: { background: 'rgba(12,12,12,0.6)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '22px 24px' },
  perfTitle: { fontSize: 13, fontWeight: 600, letterSpacing: '0.04em', color: '#94a3b8', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 },

  // Table
  tableWrap: { background: 'rgba(12,12,12,0.6)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, overflow: 'hidden', marginBottom: 32 },
  tableHeader: { padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.04)' },
  tableTitle: { fontSize: 14, fontWeight: 600, color: '#f1f5f9' },
  tableViewAll: { fontSize: 12, color: '#64748b', cursor: 'pointer', background: 'none', border: 'none', fontFamily: 'inherit', transition: 'color 0.2s' },
  tableRow: { display: 'grid', gridTemplateColumns: '1.4fr 1fr 0.7fr 1.2fr 0.8fr 40px', alignItems: 'center', padding: '14px 24px', borderBottom: '1px solid rgba(255,255,255,0.03)', cursor: 'pointer', transition: 'background 0.2s' },
  tableRowHead: { display: 'grid', gridTemplateColumns: '1.4fr 1fr 0.7fr 1.2fr 0.8fr 40px', padding: '10px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)' },
  tableColHead: { fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', color: '#4a5568', textTransform: 'uppercase' },
  tableType: { display: 'flex', alignItems: 'center', gap: 10 },
  tableTypeIcon: (color) => ({ width: 32, height: 32, borderRadius: 8, background: `${color}12`, border: `1px solid ${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }),
  tableTypeName: { fontSize: 13, fontWeight: 500, color: '#f1f5f9' },
  tableDate: { fontSize: 13, color: '#94a3b8' },
  tableDuration: { fontSize: 13, color: '#64748b' },
  tableScoreWrap: { display: 'flex', alignItems: 'center', gap: 10 },
  tableScoreBar: { flex: 1, height: 4, background: 'rgba(255,255,255,0.04)', borderRadius: 2, overflow: 'hidden', maxWidth: 60 },
  tableScoreBarFill: (score, color) => ({ height: '100%', width: `${score}%`, background: color, borderRadius: 2, transition: 'width 0.8s ease' }),
  tableScoreNum: (color) => ({ fontSize: 13, fontWeight: 600, color, minWidth: 24 }),
  tableStatus: (completed) => ({
    fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, letterSpacing: '0.03em',
    background: completed ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
    color: completed ? '#10b981' : '#f59e0b',
    border: `1px solid ${completed ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)'}`,
  }),
  tableArrow: { fontSize: 14, color: '#4a5568', textAlign: 'center' },

  // Quick actions
  quickGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 },
  quickCard: (color) => ({
    background: 'rgba(12,12,12,0.6)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14,
    padding: '22px 24px', cursor: 'pointer', transition: 'all 0.3s ease', position: 'relative', overflow: 'hidden',
  }),
  quickIcon: { fontSize: 24, marginBottom: 12 },
  quickTitle: { fontSize: 14, fontWeight: 600, color: '#f1f5f9', marginBottom: 4 },
  quickDesc: { fontSize: 12, color: '#64748b', lineHeight: 1.5 },
  quickArrow: { position: 'absolute', top: 22, right: 22, fontSize: 14, color: '#4a5568', transition: 'all 0.3s' },

  // Empty state
  emptyWrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '80px 24px' },
  emptyIcon: { fontSize: 56, marginBottom: 24, filter: 'grayscale(0.3)' },
  emptyTitle: { fontSize: 22, fontWeight: 700, color: '#f1f5f9', marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: '#64748b', maxWidth: 380, lineHeight: 1.6, marginBottom: 32 },
  emptyPills: { display: 'flex', gap: 10, marginTop: 24 },
  emptyPill: { fontSize: 11, fontWeight: 500, color: '#94a3b8', padding: '6px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: 20, border: '1px solid rgba(255,255,255,0.06)' },

  // Chart empty
  chartEmpty: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 160, textAlign: 'center' },

  // Spinner
  spinnerWrap: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' },
};

/* ─── Main Component ─────────────────────────────────────────── */

export default function DashboardPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [quickLoading, setQuickLoading] = useState(null);

  useEffect(() => {
    const auth = getAuth();
    if (!auth || !auth.token) {
      router.replace('/login');
      return;
    }
    setUser(auth.user);

    async function loadData() {
      try {
        const data = await get('/api/sessions');
        
        // Filter out abandoned in-progress sessions, keeping only the most recent one
        let foundActive = false;
        const cleanedData = data.filter(s => {
          if (s.status === 'completed') return true;
          if (s.status === 'in_progress' && !foundActive) {
            foundActive = true;
            return true;
          }
          return false;
        });
        
        setSessions(cleanedData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [router]);

  const handleLogout = () => {
    clearAuth();
    router.replace('/login');
  };

  const handleQuickStart = async (type) => {
    setQuickLoading(type);
    try {
      const data = await post('/api/sessions', { interviewType: type });
      router.push(`/interview/${data.sessionId}`);
    } catch (err) {
      setError(err.message);
      setQuickLoading(null);
    }
  };

  // Derived data
  const completedSessions = useMemo(() => sessions.filter((s) => s.status === 'completed'), [sessions]);
  // Only sessions that actually have a report count towards scores.
  const scores = sessions.map((s) => s.overallScore).filter((s) => s != null);
  const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
  const bestScore = scores.length ? Math.max(...scores) : null;
  const completionRate = sessions.length > 0 ? Math.round((completedSessions.length / sessions.length) * 100) : 0;
  const displaySessions = showAll ? sessions : sessions.slice(0, 5);

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  // ─── Render ───

  if (loading) {
    return (
      <div style={S.layout}>
        <div style={{ ...S.spinnerWrap, width: '100%' }}>
          <div className="spinner" />
        </div>
      </div>
    );
  }

  return (
    <div style={S.layout}>
      {/* Mobile toggle */}
      <button style={S.mobileToggle} className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>☰</button>
      {sidebarOpen && <div style={{ ...S.mobileOverlay, display: 'block' }} className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* ── Sidebar ── */}
      <aside style={{ ...S.sidebar, ...(sidebarOpen ? {} : {}) }} className={`dashboard-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div style={S.sidebarLogo} onClick={() => router.push('/')}>
          <div style={S.sidebarLogoIcon}>I</div>
          <span style={S.sidebarLogoText}>Intervu</span>
        </div>

        <nav style={S.sidebarNav}>
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              style={S.sidebarItem(item.key === 'dashboard')}
              onClick={() => {
                if (item.key === 'new') router.push('/interview/new');
                setSidebarOpen(false);
              }}
            >
              <span style={S.sidebarItemIcon}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div style={S.sidebarUser}>
          <div style={S.sidebarAvatar}>{user?.name?.[0]?.toUpperCase() || 'U'}</div>
          <div style={S.sidebarUserInfo}>
            <div style={S.sidebarUserName}>{user?.name || 'User'}</div>
            <div style={S.sidebarUserRole}>{user?.role || 'Candidate'}</div>
          </div>
          <button style={S.logoutBtn} onClick={handleLogout} title="Logout">↗</button>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main style={S.main} className="dashboard-main">

        {/* Top Bar */}
        <div style={S.topBar}>
          <div>
            <h1 style={S.greeting}>{getGreeting()}, {user?.name?.split(' ')[0] || 'there'}</h1>
            <div style={S.greetingSub}>
              {user?.role && <span>{user.role}</span>}
              {user?.experienceLevel && <span>· {user.experienceLevel}</span>}
              <span style={S.dateBadge}>{today}</span>
            </div>
          </div>
          <button style={S.ctaBtn} onClick={() => router.push('/interview/new')}>
            <span style={{ fontSize: 16 }}>＋</span> New Interview
          </button>
        </div>

        {error && <div className="error-toast" style={{ marginBottom: 24 }}>{error}</div>}

        {sessions.length === 0 ? (
          /* ── Empty State ── */
          <div style={S.emptyWrap}>
            <div style={S.emptyIcon}>🎯</div>
            <h2 style={S.emptyTitle}>Your interview journey starts here</h2>
            <p style={S.emptyDesc}>
              Practice with Aria, your AI interviewer who adapts to your answers in real-time.
              Get detailed feedback and score breakdowns after every session.
            </p>
            <button style={S.ctaBtn} onClick={() => router.push('/interview/new')}>
              Start Your First Interview →
            </button>
            <div style={S.emptyPills}>
              <span style={S.emptyPill}>AI Interviewer</span>
              <span style={S.emptyPill}>Instant Feedback</span>
              <span style={S.emptyPill}>Score Tracking</span>
            </div>
          </div>
        ) : (
          <>
            {/* ── Stats ── */}
            <div style={S.statsGrid} className="stats-grid">
              <div style={S.statCard}>
                <div style={{ ...S.statCardAccent, background: 'linear-gradient(90deg, #c0c0c0, transparent)' }} />
                <div style={S.statLabel}>Total Interviews</div>
                <div style={S.statValue}>{sessions.length}</div>
                <div style={S.statSub}>{completedSessions.length} completed</div>
              </div>

              <div style={S.statCard}>
                <div style={{ ...S.statCardAccent, background: `linear-gradient(90deg, ${getScoreColor(avgScore)}, transparent)` }} />
                <div style={S.statLabel}>Average Score</div>
                <div style={S.statGaugeWrap}>
                  <MiniGauge score={avgScore} />
                  <div>
                    <div style={{ ...S.statValue, color: getScoreColor(avgScore) }}>{avgScore ?? '—'}</div>
                    <div style={S.statSub}>out of 100</div>
                  </div>
                </div>
              </div>

              <div style={S.statCard}>
                <div style={{ ...S.statCardAccent, background: 'linear-gradient(90deg, #10b981, transparent)' }} />
                <div style={S.statLabel}>Completion Rate</div>
                <div style={S.statValue}>{completionRate}%</div>
                <div style={S.statSub}>{completedSessions.length} of {sessions.length} sessions</div>
              </div>

              <div style={S.statCard}>
                <div style={{ ...S.statCardAccent, background: `linear-gradient(90deg, ${getScoreColor(bestScore)}, transparent)` }} />
                <div style={S.statLabel}>Best Score</div>
                <div style={{ ...S.statValue, color: getScoreColor(bestScore) }}>{bestScore ?? '—'}</div>
                <div style={S.statSub}>personal best</div>
              </div>
            </div>

            {/* ── Performance Overview ── */}
            <div style={S.perfGrid} className="perf-grid">
              <div style={S.perfCard}>
                <div style={S.perfTitle}>
                  <span>📊</span> Score Trend
                </div>
                <ScoreTrendChart sessions={sessions} />
              </div>
              <div style={S.perfCard}>
                <div style={S.perfTitle}>
                  <span>📋</span> Interview Types
                </div>
                <TypeDistribution sessions={sessions} />
              </div>
            </div>

            {/* ── Recent Interviews Table ── */}
            <div style={S.tableWrap}>
              <div style={S.tableHeader}>
                <span style={S.tableTitle}>Recent Interviews</span>
                {sessions.length > 5 && (
                  <button style={S.tableViewAll} onClick={() => setShowAll(!showAll)}>
                    {showAll ? 'Show less' : `View all (${sessions.length})`}
                  </button>
                )}
              </div>
              {/* Column headers */}
              <div style={S.tableRowHead}>
                <span style={S.tableColHead}>Type</span>
                <span style={S.tableColHead}>Date</span>
                <span style={S.tableColHead}>Duration</span>
                <span style={S.tableColHead}>Score</span>
                <span style={S.tableColHead}>Status</span>
                <span />
              </div>
              {/* Rows */}
              {displaySessions.map((session) => {
                const color = TYPE_COLORS[session.interviewType] || '#c0c0c0';
                const scoreColor = getScoreColor(session.overallScore);
                const isCompleted = session.status === 'completed';
                return (
                  <div
                    key={session.id}
                    style={S.tableRow}
                    className="table-row-hover"
                    onClick={() => {
                      if (isCompleted) router.push(`/interview/${session.id}/report`);
                      else router.push(`/interview/${session.id}`);
                    }}
                  >
                    {/* Type */}
                    <div style={S.tableType}>
                      <div style={S.tableTypeIcon(color)}>{TYPE_ICONS[session.interviewType] || '📋'}</div>
                      <span style={S.tableTypeName}>{TYPE_LABELS[session.interviewType] || session.interviewType}</span>
                    </div>
                    {/* Date */}
                    <span style={S.tableDate}>{formatDate(session.startedAt)}</span>
                    {/* Duration */}
                    <span style={S.tableDuration}>{getDuration(session.startedAt, session.endedAt)}</span>
                    {/* Score */}
                    <div style={S.tableScoreWrap}>
                      {session.overallScore != null ? (
                        <>
                          <div style={S.tableScoreBar}>
                            <div style={S.tableScoreBarFill(session.overallScore, scoreColor)} />
                          </div>
                          <span style={S.tableScoreNum(scoreColor)}>{session.overallScore}</span>
                        </>
                      ) : (
                        <span style={{ fontSize: 13, color: '#4a5568' }}>—</span>
                      )}
                    </div>
                    {/* Status */}
                    <div>
                      <span style={S.tableStatus(isCompleted)}>
                        {isCompleted ? 'Completed' : 'In Progress'}
                      </span>
                    </div>
                    {/* Arrow */}
                    <span style={S.tableArrow}>→</span>
                  </div>
                );
              })}
            </div>

            {/* ── Quick Actions ── */}
            <div style={S.quickGrid} className="quick-grid">
              {QUICK_ACTIONS.map((a) => (
                <div
                  key={a.type}
                  style={S.quickCard(TYPE_COLORS[a.type])}
                  className="quick-card-hover"
                  onClick={() => handleQuickStart(a.type)}
                >
                  {quickLoading === a.type && (
                    <div style={{ position: 'absolute', top: 22, right: 22 }}>
                      <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                    </div>
                  )}
                  <span style={S.quickArrow}>{quickLoading === a.type ? '' : '→'}</span>
                  <div style={S.quickIcon}>{a.icon}</div>
                  <div style={S.quickTitle}>{a.title}</div>
                  <div style={S.quickDesc}>{a.desc}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      {/* ── Responsive CSS ── */}
      <style jsx global>{`
        .table-row-hover:hover {
          background: rgba(255,255,255,0.02) !important;
        }
        .quick-card-hover:hover {
          border-color: rgba(255,255,255,0.12) !important;
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.3);
        }
        .quick-card-hover:hover .quickArrow {
          transform: translateX(4px);
        }
        @media (max-width: 1024px) {
          .dashboard-main {
            margin-left: 0 !important;
            padding: 24px 20px !important;
          }
          .dashboard-sidebar {
            transform: translateX(-100%);
            transition: transform 0.3s cubic-bezier(0.4,0,0.2,1);
          }
          .dashboard-sidebar.open {
            transform: translateX(0);
          }
          .sidebar-toggle {
            display: flex !important;
          }
          .sidebar-overlay {
            display: block !important;
          }
        }
        @media (max-width: 768px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          .perf-grid {
            grid-template-columns: 1fr !important;
          }
          .quick-grid {
            grid-template-columns: 1fr !important;
          }
        }
        @media (max-width: 640px) {
          .stats-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
