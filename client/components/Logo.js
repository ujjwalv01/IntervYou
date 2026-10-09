import Link from 'next/link';
import Image from 'next/image';

// Mark (two speech bubbles + sound waves) and wordmark: "Interv" + "You" in the accent colour so the wordplay reads at a glance.
export default function Logo({ className = '' }) {
  return (
    <Link href="/" className={`flex items-center gap-2 font-semibold tracking-tight ${className}`}>
      <Image src="/brand/mark.svg" alt="" width={32} height={32} />
      <span>Interv<span className="text-sky">You</span></span>
    </Link>
  );
}
