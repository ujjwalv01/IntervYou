'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { get, post } from '@/lib/api';
import { getAuth } from '@/lib/auth';

const TYPE_LABELS = {
  behavioral: 'Behavioral',
  technical: 'Technical',
  system_design: 'System Design',
  hr_culture_fit: 'HR / Culture Fit',
};

function ScoreCircle({ score }) {
  const radius = 62;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const getScoreColor = (s) => {
    if (s >= 80) return '#10b981';
    if (s >= 60) return '#c0c0c0';
    if (s >= 40) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div className="score-circle relative flex items-center justify-center">
      <svg width="160" height="160" viewBox="0 0 160 160">
        <circle className="score-circle-track" cx="80" cy="80" r={radius}
          fill="none" strokeWidth="8" />
        <circle className="score-circle-fill" cx="80" cy="80" r={radius}
          fill="none" strokeWidth="8" strokeLinecap="round"
          stroke={getScoreColor(score)}
          strokeDasharray={circumference}
          strokeDashoffset={offset} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold" style={{ color: getScoreColor(score) }}>{score}</span>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>out of 100</span>
      </div>
    </div>
  );
}

function CategoryBar({ label, score, maxScore = 10 }) {
  const percentage = (score / maxScore) * 100;
  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</span>
        <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
          {score}<span style={{ color: 'var(--text-muted)' }}>/{maxScore}</span>
        </span>
      </div>
      <div className="score-bar">
        <div className="score-bar-fill" style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

export default function ReportPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.sessionId;

  const [report, setReport] = useState(null);
  const [error, setError] = useState(null); // { message, canRetry }
  const [retrying, setRetrying] = useState(false);
  const [expandedQuestion, setExpandedQuestion] = useState(null);

  const loadReport = useCallback(async () => {
    try {
      setReport(await get(`/api/sessions/${sessionId}/report`));
      setError(null);
    } catch (err) {
      // 404 = the interview ended but feedback generation failed; it can be retried.
      setError({ message: err.status === 404 ? "Your feedback report isn't ready yet." : err.message, canRetry: err.status === 404 });
    }
  }, [sessionId]);

  const retry = async () => {
    setRetrying(true);
    try {
      await post(`/api/sessions/${sessionId}/end`, {});
      await loadReport();
    } catch (err) {
      setError({ message: err.message, canRetry: true });
    } finally {
      setRetrying(false);
    }
  };

  useEffect(() => {
    if (!getAuth()?.token) return router.replace('/login');
    loadReport();
  }, [router, loadReport]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <div className="error-toast mb-4">{error.message}</div>
          <div className="flex gap-3 justify-center">
            {error.canRetry && (
              <button onClick={retry} disabled={retrying} className="btn-primary">
                {retrying ? 'Generating…' : 'Generate report'}
              </button>
            )}
            <button onClick={() => router.push('/dashboard')} className="btn-secondary">
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  const duration = report.startedAt && report.endedAt
    ? Math.round((new Date(report.endedAt) - new Date(report.startedAt)) / 60000)
    : null;

  return (
    <div className="min-h-screen p-4 md:p-8 relative overflow-hidden">
      <div className="orb orb-indigo" style={{ width: 400, height: 400, top: '-10%', right: '20%' }} />
      <div className="orb orb-violet" style={{ width: 300, height: 300, bottom: '5%', left: '5%' }} />

      <div className="max-w-3xl mx-auto relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 animate-fade-in">
          <div>
            <button
              onClick={() => router.push('/dashboard')}
              className="text-sm font-medium mb-3 block transition-colors"
              style={{ color: 'var(--text-muted)' }}
            >
              ← Back to Dashboard
            </button>
            <h1 className="text-2xl md:text-3xl font-bold">
              Interview <span className="gradient-text">Report</span>
            </h1>
            <div className="flex items-center gap-3 mt-2">
              <span className="badge badge-type">
                {TYPE_LABELS[report.interviewType] || report.interviewType}
              </span>
              {duration && (
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  {duration} min
                </span>
              )}
              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {new Date(report.startedAt).toLocaleDateString('en-US', {
                  month: 'short', day: 'numeric', year: 'numeric'
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Summary */}
        {report.summary && (
          <div className="glass-card p-6 mb-6 animate-slide-up" style={{ animationDelay: '0.05s' }}>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {report.summary}
            </p>
          </div>
        )}

        {/* Score + Categories */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Overall score */}
          <div className="glass-card p-6 flex flex-col items-center justify-center animate-slide-up"
            style={{ animationDelay: '0.1s' }}>
            <p className="text-xs font-medium mb-4" style={{ color: 'var(--text-muted)' }}>
              OVERALL SCORE
            </p>
            <ScoreCircle score={report.overallScore || 0} />
          </div>

          {/* Category scores */}
          <div className="glass-card p-6 animate-slide-up" style={{ animationDelay: '0.15s' }}>
            <p className="text-xs font-medium mb-4" style={{ color: 'var(--text-muted)' }}>
              CATEGORY BREAKDOWN
            </p>
            <div className="space-y-4">
              {report.categoryScores && (
                <>
                  <CategoryBar label="Communication" score={report.categoryScores.communication || 0} />
                  <CategoryBar label="Structure" score={report.categoryScores.structure || 0} />
                  <CategoryBar label="Depth" score={report.categoryScores.depth || 0} />
                  <CategoryBar label="Confidence" score={report.categoryScores.confidence || 0} />
                </>
              )}
            </div>
          </div>
        </div>

        {/* Strengths + Improvements */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Strengths */}
          <div className="glass-card p-6 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <p className="text-xs font-medium mb-4" style={{ color: 'var(--success)' }}>
              ✓ STRENGTHS
            </p>
            <ul className="space-y-3">
              {(report.strengths || []).map((s, i) => (
                <li key={i} className="flex gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <span style={{ color: 'var(--success)' }}>•</span>
                  {s}
                </li>
              ))}
            </ul>
          </div>

          {/* Improvements */}
          <div className="glass-card p-6 animate-slide-up" style={{ animationDelay: '0.25s' }}>
            <p className="text-xs font-medium mb-4" style={{ color: 'var(--warning)' }}>
              → AREAS FOR IMPROVEMENT
            </p>
            <ul className="space-y-3">
              {(report.improvements || []).map((s, i) => (
                <li key={i} className="flex gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <span style={{ color: 'var(--warning)' }}>•</span>
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Question Breakdown */}
        {report.questionBreakdown && report.questionBreakdown.length > 0 && (
          <div className="glass-card p-6 mb-6 animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <p className="text-xs font-medium mb-4" style={{ color: 'var(--text-muted)' }}>
              QUESTION-BY-QUESTION BREAKDOWN
            </p>
            <div className="space-y-3">
              {report.questionBreakdown.map((q, i) => (
                <div key={i}>
                  <button
                    onClick={() => setExpandedQuestion(expandedQuestion === i ? null : i)}
                    className="w-full text-left p-4 rounded-lg transition-all"
                    style={{
                      background: expandedQuestion === i ? 'rgba(255,255,255,0.04)' : 'rgba(10,10,10,0.5)',
                      border: `1px solid ${expandedQuestion === i ? 'var(--border-glass-hover)' : 'transparent'}`,
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                          Q{i + 1}: {q.question}
                        </p>
                      </div>
                      <span className="text-sm" style={{
                        color: 'var(--text-muted)',
                        transform: expandedQuestion === i ? 'rotate(180deg)' : 'none',
                        transition: 'transform 0.2s ease',
                        display: 'inline-block',
                      }}>
                        ▼
                      </span>
                    </div>
                  </button>
                  {expandedQuestion === i && (
                    <div className="px-4 pb-4 pt-2 space-y-3 animate-fade-in">
                      <div>
                        <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Answer Summary</p>
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{q.answer_summary}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Evaluation</p>
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{q.evaluation}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTAs */}
        <div className="flex gap-4 justify-center animate-slide-up" style={{ animationDelay: '0.35s' }}>
          <button onClick={() => router.push('/interview/new')} className="btn-primary">
            Start New Interview
          </button>
          <button onClick={() => router.push('/dashboard')} className="btn-secondary">
            Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
