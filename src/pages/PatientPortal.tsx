import { useState, useRef, useEffect } from 'react';
import { Send, Printer } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { ChatMessage, TriageResult } from '../types';
import { triagePatient } from '../api/client';

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
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  const handleSend = async () => {
    if (!input.trim() || isLoading || triageComplete) return;

    const userText = input.trim();
    setInput('');
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

        addTriageResultMessage(result);
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
      {/* WhatsApp-style header */}
      <div className="wa-header">
        <div className="avatar">S</div>
        <div className="info">
          <h3>Saarthi AI 🏥</h3>
          <p>KGMU OPD Triage Bot • Online</p>
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
                  <span className="label">Wait Time</span>
                  <span style={{ fontWeight: 600 }}>{msg.triageResult.waitTimeMinutes} min</span>
                </div>
                <div className="detail-row">
                  <span className="label">Queue Position</span>
                  <span style={{ fontWeight: 600 }}>#{msg.triageResult.queuePosition}</span>
                </div>
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

      {/* Input area */}
      <div className="wa-input-area no-print">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={triageComplete ? 'Triage complete ✓' : 'Type your answer...'}
          disabled={isLoading || triageComplete}
        />
        <button onClick={handleSend} disabled={!input.trim() || isLoading || triageComplete}>
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
