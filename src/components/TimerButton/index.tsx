import { useState, useEffect, useCallback } from 'react';
import { Play, Pause, RotateCcw, Edit2, Check, X } from 'lucide-react';
import { formatDuration } from '../../utils/parser';

interface TimerButtonProps {
  duration: number;
  stepId: string;
  onDurationChange?: (newSeconds: number) => void;
}

export function TimerButton({ duration, stepId, onDurationChange }: TimerButtonProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [remaining, setRemaining] = useState(duration);
  const [initialDuration, setInitialDuration] = useState(duration);
  const [isEditing, setIsEditing] = useState(false);
  const [editMinutes, setEditMinutes] = useState(0);
  const [editSeconds, setEditSeconds] = useState(0);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isRunning && remaining > 0) {
      interval = setInterval(() => {
        setRemaining((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, remaining]);

  useEffect(() => {
    if (remaining === 0 && !isRunning && initialDuration > 0) {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('计时器完成', { body: '步骤已完成，请查看下一步' });
      }
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.frequency.value = 800;
        gainNode.gain.value = 0.3;
        oscillator.start();
        setTimeout(() => {
          oscillator.stop();
          audioContext.close();
        }, 500);
      } catch (e) {
        // Audio not supported
      }
    }
  }, [remaining, isRunning, initialDuration]);

  const handleToggle = useCallback(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    setIsRunning((prev) => !prev);
  }, []);

  const handleReset = () => {
    setIsRunning(false);
    setRemaining(initialDuration);
  };

  const handleStartEdit = () => {
    setIsRunning(false);
    const mins = Math.floor(remaining / 60);
    const secs = remaining % 60;
    setEditMinutes(mins);
    setEditSeconds(secs);
    setIsEditing(true);
  };

  const handleConfirmEdit = () => {
    const totalSeconds = editMinutes * 60 + editSeconds;
    if (totalSeconds > 0) {
      setRemaining(totalSeconds);
      setInitialDuration(totalSeconds);
      onDurationChange?.(totalSeconds);
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="mt-2 flex items-center gap-2">
        <div className="flex items-center gap-1 px-3 py-1.5 bg-background rounded-full border border-divider">
          <input
            type="number"
            min="0"
            max="999"
            value={editMinutes}
            onChange={(e) => setEditMinutes(Math.max(0, parseInt(e.target.value) || 0))}
            className="w-10 text-center bg-transparent text-primary font-mono-digit text-sm focus:outline-none"
          />
          <span className="text-secondary text-xs">分</span>
          <input
            type="number"
            min="0"
            max="59"
            value={editSeconds}
            onChange={(e) => setEditSeconds(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
            className="w-10 text-center bg-transparent text-primary font-mono-digit text-sm focus:outline-none"
          />
          <span className="text-secondary text-xs">秒</span>
        </div>
        <button onClick={handleConfirmEdit} className="p-1.5 text-accent hover:bg-accent/10 rounded-full transition-colors">
          <Check className="w-4 h-4" />
        </button>
        <button onClick={handleCancelEdit} className="p-1.5 text-secondary hover:bg-divider/50 rounded-full transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="mt-2 flex items-center gap-2">
      <button
        onClick={handleToggle}
        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
          isRunning
            ? 'bg-secondary text-white'
            : 'bg-accent/10 text-accent hover:bg-accent/20'
        }`}
      >
        {isRunning ? (
          <><Pause className="w-4 h-4" />{formatDuration(remaining)}</>
        ) : (
          <><Play className="w-4 h-4" />{formatDuration(remaining)} 开启计时</>
        )}
      </button>
      <button
        onClick={handleStartEdit}
        className="p-1.5 text-secondary hover:text-primary hover:bg-divider/50 rounded-full transition-colors"
        title="修改计时"
      >
        <Edit2 className="w-3.5 h-3.5" />
      </button>
      {(isRunning || remaining !== initialDuration) && (
        <button
          onClick={handleReset}
          className="p-2 text-secondary hover:text-primary transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
