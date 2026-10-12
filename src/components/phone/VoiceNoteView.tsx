import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, Play, Pause, RotateCcw, Send } from 'lucide-react';
import { TactileButton } from '../common/TactileButton';
import { useApp } from '../../context/AppContext';

interface VoiceNoteViewProps {
  contactName: string;
  onBack: () => void;
}

export const VoiceNoteView: React.FC<VoiceNoteViewProps> = ({ contactName, onBack }) => {
  const { sendVoiceMessage } = useApp();
  const [stage, setStage] = useState<'idle' | 'recording' | 'review' | 'sent'>('idle');
  const [seconds, setSeconds] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioUrlRef = useRef<string | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Recording timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (stage === 'recording') {
      interval = setInterval(() => {
        setSeconds(s => {
          if (s >= 59) {
            handleStopRecording();
            return 60;
          }
          return s + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [stage]);

  // Auto-return on sent state
  useEffect(() => {
    if (stage === 'sent') {
      const timer = setTimeout(() => {
        onBack();
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [stage, onBack]);

  const handleStartRecording = async () => {
    setSeconds(0);
    audioChunksRef.current = [];

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = e => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };

        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          audioUrlRef.current = URL.createObjectURL(audioBlob);
          stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.start();
      }
    } catch {
      // If mic permission blocked, continue with simulated timer
    }

    setStage('recording');
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // Ignore
      }
    }
    setStage('review');
  };

  const handlePlayToggle = () => {
    if (isPlaying) {
      if (audioPlayerRef.current) audioPlayerRef.current.pause();
      setIsPlaying(false);
    } else {
      if (audioUrlRef.current) {
        if (!audioPlayerRef.current) {
          audioPlayerRef.current = new Audio(audioUrlRef.current);
          audioPlayerRef.current.onended = () => setIsPlaying(false);
        }
        audioPlayerRef.current.play().catch(() => {});
      } else {
        // Fallback: beep sound effect
        try {
          const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(440, ctx.currentTime);
          osc.connect(ctx.destination);
          osc.start();
          setTimeout(() => {
            osc.stop();
            setIsPlaying(false);
          }, Math.min(seconds, 3) * 1000);
        } catch {
          setTimeout(() => setIsPlaying(false), 2000);
        }
      }
      setIsPlaying(true);
    }
  };

  const handleSend = () => {
    sendVoiceMessage(contactName, Math.max(seconds, 1));
    setStage('sent');
  };

  const handleReset = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }
    setIsPlaying(false);
    setSeconds(0);
    setStage('idle');
  };

  // Screen [8]: Sent
  if (stage === 'sent') {
    return (
      <div className="min-h-full bg-[#f6f3ec] text-[#14213d] flex flex-col justify-between p-6 select-none animate-in fade-in duration-200">
        <div className="pt-8 space-y-4">
          <h1 className="text-4xl font-extrabold tracking-tight">
            Mensaje enviado a {contactName}
          </h1>
          <p className="text-2xl font-bold text-[#14213d] leading-relaxed">
            Volvemos al inicio en un momento.
          </p>
        </div>

        <div className="pb-8">
          <TactileButton variant="card" fontSize="grande" onClick={onBack}>
            Volver
          </TactileButton>
        </div>
      </div>
    );
  }

  // Screen [6]: Recording
  if (stage === 'recording') {
    return (
      <div className="min-h-full bg-[#f6f3ec] text-[#14213d] flex flex-col justify-between p-6 select-none animate-in fade-in duration-150">
        <div className="pt-4">
          <h1 className="text-4xl font-extrabold tracking-tight">
            Mensaje de voz para {contactName}
          </h1>
        </div>

        {/* Big red counter */}
        <div className="flex flex-col items-center justify-center my-auto space-y-3">
          <span className="text-[130px] font-extrabold text-[#a61b1b] leading-none tracking-tight">
            {seconds}
          </span>
          <p className="text-3xl font-extrabold text-[#14213d]">
            segundos (máximo 60)
          </p>

          {/* Big red stop button */}
          <button
            onClick={handleStopRecording}
            className="w-full max-w-sm mt-8 bg-[#a61b1b] border-2 border-[#8a1616] text-white py-6 rounded-3xl shadow-[0_4px_0_#681010] active:translate-y-1 active:shadow-none flex items-center justify-center gap-4 text-3xl font-extrabold transition cursor-pointer"
          >
            <Square className="w-10 h-10 fill-white" />
            <span>Parar</span>
          </button>
        </div>

        <div className="pb-6">
          <TactileButton variant="card" fontSize="grande" onClick={handleReset}>
            Cancelar
          </TactileButton>
        </div>
      </div>
    );
  }

  // Screen [7]: Review
  if (stage === 'review') {
    return (
      <div className="min-h-full bg-[#f6f3ec] text-[#14213d] flex flex-col justify-between p-6 select-none animate-in fade-in duration-150">
        <div className="space-y-4 pt-4">
          <h1 className="text-4xl font-extrabold tracking-tight">
            Mensaje de voz para {contactName}
          </h1>

          <div className="space-y-4 pt-4">
            <TactileButton
              variant="primary"
              fontSize="grande"
              icon={isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 fill-white" />}
              onClick={handlePlayToggle}
            >
              {isPlaying ? 'Pausar' : 'Escuchar'}
            </TactileButton>

            <TactileButton
              variant="green"
              fontSize="grande"
              icon={<Send className="w-8 h-8" />}
              onClick={handleSend}
            >
              Enviar
            </TactileButton>

            <TactileButton
              variant="card"
              fontSize="grande"
              icon={<RotateCcw className="w-7 h-7" />}
              onClick={handleReset}
            >
              Grabar de nuevo
            </TactileButton>

            <TactileButton
              variant="card"
              fontSize="grande"
              onClick={handleSend}
            >
              Enviar por WhatsApp
            </TactileButton>
          </div>
        </div>

        <div className="pb-6 pt-4">
          <TactileButton variant="card" fontSize="grande" onClick={onBack}>
            Cancelar
          </TactileButton>
        </div>
      </div>
    );
  }

  // Screen [5]: Idle recording initial screen
  return (
    <div className="min-h-full bg-[#f6f3ec] text-[#14213d] flex flex-col justify-between p-6 select-none animate-in fade-in duration-150">
      <div className="pt-4">
        <h1 className="text-4xl font-extrabold tracking-tight">
          Mensaje de voz para {contactName}
        </h1>
      </div>

      {/* Huge round Grabar button */}
      <div className="flex flex-col items-center justify-center my-auto">
        <button
          onClick={handleStartRecording}
          className="w-56 h-56 rounded-full bg-[#0b4f9e] border-4 border-[#083a75] shadow-[0_8px_0_#062a54] active:translate-y-2 active:shadow-[0_2px_0_#062a54] flex flex-col items-center justify-center text-white transition cursor-pointer"
        >
          <Mic className="w-20 h-20 text-white stroke-[2.5]" />
          <span className="text-3xl font-extrabold mt-2">Grabar</span>
        </button>
      </div>

      <div className="pb-6">
        <TactileButton variant="card" fontSize="grande" onClick={onBack}>
          Cancelar
        </TactileButton>
      </div>
    </div>
  );
};
