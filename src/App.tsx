import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import { useState } from 'react';
import { Stethoscope, Menu, X } from 'lucide-react';
import { Toaster } from 'react-hot-toast';
import AdminDashboard from './pages/AdminDashboard';
import PatientPortal from './pages/PatientPortal';
import About from './pages/About';
import './index.css';

function App() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <Router>
      <div className="spline-bg" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: -1, opacity: 0.4, pointerEvents: 'none' }}>
        <iframe src='https://my.spline.design/bganimation-SneN1YGDvvZ5jtSspTMwtlbU/' frameBorder='0' width='100%' height='100%' style={{ transform: 'scale(0.23)' }}></iframe>
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
      <nav className="navbar">
        <NavLink to="/" className="navbar-brand" onClick={() => setMenuOpen(false)}>
          <Stethoscope size={24} />
          Saarthi AI 🏥
        </NavLink>
        <button className="hamburger" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        <ul className={`navbar-links ${menuOpen ? 'open' : ''}`}>
          <li>
            <NavLink
              to="/"
              end
              className={({ isActive }) => isActive ? 'active' : ''}
              onClick={() => setMenuOpen(false)}
            >
              Admin Dashboard
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/patient"
              className={({ isActive }) => isActive ? 'active' : ''}
              onClick={() => setMenuOpen(false)}
            >
              Patient Triage
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/about"
              className={({ isActive }) => isActive ? 'active' : ''}
              onClick={() => setMenuOpen(false)}
            >
              About
            </NavLink>
          </li>
        </ul>
      </nav>
      <Routes>
        <Route path="/" element={<AdminDashboard />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/patient" element={<PatientPortal />} />
        <Route path="/about" element={<About />} />
      </Routes>
    </Router>
  );
}

export default App;
