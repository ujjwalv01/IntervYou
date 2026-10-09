'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { ChevronDown, Plus, RotateCcw } from 'lucide-react';
import AppNav from '@/components/AppNav';
import ScoreRing from '@/components/ScoreRing';
import { get, post } from '@/lib/api';
import { useAuthRedirect } from '@/lib/auth';
import { TYPES_BY_KEY, formatDate, minutesBetween } from '@/lib/constants';

const CATEGORIES = ['communication', 'structure', 'depth', 'confidence'];

function List({ title, items, tone }) {
  return (
    <div className="card p-6">
      <h2 className={`text-sm font-semibold ${tone === 'good' ? 'text-green-700' : 'text-amber-700'}`}>{title}</h2>
      <ul className="mt-4 space-y-3 text-sm text-ink-2">
        {items.length === 0 && <li className="text-ink-3">Nothing to show for this interview.</li>}
        {items.map((item, i) => (
          <li key={i} className="flex gap-3">
            <span className={`mt-1.5 size-1.5 shrink-0 rounded-full ${tone === 'good' ? 'bg-green-500' : 'bg-amber-500'}`} />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function ReportPage() {
  useAuthRedirect('in');
  const { sessionId } = useParams();
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null); // { message, canRetry }
  const [retrying, setRetrying] = useState(false);

  const loadReport = useCallback(
    () =>
      get(`/api/sessions/${sessionId}/report`)
        .then((data) => {
          setReport(data);
          setError(null);
        })
        // 404 = the interview ended but feedback generation failed; it can be retried.
        .catch((err) => setError({ message: err.status === 404 ? "Your feedback report isn't ready yet." : err.message, canRetry: err.status === 404 })),
    [sessionId]
  );

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const retry = async () => {
    setRetrying(true);
    try {
      await post(`/api/sessions/${sessionId}/end`, {});
      await loadReport();
    } catch (err) {
      setError({ message: err.message, canRetry: true });
    } finally {
      setRetrying(false);
    }
  };

  const type = TYPES_BY_KEY[report?.interviewType];
  const minutes = minutesBetween(report?.startedAt, report?.endedAt);

  return (
    <>
      <AppNav />
      <main className="mx-auto max-w-4xl px-4 py-8">
        {error ? (
          <div className="card mx-auto mt-10 max-w-md p-8 text-center">
            <p className="text-ink-2">{error.message}</p>
            <div className="mt-6 flex justify-center gap-3">
              {error.canRetry && (
                <button onClick={retry} disabled={retrying} className="btn-primary">
                  {retrying ? <span className="spinner size-4" /> : <RotateCcw size={16} />} Generate report
                </button>
              )}
              <Link href="/dashboard" className="btn-ghost">Dashboard</Link>
            </div>
          </div>
        ) : !report ? (
          <div className="grid h-64 place-items-center text-ink-3"><span className="spinner" /></div>
        ) : (
          <div className="fade-up space-y-4">
            {/* Dusk banner */}
            <section className="relative overflow-hidden rounded-3xl p-6 text-white sm:p-10">
              <Image src="/hero/hero-dusk.webp" alt="" fill preload sizes="(min-width: 896px) 896px, 100vw" className="object-cover object-[center_70%]" />
              <div className="absolute inset-0 bg-gradient-to-r from-ink/60 to-ink/10" />
              <div className="relative flex flex-wrap items-center justify-between gap-6">
                <div>
                  <p className="text-sm text-white/80">{[type?.label, formatDate(report.startedAt), minutes && `${minutes} min`].filter(Boolean).join(' · ')}</p>
                  <h1 className="mt-2 font-serif text-4xl sm:text-5xl">Interview complete</h1>
                  {report.summary && <p className="mt-3 max-w-lg text-sm leading-relaxed text-white/90">{report.summary}</p>}
                </div>
                <div className="rounded-3xl bg-white p-4 shadow-xl"><ScoreRing score={report.overallScore} size={128} /></div>
              </div>
            </section>

            <div className="card grid gap-5 p-6 sm:grid-cols-2">
              {CATEGORIES.map((c) => {
                const value = report.categoryScores?.[c] ?? 0;
                return (
                  <div key={c}>
                    <div className="flex justify-between text-sm"><span className="text-ink-2 capitalize">{c}</span><b>{value}/10</b></div>
                    <div className="mt-2 h-2 rounded-full bg-ink/5"><div className="h-full rounded-full bg-sky transition-all duration-1000" style={{ width: `${value * 10}%` }} /></div>
                  </div>
                );
              })}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <List title="Strengths" items={report.strengths || []} tone="good" />
              <List title="What to improve" items={report.improvements || []} />
            </div>

            {report.questionBreakdown?.length > 0 && (
              <div className="card divide-y divide-line">
                <h2 className="px-6 py-4 text-sm font-semibold">Question by question</h2>
                {report.questionBreakdown.map((q, i) => (
                  <details key={i} className="group px-6 py-4">
                    <summary className="flex cursor-pointer list-none items-start gap-3 text-sm font-medium">
                      <span className="text-sky">Q{i + 1}</span>
                      <span className="flex-1">{q.question}</span>
                      <ChevronDown size={18} className="shrink-0 text-ink-3 transition group-open:rotate-180" />
                    </summary>
                    <div className="mt-3 space-y-2 pl-8 text-sm text-ink-2">
                      <p><b className="text-ink">Your answer:</b> {q.answer_summary}</p>
                      <p><b className="text-ink">Evaluation:</b> {q.evaluation}</p>
                    </div>
                  </details>
                ))}
              </div>
            )}

            {report.transcript?.length > 0 && (
              <details className="card group p-6">
                <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold">
                  Full transcript <ChevronDown size={18} className="text-ink-3 transition group-open:rotate-180" />
                </summary>
                <div className="mt-4 space-y-3 text-sm">
                  {report.transcript.map((m, i) => (
                    <p key={i}><b className={m.role === 'assistant' ? 'text-sky-deep' : 'text-ink'}>{m.role === 'assistant' ? 'Aria' : 'You'}:</b> <span className="text-ink-2">{m.content}</span></p>
                  ))}
                </div>
              </details>
            )}

            <div className="flex justify-center gap-3 pt-4">
              <Link href="/interview/new" className="btn-primary"><Plus size={16} /> New interview</Link>
              <Link href="/dashboard" className="btn-ghost">Dashboard</Link>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
