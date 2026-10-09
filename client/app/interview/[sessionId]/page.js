'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { get, post, patch } from '@/lib/api';
import { getAuth } from '@/lib/auth';

const TYPE_LABELS = {
  behavioral: 'Behavioral',
  technical: 'Technical',
  system_design: 'System Design',
  hr_culture_fit: 'HR / Culture Fit',
};

export default function InterviewPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.sessionId;

  const [session, setSession] = useState(null);
  const [callState, setCallState] = useState('idle'); // idle | connecting | live | ending | error
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState([]);
  const [error, setError] = useState('');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [micError, setMicError] = useState(false);

  const vapiRef = useRef(null);
  const transcriptRef = useRef([]);
  const timerRef = useRef(null);
  const transcriptEndRef = useRef(null);
  const callPhaseRef = useRef('idle'); // idle | live | ended
  const mountedRef = useRef(true);

  // Auto-scroll transcript
  useEffect(() => {
    if (transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [transcript]);

  // Fetch session on mount
  useEffect(() => {
    const auth = getAuth();
    if (!auth || !auth.token) {
      router.replace('/login');
      return;
    }

    async function loadSession() {
      try {
        const data = await get(`/api/sessions/${sessionId}`);
        if (data.status === 'completed') {
          router.replace(`/interview/${sessionId}/report`);
          return;
        }
        setSession(data);
      } catch (err) {
        setError('Failed to load session: ' + err.message);
      }
    }

    loadSession();
  }, [sessionId, router]);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearInterval(timerRef.current);
      try { vapiRef.current?.stop(); } catch { /* ignore */ }
    };
  }, []);

  const startInterview = useCallback(async () => {
    setError('');
    setMicError(false);
    setCallState('connecting');

    try {
      // Check mic permission
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (micErr) {
        setMicError(true);
        setCallState('idle');
        return;
      }

      // Get assistant config
      const config = await get(`/api/sessions/${sessionId}/assistant-config`);

      // Dynamic import Vapi to avoid SSR issues
      const VapiModule = await import('@vapi-ai/web');
      const Vapi = VapiModule.default;

      if (!vapiRef.current) {
        vapiRef.current = new Vapi(process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY);
      }

      const vapi = vapiRef.current;

      // Clear previous listeners
      vapi.removeAllListeners();

      // Event handlers
      vapi.on('call-start', () => {
        callPhaseRef.current = 'live';
        setCallState('live');
        timerRef.current = setInterval(() => setElapsedTime((prev) => prev + 1), 1000);
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

      vapi.on('speech-start', () => {
        setIsSpeaking(true);
      });

      vapi.on('speech-end', () => {
        setIsSpeaking(false);
      });

      vapi.on('message', (message) => {
        if (message.type === 'transcript' && message.transcriptType === 'final') {
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
        }
      });

      vapi.on('error', (err) => {
        console.error('Vapi error:', err);
        setError('Voice connection error. Please check your microphone and try again.');
        setCallState('error');
        if (timerRef.current) clearInterval(timerRef.current);
      });

      const call = await vapi.start(config);
      // Lets the server fetch the transcript from Vapi if the browser didn't capture it.
      if (call?.id) patch(`/api/sessions/${sessionId}`, { vapiCallId: call.id }).catch(() => {});
    } catch (err) {
      setError('Failed to start interview: ' + err.message);
      setCallState('error');
    }
  }, [sessionId, router]);

  const endInterview = useCallback(() => {
    if (vapiRef.current) {
      vapiRef.current.stop();
    }
  }, []);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        {error ? (
          <div className="text-center">
            <div className="error-toast mb-4">{error}</div>
            <button onClick={() => router.push('/dashboard')} className="btn-secondary">
              Back to Dashboard
            </button>
          </div>
        ) : (
          <div className="spinner" />
        )}
      </div>
    );
  }

  // ========== ENDING STATE ==========
  if (callState === 'ending') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center animate-fade-in">
          <div className="relative mx-auto mb-8" style={{ width: 80, height: 80 }}>
            <div className="absolute inset-0 rounded-full animate-pulse-glow"
              style={{ background: 'var(--gradient-main)', opacity: 0.3 }} />
            <div className="absolute inset-2 rounded-full flex items-center justify-center"
              style={{ background: 'var(--bg-secondary)' }}>
              <div className="spinner" />
            </div>
          </div>
          <h2 className="text-2xl font-bold mb-2 gradient-text">
            Generating your feedback report
          </h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            Analyzing your interview performance...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Background */}
      <div className="orb orb-indigo" style={{ width: 500, height: 500, top: '-20%', left: '30%', opacity: 0.08 }} />

      {/* Header bar */}
      <header className="flex items-center justify-between p-4 md:p-6 relative z-10">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold gradient-text">Intervu</span>
          <span className="badge badge-type text-xs">
            {TYPE_LABELS[session.interviewType] || session.interviewType}
          </span>
        </div>

        {callState === 'live' && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm font-mono" style={{ color: 'var(--text-secondary)' }}>
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              {formatTime(elapsedTime)}
            </div>
            <button onClick={endInterview} className="btn-danger text-sm py-2 px-5">
              End Interview
            </button>
          </div>
        )}
      </header>

      {/* Main content area */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 relative z-10">

        {/* ========== IDLE STATE ========== */}
        {callState === 'idle' && (
          <div className="text-center animate-fade-in max-w-lg">
            {/* AI avatar */}
            <div className="relative mx-auto mb-8" style={{ width: 120, height: 120 }}>
              <div className="absolute inset-0 rounded-full"
                style={{ background: 'var(--gradient-main)', opacity: 0.15 }} />
              <div className="absolute inset-3 rounded-full flex items-center justify-center text-4xl"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-glass)' }}>
                🎙️
              </div>
            </div>

            <h1 className="text-2xl md:text-3xl font-bold mb-3">
              Ready for your <span className="gradient-text">{TYPE_LABELS[session.interviewType]}</span> interview?
            </h1>
            <p className="mb-8 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              You&apos;ll be speaking with Aria, your AI interviewer. Make sure your microphone is working,
              then click start when you&apos;re ready.
            </p>

            {micError && (
              <div className="error-toast mb-6 text-left">
                <p className="font-semibold mb-1">🎤 Microphone access required</p>
                <p className="text-sm opacity-80">
                  Please allow microphone access in your browser settings and try again.
                  Look for the camera/mic icon in your browser&apos;s address bar.
                </p>
              </div>
            )}

            {error && (
              <div className="error-toast mb-6">{error}</div>
            )}

            <button onClick={startInterview} className="btn-primary text-lg px-10 py-4 animate-pulse-glow">
              Start Interview
            </button>
          </div>
        )}

        {/* ========== CONNECTING STATE ========== */}
        {callState === 'connecting' && (
          <div className="text-center animate-fade-in">
            <div className="relative mx-auto mb-8" style={{ width: 120, height: 120 }}>
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="absolute inset-0 rounded-full animate-pulse-ring"
                  style={{
                    border: '2px solid var(--accent-indigo)',
                    opacity: 0.3 - i * 0.1,
                    animationDelay: `${i * 0.3}s`,
                    transform: `scale(${1 + i * 0.15})`,
                  }}
                />
              ))}
              <div className="absolute inset-3 rounded-full flex items-center justify-center"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-glass)' }}>
                <div className="spinner" />
              </div>
            </div>
            <h2 className="text-xl font-semibold mb-2">Connecting to Aria...</h2>
            <p style={{ color: 'var(--text-secondary)' }}>Setting up your interview session</p>
          </div>
        )}

        {/* ========== LIVE STATE ========== */}
        {callState === 'live' && (
          <div className="flex flex-col items-center w-full max-w-2xl flex-1">
            {/* Audio visualizer */}
            <div className="relative mb-8" style={{ width: 160, height: 160 }}>
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="absolute rounded-full"
                  style={{
                    inset: `${i * 12}px`,
                    border: `2px solid ${isSpeaking ? 'var(--accent-indigo)' : 'var(--border-glass)'}`,
                    opacity: isSpeaking ? 0.6 - i * 0.12 : 0.15,
                    animation: isSpeaking ? `pulseRing ${1.5 + i * 0.3}s ease-in-out infinite` : 'none',
                    animationDelay: `${i * 0.15}s`,
                    transition: 'all 0.3s ease',
                  }}
                />
              ))}
              <div
                className="absolute rounded-full flex items-center justify-center text-3xl"
                style={{
                  inset: '48px',
                  background: isSpeaking ? 'rgba(99,102,241,0.15)' : 'var(--bg-secondary)',
                  border: `2px solid ${isSpeaking ? 'var(--accent-indigo)' : 'var(--border-glass)'}`,
                  transition: 'all 0.3s ease',
                }}
              >
                {isSpeaking ? '🗣️' : '👂'}
              </div>
            </div>

            {/* Status */}
            <div className="text-center mb-6">
              <p className="text-sm font-medium" style={{
                color: isSpeaking ? 'var(--accent-indigo)' : 'var(--accent-cyan)',
                transition: 'color 0.3s ease',
              }}>
                {isSpeaking ? 'Aria is speaking...' : 'Listening to you...'}
              </p>
            </div>

            {/* Live transcript */}
            <div
              className="w-full flex-1 overflow-y-auto glass-card p-5"
              style={{ maxHeight: '350px', minHeight: '200px' }}
            >
              <p className="text-xs font-medium mb-3" style={{ color: 'var(--text-muted)' }}>
                LIVE TRANSCRIPT
              </p>
              {transcript.length === 0 ? (
                <p className="text-sm italic" style={{ color: 'var(--text-muted)' }}>
                  The conversation will appear here...
                </p>
              ) : (
                <div className="space-y-3">
                  {transcript.map((entry, i) => (
                    <div key={i} className="transcript-line">
                      <span className="text-xs font-semibold block mb-0.5" style={{
                        color: entry.role === 'assistant' ? 'var(--accent-indigo)' : 'var(--accent-cyan)',
                      }}>
                        {entry.role === 'assistant' ? 'Aria' : 'You'}
                      </span>
                      <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                        {entry.content}
                      </p>
                    </div>
                  ))}
                  <div ref={transcriptEndRef} />
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========== ERROR STATE ========== */}
        {callState === 'error' && (
          <div className="text-center animate-fade-in max-w-lg">
            <div className="text-5xl mb-6">⚠️</div>
            <h2 className="text-2xl font-bold mb-3">Connection Issue</h2>
            <div className="error-toast mb-6">{error || 'An unexpected error occurred'}</div>
            <div className="flex gap-3 justify-center">
              <button onClick={() => { setCallState('idle'); setError(''); }} className="btn-primary">
                Try Again
              </button>
              <button onClick={() => router.push('/dashboard')} className="btn-secondary">
                Back to Dashboard
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
