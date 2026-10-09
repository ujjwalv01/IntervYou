'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AuthShell from '@/components/AuthShell';
import { post } from '@/lib/api';
import { setAuth, useAuthRedirect } from '@/lib/auth';

const FIELDS = [
  { name: 'name', label: 'Full name', type: 'text', placeholder: 'Jane Doe', autoComplete: 'name' },
  { name: 'email', label: 'Email', type: 'email', placeholder: 'you@example.com', autoComplete: 'email' },
  { name: 'password', label: 'Password', type: 'password', placeholder: 'At least 6 characters', autoComplete: 'new-password', minLength: 6 },
];

export default function SignupPage() {
  useAuthRedirect('out');
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      setAuth(await post('/api/auth/signup', form));
      router.push('/onboarding');
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Create your account" subtitle="Free to use. Your first interview is two minutes away.">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="alert">{error}</div>}
        {FIELDS.map(({ name, label, ...props }) => (
          <div key={name}>
            <label htmlFor={name} className="label">{label}</label>
            <input id={name} className="input" required {...props}
              value={form[name]} onChange={(e) => setForm({ ...form, [name]: e.target.value })} />
          </div>
        ))}
        <button type="submit" disabled={loading} className="btn-primary w-full py-3">
          {loading && <span className="spinner size-4" />} Get started
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-ink-2">
        Already have an account? <Link href="/login" className="font-medium text-sky-deep hover:underline">Log in</Link>
      </p>
    </AuthShell>
  );
}
