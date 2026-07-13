import { useState, useEffect, useCallback } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { formatDuration } from '../../utils/parser';

interface TimerButtonProps {
  duration: number;
  stepId: string;
}

export function TimerButton({ duration, stepId }: TimerButtonProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [remaining, setRemaining] = useState(duration);
  const [initialDuration] = useState(duration);

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
      // Try to show notification if permission is granted
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('计时器完成', { body: '步骤已完成，请查看下一步' });
      }
      // Also try to play a sound
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
        // Audio not supported, ignore
      }
    }
  }, [remaining, isRunning, initialDuration]);

  const handleToggle = useCallback(() => {
    // Request notification permission if needed (but don't block timer)
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    setIsRunning((prev) => !prev);
  }, []);

  const handleReset = () => {
    setIsRunning(false);
    setRemaining(initialDuration);
  };

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
