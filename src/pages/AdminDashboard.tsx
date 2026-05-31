import { useState, useEffect, useCallback, useRef } from 'react';
import { Stethoscope, UserPlus, Activity, Clock, AlertTriangle, Users, WifiOff } from 'lucide-react';
import toast from 'react-hot-toast';
import type { QueueItem, StatsData } from '../types';
import { addSimulatedPatient, getStats } from '../api/client';

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

const FALLBACK_STATS: StatsData = {
  totalToday: 5124,
  criticalCount: 38,
  avgWaitTime: 34,
  doctorsOnDuty: 24,
  activeDepartments: 8
};

const MOCK_QUEUE: QueueItem[] = [
  { id: '1', token: "EMG-2041", name: "Ramesh Kumar", age: 58, department: "Emergency/Cardiology", triageLevel: "critical", assignedDoctor: "Dr. A. Singh", roomNumber: "Emergency Bay C-204", waitTime: 0, status: "Priority Override", chiefComplaint: "Chest Pain", timestamp: "" },
  { id: '2', token: "OPD-1847", name: "Sunita Devi", age: 34, department: "General Medicine", triageLevel: "moderate", assignedDoctor: "Dr. Meera Sharma", roomNumber: "G-102", waitTime: 28, status: "Waiting", chiefComplaint: "Fever", timestamp: "" },
  { id: '3', token: "OPD-1848", name: "Anil Verma", age: 45, department: "Orthopaedics", triageLevel: "moderate", assignedDoctor: "Dr. Suresh Pandey", roomNumber: "O-201", waitTime: 35, status: "Waiting", chiefComplaint: "Fracture", timestamp: "" },
  { id: '4', token: "OPD-1849", name: "Priya Singh", age: 28, department: "Gynecology", triageLevel: "mild", assignedDoctor: "Dr. Anita Joshi", roomNumber: "GY-201", waitTime: 45, status: "Waiting", chiefComplaint: "Checkup", timestamp: "" },
  { id: '5', token: "OPD-1850", name: "Mohan Lal", age: 62, department: "Neurology", triageLevel: "moderate", assignedDoctor: "Dr. Rakesh Gupta", roomNumber: "N-101", waitTime: 40, status: "Waiting", chiefComplaint: "Headache", timestamp: "" }
];

const MOCK_DEPARTMENTS = [
  { name: 'General Medicine', patientCount: 47, status: 'Overloaded', color: 'red', doctors: 'Dr. Meera Sharma, Dr. Anil Kumar', room: 'G-102, G-104' },
  { name: 'Cardiology', patientCount: 12, status: 'Busy', color: 'yellow', doctors: 'Dr. Arvind Singh, Dr. Priya Verma', room: 'C-201, C-202' },
  { name: 'Orthopaedics', patientCount: 23, status: 'Normal', color: 'green', doctors: 'Dr. Suresh Pandey, Dr. Amit Srivastava', room: 'O-201, O-203' },
  { name: 'Emergency', patientCount: 6, status: 'Busy', color: 'yellow', doctors: 'Dr. A. Singh', room: 'Emergency Bay C-204' },
  { name: 'Neurology', patientCount: 15, status: 'Normal', color: 'green', doctors: 'Dr. Rakesh Gupta, Dr. Sunita Rao', room: 'N-101, N-103' },
  { name: 'Pediatrics', patientCount: 19, status: 'Normal', color: 'green', doctors: 'Dr. Neha Singh, Dr. Rajiv Tiwari', room: 'P-101, P-102' },
  { name: 'Gynecology', patientCount: 11, status: 'Normal', color: 'green', doctors: 'Dr. Anita Joshi, Dr. Pooja Dubey', room: 'GY-201, GY-202' },
  { name: 'Dermatology', patientCount: 8, status: 'Normal', color: 'green', doctors: 'Dr. Vikram Nair', room: 'D-101' }
];

export default function AdminDashboard() {
  const [queue, setQueue] = useState<QueueItem[]>(MOCK_QUEUE);
  const [stats, setStats] = useState<StatsData>(FALLBACK_STATS);
  const [clock, setClock] = useState(new Date());
  const [wsConnected, setWsConnected] = useState(false);
  
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchAllData = useCallback(async () => {
    try {
      const s = await getStats();
      if (s && s.totalToday > 0) {
        setStats(s);
      } else {
        setStats(FALLBACK_STATS);
      }
    } catch (err) {
      setStats(FALLBACK_STATS);
      console.warn('API fail, using fallback stats');
    }
  }, []);

  useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchAllData, 15000);
    return () => clearInterval(interval);
  }, [fetchAllData]);

  useEffect(() => {
    let ws: WebSocket;
    try {
      ws = new WebSocket('ws://localhost:8000/ws/queue');
      wsRef.current = ws;

      ws.onopen = () => {
        setWsConnected(true);
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data && data.length > 0) {
          setQueue(data);
        } else {
          setQueue(MOCK_QUEUE);
        }
      };

      ws.onclose = () => {
        setWsConnected(false);
        setQueue(MOCK_QUEUE);
      };
      
      ws.onerror = () => {
        setWsConnected(false);
        setQueue(MOCK_QUEUE);
      }
    } catch (e) {
      setWsConnected(false);
      setQueue(MOCK_QUEUE);
    }

    return () => {
      if (ws) ws.close();
    };
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
      toast.error('Failed to add patient, but using mock data');
    }
  }, [wsConnected]);

  const getStatusBadge = (status: string) => {
    if (status === 'Priority Override') {
      return <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', border: '1px solid #ef4444' }}>Priority Override</span>;
    }
    return <span className="badge badge-waiting">{status}</span>;
  };

  const getTriageBadge = (level: string) => {
    const map: Record<string, { className: string; label: string; emoji: string }> = {
      critical: { className: 'badge badge-critical', label: 'Critical', emoji: '🔴' },
      moderate: { className: 'badge badge-moderate', label: 'Moderate', emoji: '🟡' },
      mild: { className: 'badge badge-mild', label: 'Low', emoji: '🟢' },
    };
    const info = map[level] || map.mild;
    return <span className={info.className}>{info.emoji} {info.label}</span>;
  };

  const getRowStyle = (level: string) => {
    if (level === 'critical') return { background: 'rgba(239, 68, 68, 0.1)' };
    if (level === 'moderate') return { background: 'rgba(245, 158, 11, 0.05)' };
    return { background: 'rgba(34, 197, 94, 0.05)' };
  };

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
          <div className="status-badge" style={!wsConnected ? { background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', borderColor: 'rgba(245, 158, 11, 0.3)' } : {}}>
            {!wsConnected ? <WifiOff size={14} /> : <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }}></span>}
            {wsConnected ? 'System Active' : 'Fallback Mode'}
          </div>
        </div>
      </div>

      {/* TOP STATS BAR */}
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

      {/* HOSPITAL DEPARTMENTS SECTION */}
      <div className="glass-card" style={{ marginBottom: 24 }}>
        <h2 className="section-title" style={{ marginBottom: 16 }}>
          <Activity size={20} color="#00d4aa" />
          Hospital Departments Load
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          {MOCK_DEPARTMENTS.map((dept, i) => {
            const barWidth = Math.min(100, (dept.patientCount / 60) * 100);
            const barColor = dept.patientCount > 35 ? '#ef4444' : dept.patientCount > 20 ? '#f59e0b' : '#22c55e';
            const badgeBg = dept.color === 'red' ? 'rgba(239, 68, 68, 0.2)' : dept.color === 'yellow' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(34, 197, 94, 0.2)';
            const badgeCol = dept.color === 'red' ? '#ef4444' : dept.color === 'yellow' ? '#f59e0b' : '#22c55e';

            return (
              <div key={i} style={{ background: 'rgba(15, 32, 64, 0.4)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, fontSize: '15px', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {dept.name === 'Cardiology' ? '🫀' : dept.name === 'Emergency' ? '🚨' : dept.name === 'Orthopaedics' ? '🦴' : dept.name === 'Neurology' ? '🧠' : '🏥'} 
                    {dept.name}
                  </h3>
                  <span style={{ fontSize: '11px', fontWeight: 'bold', padding: '4px 8px', borderRadius: '12px', background: badgeBg, color: badgeCol, textTransform: 'uppercase' }}>
                    {dept.status} {dept.color === 'red' ? '🔴' : dept.color === 'yellow' ? '🟡' : '🟢'}
                  </span>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>
                    <span>Patients: {dept.patientCount}</span>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${barWidth}%`, height: '100%', background: barColor, borderRadius: '4px' }}></div>
                  </div>
                </div>
                <div style={{ fontSize: '12px', color: '#cbd5e1', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {dept.doctors.split(', ').map((doc, j) => {
                    const rms = dept.room.split(', ');
                    return (
                      <div key={j} style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>{doc}</span>
                        <span style={{ color: '#64748b' }}>{rms[j] || rms[0]}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* QUEUE TABLE SECTION */}
      <div className="glass-card" style={{ marginBottom: 24, padding: 0, overflow: 'hidden' }}>
        <div className="section-header" style={{ padding: '20px 24px 0' }}>
          <h2 className="section-title">
            <Users size={20} color="#00d4aa" />
            Live Patient Queue
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
                <th>Name</th>
                <th>Age</th>
                <th>Department</th>
                <th>Severity</th>
                <th>Doctor</th>
                <th>Room</th>
                <th>Wait</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {queue.map((patient, i) => (
                <tr
                  key={patient.id || i}
                  className="queue-row"
                  style={{ ...getRowStyle(patient.triageLevel), animation: `fadeInUp 0.3s ease-out ${i * 0.03}s both` }}
                >
                  <td style={{ fontWeight: 700, color: patient.triageLevel === 'critical' ? '#ef4444' : '#00d4aa', fontFamily: 'monospace', fontSize: 13 }}>
                    {patient.token.startsWith('EMG') ? <span style={{ background: 'rgba(239, 68, 68, 0.15)', padding: '2px 6px', borderRadius: '4px', border: '1px solid #ef4444' }}>{patient.token}</span> : patient.token}
                  </td>
                  <td style={{ fontWeight: 600 }}>
                    {patient.triageLevel === 'critical' && <span className="critical-pulse"></span>}
                    {patient.name}
                  </td>
                  <td>{patient.age}</td>
                  <td style={{ fontWeight: 500 }}>{patient.department}</td>
                  <td>{getTriageBadge(patient.triageLevel)}</td>
                  <td style={{ color: '#cbd5e1' }}>{patient.assignedDoctor || 'On-Duty'}</td>
                  <td style={{ color: '#cbd5e1', fontSize: '13px' }}>{patient.roomNumber || '-'}</td>
                  <td style={{ fontWeight: 600 }}>{patient.waitTime === 0 ? '0-3 mins' : `${patient.waitTime} mins`}</td>
                  <td>{getStatusBadge(patient.status || 'Waiting')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
