import { useState, useEffect, useRef } from 'react';
import { Minus, Plus } from 'lucide-react';

interface ServingsAdjusterProps {
  baseServings: number;
  currentServings: number;
  onChange: (servings: number) => void;
}

export function ServingsAdjuster({ baseServings, currentServings, onChange }: ServingsAdjusterProps) {
  const multiplier = currentServings / baseServings;
  const [inputValue, setInputValue] = useState(multiplier.toFixed(2));
  const [isAnimating, setIsAnimating] = useState(false);
  const prevValueRef = useRef(currentServings);

  useEffect(() => {
    if (prevValueRef.current !== currentServings) {
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 300);
    }
    prevValueRef.current = currentServings;
    setInputValue(multiplier.toFixed(2));
  }, [currentServings, multiplier]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value > 0) {
      setInputValue(e.target.value);
      onChange(value * baseServings);
    }
  };

  const handleBlur = () => {
    const value = parseFloat(inputValue);
    if (isNaN(value) || value <= 0) {
      setInputValue('1.00');
      onChange(baseServings);
    }
  };

  const handleDecrease = () => {
    const newMultiplier = Math.max(0.5, multiplier - 0.5);
    onChange(newMultiplier * baseServings);
  };

  const handleIncrease = () => {
    onChange((multiplier + 0.5) * baseServings);
  };

  return (
    <div className="flex items-center justify-center gap-4">
      <button
        onClick={handleDecrease}
        disabled={multiplier <= 0.5}
        className="w-10 h-10 flex items-center justify-center rounded-full bg-background text-primary hover:bg-divider/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <Minus className="w-5 h-5" />
      </button>
      <div className="text-center">
        <input
          type="number"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          min="0.5"
          step="0.5"
          className={`w-24 text-center text-3xl font-mono-digit font-medium text-accent bg-transparent border-none outline-none transition-transform ${
            isAnimating ? 'scale-110' : ''
          }`}
        />
        <div className="text-xs text-secondary mt-1">倍</div>
      </div>
      <button
        onClick={handleIncrease}
        className="w-10 h-10 flex items-center justify-center rounded-full bg-background text-primary hover:bg-divider/50 transition-colors"
      >
        <Plus className="w-5 h-5" />
      </button>
    </div>
  );
}
