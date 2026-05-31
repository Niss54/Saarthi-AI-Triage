import type { TriageResult } from '../../types';
import { Printer, User, Building2, ShieldCheck, Brain, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import UrgencyIndicator from './UrgencyIndicator';
import CriticalPriorityBadge from './CriticalPriorityBadge';
import WaitTimeCard from '../queue/WaitTimeCard';
import DepartmentRecommendationCard from './DepartmentRecommendationCard';
import QueueTracker from '../queue/QueueTracker';

interface Props {
  result: TriageResult;
  onPrint?: () => void;
}

export default function TriageResultCard({ result, onPrint }: Props) {
  const [showDetails, setShowDetails] = useState(false);

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'critical': return '#ef4444';
      case 'moderate': return '#f59e0b';
      case 'mild': return '#22c55e';
      default: return '#94a3b8';
    }
  };

  const getLevelEmoji = (level: string) => {
    switch (level) {
      case 'critical': return '🔴';
      case 'moderate': return '🟡';
      case 'mild': return '🟢';
      default: return '⚪';
    }
  };

  const priorityLevel = (result.priorityScore ?? 0) >= 80 ? 'critical' : (result.priorityScore ?? 0) >= 60 ? 'high' : (result.priorityScore ?? 0) >= 40 ? 'medium' : 'low';

  return (
    <div className="enhanced-triage-card" style={{ borderTopColor: getLevelColor(result.triageLevel) }}>
      {/* Header */}
      <div className="etc-header">
        <div className="etc-token">#{result.token}</div>
        <div className="etc-badges">
          <UrgencyIndicator level={result.urgencyLevel} />
          {result.priorityScore !== undefined && (
            <CriticalPriorityBadge level={priorityLevel} score={result.priorityScore} />
          )}
        </div>
      </div>

      {/* Severity + Confidence */}
      <div className="etc-severity-row">
        <div className="etc-severity">
          <span className="etc-severity-emoji">{getLevelEmoji(result.triageLevel)}</span>
          <span className="etc-severity-text" style={{ color: getLevelColor(result.triageLevel) }}>
            {result.triageLevel.charAt(0).toUpperCase() + result.triageLevel.slice(1)}
          </span>
          {result.severityScore !== undefined && (
            <span className="etc-severity-score">{result.severityScore}/10</span>
          )}
        </div>
        {result.confidenceScore !== undefined && (
          <div className="etc-confidence">
            <span className="etc-conf-label">AI Confidence</span>
            <div className="etc-conf-bar">
              <div className="etc-conf-fill" style={{ width: `${Math.round(result.confidenceScore * 100)}%` }} />
            </div>
            <span className="etc-conf-value">{Math.round(result.confidenceScore * 100)}%</span>
          </div>
        )}
      </div>

      {/* Core Info */}
      <div className="etc-info-grid">
        <div className="etc-info-item">
          <Building2 size={14} color="#94a3b8" />
          <span className="etc-info-label">Department</span>
          <span className="etc-info-value">{result.department}</span>
        </div>
        <div className="etc-info-item">
          <User size={14} color="#94a3b8" />
          <span className="etc-info-label">Doctor</span>
          <span className="etc-info-value">{result.assignedDoctor || 'On-Duty Physician'}</span>
        </div>
      </div>

      {/* Wait Time Card */}
      <WaitTimeCard
        waitMinutes={result.waitTimeMinutes}
        queuePosition={result.queuePosition}
        patientsAhead={result.patientsAhead ?? 0}
        crowdStatus={result.crowdStatus}
        departmentLoad={result.departmentLoad}
        department={result.department}
      />

      {/* Queue Tracker */}
      <QueueTracker
        currentStatus="waiting"
        token={result.token}
        department={result.department}
        roomNumber={result.roomNumber}
      />

      {/* AI Reasoning */}
      {result.aiReasoning && (
        <div className="etc-reasoning">
          <Brain size={14} color="#00d4aa" />
          <div>
            <div className="etc-reasoning-title">AI Reasoning</div>
            <p className="etc-reasoning-text">{result.aiReasoning}</p>
          </div>
        </div>
      )}

      {/* Expandable Details */}
      <button className="etc-expand-btn" onClick={() => setShowDetails(!showDetails)}>
        {showDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        {showDetails ? 'Hide Details' : 'Show More Details'}
      </button>

      {showDetails && (
        <div className="etc-details">
          {result.recommendedAction && (
            <div className="etc-detail-section">
              <ShieldCheck size={13} color="#00d4aa" />
              <div>
                <strong>Recommended Action</strong>
                <p>{result.recommendedAction}</p>
              </div>
            </div>
          )}

          {result.riskFactors && result.riskFactors.length > 0 && (
            <div className="etc-detail-section">
              <AlertCircle size={13} color="#f59e0b" />
              <div>
                <strong>Risk Factors</strong>
                <div className="etc-pills">
                  {result.riskFactors.map((rf, i) => (
                    <span key={i} className="etc-pill risk">{rf}</span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {result.possibleConditions && result.possibleConditions.length > 0 && (
            <div className="etc-detail-section">
              <Brain size={13} color="#3b82f6" />
              <div>
                <strong>Possible Conditions</strong>
                <div className="etc-pills">
                  {result.possibleConditions.map((pc, i) => (
                    <span key={i} className="etc-pill condition">{pc}</span>
                  ))}
                </div>
                <p className="etc-disclaimer">⚠️ AI-suggested — consult doctor for diagnosis</p>
              </div>
            </div>
          )}

          {result.emergencyFlags && result.emergencyFlags.length > 0 && (
            <div className="etc-detail-section">
              <AlertCircle size={13} color="#ef4444" />
              <div>
                <strong>Emergency Flags</strong>
                <div className="etc-pills">
                  {result.emergencyFlags.map((ef, i) => (
                    <span key={i} className="etc-pill emergency">{ef}</span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="etc-actions">
        <button className="etc-print-btn" onClick={onPrint || (() => window.print())}>
          <Printer size={14} /> Print Token
        </button>
        {result.message && <p className="etc-message">{result.message}</p>}
      </div>
    </div>
  );
}
