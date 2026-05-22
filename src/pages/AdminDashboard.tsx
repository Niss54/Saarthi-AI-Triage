import { useState, useEffect, useCallback } from 'react';
import { Stethoscope, UserPlus, Activity, Clock, AlertTriangle, Users, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import toast from 'react-hot-toast';
import { QueueItem, Department, Insight, ActivityFeedItem, StatsData } from '../types';
import { getQueue, addSimulatedPatient, getDepartments, getStats, getInsights, getFeed } from '../api/client';
import { mockQueue, mockDepartments, mockInsights, mockFeed, mockStats } from '../data/mockData';

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
  const [queue, setQueue] = useState<QueueItem[]>(mockQueue);
  const [departments] = useState<Department[]>(mockDepartments);
  const [insights] = useState<Insight[]>(mockInsights);
  const [feed] = useState<ActivityFeedItem[]>(mockFeed);
  const [stats] = useState<StatsData>(mockStats);
  const [clock, setClock] = useState(new Date());

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSimulate = useCallback(async () => {
    try {
      const newPatient = await addSimulatedPatient();
      setQueue(prev => [newPatient, ...prev]);
      toast.success(`🏥 New patient: ${newPatient.name} — ${newPatient.triageLevel.toUpperCase()}`, {
        style: {
          background: '#0f2040',
          color: '#fff',
          border: '1px solid rgba(0, 212, 170, 0.3)',
        },
        iconTheme: {
          primary: '#00d4aa',
          secondary: '#0f2040',
        },
      });
      if (newPatient.triageLevel === 'critical') {
        toast.error(`🚨 CRITICAL: ${newPatient.name} routed to Emergency!`, {
          duration: 5000,
          style: {
            background: '#1a0a0a',
            color: '#ef4444',
            border: '1px solid rgba(239, 68, 68, 0.5)',
          },
        });
      }
    } catch (err) {
      toast.error('Failed to add patient');
    }
  }, []);

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
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  });

  return (
    <div className="page-container">
      {/* Header */}
      <div className="dashboard-header">
        <div className="title-section">
          <h1>
            <Stethoscope size={28} color="#00d4aa" />
            Saarthi AI
          </h1>
          <p>KGMU Smart OPD Management System — Powered by Google Gemini</p>
        </div>
        <div className="status-section">
          <div className="live-clock">{clockStr}</div>
          <div className="status-badge">
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }}></span>
            System Active
          </div>
        </div>
      </div>

      {/* Stats Grid */}
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
      </div>

      {/* Queue Board */}
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

      {/* Bottom Grid: Chart + Insights */}
      <div className="dashboard-grid">
        {/* Department Load Chart */}
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

        {/* AI Insights + Feed */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* AI Insights */}
          <div>
            <h2 className="section-title" style={{ marginBottom: 12 }}>
              🧠 AI Insights
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {insights.map((insight, i) => (
                <div key={i} className={`insight-card severity-${insight.severity}`} style={{ animation: `slideInRight 0.4s ease-out ${i * 0.1}s both` }}>
                  <span style={{ fontSize: 24 }}>{insight.icon}</span>
                  <p style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.5 }}>{insight.message}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity Feed */}
          <div className="glass-card" style={{ padding: 0 }}>
            <h2 className="section-title" style={{ padding: '16px 20px 8px' }}>
              📋 Recent Triage Activity
            </h2>
            <div style={{ maxHeight: 280, overflowY: 'auto' }}>
              {feed.map((item, i) => (
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

      <div className="watermark">Team Syntrix | APL 2025</div>
    </div>
  );
}
