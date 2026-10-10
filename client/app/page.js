'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image, { getImageProps } from 'next/image';
import { ArrowRight, AudioLines, ChevronDown } from 'lucide-react';
import Logo from '@/components/Logo';
import ScoreRing from '@/components/ScoreRing';
import { useAuth } from '@/lib/auth';
import { INTERVIEW_TYPES, formatTime } from '@/lib/constants';

const STEPS = [
  { title: 'Pick an interview', desc: 'Behavioral, Technical, System Design or HR — tuned to your target role and experience level.' },
  { title: 'Talk to Aria', desc: 'A real voice conversation. She listens, follows up on vague answers and pushes back on weak ones.' },
  { title: 'Get your report', desc: 'An overall score, four category scores, strengths, improvements and a question-by-question review.' },
  { title: 'Track progress', desc: 'Your dashboard keeps every session and shows how your scores move over time.' },
];

const FACTS = [
  ['4', 'interview types'],
  ['No limit', 'you decide when to stop'],
  ['Voice only', 'no typing'],
  ['Adaptive', 'no fixed question list'],
];

const FAQS = [
  ['What is IntervYou?', 'A mock interview you have out loud. Aria, the AI interviewer, decides each next question from your previous answers — then you get a structured feedback report.'],
  ['What do I need?', 'A browser and a microphone. Allow microphone access when you start the interview.'],
  ['How long is an interview?', 'As long as you like. Aria asks whether you want to keep going once the core topics are covered, and pauses a couple of seconds after each answer so you have time to think. The report covers everything you answered.'],
  ['How is the feedback made?', 'After the call, the full transcript is graded by an AI model on communication, structure, depth and confidence. It only uses what you actually said.'],
  ['Can I practice for a specific job?', 'Yes. Paste the job description and add your resume, and Aria asks about your real projects and the skills that job needs. Your report then shows how well you covered each requirement.'],
  ['Is my data private?', 'Your transcripts, reports and resume are only visible to your account. Aria only sees a short summary of your resume — never your contact details — and you can remove your resume or delete any interview from your dashboard.'],
];

// Different crops for phones (portrait) and larger screens (landscape).
function HeroImage({ desktop, mobile, className }) {
  const common = { alt: '', sizes: '100vw', fill: true };
  const { props: { srcSet: desktopSet } } = getImageProps({ ...common, src: desktop });
  const { props: { srcSet: mobileSet, ...img } } = getImageProps({ ...common, src: mobile, loading: 'eager', fetchPriority: 'high' });
  return (
    <picture>
      <source media="(min-width: 768px)" srcSet={desktopSet} />
      <img {...img} alt="" className={`object-cover ${className}`} />
    </picture>
  );
}

const PREVIEW_MESSAGES = [
  ['Aria', 'You said the cache sits in front of the database. What happens when it goes down at peak traffic?'],
  ['You', "Reads fall through to Postgres, so I'd add a circuit breaker and serve stale data for a few seconds…"],
  ['Aria', 'Good — stale-while-revalidate. How stale is too stale for this product?'],
];

// Counts up from 00:00 while the page is open, like a live call.
function LiveTimer() {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="tabular-nums">{formatTime(seconds)}</span>;
}

function InterviewPreview() {
  return (
    <div className="glass overflow-hidden text-left">
      <div className="flex items-center gap-2 border-b border-white/60 px-5 py-3 text-xs text-ink-2">
        <span className="size-2.5 rounded-full bg-red-400" />
        <span className="size-2.5 rounded-full bg-amber-400" />
        <span className="size-2.5 rounded-full bg-green-400" />
        <span className="ml-3 font-medium text-ink">Technical interview</span>
        <span className="ml-auto flex items-center gap-1.5"><span className="size-1.5 animate-pulse rounded-full bg-red-500" /> <LiveTimer /></span>
      </div>
      <div className="grid gap-6 p-6 md:grid-cols-[200px_1fr]">
        <div className="flex flex-col items-center justify-center gap-3 py-4">
          <div className="relative grid size-24 place-items-center">
            <span className="ring-pulse absolute inset-0 rounded-full bg-sky/30" />
            <span className="relative grid size-20 place-items-center rounded-full bg-sky text-white"><AudioLines /></span>
          </div>
          <p className="text-sm font-medium text-sky-deep">Aria is speaking…</p>
        </div>
        <div className="space-y-3 text-sm">
          {/* Messages appear one after another, like a live transcript */}
          {PREVIEW_MESSAGES.map(([who, text], i) => (
            <p key={i} style={{ animationDelay: `${0.8 + i * 1.2}s` }}
              className={`fade-up rounded-2xl p-3 ${who === 'You' ? 'ml-8 rounded-tr-sm bg-ink text-white' : 'rounded-tl-sm bg-white/80'}`}>
              <b className={who === 'You' ? '' : 'text-sky-deep'}>{who}</b> — {text}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const loggedIn = Boolean(useAuth()?.token);
  const cta = loggedIn ? { href: '/dashboard', label: 'Go to dashboard' } : { href: '/signup', label: 'Start practicing free' };

  return (
    <div className="overflow-x-clip">
      {/* Nav */}
      <header className="fixed inset-x-0 top-4 z-50 px-4">
        <nav className="glass mx-auto flex max-w-5xl items-center gap-1 rounded-full! py-2 pr-2 pl-4">
          <Logo className="mr-auto" />
          {[['How it works', '#how'], ['Interviews', '#types'], ['FAQ', '#faq']].map(([label, href]) => (
            <a key={href} href={href} className="btn-ghost hidden md:inline-flex">{label}</a>
          ))}
          {!loggedIn && <Link href="/login" className="btn-ghost">Log in</Link>}
          <Link href={cta.href} className="btn-primary">{loggedIn ? 'Dashboard' : 'Get started'}</Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative min-h-svh overflow-hidden">
        <div className="parallax absolute inset-0 origin-top">
          <HeroImage desktop="/hero/hero-desktop.webp" mobile="/hero/hero-mobile.webp" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-sky-deep/25 via-transparent to-transparent" />
        {/* Melts the bottom edge of the image into the page background */}
        <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-b from-transparent via-canvas/60 to-canvas" />

        <div className="fade-up relative mx-auto max-w-4xl px-6 pt-36 text-center text-white [text-shadow:0_2px_16px_rgb(11_27_46/0.35)] md:pt-40">
          <span className="inline-block rounded-full bg-white/20 px-4 py-1.5 text-xs font-medium backdrop-blur">
            Voice-first AI mock interviews
          </span>
          <h1 className="mt-6 font-serif text-5xl leading-[1.02] sm:text-7xl">
            Practice the interview before the interview.
          </h1>
          <p className="mt-4 font-serif text-2xl text-white/90 italic sm:text-3xl">
            Talk to Aria. Get honest feedback in minutes.
          </p>
          <Link href={cta.href} className="btn-light mt-10 px-7 py-3.5 text-base">
            {cta.label} <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* Product preview overlapping the hero */}
      <div className="relative z-10 mx-auto -mt-40 max-w-4xl px-4 md:-mt-56">
        <InterviewPreview />
      </div>

      {/* Facts */}
      <section className="mx-auto grid max-w-5xl grid-cols-2 gap-6 px-6 py-16 text-center md:grid-cols-4">
        {FACTS.map(([big, small]) => (
          <div key={big}>
            <div className="font-serif text-4xl">{big}</div>
            <div className="mt-1 text-sm text-ink-3">{small}</div>
          </div>
        ))}
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-5xl scroll-mt-28 px-6 py-16">
        <p className="eyebrow">How it works</p>
        <h2 className="mt-3 max-w-xl font-serif text-4xl sm:text-5xl">From nervous to ready in four steps.</h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <div key={step.title} className="card p-6">
              <span className="font-serif text-3xl text-sky">0{i + 1}</span>
              <h3 className="mt-4 font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-2">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Interview types */}
      <section id="types" className="mx-auto max-w-5xl scroll-mt-28 px-6 py-16">
        <p className="eyebrow">Interviews</p>
        <h2 className="mt-3 max-w-xl font-serif text-4xl sm:text-5xl">Practice the round you&apos;re worried about.</h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {INTERVIEW_TYPES.map(({ key, label, desc, Icon }) => (
            <div key={key} className="card flex gap-4 p-6">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-sky-soft text-sky-deep"><Icon size={20} /></span>
              <div>
                <h3 className="font-semibold">{label}</h3>
                <p className="mt-1 text-sm text-ink-2">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Sample report */}
      <section className="mx-auto grid max-w-5xl items-center gap-10 px-6 py-16 md:grid-cols-2">
        <div>
          <p className="eyebrow">Your report</p>
          <h2 className="mt-3 font-serif text-4xl sm:text-5xl">Know exactly what to fix next.</h2>
          <p className="mt-4 text-ink-2">
            Every interview ends with a scorecard grounded in your own words: what landed, what didn&apos;t, and how
            each answer could be stronger.
          </p>
        </div>
        <div className="card p-6">
          <div className="flex items-center gap-6">
            <ScoreRing score={74} size={110} stroke={8} />
            <div className="flex-1 space-y-3">
              {[['Communication', 8], ['Structure', 6], ['Depth', 7], ['Confidence', 8]].map(([name, value]) => (
                <div key={name}>
                  <div className="flex justify-between text-xs"><span className="text-ink-2">{name}</span><b>{value}/10</b></div>
                  <div className="mt-1 h-1.5 rounded-full bg-ink/5"><div className="h-full rounded-full bg-sky" style={{ width: `${value * 10}%` }} /></div>
                </div>
              ))}
            </div>
          </div>
          <p className="mt-6 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
            <b>Improve:</b> Your conflict story skipped the result — say what changed because of your action.
          </p>
          <p className="mt-3 text-center text-xs text-ink-3">Example report</p>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl scroll-mt-28 px-6 py-16">
        <h2 className="text-center font-serif text-4xl sm:text-5xl">Questions</h2>
        <div className="mt-10 space-y-3">
          {FAQS.map(([q, a]) => (
            <details key={q} className="card group p-5">
              <summary className="flex cursor-pointer list-none items-center justify-between font-medium">
                {q} <ChevronDown size={18} className="text-ink-3 transition group-open:rotate-180" />
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-ink-2">{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative mx-4 mb-4 overflow-hidden rounded-[2rem] px-6 py-28 text-center text-white">
        <Image src="/hero/hero-dusk.webp" alt="" fill sizes="100vw" className="object-cover object-[center_85%]" />
        <div className="absolute inset-0 bg-ink/30" />
        <div className="relative">
          <h2 className="font-serif text-5xl sm:text-6xl">Walk out ready.</h2>
          <p className="mt-3 font-serif text-2xl text-white/85 italic">Your next interview starts with this one.</p>
          <Link href={cta.href} className="btn-light mt-8 px-7 py-3.5 text-base">
            {cta.label} <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      <footer className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-8 text-sm text-ink-3">
        <Logo className="text-ink" />
        <span>© {new Date().getFullYear()} IntervYou</span>
      </footer>
    </div>
  );
}
