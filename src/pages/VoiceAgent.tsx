import { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, MicOff, Volume2, VolumeX, RotateCcw, Languages, Phone, PhoneOff, AlertTriangle, Stethoscope, Wifi, WifiOff } from 'lucide-react';
import EmergencyAlertModal from '../components/triage/EmergencyAlertModal';
import Orb from '../components/Orb';
import type { TriageResult } from '../types';

const API_BASE = 'http://localhost:8000';

type VoiceState = 'idle' | 'connecting' | 'greeting' | 'listening' | 'processing' | 'speaking' | 'done' | 'error';

type TranscriptEntry = {
  id: string;
  text: string;
  type: 'user' | 'ai' | 'system';
  timestamp: string;
};

const LANGUAGES = [
  { code: 'hi-IN', label: 'हिंदी', flag: '🇮🇳' },
  { code: 'en-IN', label: 'English', flag: '🇬🇧' },
  { code: 'bn-IN', label: 'বাংলা', flag: '🇮🇳' },
  { code: 'ta-IN', label: 'தமிழ்', flag: '🇮🇳' },
  { code: 'te-IN', label: 'తెలుగు', flag: '🇮🇳' },
  { code: 'mr-IN', label: 'मराठी', flag: '🇮🇳' },
  { code: 'gu-IN', label: 'ગુજરાતી', flag: '🇮🇳' },
  { code: 'kn-IN', label: 'ಕನ್ನಡ', flag: '🇮🇳' },
  { code: 'ml-IN', label: 'മലയാളം', flag: '🇮🇳' },
  { code: 'pa-IN', label: 'ਪੰਜਾਬੀ', flag: '🇮🇳' },
];

export default function VoiceAgent() {
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [lang, setLang] = useState('hi-IN');
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [triageResult, setTriageResult] = useState<TriageResult | null>(null);
  const [showEmergency, setShowEmergency] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [livekitConnected, setLivekitConnected] = useState(false);
  const [showLangDropdown, setShowLangDropdown] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const vadIntervalRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const now = () => new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  const addEntry = useCallback((text: string, type: TranscriptEntry['type']) => {
    setTranscript(prev => [...prev, { id: crypto.randomUUID(), text, type, timestamp: now() }]);
  }, []);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [transcript]);

  // Play base64 audio
  const playAudio = useCallback((base64Audio: string) => {
    if (!ttsEnabled || !base64Audio) return;
    try {
      const audio = new Audio(`data:audio/wav;base64,${base64Audio}`);
      audioRef.current = audio;
      audio.play().catch(e => console.warn('Audio play failed:', e));
    } catch (e) {
      console.warn('Audio decode failed:', e);
    }
  }, [ttsEnabled]);

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  };

  // Start voice session
  const startSession = async () => {
    setVoiceState('connecting');
    setTranscript([]);
    setTriageResult(null);
    setShowEmergency(false);

    try {
      // Test backend connectivity first
      const healthCheck = await fetch(`${API_BASE}/api/stats`).catch(() => null);
      if (!healthCheck || !healthCheck.ok) {
        throw new Error('Backend server is not running on port 8000');
      }

      setLivekitConnected(true);
      setVoiceState('greeting');

      // Try to get LiveKit token & greeting
      let greetingText = lang === 'hi-IN' 
        ? 'नमस्ते! मैं सारथी हूँ, केजीएमयू का एआई सहायक। आप अपने लक्षण बताइए।' 
        : 'Hello! I\'m Saarthi, KGMU\'s AI assistant. Please describe your symptoms.';

      try {
        const tokenRes = await fetch(`${API_BASE}/api/livekit/token?language=${lang}`);
        if (tokenRes.ok) {
          const tokenData = await tokenRes.json();
          if (tokenData.greeting) greetingText = tokenData.greeting;
        }
      } catch(e) {
        console.warn('LiveKit token fetch failed (non-critical):', e);
      }

      // Show greeting in transcript
      addEntry(greetingText, 'ai');

      // Try TTS greeting (non-blocking)
      try {
        const greetRes = await fetch(`${API_BASE}/api/voice/greeting?language=${lang}`);
        if (greetRes.ok) {
          const greetData = await greetRes.json();
          if (greetData.audio_base64) {
            playAudio(greetData.audio_base64);
          }
        }
      } catch (e) {
        console.warn('TTS greeting failed (non-critical):', e);
      }

      // After greeting, transition to listening
      setTimeout(() => {
        setVoiceState('listening');
        addEntry(lang === 'hi-IN' ? 'Mic button dabayein aur bolein...' : 'Press the mic button and speak...', 'system');
      }, 2500);

    } catch (err) {
      console.error('Session start error:', err);
      setVoiceState('error');
      addEntry('Connection failed. Please try again.', 'system');
      setLivekitConnected(false);
    }
  };

  // Start recording audio — using AudioContext to produce WAV directly
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      streamRef.current = stream;
      audioChunksRef.current = [];

      // Use AudioContext to capture raw PCM at 16kHz mono
      const audioCtx = new window.AudioContext({ sampleRate: 16000 });
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      source.connect(analyser);
      analyser.fftSize = 256;
      const freqData = new Uint8Array(analyser.frequencyBinCount);

      // ScriptProcessor to capture raw PCM samples
      const bufferSize = 4096;
      const processor = audioCtx.createScriptProcessor(bufferSize, 1, 1);
      const pcmChunks: Float32Array[] = [];

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        pcmChunks.push(new Float32Array(inputData));
      };

      source.connect(processor);
      processor.connect(audioCtx.destination);

      // Store pcmChunks and processor for later access
      (window as any).__saarthiPcmChunks = pcmChunks;
      (window as any).__saarthiProcessor = processor;

      setIsRecording(true);

      // --- VAD (Voice Activity Detection) ---
      let silenceStart = Date.now();
      let hasSpoken = false;

      vadIntervalRef.current = window.setInterval(() => {
        analyser.getByteFrequencyData(freqData);
        let sum = 0;
        for (let i = 0; i < freqData.length; i++) sum += freqData[i];
        const avg = sum / freqData.length;

        if (avg > 15) {
          silenceStart = Date.now();
          hasSpoken = true;
        } else if (hasSpoken && Date.now() - silenceStart > 2000) {
          // 2 seconds of silence after speaking -> auto stop
          if (vadIntervalRef.current) clearInterval(vadIntervalRef.current);
          stopRecordingAndProcess();
        }
      }, 100);

    } catch (err) {
      console.error('Mic access denied:', err);
      addEntry('Microphone access denied. Please allow mic permission.', 'system');
    }
  };

  // Helper: Convert Float32 PCM samples to WAV Blob
  const pcmToWavBlob = (pcmChunks: Float32Array[], sampleRate: number): Blob => {
    // Merge all chunks
    let totalLength = 0;
    for (const chunk of pcmChunks) totalLength += chunk.length;
    const merged = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of pcmChunks) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }

    // Convert to 16-bit PCM
    const int16 = new Int16Array(merged.length);
    for (let i = 0; i < merged.length; i++) {
      const s = Math.max(-1, Math.min(1, merged[i]));
      int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }

    // Build WAV header
    const wavBuffer = new ArrayBuffer(44 + int16.length * 2);
    const view = new DataView(wavBuffer);
    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + int16.length * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);         // chunk size
    view.setUint16(20, 1, true);          // PCM format
    view.setUint16(22, 1, true);          // mono
    view.setUint32(24, sampleRate, true); // sample rate
    view.setUint32(28, sampleRate * 2, true); // byte rate
    view.setUint16(32, 2, true);          // block align
    view.setUint16(34, 16, true);         // bits per sample
    writeString(36, 'data');
    view.setUint32(40, int16.length * 2, true);

    const wavBytes = new Uint8Array(wavBuffer);
    const pcmBytes = new Uint8Array(int16.buffer);
    wavBytes.set(pcmBytes, 44);

    return new Blob([wavBytes], { type: 'audio/wav' });
  };

  // Stop recording and send to backend
  const stopRecordingAndProcess = async () => {
    if (vadIntervalRef.current) clearInterval(vadIntervalRef.current);

    // Disconnect processor
    const processor = (window as any).__saarthiProcessor;
    if (processor) {
      try { processor.disconnect(); } catch {}
    }

    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }

    setIsRecording(false);
    setVoiceState('processing');

    streamRef.current?.getTracks().forEach(t => t.stop());

    // Wait a bit for the last data chunk
    await new Promise(r => setTimeout(r, 300));

    // Create WAV blob from captured PCM chunks
    const pcmChunks = (window as any).__saarthiPcmChunks as Float32Array[] | undefined;
    if (!pcmChunks || pcmChunks.length === 0) {
      addEntry(lang === 'hi-IN' ? 'Audio capture nahi hua. Dubara try karein.' : 'Audio capture failed. Please try again.', 'system');
      setVoiceState('listening');
      return;
    }

    const audioBlob = pcmToWavBlob(pcmChunks, 16000);

    if (audioBlob.size < 5000) {
      addEntry(lang === 'hi-IN' ? 'Audio bahut chhota hai. Zyada der tak bolein.' : 'Audio too short. Please speak longer.', 'system');
      setVoiceState('listening');
      return;
    }

    addEntry(lang === 'hi-IN' ? 'Aapki awaaz process ho rahi hai...' : 'Processing your voice...', 'system');

    try {
      // Send WAV audio to backend for full pipeline
      const formData = new FormData();
      formData.append('audio', audioBlob, 'voice.wav');
      formData.append('language', lang);

      const res = await fetch(`${API_BASE}/api/voice/triage`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error(`API error: ${res.status}`);

      const result = await res.json();

      // Show transcript
      if (result.transcript) {
        addEntry(result.transcript, 'user');
      }

      // Show AI response
      if (result.spoken_response) {
        setVoiceState('speaking');
        addEntry(result.spoken_response, 'ai');
      }

      // Play TTS audio
      if (result.audio_base64) {
        playAudio(result.audio_base64);
      }

      // Show triage result
      if (result.triage_data) {
        const td = result.triage_data;
        const triageForUI: TriageResult = {
          token: td.token || 'APL-0000',
          triageLevel: td.triage_level || 'mild',
          department: td.department || 'General OPD',
          waitTimeMinutes: td.wait_time_minutes || 30,
          queuePosition: 1,
          message: result.spoken_response || '',
          aiReasoning: td.ai_reasoning || '',
          isEmergency: td.isEmergency || false,
        };

        setTriageResult(triageForUI);

        // Emergency handling
        if (triageForUI.isEmergency || triageForUI.triageLevel === 'critical') {
          setShowEmergency(true);
        }

        setVoiceState('done');
      } else {
        setVoiceState('listening');
      }

    } catch (err) {
      console.error('Voice triage error:', err);
      addEntry(lang === 'hi-IN' ? 'Technical issue. Kripya dubara try karein.' : 'Technical issue. Please try again.', 'system');
      setVoiceState('listening');
    }
  };

  // Toggle recording
  const toggleRecording = () => {
    if (isRecording) {
      stopRecordingAndProcess();
    } else {
      startRecording();
    }
  };

  // End session
  const endSession = () => {
    stopAudio();
    if (vadIntervalRef.current) clearInterval(vadIntervalRef.current);
    const processor = (window as any).__saarthiProcessor;
    if (processor) {
      try { processor.disconnect(); } catch {}
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    streamRef.current?.getTracks().forEach(t => t.stop());
    setIsRecording(false);
    setVoiceState('idle');
    setLivekitConnected(false);
    setTriageResult(null);
    setShowEmergency(false);
  };

  // New session
  const resetSession = () => {
    endSession();
    setTranscript([]);
  };

  const getTriageLevelStyle = (level: string) => {
    switch (level) {
      case 'critical': return { bg: 'rgba(239,68,68,0.15)', border: '#ef4444', color: '#fca5a5' };
      case 'moderate': return { bg: 'rgba(245,158,11,0.15)', border: '#f59e0b', color: '#fde68a' };
      case 'mild': return { bg: 'rgba(34,197,94,0.15)', border: '#22c55e', color: '#86efac' };
      default: return { bg: 'rgba(148,163,184,0.15)', border: '#94a3b8', color: '#e2e8f0' };
    }
  };

  const selectedLang = LANGUAGES.find(l => l.code === lang) || LANGUAGES[0];

  return (
    <div className="page-container va-page">
      {/* Emergency Panel Overlay */}
      {showEmergency && triageResult && (
        <EmergencyAlertModal result={triageResult} onDismiss={() => setShowEmergency(false)} />
      )}

      {/* Header */}
      <div className="va-header">
        <div className="va-title-block">
          <h1 className="va-title">
            <Mic size={28} className="va-title-icon" />
            Voice Triage — Saarthi AI
          </h1>
          <p className="va-subtitle">Powered by Sarvam AI + LiveKit · Multilingual Indian Voice Triage</p>
        </div>
        <div className="va-controls">
          {/* Language Selector */}
          <div className="va-lang-selector">
            <button 
              className="va-lang-dropdown-btn" 
              onClick={() => setShowLangDropdown(!showLangDropdown)}
              disabled={voiceState !== 'idle'}
            >
              <Languages size={14} />
              {selectedLang.flag} {selectedLang.label}
              <span className="va-dropdown-arrow">▾</span>
            </button>
            {showLangDropdown && (
              <div className="va-lang-dropdown">
                {LANGUAGES.map(l => (
                  <button
                    key={l.code}
                    className={`va-lang-option ${l.code === lang ? 'active' : ''}`}
                    onClick={() => { setLang(l.code); setShowLangDropdown(false); }}
                  >
                    {l.flag} {l.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            className="va-tts-btn"
            onClick={() => setTtsEnabled(!ttsEnabled)}
            title={ttsEnabled ? 'Mute AI Voice' : 'Unmute AI Voice'}
          >
            {ttsEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
          <div className={`va-connection-badge ${livekitConnected ? 'connected' : ''}`}>
            {livekitConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
            {livekitConnected ? 'Connected' : 'Offline'}
          </div>
        </div>
      </div>

      {/* Main Mic Area */}
      <div className="va-mic-section">
        {voiceState === 'idle' ? (
          <>
            <button className="va-mic-btn va-start-btn" onClick={startSession}>
              <Phone size={36} />
            </button>
            <p className="va-mic-label">
              {lang === 'hi-IN' ? 'Voice Triage shuru karein' : 'Start Voice Triage'}
            </p>
            <p className="va-mic-sub">
              {lang === 'hi-IN' ? 'Mic dabayein, apne symptoms bolein, AI triage karega' : 'Press mic, speak symptoms, AI will triage'}
            </p>
          </>
        ) : voiceState === 'connecting' ? (
          <>
            <div className="va-mic-btn va-connecting-btn">
              <div className="spinner" style={{ width: 36, height: 36, borderWidth: 3 }}></div>
            </div>
            <p className="va-mic-label">Connecting to Saarthi...</p>
          </>
        ) : voiceState === 'error' ? (
          <>
            <button className="va-mic-btn va-error-btn" onClick={startSession}>
              <AlertTriangle size={36} />
            </button>
            <p className="va-mic-label">Connection failed — Tap to retry</p>
          </>
        ) : (
          <div 
            className="orb-wrapper" 
            style={{ 
              position: 'relative', 
              width: '100%', 
              height: 400, 
              cursor: (voiceState === 'listening' || voiceState === 'done') ? 'pointer' : 'default',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '20px 0'
            }}
            onClick={voiceState === 'listening' || voiceState === 'done' ? toggleRecording : undefined}
          >
            <Orb 
              hoverIntensity={2} 
              rotateOnHover={true} 
              hue={0} 
              forceHoverState={voiceState === 'speaking' || voiceState === 'greeting' || voiceState === 'processing'} 
              backgroundColor="transparent"
            />
            {/* Overlay Logo and Text */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 10 }}>
               <div style={{ background: 'rgba(0, 0, 0, 0.4)', padding: '16px', borderRadius: '50%', marginBottom: 12, border: '2px solid rgba(0, 212, 170, 0.3)' }}>
                 <Stethoscope size={32} color="#00d4aa" />
               </div>
               <div style={{ color: '#fff', fontWeight: 600, fontSize: 18, textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}>
                  {voiceState === 'processing' 
                    ? (lang === 'hi-IN' ? 'Processing...' : 'Processing...')
                    : (voiceState === 'speaking' || voiceState === 'greeting')
                    ? (lang === 'hi-IN' ? 'Speaking...' : 'Speaking...')
                    : isRecording
                    ? (lang === 'hi-IN' ? 'Listening...' : 'Listening...')
                    : (lang === 'hi-IN' ? 'Tap to Speak' : 'Tap to Speak')}
               </div>
            </div>
          </div>
        )}
      </div>

      {/* Transcript */}
      {transcript.length > 0 && (
        <div className="va-transcript">
          <h3 className="va-transcript-title">
            Live Transcript
            <span className="va-transcript-lang">{selectedLang.flag} {selectedLang.label}</span>
          </h3>
          <div className="va-transcript-list">
            {transcript.map((entry) => (
              <div key={entry.id} className={`va-transcript-entry va-entry-${entry.type}`}>
                <span className="va-entry-avatar">
                  {entry.type === 'user' ? '🗣️' : entry.type === 'ai' ? '🤖' : '⚙️'}
                </span>
                <div className="va-entry-content">
                  <span className="va-entry-text">{entry.text}</span>
                  <span className="va-entry-time">{entry.timestamp}</span>
                </div>
              </div>
            ))}
            <div ref={transcriptEndRef} />
          </div>
        </div>
      )}

      {/* Triage Result Card */}
      {triageResult && !showEmergency && (
        <div className="va-result" style={{
          background: getTriageLevelStyle(triageResult.triageLevel).bg,
          borderColor: getTriageLevelStyle(triageResult.triageLevel).border,
        }}>
          <h3 className="va-result-title">🏥 Triage Result</h3>
          <div className="va-result-grid">
            <div className="va-result-item">
              <span className="va-result-label">Token</span>
              <span className="va-result-value" style={{ color: getTriageLevelStyle(triageResult.triageLevel).color }}>
                #{triageResult.token}
              </span>
            </div>
            <div className="va-result-item">
              <span className="va-result-label">Level</span>
              <span className="va-result-value" style={{ color: getTriageLevelStyle(triageResult.triageLevel).color }}>
                {triageResult.triageLevel.toUpperCase()}
              </span>
            </div>
            <div className="va-result-item">
              <span className="va-result-label">Department</span>
              <span className="va-result-value">{triageResult.department}</span>
            </div>
            <div className="va-result-item">
              <span className="va-result-label">Wait Time</span>
              <span className="va-result-value">~{triageResult.waitTimeMinutes} min</span>
            </div>
          </div>
          {triageResult.aiReasoning && (
            <div className="va-result-reasoning">
              <strong>🤖 AI Analysis:</strong> {triageResult.aiReasoning}
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="va-actions">
        {voiceState === 'idle' ? null : (
          <>
            <button className="va-end-btn" onClick={endSession}>
              <PhoneOff size={16} />
              {lang === 'hi-IN' ? 'Session Band Karein' : 'End Session'}
            </button>
            <button className="va-reset-btn" onClick={resetSession}>
              <RotateCcw size={16} />
              {lang === 'hi-IN' ? 'Naya Session' : 'New Session'}
            </button>
          </>
        )}
      </div>

      {/* Footer Info */}
      <div className="va-footer-info">
        <span>🎙️ Sarvam AI STT/TTS</span>
        <span>•</span>
        <span>🔗 LiveKit WebRTC</span>
        <span>•</span>
        <span>🧠 Gemini AI Triage</span>
        <span>•</span>
        <span>🏥 KGMU Lucknow</span>
      </div>
    </div>
  );
}
