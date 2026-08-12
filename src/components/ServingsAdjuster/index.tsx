import { useEffect, useRef, useState } from 'react';
import { Minus, Plus } from 'lucide-react';

interface ServingsAdjusterProps {
  currentServings: number;
  onChange: (servings: number) => void;
}

const STEP = 0.1;
const QUICK_MULTIPLIERS = [0.5, 1, 2];

function formatMultiplier(value: number) {
  return Number(value.toFixed(2)).toString();
}

export function ServingsAdjuster({ currentServings, onChange }: ServingsAdjusterProps) {
  const [inputValue, setInputValue] = useState(() => formatMultiplier(currentServings));
  const [isAnimating, setIsAnimating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const previousServings = useRef(currentServings);

  useEffect(() => {
    if (previousServings.current !== currentServings) {
      setIsAnimating(true);
      const timer = window.setTimeout(() => setIsAnimating(false), 220);
      previousServings.current = currentServings;
      if (!isEditing) setInputValue(formatMultiplier(currentServings));
      return () => window.clearTimeout(timer);
    }
  }, [currentServings, isEditing]);

  const applyServings = (value: number) => {
    if (Number.isFinite(value) && value > 0) onChange(value);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value;
    // Keep temporary text such as "0" or "0." while the user is typing.
    if (!/^\d*(?:\.\d*)?$/.test(nextValue)) return;
    setInputValue(nextValue);

    const parsed = Number(nextValue);
    if (nextValue !== '' && Number.isFinite(parsed) && parsed > 0) {
      onChange(parsed);
    }
  };

  const commitInput = () => {
    const parsed = Number(inputValue);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setInputValue(formatMultiplier(currentServings));
      return;
    }
    onChange(parsed);
  };

  const nudgeServings = (direction: -1 | 1) => {
    const next = direction === -1 && currentServings <= STEP
      ? currentServings / 2
      : currentServings + direction * STEP;
    applyServings(Number(next.toFixed(6)));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center gap-5">
        <button
          type="button"
          onClick={() => nudgeServings(-1)}
          aria-label="倍率减 0.1"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-background text-primary transition-colors hover:bg-divider/50 disabled:cursor-not-allowed disabled:opacity-35"
        >
          <Minus className="h-5 w-5" />
        </button>
        <div className="min-w-[118px] text-center">
          <label htmlFor="recipe-serving-amount" className="sr-only">配方量</label>
          <div className="flex items-baseline justify-center border-b border-divider pb-1 focus-within:border-accent">
            <input
              id="recipe-serving-amount"
              type="text"
              inputMode="decimal"
              value={inputValue}
              onFocus={(event) => {
                setIsEditing(true);
                event.currentTarget.select();
              }}
              onChange={handleInputChange}
              onBlur={() => {
                setIsEditing(false);
                commitInput();
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') event.currentTarget.blur();
              }}
              className={`w-[78px] bg-transparent text-center font-mono-digit text-3xl font-medium text-accent outline-none transition-transform ${isAnimating ? 'scale-105' : ''}`}
            />
          </div>
        </div>
        <button
          type="button"
          onClick={() => nudgeServings(1)}
          aria-label="倍率加 0.1"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-background text-primary transition-colors hover:bg-divider/50 disabled:cursor-not-allowed disabled:opacity-35"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>
      <div className="flex justify-center gap-2" aria-label="常用倍率">
        {QUICK_MULTIPLIERS.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => applyServings(value)}
            className={`min-w-12 border px-3 py-1.5 text-[12px] transition-colors ${Math.abs(currentServings - value) < 0.001 ? 'border-accent bg-accent text-white' : 'border-divider text-secondary hover:border-accent/60 hover:text-primary'}`}
          >
            {value}×
          </button>
        ))}
      </div>
    </div>
  );
}
