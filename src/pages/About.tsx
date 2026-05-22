import { Stethoscope, Code, Brain, Zap, Users, HeartPulse } from 'lucide-react';

export default function About() {
  return (
    <div className="about-container">
      <div className="animate-fade-in-up">
        <h1>🏥 Saarthi AI</h1>
        <h2>Intelligent OPD Triage & Queue Management for KGMU, Lucknow</h2>
      </div>

      <div className="glass-card about-section animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
        <h3><HeartPulse size={20} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 8 }} />The Problem</h3>
        <p>
          KGMU (King George's Medical University) handles 5,000+ OPD patients daily. 
          There is no intelligent queue management — critical cardiac patients wait alongside 
          patients with mild complaints. Triage is manual, slow, and error-prone.
        </p>
      </div>

      <div className="glass-card about-section animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
        <h3><Brain size={20} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 8 }} />Our Solution</h3>
        <p>
          Saarthi AI is an agentic triage system that pre-triages patients via a WhatsApp-style 
          conversational interface, uses Google Gemini AI to classify urgency, auto-routes critical 
          cases, and provides hospital admins a real-time queue management dashboard.
        </p>
        <ul style={{ marginTop: 12 }}>
          <li>🤖 AI-powered triage using Google Gemini 1.5 Flash</li>
          <li>💬 WhatsApp-style chat in Hindi-English</li>
          <li>🚨 Auto-routing of critical cases to Emergency (0s delay)</li>
          <li>📊 Real-time admin dashboard with live queue board</li>
          <li>🔮 AI-generated insights for staffing & wait prediction</li>
          <li>📱 QR code entry simulating WhatsApp Business API</li>
          <li>⚡ WebSocket live updates</li>
          <li>🖨️ Printable token slips</li>
        </ul>
      </div>

      <div className="glass-card about-section animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
        <h3><Code size={20} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 8 }} />Tech Stack</h3>
        <ul>
          <li><strong>Frontend:</strong> React, TypeScript, Vite, Recharts</li>
          <li><strong>Backend:</strong> FastAPI, Python, Google Gemini API</li>
          <li><strong>Real-time:</strong> WebSockets for live queue updates</li>
          <li><strong>Infrastructure:</strong> Uvicorn, In-memory queue</li>
        </ul>
      </div>

      <div className="glass-card about-section animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
        <h3><Users size={20} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 8 }} />Team Syntrix</h3>
        <p>
          Built with ❤️ for the Agentic Premier League (APL) 2025 by Google Developer Groups Lucknow.
        </p>
        <p style={{ marginTop: 12 }}>
          <Zap size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4, color: '#00d4aa' }} />
          <em>"Ship before the match ends. Code bhi. Cricket bhi."</em>
        </p>
      </div>

      <div className="watermark">Team Syntrix | APL 2025</div>
    </div>
  );
}
