'use client';

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AuthShell from '@/components/AuthShell';
import { get } from '@/lib/api';
import { setAuth } from '@/lib/auth';

// Google / GitHub sign-in lands here with #token=… (or #error=…) from the server.
export default function AuthCallbackPage() {
  const router = useRouter();
  const hash = useSyncExternalStore(() => () => {}, () => window.location.hash, () => '');
  const params = useMemo(() => new URLSearchParams(hash.slice(1)), [hash]);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = params.get('token');
    if (!token) return;
    setAuth({ token });
    get('/api/users/me')
      .then((user) => {
        setAuth({ token, user });
        // First sign-in: ask for role and level before the first interview.
        router.replace(user.role ? '/dashboard' : '/onboarding');
      })
      .catch((err) => setError(err.message));
  }, [params, router]);

  const message = error || params.get('error');
  return (
    <AuthShell title={message ? "Couldn't sign you in" : 'Signing you in…'}>
      {message ? (
        <>
          <div className="alert">{message}</div>
          <Link href="/login" className="btn-primary mt-6 w-full py-3">Back to log in</Link>
        </>
      ) : hash && <span className="spinner text-sky" />}
    </AuthShell>
  );
}
