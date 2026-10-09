'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import AppNav from '@/components/AppNav';
import { post } from '@/lib/api';
import { useAuthRedirect } from '@/lib/auth';
import { INTERVIEW_TYPES } from '@/lib/constants';

export default function NewInterviewPage() {
  const user = useAuthRedirect('in')?.user;
  const router = useRouter();
  const [loading, setLoading] = useState(null);
  const [error, setError] = useState('');

  const start = async (type) => {
    setError('');
    setLoading(type);
    try {
      const { sessionId } = await post('/api/sessions', { interviewType: type });
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

        {error && <div className="alert mt-6">{error}</div>}

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {INTERVIEW_TYPES.map(({ key, label, desc, Icon }) => (
            <button key={key} onClick={() => start(key)} disabled={loading !== null}
              className="card group cursor-pointer p-6 text-left transition hover:-translate-y-0.5 hover:border-sky/40 hover:shadow-lg disabled:opacity-60">
              <div className="flex items-start justify-between">
                <span className="grid size-12 place-items-center rounded-2xl bg-sky-soft text-sky-deep"><Icon size={22} /></span>
                {loading === key ? <span className="spinner text-sky" /> : <ArrowRight className="text-ink-3 transition group-hover:translate-x-1 group-hover:text-sky" />}
              </div>
              <h2 className="mt-5 text-lg font-semibold">{label}</h2>
              <p className="mt-1 text-sm text-ink-2">{desc}</p>
            </button>
          ))}
        </div>
      </main>
    </>
  );
}
