import { MessagesSquare, CodeXml, Network, HeartHandshake } from 'lucide-react';

export const INTERVIEW_TYPES = [
  { key: 'behavioral', label: 'Behavioral', Icon: MessagesSquare, desc: 'STAR stories, teamwork, conflict and ownership.' },
  { key: 'technical', label: 'Technical', Icon: CodeXml, desc: 'Depth of knowledge and problem-solving, explained out loud.' },
  { key: 'system_design', label: 'System Design', Icon: Network, desc: 'Requirements, trade-offs and scaling one real system.' },
  { key: 'hr_culture_fit', label: 'HR / Culture Fit', Icon: HeartHandshake, desc: 'Motivation, values and situational judgment.' },
];

export const TYPES_BY_KEY = Object.fromEntries(INTERVIEW_TYPES.map((t) => [t.key, t]));

export const EXPERIENCE_LEVELS = ['Fresher / Intern', '1-3 years', '3+ years'];

export const scoreColor = (s) =>
  s == null ? '#8394a8' : s >= 80 ? '#16a34a' : s >= 60 ? '#1683f2' : s >= 40 ? '#f59e0b' : '#dc2626';

export const formatDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export const minutesBetween = (start, end) => (start && end ? Math.max(1, Math.round((new Date(end) - new Date(start)) / 60000)) : null);

export const formatTime = (sec) => `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
