interface Props {
  level: string;
  score?: number;
  compact?: boolean;
}

const BADGE_CONFIG: Record<string, { bg: string; color: string; glow: string; label: string }> = {
  critical: { bg: 'rgba(239,68,68,0.2)', color: '#ef4444', glow: '0 0 12px rgba(239,68,68,0.5)', label: 'Critical' },
  high: { bg: 'rgba(245,158,11,0.2)', color: '#f59e0b', glow: '0 0 8px rgba(245,158,11,0.3)', label: 'High' },
  medium: { bg: 'rgba(59,130,246,0.2)', color: '#3b82f6', glow: 'none', label: 'Medium' },
  low: { bg: 'rgba(34,197,94,0.2)', color: '#22c55e', glow: 'none', label: 'Low' },
};

export default function CriticalPriorityBadge({ level, score, compact = false }: Props) {
  const normalizedLevel = level?.toLowerCase() || 'low';
  const config = BADGE_CONFIG[normalizedLevel] || BADGE_CONFIG.low;

  return (
    <span
      className={`priority-badge ${normalizedLevel === 'critical' ? 'priority-badge-pulse' : ''}`}
      style={{
        background: config.bg,
        color: config.color,
        border: `1px solid ${config.color}`,
        boxShadow: config.glow,
        padding: compact ? '2px 6px' : '3px 10px',
        borderRadius: '20px',
        fontSize: compact ? '10px' : '11px',
        fontWeight: 700,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        letterSpacing: '0.5px',
        textTransform: 'uppercase' as const,
      }}
    >
      {normalizedLevel === 'critical' && <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: config.color, animation: 'pulse-dot 1.5s infinite' }} />}
      {config.label}
      {score !== undefined && <span style={{ opacity: 0.8, fontWeight: 500 }}>({score})</span>}
    </span>
  );
}
