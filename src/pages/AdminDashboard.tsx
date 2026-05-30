import { useState, useEffect, useCallback, useRef } from 'react';
import { Stethoscope, UserPlus, Activity, Clock, AlertTriangle, Users, BarChart3, WifiOff } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import toast from 'react-hot-toast';
import type { QueueItem, Department, Insight, ActivityFeedItem, StatsData } from '../types';
import { getQueue, addSimulatedPatient, getDepartments, getStats, getInsights, getFeed } from '../api/client';

function AnimatedCounter({ target, duration = 2000, suffix = '' }: { target: number; duration?: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const increment = target / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return <span>{count.toLocaleString()}{suffix}</span>;
}

export default function AdminDashboard() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [feed, setFeed] = useState<ActivityFeedItem[]>([]);
  const [stats, setStats] = useState<StatsData>({ totalToday: 0, avgWaitTime: 0, criticalCount: 0, activeDepartments: 0 });
  const [clock, setClock] = useState(new Date());
  const [wsConnected, setWsConnected] = useState(false);
  
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchAllData = useCallback(async () => {
    try {
      const [d, s, i, f] = await Promise.all([
        getDepartments(),
        getStats(),
        getInsights(),
        getFeed()
      ]);
      setDepartments(d);
      setStats(s);
      setInsights(i);
      setFeed(f);
    } catch (err) {
      toast.error('⚠️ Connection issue — showing cached data', { id: 'api-err' });
    }
  }, []);

  useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchAllData, 60000);
    return () => clearInterval(interval);
  }, [fetchAllData]);

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8000/ws/queue');
    wsRef.current = ws;

    ws.onopen = () => {
      setWsConnected(true);
      toast.success('Live connection established', { id: 'ws-conn' });
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setQueue(data);
    };

    ws.onclose = () => {
      setWsConnected(false);
      toast.error('🔴 Live updates disconnected', { id: 'ws-conn' });
    };

    return () => ws.close();
  }, []);

  const handleSimulate = useCallback(async () => {
    try {
      if (wsRef.current && wsConnected) {
        wsRef.current.send(JSON.stringify({ action: "add_patient" }));
        toast.success(`🏥 Simulating new patient...`);
      } else {
        await addSimulatedPatient();
        toast.success(`🏥 Simulating new patient...`);
      }
    } catch (err) {
      toast.error('Failed to add patient');
    }
  }, [wsConnected]);

  const getStatusBadge = (status: string) => {
    const map: Record<string, { className: string; label: string }> = {
      waiting: { className: 'badge badge-waiting', label: 'Waiting' },
      called: { className: 'badge badge-called', label: 'Called' },
      'in-consultation': { className: 'badge badge-consultation', label: 'In Consultation' },
      done: { className: 'badge badge-done', label: 'Done' },
    };
    const info = map[status] || map.waiting;
    return <span className={info.className}>{info.label}</span>;
  };

  const getTriageBadge = (level: string) => {
    const map: Record<string, { className: string; label: string; emoji: string }> = {
      critical: { className: 'badge badge-critical', label: 'Critical', emoji: '🔴' },
      moderate: { className: 'badge badge-moderate', label: 'Moderate', emoji: '🟡' },
      mild: { className: 'badge badge-mild', label: 'Mild', emoji: '🟢' },
    };
    const info = map[level] || map.mild;
    return <span className={info.className}>{info.emoji} {info.label}</span>;
  };

  const chartData = departments.map(d => ({
    name: d.name,
    patients: d.patientCount,
    fill: d.status === 'critical' ? '#ef4444' : d.status === 'busy' ? '#f59e0b' : '#00d4aa',
  }));

  const clockStr = clock.toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true, timeZone: 'Asia/Kolkata',
  });

  return (
    <div className="page-container">
      <div className="dashboard-header">
        <div className="title-section">
          <h1>
            <Stethoscope size={28} color="#00d4aa" />
            King George's Medical University, Lucknow
          </h1>
          <p>Saarthi AI — Smart OPD Triage & Management | Est. 1905 | OPD Hours: 8:00 AM – 2:00 PM</p>
        </div>
        <div className="status-section">
          <div className="live-clock">{clockStr}</div>
          <div className="status-badge" style={!wsConnected ? { background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' } : {}}>
            {!wsConnected ? <WifiOff size={14} /> : <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }}></span>}
            {wsConnected ? 'System Active' : 'Disconnected'}
          </div>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card" style={{ animationDelay: '0s' }}>
          <Users size={24} color="#00d4aa" />
          <div className="stat-number"><AnimatedCounter target={stats.totalToday} /></div>
          <div className="stat-label">Total Patients Today</div>
        </div>
        <div className="stat-card" style={{ animationDelay: '0.1s' }}>
          <Clock size={24} color="#f59e0b" />
          <div className="stat-number"><AnimatedCounter target={stats.avgWaitTime} suffix=" min" /></div>
          <div className="stat-label">Avg Wait Time</div>
        </div>
        <div className="stat-card" style={{ animationDelay: '0.2s' }}>
          <AlertTriangle size={24} color="#ef4444" />
          <div className="stat-number"><AnimatedCounter target={stats.criticalCount} /></div>
          <div className="stat-label">Critical Cases Routed</div>
        </div>
        <div className="stat-card" style={{ animationDelay: '0.3s' }}>
          <Activity size={24} color="#22c55e" />
          <div className="stat-number"><AnimatedCounter target={stats.activeDepartments} /></div>
          <div className="stat-label">Departments Active</div>
        </div>
        <div className="stat-card" style={{ animationDelay: '0.4s' }}>
          <UserPlus size={24} color="#3b82f6" />
          <div className="stat-number"><AnimatedCounter target={stats.doctorsOnDuty || 24} /></div>
          <div className="stat-label">Doctors On Duty</div>
        </div>
      </div>

      <div className="glass-card" style={{ marginBottom: 24, padding: 0, overflow: 'hidden' }}>
        <div className="section-header" style={{ padding: '20px 24px 0' }}>
          <h2 className="section-title">
            <Activity size={20} color="#00d4aa" />
            Live Queue Board
          </h2>
          <button className="btn-primary" onClick={handleSimulate}>
            <UserPlus size={16} /> Simulate New Patient
          </button>
        </div>
        <div style={{ overflowX: 'auto', padding: '0 8px 16px' }}>
          <table className="queue-table">
            <thead>
              <tr>
                <th>Token</th>
                <th>Patient Name</th>
                <th>Age</th>
                <th>Triage Level</th>
                <th>Chief Complaint</th>
                <th>Department</th>
                <th>Wait Time</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {queue.map((patient, i) => (
                <tr
                  key={patient.id}
                  className={`queue-row ${
                    patient.triageLevel === 'critical' ? 'critical-row' :
                    patient.triageLevel === 'moderate' ? 'moderate-row' : 'mild-row'
                  }`}
                  style={{ animation: `fadeInUp 0.3s ease-out ${i * 0.03}s both` }}
                >
                  <td style={{ fontWeight: 700, color: '#00d4aa', fontFamily: 'monospace', fontSize: 13 }}>
                    #{patient.token}
                  </td>
                  <td style={{ fontWeight: 600 }}>
                    {patient.triageLevel === 'critical' && <span className="critical-pulse"></span>}
                    {patient.name}
                  </td>
                  <td>{patient.age}</td>
                  <td>{getTriageBadge(patient.triageLevel)}</td>
                  <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#94a3b8' }}>
                    {patient.chiefComplaint}
                  </td>
                  <td style={{ fontWeight: 500 }}>{patient.department}</td>
                  <td style={{ fontWeight: 600 }}>{patient.waitTime} min</td>
                  <td>{getStatusBadge(patient.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="glass-card">
          <h2 className="section-title" style={{ marginBottom: 20 }}>
            <BarChart3 size={20} color="#00d4aa" />
            Department Patient Load
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis type="number" stroke="#94a3b8" fontSize={12} />
              <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={12} width={100} />
              <Tooltip
                contentStyle={{
                  background: '#0f2040',
                  border: '1px solid rgba(0, 212, 170, 0.3)',
                  borderRadius: 8,
                  color: '#fff',
                  fontSize: 13,
                }}
              />
              <Bar dataKey="patients" radius={[0, 6, 6, 0]}>
                {chartData.map((entry, idx) => (
                  <Cell key={idx} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <h2 className="section-title" style={{ marginBottom: 12 }}>
              🧠 AI Insights
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {insights.length === 0 ? (
                <div style={{ color: '#94a3b8', fontSize: 13, padding: 16, textAlign: 'center' }}>Loading insights...</div>
              ) : insights.map((insight, i) => (
                <div key={i} className={`insight-card severity-${insight.severity}`} style={{ animation: `slideInRight 0.4s ease-out ${i * 0.1}s both` }}>
                  <span style={{ fontSize: 24 }}>{insight.icon}</span>
                  <p style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.5 }}>{insight.message}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card" style={{ padding: 0 }}>
            <h2 className="section-title" style={{ padding: '16px 20px 8px' }}>
              📋 Recent Triage Activity
            </h2>
            <div style={{ maxHeight: 280, overflowY: 'auto' }}>
              {feed.length === 0 ? (
                <div style={{ color: '#94a3b8', fontSize: 13, padding: 16, textAlign: 'center' }}>Loading feed...</div>
              ) : feed.map((item, i) => (
                <div key={i} className="feed-item">
                  <span style={{ color: '#64748b', fontFamily: 'monospace', fontSize: 12, minWidth: 70 }}>{item.time}</span>
                  <span style={{ color: '#00d4aa', fontWeight: 600, fontFamily: 'monospace', fontSize: 12, minWidth: 75 }}>#{item.token}</span>
                  <span style={{ flex: 1, fontWeight: 500 }}>{item.name}</span>
                  <span className={`badge badge-${item.triageLevel}`}>
                    {item.triageLevel === 'critical' ? '🔴' : item.triageLevel === 'moderate' ? '🟡' : '🟢'} {item.triageLevel}
                  </span>
                  <span style={{ color: '#94a3b8', fontSize: 12 }}>{item.department}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="glass-card" style={{ marginBottom: 24, marginTop: 24 }}>
        <h2 className="section-title" style={{ marginBottom: 16 }}>
          <Activity size={20} color="#00d4aa" />
          Agentic Workflow Architecture
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          <div style={{ background: 'rgba(0, 212, 170, 0.05)', border: '1px solid rgba(0, 212, 170, 0.2)', borderRadius: 8, padding: 16 }}>
            <h4 style={{ color: '#00d4aa', marginBottom: 8 }}>🎙️ Voice Agent</h4>
            <p style={{ fontSize: 13, color: '#94a3b8' }}>Multilingual speech recognition & TTS for seamless patient intake (hi-IN / en-US).</p>
          </div>
          <div style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 8, padding: 16 }}>
            <h4 style={{ color: '#ef4444', marginBottom: 8 }}>🧠 Triage Agent</h4>
            <p style={{ fontSize: 13, color: '#94a3b8' }}>Gemini 1.5 Flash powered severity classification and emergency detection.</p>
          </div>
          <div style={{ background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: 8, padding: 16 }}>
            <h4 style={{ color: '#3b82f6', marginBottom: 8 }}>👨‍⚕️ Assignment Agent</h4>
            <p style={{ fontSize: 13, color: '#94a3b8' }}>Maps critical patients to specialized departments and assigns on-duty doctors.</p>
          </div>
          <div style={{ background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: 8, padding: 16 }}>
            <h4 style={{ color: '#f59e0b', marginBottom: 8 }}>📊 Insights Agent</h4>
            <p style={{ fontSize: 13, color: '#94a3b8' }}>Monitors live queue data and generates actionable hospital management insights.</p>
          </div>
        </div>
      </div>

      <div className="watermark">Team Syntrix | APL 2025</div>
    </div>
  );
}
