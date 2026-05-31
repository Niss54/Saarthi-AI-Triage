import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Activity, ArrowRight, BarChart2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

// Count-up hook with IntersectionObserver
function useCountUp(end: number, duration = 1500) {
  const [count, setCount] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const startAnimation = useCallback(() => {
    if (hasStarted) return;
    setHasStarted(true);
    const startTime = performance.now();
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      setCount(Math.floor(easeOutCubic(progress) * end));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [end, duration, hasStarted]);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) startAnimation(); },
      { threshold: 0.3 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [startAnimation]);

  return { count, ref };
}

const liveStats = [
  { value: 5124, label: 'Patients Registered' },
  { value: 38, label: 'Critical Cases Routed' },
  { value: 34, label: 'Avg Wait Time (mins)' },
  { value: 24, label: 'Doctors On Duty' },
];

const criticalConversation = [
  { role: 'ai', text: 'Namaste! Apne symptoms batayein' },
  { role: 'patient', text: 'Seene mein dard, saans nahi aa rahi', delay: 1500 },
  { role: 'ai', text: '🚨 CRITICAL — EMG-2045\nEmergency Bay C-204 — Abhi jaayein', isCritical: true, delay: 1000 }
];

const normalConversation = [
  { role: 'ai', text: 'Namaste! Apne symptoms batayein' },
  { role: 'patient', text: '5 din se bukhar hai', delay: 1500 },
  { role: 'ai', text: '✅ OPD-1847 | Dr. Meera Sharma\nRoom G-102 | ~28 mins', delay: 1000 }
];

export default function HomePage() {
  const [messages, setMessages] = useState<any[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [loopState, setLoopState] = useState(0); // 0 = start critical, 1 = start normal

  useEffect(() => {
    let active = true;
    
    const runSequence = async () => {
      const currentConversation = loopState === 0 ? criticalConversation : normalConversation;
      
      if (!active) return;
      setMessages([]);
      
      for (let i = 0; i < currentConversation.length; i++) {
        const msg = currentConversation[i];
        
        if (msg.role === 'patient' || i === currentConversation.length - 1) {
          if (!active) return;
          setIsTyping(true);
          await new Promise(r => setTimeout(r, msg.delay || 1000));
          if (!active) return;
          setIsTyping(false);
        } else {
          await new Promise(r => setTimeout(r, 400));
        }
        
        if (!active) return;
        setMessages(prev => [...prev, msg]);
      }
      
      // Wait at the end of conversation
      await new Promise(r => setTimeout(r, 4000));
      if (!active) return;
      setLoopState(prev => (prev === 0 ? 1 : 0)); // Toggle loop
    };

    runSequence();
    
    return () => {
      active = false;
    };
  }, [loopState]);

  return (
    <div className="homepage-wrapper">
      {/* Hero Section */}
      <div className="home-container">
        <div className="home-content">
          
          {/* Left Side: 55% */}
          <div className="home-text-side">
            <div className="live-badge">
              <span className="live-dot"></span>
              Live at KGMU Lucknow
            </div>
            
            <h1 className="home-title">
              5,000 Patients.<br />
              Every Day.<br />
              <span className="home-title-gradient">Now Triaged by AI.</span>
            </h1>
            
            <p className="home-subtitle">
              Saarthi AI detects critical cases instantly and routes patients to the right doctor — in Hindi, English & 8 Indian languages.
            </p>
            
            <div className="home-tag">
              🏥 KGMU Lucknow · Est. 1905
            </div>
            
            <div className="home-actions">
              <Link to="/patient" className="btn-primary">
                <Play size={18} />
                Try Live Triage
              </Link>
              <Link to="/admin" className="btn-secondary">
                <BarChart2 size={18} />
                Dashboard
              </Link>
            </div>
            
            <div className="home-stats-row">
              <div className="home-stat">
                <span className="stat-value">5,124</span>
                <span className="stat-label">Patients</span>
              </div>
              <div className="home-stat-divider"></div>
              <div className="home-stat">
                <span className="stat-value critical">38</span>
                <span className="stat-label">Critical</span>
              </div>
              <div className="home-stat-divider"></div>
              <div className="home-stat">
                <span className="stat-value">34 min</span>
                <span className="stat-label">Avg Wait</span>
              </div>
              <div className="home-stat-divider"></div>
              <div className="home-stat">
                <span className="stat-value">8</span>
                <span className="stat-label">Departments</span>
              </div>
            </div>
          </div>

          {/* Right Side: 45% (Phone Mockup) */}
          <div className="home-visual-side">
            <div className="phone-mockup">
              <div className="phone-notch"></div>
              <div className="phone-header">
                <div className="phone-avatar">
                  <Activity size={18} color="#00d4aa" />
                </div>
                <div>
                  <div className="phone-name">Saarthi AI</div>
                  <div className="phone-status">Online</div>
                </div>
              </div>
              
              <div className="phone-chat-body">
                <div className="chat-date">Today</div>
                
                {messages.map((msg, idx) => (
                  <div key={idx} className={`chat-bubble ${msg.role === 'ai' ? 'ai' : 'patient'} ${msg.isCritical ? 'critical' : ''}`}>
                    {msg.text.split('\n').map((line: string, i: number) => (
                      <span key={i}>{line}<br /></span>
                    ))}
                  </div>
                ))}
                
                {isTyping && (
                  <div className={`chat-bubble ${messages.length % 2 === 0 ? 'patient' : 'ai'} typing-indicator`}>
                    <span></span><span></span><span></span>
                  </div>
                )}
              </div>
              
              <div className="phone-input">
                <div className="input-pill">Message...</div>
                <div className="send-btn">
                  <ArrowRight size={16} color="#fff" />
                </div>
              </div>
            </div>
          </div>
          
        </div>
      </div>

      {/* How It Works Section */}
      <div className="how-it-works-container" id="features">
        <div className="how-it-works-content">
          <h2 className="section-title-large">How Saarthi AI Works</h2>
          <p className="section-subtitle-large">4 specialized AI agents working together</p>
          
          <div className="agents-grid">
            {/* Card 1 */}
            <div className="agent-card">
              <div className="agent-icon-wrap">🔍</div>
              <h3 className="agent-name">Symptom Analysis Agent</h3>
              <p className="agent-description">
                Gemini AI analyzes symptoms in Hindi, English & regional languages
              </p>
            </div>
            
            {/* Card 2 */}
            <div className="agent-card">
              <div className="agent-icon-wrap">🏥</div>
              <h3 className="agent-name">Department Routing Agent</h3>
              <p className="agent-description">
                Maps symptoms to correct KGMU department and specialist automatically
              </p>
            </div>
            
            {/* Card 3 */}
            <div className="agent-card">
              <div className="agent-icon-wrap">⏱️</div>
              <h3 className="agent-name">Wait Time Prediction Agent</h3>
              <p className="agent-description">
                Calculates real-time queue position and consultation ETA
              </p>
            </div>
            
            {/* Card 4 */}
            <div className="agent-card">
              <div className="agent-icon-wrap">🚨</div>
              <h3 className="agent-name">Emergency Escalation Agent</h3>
              <p className="agent-description">
                Critical cases bypass queue instantly and reach Emergency in 0-3 mins
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Live Stats Bar */}
      <LiveStatsBar />

      {/* Try It Live Section */}
      <TryItLiveSection />
    </div>
  );
}

function LiveStatsBar() {
  const stats = liveStats.map((s) => ({
    ...s,
    ...useCountUp(s.value),
  }));

  return (
    <div className="live-stats-container">
      <div className="live-stats-content">
        <h2 className="live-stats-title">KGMU OPD — Live Today</h2>
        <div className="live-stats-grid">
          {stats.map((s, i) => (
            <div key={i} className="live-stat-card" ref={s.ref}>
              <span className="live-stat-number">
                {s.count.toLocaleString('en-IN')}
              </span>
              <span className="live-stat-label">{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TryItLiveSection() {
  const navigate = useNavigate();

  const handleDemoClick = (text: string) => {
    navigate(`/patient?prefill=${encodeURIComponent(text)}`);
  };

  return (
    <div className="try-it-live-container">
      <div className="try-it-live-content">
        <h2 className="section-title-large">See Saarthi AI in Action</h2>
        <p className="section-subtitle-large">Click any case to try live triage</p>
        
        <div className="demo-buttons-grid">
          <button 
            className="demo-btn demo-btn-red"
            onClick={() => handleDemoClick('Mere seene mein tej dard hai')}
          >
            <div className="demo-btn-title">🚨 Chest Pain — Critical</div>
            <div className="demo-btn-text">"Mere seene mein tej dard hai"</div>
          </button>
          
          <button 
            className="demo-btn demo-btn-yellow"
            onClick={() => handleDemoClick('5 din se tez bukhar hai')}
          >
            <div className="demo-btn-title">⚠️ Fever — Moderate</div>
            <div className="demo-btn-text">"5 din se tez bukhar hai"</div>
          </button>
          
          <button 
            className="demo-btn demo-btn-green"
            onClick={() => handleDemoClick('Pair mein fracture jaisa dard hai')}
          >
            <div className="demo-btn-title">✅ Fracture — Ortho</div>
            <div className="demo-btn-text">"Pair mein fracture jaisa dard hai"</div>
          </button>
        </div>
        
        <p className="try-it-live-footer">Powered by Gemini AI · Results in seconds</p>
      </div>
    </div>
  );
}
