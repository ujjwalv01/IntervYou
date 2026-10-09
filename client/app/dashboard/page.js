'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowRight, Plus, Trash2 } from 'lucide-react';
import AppNav from '@/components/AppNav';
import { get, post, del } from '@/lib/api';
import { useAuthRedirect } from '@/lib/auth';
import { INTERVIEW_TYPES, TYPES_BY_KEY, scoreColor, formatDate, minutesBetween } from '@/lib/constants';

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

function ScoreTrend({ sessions }) {
  // Sessions arrive newest first: take the latest 8 scored ones, oldest → newest.
  const data = sessions
    .filter((s) => s.overallScore != null)
    .slice(0, 8)
    .reverse()
    .map((s) => ({ date: new Date(s.startedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), score: s.overallScore }));

  if (data.length < 2) {
    return <p className="grid h-48 place-items-center text-sm text-ink-3">Finish 2 interviews to see your trend.</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={192}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
        <defs>
          <linearGradient id="trend" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1683f2" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#1683f2" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="rgb(11 27 46 / 0.06)" />
        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#8394a8' }} />
        <YAxis domain={[0, 100]} ticks={[0, 50, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#8394a8' }} />
        <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid rgb(11 27 46 / 0.08)', fontSize: 12 }} />
        <Area type="monotone" dataKey="score" stroke="#1683f2" strokeWidth={2} fill="url(#trend)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export default function DashboardPage() {
  const user = useAuthRedirect('in')?.user;
  const router = useRouter();
  const [sessions, setSessions] = useState(null);
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(null);

  useEffect(() => {
    get('/api/sessions').then(setSessions).catch((err) => setError(err.message));
  }, []);

  const start = async (type) => {
    setStarting(type);
    try {
      const { sessionId } = await post('/api/sessions', { interviewType: type });
      router.push(`/interview/${sessionId}`);
    } catch (err) {
      setError(err.message);
      setStarting(null);
    }
  };

  const remove = async (id) => {
    if (!confirm('Delete this interview and its report?')) return;
    try {
      await del(`/api/sessions/${id}`);
      setSessions((list) => list.filter((s) => s.id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  const scores = (sessions || []).map((s) => s.overallScore).filter((s) => s != null);
  const stats = [
    ['Interviews', sessions?.length ?? 0],
    ['Average score', scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : '—'],
    ['Best score', scores.length ? Math.max(...scores) : '—'],
    ['With report', scores.length],
  ];

  return (
    <>
      <AppNav />
      <main className="mx-auto max-w-5xl px-4 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-serif text-4xl sm:text-5xl">{user ? `${greeting()}, ${user.name.split(' ')[0]}` : 'Dashboard'}</h1>
            {user?.role && <p className="mt-1 text-ink-2">{user.role} · {user.experienceLevel}</p>}
          </div>
          <Link href="/interview/new" className="btn-primary"><Plus size={16} /> New interview</Link>
        </div>

        {error && <div className="alert mt-6">{error}</div>}

        {!sessions ? (
          <div className="grid h-64 place-items-center text-ink-3"><span className="spinner" /></div>
        ) : sessions.length === 0 ? (
          <div className="card mt-8 overflow-hidden">
            <div className="relative h-56">
              <Image src="/hero/hero-desktop.webp" alt="" fill sizes="(min-width: 1024px) 1024px, 100vw" className="object-cover object-bottom" />
            </div>
            <div className="p-8 text-center">
              <h2 className="font-serif text-3xl">Your first interview is waiting</h2>
              <p className="mx-auto mt-2 max-w-md text-ink-2">Pick a type, talk to Aria for about 15 minutes, and get a detailed report right after.</p>
              <Link href="/interview/new" className="btn-primary mt-6">Start your first interview <ArrowRight size={16} /></Link>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
              {stats.map(([label, value]) => (
                <div key={label} className="card p-5">
                  <p className="text-xs text-ink-3">{label}</p>
                  <p className="mt-2 font-serif text-4xl" style={{ color: label.includes('score') ? scoreColor(typeof value === 'number' ? value : null) : undefined }}>{value}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              <div className="card p-5 lg:col-span-2">
                <h2 className="mb-4 text-sm font-semibold">Score trend</h2>
                <ScoreTrend sessions={sessions} />
              </div>
              <div className="card p-5">
                <h2 className="mb-3 text-sm font-semibold">Practice next</h2>
                {INTERVIEW_TYPES.map(({ key, label, Icon }) => (
                  <button key={key} onClick={() => start(key)} disabled={starting !== null}
                    className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-2 py-2.5 text-left text-sm hover:bg-ink/5">
                    <span className="grid size-8 place-items-center rounded-lg bg-sky-soft text-sky-deep"><Icon size={16} /></span>
                    {label}
                    {starting === key ? <span className="spinner ml-auto size-4" /> : <ArrowRight size={14} className="ml-auto text-ink-3" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="card mt-4 divide-y divide-line">
              <h2 className="px-5 py-4 text-sm font-semibold">Your interviews</h2>
              {sessions.map((s) => {
                const type = TYPES_BY_KEY[s.interviewType];
                const done = s.status === 'completed';
                const minutes = minutesBetween(s.startedAt, s.endedAt);
                return (
                  <div key={s.id} className="group flex items-center gap-4 px-5 py-3 hover:bg-ink/[0.02]">
                    <Link href={done ? `/interview/${s.id}/report` : `/interview/${s.id}`} className="flex min-w-0 flex-1 items-center gap-4">
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-sky-soft text-sky-deep">{type && <type.Icon size={18} />}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{type?.label || s.interviewType}</span>
                        <span className="text-xs text-ink-3">{formatDate(s.startedAt)}{minutes && ` · ${minutes} min`}</span>
                      </span>
                      {s.overallScore != null ? (
                        <span className="font-serif text-2xl" style={{ color: scoreColor(s.overallScore) }}>{s.overallScore}</span>
                      ) : (
                        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">{done ? 'No report' : 'Not finished'}</span>
                      )}
                    </Link>
                    <button onClick={() => remove(s.id)} title="Delete" className="btn-ghost size-8 p-0! opacity-60 group-hover:opacity-100">
                      <Trash2 size={15} />
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>
    </>
  );
}
