import { scoreColor } from '@/lib/constants';

export default function ScoreRing({ score, size = 140, stroke = 10, label = 'out of 100' }) {
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const color = scoreColor(score);
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-ink/5" />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={circumference * (1 - (score ?? 0) / 100)}
          className="transition-[stroke-dashoffset] duration-1000"
        />
      </svg>
      <div className="absolute text-center">
        <div className="font-serif leading-none" style={{ color, fontSize: size * 0.32 }}>{score ?? '—'}</div>
        {label && <div className="mt-1 text-[11px] text-ink-3">{label}</div>}
      </div>
    </div>
  );
}
