import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Send, Printer, User, Building2, Mic, MicOff, Paperclip, X, Image as ImageIcon } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import type { ChatMessage, TriageResult } from '../types';
import { triagePatient } from '../api/client';
import EmergencyAlertPanel from '../components/EmergencyAlertPanel';

const API_BASE = 'http://localhost:8000';

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
  const location = useLocation();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const prefill = params.get('prefill');
    if (prefill) {
      setInput(prefill);
    }
  }, [location.search]);

  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [triageComplete, setTriageComplete] = useState(false);
  const [showEmergency, setShowEmergency] = useState(false);
  const [emergencyResult, setEmergencyResult] = useState<TriageResult | null>(null);
  const [lang, setLang] = useState<'hi-IN' | 'en-US'>('hi-IN');
  const [isListening, setIsListening] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>('');
  const [ocrProcessing, setOcrProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const enrichTriageResult = (res: any, demoAnswers?: string[]) => {
    const newRes = { ...res };
    if (!newRes.name && demoAnswers) newRes.name = demoAnswers[0];
    if (!newRes.age && demoAnswers) newRes.age = demoAnswers[1];
    
    if (newRes.triageLevel === 'critical') {
      newRes.waitTimeStr = "0–3 mins";
      newRes.queueStr = "PRIORITY OVERRIDE";
    } else if (newRes.triageLevel === 'moderate') {
      newRes.waitTimeStr = `~${newRes.waitTimeMinutes || Math.floor(Math.random() * 21) + 25} minutes`;
      newRes.queueStr = `#${newRes.queuePosition || Math.floor(Math.random() * 13) + 8}`;
    } else {
      newRes.waitTimeStr = `~${newRes.waitTimeMinutes || Math.floor(Math.random() * 21) + 40} minutes`;
      newRes.queueStr = `#${newRes.queuePosition || Math.floor(Math.random() * 16) + 15}`;
    }
    return newRes;
  };

  const handleDemoFill = async (caseType: 'critical' | 'moderate' | 'ortho') => {
    let symptomText = '';
    if (caseType === 'critical') symptomText = 'Mere seene mein tej dard hai aur saans lene mein dikkat ho rahi hai';
    else if (caseType === 'moderate') symptomText = 'Bukhar hai aur pet mein dard hai';
    else symptomText = 'Mera pair toot gaya hai, bahut dard hai';

    setInput(symptomText);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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

        let result: any = await triagePatient({
          name: newAnswers[0],
          age: parseInt(newAnswers[1]) || 30,
          gender: newAnswers[2],
          chiefComplaint: newAnswers[3],
          duration: newAnswers[4],
          hasCriticalSymptoms,
          onMedication,
          isPregnant,
        });

        result = enrichTriageResult(result, newAnswers);

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

  // =================== OCR / IMAGE UPLOAD ===================
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 5MB check
    if (file.size > 5 * 1024 * 1024) {
      addBotMessage('⚠️ Image 5MB se badi hai. Kripya chhoti image upload karein.');
      return;
    }

    setSelectedImage(file);
    setImagePreviewUrl(URL.createObjectURL(file));
  };

  const clearSelectedImage = () => {
    setSelectedImage(null);
    setImagePreviewUrl('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleOcrTriage = async () => {
    if (!selectedImage || ocrProcessing) return;

    setOcrProcessing(true);

    // Show image in chat as user message
    const imgMsg: ChatMessage = {
      id: crypto.randomUUID(),
      text: `📎 ${selectedImage.name}`,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
    };
    setMessages(prev => [...prev, imgMsg]);

    // Show loading
    addBotMessage('🔍 Saarthi AI prescription padh raha hai...');

    try {
      const formData = new FormData();
      formData.append('image', selectedImage);
      formData.append('language', lang === 'hi-IN' ? 'hi' : 'en');

      const res = await fetch(`${API_BASE}/api/ocr-triage`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();

      // Low confidence → show warning
      if (data.ocr_confidence === 'low') {
        addBotMessage(`⚠️ Image clearly nahi dikh rahi. ${data.extracted_text || 'Kripya dobara try karein ya apne symptoms type karein.'}`);
        clearSelectedImage();
        setOcrProcessing(false);
        return;
      }

      // Build analysis summary
      const symptoms = data.symptoms_found?.length > 0 ? data.symptoms_found.join(', ') : 'Not detected';
      const medicines = data.medicines_found?.length > 0 ? data.medicines_found.join(', ') : 'None found';
      const summaryText = `📋 Prescription Analysis Complete\n\nSymptoms: ${symptoms}\nMedicines: ${medicines}\n${data.urgency_reason ? `Reason: ${data.urgency_reason}` : ''}`;
      addBotMessage(summaryText);

      // Show triage result
      if (data.triage_result) {
        const tr: TriageResult = {
          token: data.triage_result.token || data.token || 'OPD-0000',
          triageLevel: data.triage_result.triageLevel || 'mild',
          department: data.triage_result.department || 'General OPD',
          waitTimeMinutes: data.triage_result.waitTimeMinutes || 30,
          queuePosition: data.triage_result.queuePosition || 1,
          message: data.triage_result.message || '',
          aiReasoning: data.triage_result.aiReasoning || data.urgency_reason || '',
          assignedDoctor: data.triage_result.assignedDoctor,
          roomNumber: data.triage_result.roomNumber,
          isEmergency: data.triage_result.isEmergency || false,
        };

        if (tr.isEmergency || tr.triageLevel === 'critical') {
          setEmergencyResult(tr);
          setShowEmergency(true);
          playEmergencyBeep();
        } else {
          addTriageResultMessage(tr);
        }
        setTriageComplete(true);
      }

    } catch (err) {
      console.error('OCR triage error:', err);
      addBotMessage('Sorry, image analysis mein issue ho gaya. Kripya dubara try karein ya symptoms type karein. 🙏');
    } finally {
      clearSelectedImage();
      setOcrProcessing(false);
    }
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
          <h3>Saarthi AI</h3>
          <p>KGMU OPD Triage Assistant • 🟢 Online</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            onClick={() => setLang(l => l === 'hi-IN' ? 'en-US' : 'hi-IN')}
            style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'white', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
          >
            {lang === 'hi-IN' ? 'हिंदी' : 'English'}
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="wa-messages">
        {messages.map(msg => (
          <div key={msg.id}>
            {msg.isTriageResult && msg.triageResult ? (
              <div className={`triage-card ${msg.triageResult.triageLevel}`}>
                <div className="no-print">
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
                    <span style={{ fontWeight: 600 }}>{msg.triageResult.waitTimeStr}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Queue Position</span>
                    <span style={{ fontWeight: 600 }}>{msg.triageResult.queueStr}</span>
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

                <div className="print-token-only" style={{ display: 'none' }}>
                  <div style={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap', lineHeight: 1.6, padding: '24px', border: '2px solid #000', margin: '20px auto', maxWidth: '400px' }}>
                    {`┌─────────────────────────────────┐
│  🏥 SAARTHI AI — KGMU LUCKNOW  │
│  Token: ${(msg.triageResult.token || '').padEnd(23)} │
├─────────────────────────────────┤
│  Name: ${(msg.triageResult.name || 'Patient').padEnd(24)} │
│  Age: ${String(msg.triageResult.age || '--').padEnd(25)} │
│  Department: ${(msg.triageResult.department || '').padEnd(18)} │
│  Doctor: ${(msg.triageResult.assignedDoctor || 'On-Duty Physician').padEnd(22)} │
│  Room: ${(msg.triageResult.roomNumber || 'General').padEnd(24)} │
│  Queue Position: ${(msg.triageResult.queueStr || '').padEnd(14)} │
│  Est. Wait: ${(msg.triageResult.waitTimeStr || '').padEnd(19)} │
│  Date: ${new Date().toLocaleDateString('en-IN').padEnd(24)} │
│  Time: ${new Date().toLocaleTimeString('en-IN', {hour: '2-digit', minute:'2-digit'}).padEnd(24)} │
├─────────────────────────────────┤
│  Please proceed to Room ${(msg.triageResult.roomNumber || 'General').padEnd(7)} │
│  KGMU OPD | Est. 1905           │
└─────────────────────────────────┘`}
                  </div>
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
              <div style={{ display: 'flex', gap: '8px', alignSelf: msg.sender === 'bot' ? 'flex-start' : 'flex-end', maxWidth: '85%' }}>
                {msg.sender === 'bot' && (
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(0, 212, 170, 0.2)', color: '#00d4aa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0, marginTop: 4 }}>S</div>
                )}
                <div className={`wa-bubble ${msg.sender}`}>
                  {msg.text}
                  <div className="time">{msg.timestamp}</div>
                </div>
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
      <div className="no-print" style={{ display: 'flex', gap: '12px', padding: '0 24px', marginBottom: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
        <button 
          onClick={() => handleDemoFill('critical')}
          disabled={isLoading || triageComplete}
          className="demo-btn-triage demo-triage-critical"
        >
          🚨 Try: Chest Pain
        </button>
        <button 
          onClick={() => handleDemoFill('moderate')}
          disabled={isLoading || triageComplete}
          className="demo-btn-triage demo-triage-moderate"
        >
          ⚠️ Try: Fever
        </button>
        <button 
          onClick={() => handleDemoFill('ortho')}
          disabled={isLoading || triageComplete}
          className="demo-btn-triage demo-triage-ortho"
        >
          ✅ Try: Fracture
        </button>
      </div>

      {/* Image Preview Bar */}
      {selectedImage && imagePreviewUrl && (
        <div className="ocr-preview-bar no-print">
          <div className="ocr-preview-thumb">
            <img src={imagePreviewUrl} alt="Selected" />
          </div>
          <div className="ocr-preview-info">
            <span className="ocr-preview-name">{selectedImage.name}</span>
            <span className="ocr-preview-size">{(selectedImage.size / 1024).toFixed(0)} KB</span>
          </div>
          <button className="ocr-preview-remove" onClick={clearSelectedImage} title="Remove">
            <X size={16} />
          </button>
          <button
            className="ocr-analyze-btn"
            onClick={handleOcrTriage}
            disabled={ocrProcessing}
          >
            {ocrProcessing ? (
              <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }}></div> Analyzing...</>
            ) : (
              <><ImageIcon size={14} /> Analyze Prescription</>
            )}
          </button>
        </div>
      )}

      {/* Input area */}
      <div className="wa-input-area no-print" style={{ position: 'relative' }}>
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf"
          onChange={handleImageSelect}
          style={{ display: 'none' }}
        />
        {/* Attachment button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading || triageComplete || ocrProcessing}
          className="ocr-attach-btn"
          title="Upload prescription or symptom photo"
        >
          <Paperclip size={20} />
        </button>
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
          placeholder={isListening ? 'Listening...' : (triageComplete ? 'Triage complete ✓' : 'Apne symptoms Hindi ya English mein likhein...')}
          disabled={isLoading || triageComplete || isListening}
          style={{ flex: 1 }}
        />
        <button className="send-btn-teal" onClick={() => handleSend()} disabled={!input.trim() || isLoading || triageComplete}>
          <Send size={18} />
        </button>
      </div>

      {/* QR Code section */}
      <div className="qr-section no-print">
        <h4>📱 Scan to access on mobile</h4>
        <QRCodeSVG
          value="http://localhost:5173/patient"
          size={90}
          bgColor="transparent"
          fgColor="#00d4aa"
          level="M"
        />
      </div>

      <div className="watermark">Team Syntrix | APL 2025</div>
    </div>
  );
}
