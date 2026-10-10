'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Sparkles } from 'lucide-react';
import AppNav from '@/components/AppNav';
import ResumeCard from '@/components/ResumeCard';
import { post } from '@/lib/api';
import { useAuthRedirect } from '@/lib/auth';
import { INTERVIEW_TYPES } from '@/lib/constants';

export default function NewInterviewPage() {
  const user = useAuthRedirect('in')?.user;
  const router = useRouter();
  const [loading, setLoading] = useState(null);
  const [error, setError] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [resume, setResume] = useState(null);
  const [useResume, setUseResume] = useState(true);
  const tailoring = Boolean(jobDescription.trim() || (resume && useResume));

  const start = async (type) => {
    setError('');
    setLoading(type);
    try {
      const { sessionId } = await post('/api/sessions', { interviewType: type, jobDescription, useResume: Boolean(resume && useResume) });
      router.push(`/interview/${sessionId}`);
    } catch (err) {
      setError(err.message);
      setLoading(null);
    }
  };

  return (
    <>
      <AppNav />
      <main className="fade-up mx-auto max-w-4xl px-4 py-12">
        <p className="eyebrow">New interview</p>
        <h1 className="mt-3 font-serif text-4xl sm:text-5xl">What do you want to practice?</h1>
        {user?.role && (
          <p className="mt-3 text-ink-2">
            Aria will interview you as a <b className="text-ink">{user.role}</b> ({user.experienceLevel}).{' '}
            <Link href="/onboarding" className="text-sky-deep hover:underline">Change</Link>
          </p>
        )}

        {/* Optional tailoring: a job description and/or the saved resume */}
        <div className="card mt-8 p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold"><Sparkles size={16} className="text-sky" /> Tailor it to a job <span className="font-normal text-ink-3">(optional)</span></h2>
          <textarea
            className="input mt-3 h-28 resize-y"
            maxLength={15000}
            placeholder="Paste the job description. Aria will focus on what this role actually asks for."
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
          />
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            {resume && (
              <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-2">
                <input type="checkbox" className="size-4 accent-sky" checked={useResume} onChange={(e) => setUseResume(e.target.checked)} />
                Use my resume
              </label>
            )}
            <ResumeCard compact onChange={setResume} />
          </div>
        </div>

        {error && <div className="alert mt-6">{error}</div>}

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {INTERVIEW_TYPES.map(({ key, label, desc, Icon }) => (
            <button key={key} onClick={() => start(key)} disabled={loading !== null}
              className="card group cursor-pointer p-6 text-left transition hover:-translate-y-0.5 hover:border-sky/40 hover:shadow-lg disabled:opacity-60">
              <div className="flex items-start justify-between">
                <span className="grid size-12 place-items-center rounded-2xl bg-sky-soft text-sky-deep"><Icon size={22} /></span>
                {loading === key ? <span className="spinner text-sky" /> : <ArrowRight className="text-ink-3 transition group-hover:translate-x-1 group-hover:text-sky" />}
              </div>
              <h2 className="mt-5 text-lg font-semibold">{label}</h2>
              <p className="mt-1 text-sm text-ink-2">
                {loading === key && tailoring ? 'Tailoring your interview…' : desc}
              </p>
            </button>
          ))}
        </div>
      </main>
    </>
  );
}
