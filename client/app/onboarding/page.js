'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthShell from '@/components/AuthShell';
import { patch } from '@/lib/api';
import { getAuth, setAuth, useAuthRedirect } from '@/lib/auth';
import { EXPERIENCE_LEVELS } from '@/lib/constants';

// First-time profile setup; also reachable later from the avatar in the nav to edit the profile.
export default function OnboardingPage() {
  const user = useAuthRedirect('in')?.user;
  const router = useRouter();
  const [form, setForm] = useState(null); // null until edited, so the saved profile shows first
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const values = form ?? { role: user?.role || '', experienceLevel: user?.experienceLevel || '' };
  const update = (field) => (e) => setForm({ ...values, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const updated = await patch('/api/users/me', values);
      setAuth({ ...getAuth(), user: updated });
      router.push('/interview/new');
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title={user?.role ? 'Your profile' : `Nice to meet you${user ? `, ${user.name.split(' ')[0]}` : ''}`}
      subtitle="Aria tailors every question to the role and level you're aiming for."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="alert">{error}</div>}
        <div>
          <label htmlFor="role" className="label">Target role</label>
          <input id="role" className="input" required maxLength={120} placeholder="e.g. Frontend Developer, Product Manager"
            value={values.role} onChange={update('role')} />
        </div>
        <div>
          <span className="label">Experience level</span>
          <div className="grid grid-cols-3 gap-2">
            {EXPERIENCE_LEVELS.map((level) => (
              <label key={level} className={`card cursor-pointer px-2 py-3 text-center text-xs font-medium transition ${
                values.experienceLevel === level ? 'border-sky! bg-sky-soft text-sky-deep' : 'text-ink-2 hover:border-ink/20'}`}>
                <input type="radio" name="level" value={level} className="sr-only" required
                  checked={values.experienceLevel === level} onChange={update('experienceLevel')} />
                {level}
              </label>
            ))}
          </div>
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full py-3">
          {loading && <span className="spinner size-4" />} Continue
        </button>
      </form>
    </AuthShell>
  );
}
