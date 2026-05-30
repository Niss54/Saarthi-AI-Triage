import { useState, useRef, useEffect } from 'react';
import { Send, Printer, User, Building2, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import type { ChatMessage, TriageResult } from '../types';
import { triagePatient } from '../api/client';
import EmergencyAlertPanel from '../components/EmergencyAlertPanel';

const BOT_QUESTIONS = [
  'Namaste! Main Saarthi hoon. Aapka KGMU OPD mein swagat hai. 🙏 Kripya apna naam batayein.',
  'Aapki umar kitni hai? (Age in years)',
  'Aap kiska gender hai? (Male / Female / Other)',
  'Aap kis taklif ke liye aaye hain? (Chief complaint — briefly describe)',
  'Yeh taklif kitne dino se hai? (1–3 din / 1 hafta / 1 mahine se zyada)',
  'Kya aapko bukhar, saans lene mein takleef, ya seene mein dard hai? (Haan / Nahi)',
  'Kya aap kisi bimari ki dawai le rahe hain? (Haan / Nahi)',
];

const PREGNANCY_QUESTION = 'Kya aap pregnant hain? (Haan / Nahi)';

export default function PatientPortal() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [triageComplete, setTriageComplete] = useState(false);
  const [showEmergency, setShowEmergency] = useState(false);
  const [emergencyResult, setEmergencyResult] = useState<TriageResult | null>(null);
  const [lang, setLang] = useState<'hi-IN' | 'en-US'>('hi-IN');
  const [isListening, setIsListening] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const speakText = (text: string) => {
    if (!ttsEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    window.speechSynthesis.speak(utterance);
  };

  const toggleListening = () => {
    if (isListening) {
      setIsListening(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Browser does not support Speech Recognition. Please try Chrome.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = lang;
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      // Optional: auto-send after a tiny delay to ensure input is updated, but user asked to auto-send
      setTimeout(() => handleSend(transcript), 300);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognition.start();
  };

  const playEmergencyBeep = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const playBeep = () => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.setValueAtTime(1200, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.1);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
      };
      playBeep();
      let count = 1;
      const interval = setInterval(() => {
        if (count >= 3) {
          clearInterval(interval);
          return;
        }
        playBeep();
        count++;
      }, 600);
    } catch(e) {
      console.log('Audio error:', e);
    }
  };

  const handleDemoFill = async (caseType: 'critical' | 'moderate' | 'ortho') => {
    let demoAnswers: string[] = [];
    if (caseType === 'critical') {
      demoAnswers = ['Ramesh', '55', 'Male', 'Seene mein bahut dard hai aur saans lene mein takleef ho rahi hai', '2 hours', 'Haan', 'Nahi'];
      // set messages to show the conversation
      setMessages([
        { id: '1', text: BOT_QUESTIONS[0], sender: 'bot', timestamp: '' },
        { id: '2', text: demoAnswers[0], sender: 'user', timestamp: '' },
        { id: '3', text: BOT_QUESTIONS[1], sender: 'bot', timestamp: '' },
        { id: '4', text: demoAnswers[1], sender: 'user', timestamp: '' },
        { id: '5', text: BOT_QUESTIONS[2], sender: 'bot', timestamp: '' },
        { id: '6', text: demoAnswers[2], sender: 'user', timestamp: '' },
        { id: '7', text: BOT_QUESTIONS[3], sender: 'bot', timestamp: '' },
        { id: '8', text: demoAnswers[3], sender: 'user', timestamp: '' },
        { id: '9', text: BOT_QUESTIONS[4], sender: 'bot', timestamp: '' },
        { id: '10', text: demoAnswers[4], sender: 'user', timestamp: '' },
        { id: '11', text: BOT_QUESTIONS[5], sender: 'bot', timestamp: '' },
        { id: '12', text: demoAnswers[5], sender: 'user', timestamp: '' },
        { id: '13', text: BOT_QUESTIONS[6], sender: 'bot', timestamp: '' },
        { id: '14', text: demoAnswers[6], sender: 'user', timestamp: '' }
      ]);
    } else if (caseType === 'moderate') {
      demoAnswers = ['Sunita', '32', 'Female', 'Bukhar hai aur pet mein dard hai', '3 din', 'Haan', 'Nahi', 'Nahi'];
      setMessages([
        { id: '1', text: BOT_QUESTIONS[0], sender: 'bot', timestamp: '' },
        { id: '2', text: demoAnswers[0], sender: 'user', timestamp: '' },
        { id: '3', text: BOT_QUESTIONS[1], sender: 'bot', timestamp: '' },
        { id: '4', text: demoAnswers[1], sender: 'user', timestamp: '' },
        { id: '5', text: BOT_QUESTIONS[2], sender: 'bot', timestamp: '' },
        { id: '6', text: demoAnswers[2], sender: 'user', timestamp: '' },
        { id: '7', text: BOT_QUESTIONS[3], sender: 'bot', timestamp: '' },
        { id: '8', text: demoAnswers[3], sender: 'user', timestamp: '' },
        { id: '9', text: BOT_QUESTIONS[4], sender: 'bot', timestamp: '' },
        { id: '10', text: demoAnswers[4], sender: 'user', timestamp: '' },
        { id: '11', text: BOT_QUESTIONS[5], sender: 'bot', timestamp: '' },
        { id: '12', text: demoAnswers[5], sender: 'user', timestamp: '' },
        { id: '13', text: BOT_QUESTIONS[6], sender: 'bot', timestamp: '' },
        { id: '14', text: demoAnswers[6], sender: 'user', timestamp: '' },
        { id: '15', text: PREGNANCY_QUESTION, sender: 'bot', timestamp: '' },
        { id: '16', text: demoAnswers[7], sender: 'user', timestamp: '' }
      ]);
    } else {
      demoAnswers = ['Rahul', '28', 'Male', 'Mera pair tod gaya hai, bahut dard hai', '1 din', 'Nahi', 'Nahi'];
      setMessages([
        { id: '1', text: BOT_QUESTIONS[0], sender: 'bot', timestamp: '' },
        { id: '2', text: demoAnswers[0], sender: 'user', timestamp: '' },
        { id: '3', text: BOT_QUESTIONS[1], sender: 'bot', timestamp: '' },
        { id: '4', text: demoAnswers[1], sender: 'user', timestamp: '' },
        { id: '5', text: BOT_QUESTIONS[2], sender: 'bot', timestamp: '' },
        { id: '6', text: demoAnswers[2], sender: 'user', timestamp: '' },
        { id: '7', text: BOT_QUESTIONS[3], sender: 'bot', timestamp: '' },
        { id: '8', text: demoAnswers[3], sender: 'user', timestamp: '' },
        { id: '9', text: BOT_QUESTIONS[4], sender: 'bot', timestamp: '' },
        { id: '10', text: demoAnswers[4], sender: 'user', timestamp: '' },
        { id: '11', text: BOT_QUESTIONS[5], sender: 'bot', timestamp: '' },
        { id: '12', text: demoAnswers[5], sender: 'user', timestamp: '' },
        { id: '13', text: BOT_QUESTIONS[6], sender: 'bot', timestamp: '' },
        { id: '14', text: demoAnswers[6], sender: 'user', timestamp: '' }
      ]);
    }
    
    setAnswers(demoAnswers);
    setInput('');
    setCurrentStep(demoAnswers.length);
    setIsLoading(true);
    addBotMessage('Generating your triage report... 🏥');
    
    try {
      const isFemale = demoAnswers[2]?.toLowerCase() === 'female';
      const hasCriticalSymptoms = demoAnswers[5]?.toLowerCase().includes('haan') || demoAnswers[5]?.toLowerCase() === 'yes';
      const onMedication = demoAnswers[6]?.toLowerCase().includes('haan') || demoAnswers[6]?.toLowerCase() === 'yes';
      const isPregnant = isFemale && demoAnswers[7] ? (demoAnswers[7].toLowerCase().includes('haan') || demoAnswers[7].toLowerCase() === 'yes') : undefined;

      const result = await triagePatient({
        name: demoAnswers[0],
        age: parseInt(demoAnswers[1]) || 30,
        gender: demoAnswers[2],
        chiefComplaint: demoAnswers[3],
        duration: demoAnswers[4],
        hasCriticalSymptoms,
        onMedication,
        isPregnant,
      });

      if (result.isEmergency || result.triageLevel === 'critical') {
        setEmergencyResult(result);
        setShowEmergency(true);
        playEmergencyBeep();
      } else {
        addTriageResultMessage(result);
      }
      setTriageComplete(true);
    } catch (err) {
      addBotMessage('Sorry, kuch technical issue ho gaya. Kripya dubara try karein. 🙏');
    } finally {
      setIsLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Send initial bot message
  useEffect(() => {
    const timer = setTimeout(() => {
      addBotMessage(BOT_QUESTIONS[0]);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const addBotMessage = (text: string) => {
    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      text,
      sender: 'bot',
      timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
    };
    setMessages(prev => [...prev, msg]);
    speakText(text);
  };

  const addUserMessage = (text: string) => {
    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      text,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
    };
    setMessages(prev => [...prev, msg]);
  };

  const addTriageResultMessage = (result: TriageResult) => {
    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      text: '',
      sender: 'bot',
      timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
      isTriageResult: true,
      triageResult: result,
    };
    setMessages(prev => [...prev, msg]);
  };

  const getTotalQuestions = () => {
    // If gender is female (answer at index 2), add pregnancy question
    if (answers.length > 2 && answers[2]?.toLowerCase() === 'female') {
      return BOT_QUESTIONS.length + 1;
    }
    return BOT_QUESTIONS.length;
  };

  const getNextQuestion = (step: number, currentAnswers: string[]): string | null => {
    if (step < BOT_QUESTIONS.length) {
      return BOT_QUESTIONS[step];
    }
    // After all standard questions, check if we need pregnancy question
    if (step === BOT_QUESTIONS.length && currentAnswers[2]?.toLowerCase() === 'female') {
      return PREGNANCY_QUESTION;
    }
    return null;
  };

  const handleSend = async (overrideInput?: string) => {
    const textToSend = typeof overrideInput === 'string' ? overrideInput : input;
    if (!textToSend.trim() || isLoading || triageComplete) return;

    const userText = textToSend.trim();
    if (!overrideInput) setInput('');
    addUserMessage(userText);

    const newAnswers = [...answers, userText];
    setAnswers(newAnswers);

    const nextStep = currentStep + 1;
    setCurrentStep(nextStep);

    const nextQ = getNextQuestion(nextStep, newAnswers);

    if (nextQ) {
      setTimeout(() => addBotMessage(nextQ), 600);
    } else {
      // All questions answered — perform triage
      setIsLoading(true);
      addBotMessage('Generating your triage report... 🏥');

      try {
        const isFemale = newAnswers[2]?.toLowerCase() === 'female';
        const hasCriticalSymptoms = newAnswers[5]?.toLowerCase().includes('haan') || newAnswers[5]?.toLowerCase() === 'yes';
        const onMedication = newAnswers[6]?.toLowerCase().includes('haan') || newAnswers[6]?.toLowerCase() === 'yes';
        const isPregnant = isFemale && newAnswers[7] ? (newAnswers[7].toLowerCase().includes('haan') || newAnswers[7].toLowerCase() === 'yes') : undefined;

        const result = await triagePatient({
          name: newAnswers[0],
          age: parseInt(newAnswers[1]) || 30,
          gender: newAnswers[2],
          chiefComplaint: newAnswers[3],
          duration: newAnswers[4],
          hasCriticalSymptoms,
          onMedication,
          isPregnant,
        });

        if (result.isEmergency || result.triageLevel === 'critical') {
          setEmergencyResult(result);
          setShowEmergency(true);
          playEmergencyBeep();
        } else {
          addTriageResultMessage(result);
        }
        setTriageComplete(true);
      } catch (err) {
        addBotMessage('Sorry, kuch technical issue ho gaya. Kripya dubara try karein. 🙏');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSend();
  };

  const handlePrint = () => {
    window.print();
  };

  const getTriageLevelDisplay = (level: string) => {
    switch (level) {
      case 'critical': return { emoji: '🔴', text: 'Critical', color: '#ef4444' };
      case 'moderate': return { emoji: '🟡', text: 'Moderate', color: '#f59e0b' };
      case 'mild': return { emoji: '🟢', text: 'Mild', color: '#22c55e' };
      default: return { emoji: '⚪', text: level, color: '#94a3b8' };
    }
  };

  return (
    <div className="wa-container">
      {showEmergency && emergencyResult && (
        <EmergencyAlertPanel result={emergencyResult} />
      )}
      {/* WhatsApp-style header */}
      <div className="wa-header">
        <div className="avatar">S</div>
        <div className="info" style={{ flex: 1 }}>
          <h3>Saarthi AI 🏥</h3>
          <p>KGMU OPD Triage Bot • Online</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            onClick={() => setLang(l => l === 'hi-IN' ? 'en-US' : 'hi-IN')}
            style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'white', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
          >
            {lang === 'hi-IN' ? 'हिंदी' : 'English'}
          </button>
          <button 
            onClick={() => setTtsEnabled(!ttsEnabled)}
            style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}
            title={ttsEnabled ? "Mute Voice" : "Enable Voice"}
          >
            {ttsEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="wa-messages">
        {messages.map(msg => (
          <div key={msg.id}>
            {msg.isTriageResult && msg.triageResult ? (
              <div className={`triage-card ${msg.triageResult.triageLevel}`}>
                <div className="token-number">#{msg.triageResult.token}</div>
                <div className="detail-row">
                  <span className="label">Triage Level</span>
                  <span style={{ color: getTriageLevelDisplay(msg.triageResult.triageLevel).color, fontWeight: 700 }}>
                    {getTriageLevelDisplay(msg.triageResult.triageLevel).emoji} {getTriageLevelDisplay(msg.triageResult.triageLevel).text}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="label">Department</span>
                  <span style={{ fontWeight: 600 }}>{msg.triageResult.department}</span>
                </div>
                <div className="detail-row">
                  <span className="label"><User size={14} style={{display:'inline'}}/> Assigned Doctor</span>
                  <span style={{ fontWeight: 600 }}>{msg.triageResult.assignedDoctor || 'On-Duty Physician'}</span>
                </div>
                <div className="detail-row">
                  <span className="label"><Building2 size={14} style={{display:'inline'}}/> Room</span>
                  <span style={{ fontWeight: 600 }}>{msg.triageResult.roomNumber || 'General'}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Wait Time</span>
                  <span style={{ fontWeight: 600 }}>~{msg.triageResult.waitTimeMinutes} min</span>
                </div>
                <div className="detail-row">
                  <span className="label">Queue Position</span>
                  <span style={{ fontWeight: 600 }}>#{msg.triageResult.queuePosition}</span>
                </div>

                {msg.triageResult.aiReasoning && (
                  <details className="ai-reasoning" style={{ margin: '12px 0', padding: '8px', background: 'rgba(0, 212, 170, 0.1)', borderRadius: '6px', fontSize: '12px', border: '1px solid rgba(0, 212, 170, 0.2)' }}>
                    <summary style={{ cursor: 'pointer', color: '#00d4aa', fontWeight: 600 }}>🤖 How was this decided?</summary>
                    <p style={{ marginTop: 8, color: '#e2e8f0', lineHeight: 1.4 }}>{msg.triageResult.aiReasoning}</p>
                  </details>
                )}

                <div className="message">
                  {msg.triageResult.message}
                </div>
                <button className="print-btn no-print" onClick={handlePrint}>
                  <Printer size={16} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
                  Print Token
                </button>
              </div>
            ) : (
              <div className={`wa-bubble ${msg.sender}`}>
                {msg.text}
                <div className="time">{msg.timestamp}</div>
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="wa-bubble bot" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }}></div>
            <span>Analyzing<span className="loading-dots"></span></span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Demo Buttons */}
      <div className="no-print" style={{ display: 'flex', gap: '8px', padding: '0 16px', marginBottom: '8px', justifyContent: 'center' }}>
        <button 
          onClick={() => handleDemoFill('critical')}
          disabled={isLoading || triageComplete}
          style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', color: '#fca5a5', padding: '4px 12px', borderRadius: '16px', fontSize: '12px', cursor: 'pointer' }}
        >
          Try: Chest Pain
        </button>
        <button 
          onClick={() => handleDemoFill('moderate')}
          disabled={isLoading || triageComplete}
          style={{ background: 'rgba(245, 158, 11, 0.2)', border: '1px solid #f59e0b', color: '#fde68a', padding: '4px 12px', borderRadius: '16px', fontSize: '12px', cursor: 'pointer' }}
        >
          Try: Fever
        </button>
        <button 
          onClick={() => handleDemoFill('ortho')}
          disabled={isLoading || triageComplete}
          style={{ background: 'rgba(59, 130, 246, 0.2)', border: '1px solid #3b82f6', color: '#bfdbfe', padding: '4px 12px', borderRadius: '16px', fontSize: '12px', cursor: 'pointer' }}
        >
          Try: Fracture
        </button>
      </div>

      {/* Input area */}
      <div className="wa-input-area no-print" style={{ position: 'relative' }}>
        <button 
          onClick={toggleListening} 
          disabled={isLoading || triageComplete}
          style={{ 
            background: 'transparent', 
            border: 'none', 
            color: isListening ? '#ef4444' : '#94a3b8',
            cursor: 'pointer',
            padding: '8px',
            animation: isListening ? 'pulse-dot 1.5s infinite' : 'none'
          }}
          title="Click mic and speak your symptoms"
        >
          {isListening ? <Mic size={22} /> : <MicOff size={22} />}
        </button>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isListening ? 'Listening...' : (triageComplete ? 'Triage complete ✓' : 'Type your answer...')}
          disabled={isLoading || triageComplete || isListening}
          style={{ flex: 1 }}
        />
        <button onClick={() => handleSend()} disabled={!input.trim() || isLoading || triageComplete}>
          <Send size={18} />
        </button>
      </div>

      {/* QR Code section */}
      <div className="qr-section no-print">
        <h4>📱 Scan to Register via OPD Portal</h4>
        <QRCodeSVG
          value="http://localhost:5173/patient"
          size={120}
          bgColor="transparent"
          fgColor="#25D366"
          level="M"
        />
      </div>

      <div className="watermark">Team Syntrix | APL 2025</div>
    </div>
  );
}
