'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AuthShell from '@/components/AuthShell';
import SocialSignIn from '@/components/SocialSignIn';
import { post } from '@/lib/api';
import { setAuth, useAuthRedirect } from '@/lib/auth';

export default function LoginPage() {
  useAuthRedirect('out');
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      setAuth(await post('/api/auth/login', { ...form, remember }));
      router.push('/dashboard');
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Welcome back" subtitle="Log in to continue practicing with Aria.">
      <SocialSignIn remember={remember} />
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="alert">{error}</div>}
        <div>
          <label htmlFor="email" className="label">Email</label>
          <input id="email" type="email" className="input" placeholder="you@example.com" autoComplete="email" required
            value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div>
          <label htmlFor="password" className="label">Password</label>
          <input id="password" type="password" className="input" placeholder="••••••••" autoComplete="current-password" required
            value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-2">
          <input type="checkbox" className="size-4 accent-sky" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
          Remember me for 30 days
        </label>
        <button type="submit" disabled={loading} className="btn-primary w-full py-3">
          {loading && <span className="spinner size-4" />} Log in
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-ink-2">
        New to IntervYou? <Link href="/signup" className="font-medium text-sky-deep hover:underline">Create an account</Link>
      </p>
    </AuthShell>
  );
}
