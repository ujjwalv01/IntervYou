'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Plus, LogOut } from 'lucide-react';
import Logo from './Logo';
import { clearAuth, useAuth } from '@/lib/auth';

const LINKS = [
  { href: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { href: '/interview/new', label: 'New interview', Icon: Plus },
];

// Floating pill navigation shared by the logged-in pages.
export default function AppNav() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuth()?.user;

  const logout = () => {
    clearAuth();
    router.replace('/login');
  };

  return (
    <header className="sticky top-3 z-40 px-4">
      <nav className="glass mx-auto flex max-w-5xl items-center gap-2 rounded-full! py-2 pr-2 pl-4">
        <Logo className="mr-auto" />
        {LINKS.map(({ href, label, Icon }) => (
          <Link
            key={href}
            href={href}
            className={`btn px-3! sm:px-4! ${pathname === href ? 'bg-ink/5 text-ink' : 'text-ink-2 hover:text-ink'}`}
          >
            <Icon size={16} />
            <span className="hidden sm:inline">{label}</span>
          </Link>
        ))}
        <Link href="/onboarding" title="Edit profile" className="ml-1 grid size-9 place-items-center rounded-full bg-sky-soft text-sm font-semibold text-sky-deep">
          {user?.name?.[0]?.toUpperCase() || 'U'}
        </Link>
        <button onClick={logout} title="Log out" className="btn-ghost size-9 p-0!">
          <LogOut size={16} />
        </button>
      </nav>
    </header>
  );
}
