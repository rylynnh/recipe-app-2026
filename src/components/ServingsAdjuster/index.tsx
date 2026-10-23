import { useEffect, useRef, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { formatServingAmount, parseServingAmount } from '../../utils/servings';

interface ServingsAdjusterProps {
  currentServings: number;
  onChange: (servings: number) => void;
  baseServings?: number;
}

const STEP = 0.5;

export function ServingsAdjuster({ currentServings, onChange, baseServings = 1 }: ServingsAdjusterProps) {
  const displayServings = currentServings / baseServings;
  const [inputValue, setInputValue] = useState(() => formatServingAmount(displayServings));
  const [isAnimating, setIsAnimating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const previousServings = useRef(currentServings);

  useEffect(() => {
    if (previousServings.current !== currentServings) {
      setIsAnimating(true);
      const timer = window.setTimeout(() => setIsAnimating(false), 220);
      previousServings.current = currentServings;
      if (!isEditing) setInputValue(formatServingAmount(displayServings));
      return () => window.clearTimeout(timer);
    }
  }, [currentServings, displayServings, isEditing]);

  const applyServings = (value: number) => {
    if (Number.isFinite(value) && value > 0) onChange(value * baseServings);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value;
    // Keep partial values while typing, including fractions such as "1/".
    if (!/^\d*(?:\.\d*)?(?:\/\d*(?:\.\d*)?)?$/.test(nextValue)) return;
    setInputValue(nextValue);

    const parsed = parseServingAmount(nextValue);
    if (parsed !== null) {
      applyServings(parsed);
    }
  };

  const commitInput = () => {
    const parsed = parseServingAmount(inputValue);
    if (parsed === null) {
      setInputValue(formatServingAmount(displayServings));
      return;
    }
    applyServings(parsed);
  };

  const nudgeServings = (direction: -1 | 1) => {
    const next = direction === -1 && displayServings <= STEP
      ? displayServings / 2
      : displayServings + direction * STEP;
    applyServings(Number(next.toFixed(6)));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4"><div><p className="text-[14px] font-medium text-primary">配方份量</p><p className="mt-1 text-[12px] leading-5 text-secondary">以原配方为 1 倍，按比例调整用量</p></div><span className="text-[12px] text-secondary">× {formatServingAmount(displayServings)}</span></div>
      <div className="flex items-center justify-center gap-5">
        <button
          type="button"
          onClick={() => nudgeServings(-1)}
          aria-label="减少配方量"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-background text-primary transition-colors hover:bg-divider/50 disabled:cursor-not-allowed disabled:opacity-35"
        >
          <Minus className="h-5 w-5" />
        </button>
        <div className="min-w-[118px] text-center">
          <label htmlFor="recipe-serving-amount" className="sr-only">配方倍率</label>
          <div className="flex items-baseline justify-center border-b border-divider pb-1 focus-within:border-accent">
            <input
              id="recipe-serving-amount"
              type="text"
              inputMode="text"
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
              className={`w-[78px] bg-transparent text-center font-mono-digit text-2xl font-medium text-primary outline-none transition-transform ${isAnimating ? 'scale-105' : ''}`}
            />
          </div>
        </div>
        <button
          type="button"
          onClick={() => nudgeServings(1)}
          aria-label="增加配方量"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-background text-primary transition-colors hover:bg-divider/50 disabled:cursor-not-allowed disabled:opacity-35"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
