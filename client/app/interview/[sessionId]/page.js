'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useParams } from 'next/navigation';
import { AudioLines, Mic, MicOff, PhoneOff } from 'lucide-react';
import Logo from '@/components/Logo';
import { get, post, patch } from '@/lib/api';
import { useAuthRedirect } from '@/lib/auth';
import { TYPES_BY_KEY, formatTime } from '@/lib/constants';


export default function InterviewPage() {
  useAuthRedirect('in');
  const router = useRouter();
  const { sessionId } = useParams();

  const [session, setSession] = useState(null);
  const [callState, setCallState] = useState('idle'); // idle | connecting | live | ending | error
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [muted, setMuted] = useState(false);
  const [transcript, setTranscript] = useState([]);
  const [error, setError] = useState('');
  const [elapsed, setElapsed] = useState(0);

  const vapiRef = useRef(null);
  const transcriptRef = useRef([]);
  const timerRef = useRef(null);
  const transcriptEndRef = useRef(null);
  const callPhaseRef = useRef('idle'); // idle | live | ended
  const mountedRef = useRef(true);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  useEffect(() => {
    get(`/api/sessions/${sessionId}`)
      .then((data) => (data.status === 'completed' ? router.replace(`/interview/${sessionId}/report`) : setSession(data)))
      .catch((err) => setError(err.message));
  }, [sessionId, router]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearInterval(timerRef.current);
      try { vapiRef.current?.stop(); } catch { /* ignore */ }
    };
  }, []);

  const startInterview = async () => {
    setError('');
    setCallState('connecting');
    try {
      try {
        // Ask for mic permission up front, then release it — Vapi opens its own stream.
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop());
      } catch {
        setError('Microphone access is required. Allow it from the mic icon in your browser’s address bar, then try again.');
        setCallState('idle');
        return;
      }

      const config = await get(`/api/sessions/${sessionId}/assistant-config`);
      const { default: Vapi } = await import('@vapi-ai/web'); // browser-only SDK
      vapiRef.current ??= new Vapi(process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY);
      const vapi = vapiRef.current;
      vapi.removeAllListeners();

      vapi.on('call-start', () => {
        callPhaseRef.current = 'live';
        setCallState('live');
        timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
      });

      // Fires once per call — also when the user navigates away mid-call, so the transcript is still saved.
      vapi.on('call-end', async () => {
        if (callPhaseRef.current !== 'live') return;
        callPhaseRef.current = 'ended';
        clearInterval(timerRef.current);
        setCallState('ending');
        // If feedback generation fails, the report page offers a retry.
        await post(`/api/sessions/${sessionId}/end`, { transcript: transcriptRef.current }).catch(() => {});
        if (mountedRef.current) router.push(`/interview/${sessionId}/report`);
      });

      vapi.on('speech-start', () => setIsSpeaking(true));
      vapi.on('speech-end', () => setIsSpeaking(false));

      vapi.on('message', (message) => {
        if (message.type !== 'transcript' || message.transcriptType !== 'final') return;
        setTranscript((prev) => {
          const last = prev[prev.length - 1];
          const text = message.transcript.trim();
          if (last?.content.endsWith(text)) return prev; // Vapi occasionally repeats a final transcript
          // Same speaker continues the same block; a new speaker starts a new one.
          const next = last?.role === message.role
            ? [...prev.slice(0, -1), { ...last, content: `${last.content} ${text}` }]
            : [...prev, { role: message.role, content: text }];
          transcriptRef.current = next;
          return next;
        });
      });

      vapi.on('error', (err) => {
        console.error('Vapi error:', err);
        clearInterval(timerRef.current);
        setError('Voice connection error. Check your microphone and internet, then try again.');
        setCallState('error');
      });

      const call = await vapi.start(config);
      // Lets the server fetch the transcript from Vapi if the browser didn't capture it.
      if (call?.id) patch(`/api/sessions/${sessionId}`, { vapiCallId: call.id }).catch(() => {});
    } catch (err) {
      setError(`Couldn't start the interview: ${err.message}`);
      setCallState('error');
    }
  };

  const toggleMute = () => {
    vapiRef.current?.setMuted(!muted);
    setMuted(!muted);
  };

  const type = TYPES_BY_KEY[session?.interviewType];

  return (
    <div className="relative isolate flex min-h-svh flex-col">
      {/* Blurred campus scene behind the glass panel */}
      <Image src="/hero/hero-desktop.webp" alt="" fill sizes="100vw" className="-z-10 scale-110 object-cover blur-2xl" />
      <div className="absolute inset-0 -z-10 bg-white/40" />

      <header className="flex items-center justify-between p-4 sm:p-6">
        <Logo />
        {callState === 'live' && (
          <span className="glass flex items-center gap-2 rounded-full! px-4 py-2 font-mono text-sm">
            <span className="size-2 animate-pulse rounded-full bg-red-500" /> {formatTime(elapsed)}
          </span>
        )}
      </header>

      <main className="flex flex-1 items-center justify-center p-4">
        <div className="glass fade-up w-full max-w-2xl p-6 sm:p-10">
          {!session ? (
            <div className="py-10 text-center">
              {error ? (
                <>
                  <div className="alert">{error}</div>
                  <Link href="/dashboard" className="btn-ghost mt-4">Back to dashboard</Link>
                </>
              ) : <span className="spinner text-sky" />}
            </div>
          ) : callState === 'ending' ? (
            <div className="py-10 text-center">
              <span className="spinner size-8 text-sky" />
              <h2 className="mt-6 font-serif text-3xl">Writing your feedback…</h2>
              <p className="mt-2 text-ink-2">Aria is reviewing the whole conversation. This takes a few seconds.</p>
            </div>
          ) : callState === 'live' ? (
            <>
              <div className="flex flex-col items-center">
                <div className="relative grid size-28 place-items-center">
                  {isSpeaking && <span className="ring-pulse absolute inset-0 rounded-full bg-sky/30" />}
                  <span className={`relative grid size-24 place-items-center rounded-full text-white transition ${isSpeaking ? 'bg-sky' : 'bg-ink'}`}>
                    <AudioLines size={32} />
                  </span>
                </div>
                <p className="mt-3 text-sm font-medium text-ink-2">{isSpeaking ? 'Aria is speaking…' : muted ? 'You are muted' : 'Listening…'}</p>
              </div>

              <div className="mt-6 h-64 space-y-3 overflow-y-auto rounded-2xl bg-white/60 p-4 text-sm">
                {transcript.length === 0 && <p className="text-ink-3 italic">The conversation will appear here…</p>}
                {transcript.map((m, i) => (
                  <p key={i} className={m.role === 'assistant' ? 'mr-8' : 'ml-8 text-right'}>
                    <span className={`inline-block rounded-2xl px-3 py-2 text-left ${m.role === 'assistant' ? 'bg-white' : 'bg-ink text-white'}`}>
                      {m.content}
                    </span>
                  </p>
                ))}
                <div ref={transcriptEndRef} />
              </div>

              <div className="mt-6 flex justify-center gap-3">
                <button onClick={toggleMute} className="btn-light">{muted ? <MicOff size={16} /> : <Mic size={16} />} {muted ? 'Unmute' : 'Mute'}</button>
                <button onClick={() => vapiRef.current?.stop()} className="btn-danger"><PhoneOff size={16} /> End interview</button>
              </div>
            </>
          ) : (
            <div className="text-center">
              {type && <span className="inline-grid size-14 place-items-center rounded-2xl bg-sky-soft text-sky-deep"><type.Icon size={26} /></span>}
              <h1 className="mt-5 font-serif text-4xl">{type?.label} interview</h1>
              <p className="mx-auto mt-3 max-w-md text-ink-2">
                Aria will ask one question at a time and follow up on your answers. Find a quiet spot, speak naturally,
                and end whenever you&apos;re ready — it usually takes 12–18 minutes.
              </p>
              {error && <div className="alert mt-6 text-left">{error}</div>}
              <button onClick={startInterview} disabled={callState === 'connecting'} className="btn-primary mt-8 px-8 py-3.5 text-base">
                {callState === 'connecting' ? <><span className="spinner size-4" /> Connecting to Aria…</> : <><Mic size={18} /> {callState === 'error' ? 'Try again' : 'Start interview'}</>}
              </button>
              <div><Link href="/dashboard" className="btn-ghost mt-3">Back to dashboard</Link></div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
