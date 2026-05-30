import React from 'react';
import type { TriageResult } from '../types';
import { AlertTriangle, User, Clock, Building2 } from 'lucide-react';

interface Props {
  result: TriageResult;
}

export default function EmergencyAlertPanel({ result }: Props) {
  return (
    <div className="emergency-alert-overlay fadeIn">
      <div className="emergency-alert-content pulse-red-border">
        <div className="alert-header">
          <AlertTriangle size={48} className="alert-icon pulse-dot" />
          <h2>CRITICAL CASE DETECTED</h2>
          <p>Priority Escalation Activated</p>
        </div>
        
        <div className="alert-divider"></div>

        <div className="alert-details">
          <div className="detail-item">
            <span className="label">Severity</span>
            <span className="value critical">Critical</span>
          </div>
          <div className="detail-item">
            <span className="label">Department</span>
            <span className="value">{result.department}</span>
          </div>
          <div className="detail-item">
            <span className="label">Estimated Wait</span>
            <span className="value">0–3 minutes</span>
          </div>
          <div className="detail-item">
            <span className="label">Emergency Token</span>
            <span className="value highlight token-text">{result.token}</span>
          </div>
          <div className="detail-item">
            <span className="label">Queue Position</span>
            <span className="value highlight">PRIORITY OVERRIDE</span>
          </div>
          <div className="detail-item">
            <span className="label"><User size={16} /> Assigned Doctor</span>
            <span className="value">{result.assignedDoctor || 'On-Duty Emergency Physician'}</span>
          </div>
          <div className="detail-item">
            <span className="label"><Building2 size={16} /> Room</span>
            <span className="value">{result.roomNumber || 'Emergency Bay'}</span>
          </div>
        </div>

        <div className="alert-divider"></div>

        <div className="alert-footer">
          <p className="action-text">Please proceed to Emergency immediately.</p>
          <p className="sub-text">Staff has been notified.</p>
        </div>
      </div>
    </div>
  );
}
