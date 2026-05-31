import { useEffect, useRef } from 'react';

interface VoiceWaveformProps {
  isActive: boolean;
  isSpeaking?: boolean;
  barCount?: number;
}

export default function VoiceWaveform({ isActive, isSpeaking = false, barCount = 5 }: VoiceWaveformProps) {
  const bars = Array.from({ length: barCount }, (_, i) => i);

  return (
    <div className={`voice-waveform ${isActive ? 'active' : ''} ${isSpeaking ? 'speaking' : ''}`}>
      {bars.map((i) => (
        <div
          key={i}
          className="waveform-bar"
          style={{
            animationDelay: `${i * 0.15}s`,
            animationDuration: isSpeaking ? '0.6s' : '0.8s',
          }}
        />
      ))}
    </div>
  );
}
