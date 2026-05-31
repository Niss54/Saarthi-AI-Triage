import { useState, useEffect, useRef } from 'react';
import { RefreshCw, AlertTriangle, Clock, Users, Activity } from 'lucide-react';
import { getQueue } from '../api/client';
import type { QueueItem } from '../types';

export default function LiveQueue() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [countdown, setCountdown] = useState(10);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchQueue = async () => {
    try {
      setError(null);
      const data = await getQueue();
      setQueue(data);
      setLastUpdated(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }));
      setCountdown(10);
    } catch (err) {
      setError('Queue data fetch failed. Backend may be offline.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
    intervalRef.current = setInterval(fetchQueue, 10000);
    countdownRef.current = setInterval(() => {
      setCountdown(prev => (prev <= 1 ? 10 : prev - 1));
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  const getSeverityBadge = (level: string) => {
    switch (level) {
      case 'critical': return { text: 'Critical', className: 'severity-badge critical' };
      case 'moderate': return { text: 'Moderate', className: 'severity-badge moderate' };
      case 'mild': return { text: 'Mild', className: 'severity-badge mild' };
      default: return { text: level, className: 'severity-badge' };
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'waiting': return { text: '⏳ Waiting', className: 'status-badge waiting' };
      case 'called': return { text: '📢 Called', className: 'status-badge called' };
      case 'in-consultation': return { text: '🩺 In Consultation', className: 'status-badge in-consultation' };
      case 'done': return { text: '✅ Done', className: 'status-badge done' };
      default: return { text: status, className: 'status-badge' };
    }
  };

  const criticalCount = queue.filter(q => q.triageLevel === 'critical').length;
  const waitingCount = queue.filter(q => q.status === 'waiting').length;

  return (
    <div className="page-container lq-page">
      <div className="lq-header">
        <div className="lq-title-block">
          <h1 className="lq-title">
            <Activity size={28} className="lq-title-icon" />
            Live Patient Queue
          </h1>
          <p className="lq-subtitle">KGMU OPD — Real-time queue monitoring</p>
        </div>
        <div className="lq-controls">
          <div className="lq-stats-mini">
            <div className="lq-stat-chip">
              <Users size={14} />
              <span>{queue.length} Total</span>
            </div>
            <div className="lq-stat-chip critical-chip">
              <AlertTriangle size={14} />
              <span>{criticalCount} Critical</span>
            </div>
            <div className="lq-stat-chip">
              <Clock size={14} />
              <span>{waitingCount} Waiting</span>
            </div>
          </div>
          <button className="lq-refresh-btn" onClick={fetchQueue} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      <div className="lq-meta-bar">
        <span className="lq-last-updated">Last updated: {lastUpdated || '—'}</span>
        <span className="lq-countdown">Next refresh in {countdown}s</span>
      </div>

      {error && (
        <div className="lq-error">
          <AlertTriangle size={18} />
          {error}
        </div>
      )}

      {loading && queue.length === 0 ? (
        <div className="lq-loading">
          <div className="spinner" style={{ width: 36, height: 36 }}></div>
          <p>Loading queue data...</p>
        </div>
      ) : (
        <div className="lq-table-wrapper">
          <table className="lq-table">
            <thead>
              <tr>
                <th>Token</th>
                <th>Patient Name</th>
                <th>Department</th>
                <th>Severity</th>
                <th>Wait Time</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {queue.length === 0 ? (
                <tr>
                  <td colSpan={6} className="lq-empty">No patients in queue</td>
                </tr>
              ) : (
                queue.map((item) => {
                  const severity = getSeverityBadge(item.triageLevel);
                  const status = getStatusBadge(item.status);
                  return (
                    <tr key={item.id} className={item.triageLevel === 'critical' ? 'row-critical' : ''}>
                      <td className="lq-token">#{item.token}</td>
                      <td>
                        <div className="lq-patient-name">{item.name}</div>
                        <div className="lq-patient-complaint">{item.chiefComplaint}</div>
                      </td>
                      <td>{item.department}</td>
                      <td><span className={severity.className}>{severity.text}</span></td>
                      <td className="lq-wait">{item.waitTime} min</td>
                      <td><span className={status.className}>{status.text}</span></td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
