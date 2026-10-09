import Image from 'next/image';
import Logo from './Logo';

// Split layout for login / signup / onboarding: hero illustration left, form right.
export default function AuthShell({ title, subtitle, children }) {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="relative hidden overflow-hidden lg:block">
        <Image src="/hero/hero-desktop.webp" alt="" fill sizes="50vw" className="object-cover object-[30%_center]" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/50 via-transparent to-transparent" />
        <p className="absolute right-10 bottom-10 left-10 font-serif text-4xl leading-tight text-white">
          Walk in prepared. <em className="text-white/80">Walk out confident.</em>
        </p>
      </div>
      <main className="flex flex-col px-6 py-8 sm:px-12">
        <Logo />
        <div className="fade-up m-auto w-full max-w-sm py-12">
          <h1 className="font-serif text-4xl">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-ink-2">{subtitle}</p>}
          <div className="mt-8">{children}</div>
        </div>
      </main>
    </div>
  );
}
