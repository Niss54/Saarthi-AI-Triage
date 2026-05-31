import { Building2, MapPin, ArrowRight, User } from 'lucide-react';

interface Props {
  department: string;
  confidence?: number;
  reasoning?: string;
  alternativeDepartment?: string;
  doctor?: string;
  room?: string;
}

export default function DepartmentRecommendationCard({ department, confidence = 0.8, reasoning, alternativeDepartment, doctor, room }: Props) {
  const confPercent = Math.round(confidence * 100);
  
  return (
    <div className="dept-rec-card">
      <div className="dept-rec-header">
        <Building2 size={18} color="#00d4aa" />
        <span>Department Assigned</span>
      </div>
      <div className="dept-rec-body">
        <div className="dept-rec-name">{department}</div>
        
        <div className="dept-rec-confidence">
          <span className="dept-rec-conf-label">Match Confidence</span>
          <div className="dept-rec-conf-bar">
            <div className="dept-rec-conf-fill" style={{ width: `${confPercent}%`, background: confPercent > 80 ? '#00d4aa' : confPercent > 50 ? '#f59e0b' : '#ef4444' }} />
          </div>
          <span className="dept-rec-conf-value">{confPercent}%</span>
        </div>

        {doctor && (
          <div className="dept-rec-detail">
            <User size={13} color="#94a3b8" />
            <span>{doctor}</span>
          </div>
        )}
        {room && (
          <div className="dept-rec-detail">
            <MapPin size={13} color="#94a3b8" />
            <span>Room {room}</span>
          </div>
        )}

        {reasoning && (
          <p className="dept-rec-reasoning">{reasoning}</p>
        )}
        
        {alternativeDepartment && (
          <div className="dept-rec-alt">
            <ArrowRight size={12} />
            <span>Alternative: <strong>{alternativeDepartment}</strong></span>
          </div>
        )}
      </div>
    </div>
  );
}
