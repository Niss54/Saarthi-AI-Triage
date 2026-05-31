import { useState, useEffect } from 'react';
import type { TriageResult } from '../../types';
import { AlertTriangle, X } from 'lucide-react';

interface Props {
  result: TriageResult;
  onDismiss?: () => void;
}

export default function EmergencyAlertModal({ result, onDismiss }: Props) {
  const [countdown, setCountdown] = useState(15);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Play alert sound
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const playBeep = () => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.setValueAtTime(1200, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.05);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      };
      playBeep();
      let count = 1;
      const interval = setInterval(() => {
        if (count >= 3) { clearInterval(interval); return; }
        playBeep();
        count++;
      }, 500);
    } catch(e) { /* Audio not available */ }
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    setVisible(false);
    onDismiss?.();
  };

  return (
    <div className="emergency-modal-overlay" onClick={dismiss}>
      <div className="emergency-modal" onClick={e => e.stopPropagation()}>
        <button className="emergency-modal-close" onClick={dismiss}><X size={20} /></button>
        
        <div className="emergency-modal-siren">
          <AlertTriangle size={40} />
        </div>
        
        <h2 className="emergency-modal-title">🚨 EMERGENCY — FAST TRACK ACTIVATED</h2>
        
        {result.fastTrackReason && (
          <p className="emergency-modal-reason">{result.fastTrackReason}</p>
        )}
        
        <div className="emergency-modal-grid">
          <div className="emergency-modal-item">
            <span className="emergency-modal-label">Token</span>
            <span className="emergency-modal-value">{result.token}</span>
          </div>
          <div className="emergency-modal-item">
            <span className="emergency-modal-label">Department</span>
            <span className="emergency-modal-value">{result.department}</span>
          </div>
          <div className="emergency-modal-item">
            <span className="emergency-modal-label">Doctor</span>
            <span className="emergency-modal-value">{result.assignedDoctor || 'Emergency Physician'}</span>
          </div>
          <div className="emergency-modal-item">
            <span className="emergency-modal-label">Room</span>
            <span className="emergency-modal-value">{result.roomNumber || 'ER-1'}</span>
          </div>
          <div className="emergency-modal-item">
            <span className="emergency-modal-label">Priority</span>
            <span className="emergency-modal-value" style={{ color: '#ef4444' }}>#1 — IMMEDIATE</span>
          </div>
          <div className="emergency-modal-item">
            <span className="emergency-modal-label">Wait Time</span>
            <span className="emergency-modal-value" style={{ color: '#ef4444' }}>0 minutes</span>
          </div>
        </div>

        <div className="emergency-modal-footer">
          <span>Auto-dismiss in {countdown}s</span>
          <button className="emergency-modal-btn" onClick={dismiss}>I Understand</button>
        </div>
      </div>
    </div>
  );
}
