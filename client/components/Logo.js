import Link from 'next/link';

export default function Logo({ className = '' }) {
  return (
    <Link href="/" className={`flex items-center gap-2 font-semibold tracking-tight ${className}`}>
      <span className="grid size-8 place-items-center rounded-lg bg-ink font-serif text-xl text-white">I</span>
      Intervu
    </Link>
  );
}
