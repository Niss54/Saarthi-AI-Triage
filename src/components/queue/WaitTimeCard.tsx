import { useState, useEffect } from 'react';
import { Clock, Users, Activity } from 'lucide-react';

interface Props {
  waitMinutes: number;
  queuePosition: number;
  patientsAhead: number;
  crowdStatus?: string;
  departmentLoad?: string;
  department?: string;
}

const CROWD_COLORS: Record<string, string> = {
  'Empty': '#22c55e',
  'Low': '#22c55e',
  'Moderate': '#f59e0b',
  'Busy': '#ef4444',
  'Overcrowded': '#dc2626',
};

export default function WaitTimeCard({ waitMinutes, queuePosition, patientsAhead, crowdStatus = 'Moderate', departmentLoad = 'Normal', department }: Props) {
  const [displayTime, setDisplayTime] = useState(waitMinutes);

  useEffect(() => {
    // Animate counter
    let start = 0;
    const end = waitMinutes;
    const duration = 1000;
    const step = Math.max(1, Math.floor(end / (duration / 30)));
    const timer = setInterval(() => {
      start += step;
      if (start >= end) {
        setDisplayTime(end);
        clearInterval(timer);
      } else {
        setDisplayTime(start);
      }
    }, 30);
    return () => clearInterval(timer);
  }, [waitMinutes]);

  const crowdColor = CROWD_COLORS[crowdStatus] || '#f59e0b';
  const circumference = 2 * Math.PI * 36;
  const progress = Math.min(1, queuePosition / Math.max(queuePosition + patientsAhead, 1));

  return (
    <div className="wait-time-card">
      <div className="wait-time-header">
        <Clock size={16} color="#00d4aa" />
        <span>Estimated Wait Time</span>
        {department && <span className="wait-dept-tag">{department}</span>}
      </div>

      <div className="wait-time-body">
        <div className="wait-time-ring-container">
          <svg width="88" height="88" viewBox="0 0 88 88">
            <circle cx="44" cy="44" r="36" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
            <circle
              cx="44" cy="44" r="36" fill="none"
              stroke="#00d4aa" strokeWidth="5"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - progress)}
              strokeLinecap="round"
              transform="rotate(-90 44 44)"
              style={{ transition: 'stroke-dashoffset 1s ease' }}
            />
          </svg>
          <div className="wait-time-number">
            <span className="wait-mins">{displayTime}</span>
            <span className="wait-label">min</span>
          </div>
        </div>

        <div className="wait-time-stats">
          <div className="wait-stat">
            <Users size={14} color="#94a3b8" />
            <div>
              <div className="wait-stat-value">{patientsAhead}</div>
              <div className="wait-stat-label">Ahead</div>
            </div>
          </div>
          <div className="wait-stat">
            <span style={{ fontSize: '14px' }}>🎫</span>
            <div>
              <div className="wait-stat-value">#{queuePosition}</div>
              <div className="wait-stat-label">Position</div>
            </div>
          </div>
          <div className="wait-stat">
            <Activity size={14} color={crowdColor} />
            <div>
              <div className="wait-stat-value" style={{ color: crowdColor }}>{crowdStatus}</div>
              <div className="wait-stat-label">Crowd</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
