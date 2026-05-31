import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import { useState } from 'react';
import { Stethoscope, Menu, X } from 'lucide-react';
import { Toaster } from 'react-hot-toast';
import AdminDashboard from './pages/AdminDashboard';
import PatientPortal from './pages/PatientPortal';
import About from './pages/About';
import HomePage from './pages/HomePage';
import LiveQueue from './pages/LiveQueue';
import AIInsights from './pages/AIInsights';
import VoiceAgent from './pages/VoiceAgent';
import Footer from './components/Footer';
import SoftAurora from './components/SoftAurora';
import './index.css';

function App() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <Router>
      {/* Soft Aurora Background */}
      <div className="aurora-bg-wrapper">
        <SoftAurora
          speed={0.7}
          scale={1.5}
          brightness={1.0}
          color1="#000000" /* Deep dark background */
          color2="#00e5a0" /* Bright teal aurora */
          noiseFrequency={2.0}
          noiseAmplitude={1.0}
          bandHeight={0.6}
          bandSpread={1.2}
          octaveDecay={0.15}
          layerOffset={0.2}
          colorSpeed={1.0}
          enableMouseInteraction
          mouseInfluence={0.25}
        />
      </div>

      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#0f2040',
            color: '#fff',
            border: '1px solid rgba(0, 212, 170, 0.3)',
            borderRadius: '12px',
            fontSize: '14px',
          },
        }}
      />

      {/* Floating Pill Navbar */}
      <nav className="navbar">
        <NavLink to="/" className="navbar-brand" onClick={() => setMenuOpen(false)}>
          <Stethoscope size={22} />
          Saarthi AI
        </NavLink>
        <button className="hamburger" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        <ul className={`navbar-links ${menuOpen ? 'open' : ''}`}>
          <li>
            <NavLink to="/" end className={({ isActive }) => isActive ? 'active' : ''} onClick={() => setMenuOpen(false)}>
              Home
            </NavLink>
          </li>
          <li>
            <NavLink to="/patient" className={({ isActive }) => isActive ? 'active' : ''} onClick={() => setMenuOpen(false)}>
              Patient Triage
            </NavLink>
          </li>
          <li>
            <NavLink to="/voice-agent" className={({ isActive }) => isActive ? 'active' : ''} onClick={() => setMenuOpen(false)}>
              Voice Agent
            </NavLink>
          </li>
          <li>
            <NavLink to="/live-queue" className={({ isActive }) => isActive ? 'active' : ''} onClick={() => setMenuOpen(false)}>
              Live Queue
            </NavLink>
          </li>
          <li>
            <NavLink to="/ai-insights" className={({ isActive }) => isActive ? 'active' : ''} onClick={() => setMenuOpen(false)}>
              AI Insights
            </NavLink>
          </li>
        </ul>
      </nav>

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/patient" element={<PatientPortal />} />
        <Route path="/about" element={<About />} />
        <Route path="/live-queue" element={<LiveQueue />} />
        <Route path="/ai-insights" element={<AIInsights />} />
        <Route path="/voice-agent" element={<VoiceAgent />} />
      </Routes>

      <Footer />
    </Router>
  );
}

export default App;
