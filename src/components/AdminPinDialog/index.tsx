import { FormEvent, useEffect, useRef, useState } from 'react';
import { LockKeyhole, X } from 'lucide-react';
import { enableAdminMode } from '../../lib/adminMode';
import { verifyAdminPin } from '../../lib/adminRecipeSync';

interface AdminPinDialogProps {
  open: boolean;
  onCancel: () => void;
  onUnlocked: () => void;
}

export function AdminPinDialog({ open, onCancel, onUnlocked }: AdminPinDialogProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setPin('');
    setError('');
    setChecking(false);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  if (!open) return null;

  const unlock = async (event: FormEvent) => {
    event.preventDefault();
    const nextPin = pin.trim();
    if (!nextPin) {
      setError('请输入管理 PIN');
      return;
    }

    setChecking(true);
    setError('');
    const result = await verifyAdminPin(nextPin);
    setChecking(false);
    if (!result.ok) {
      setError('PIN 不正确，请重试');
      return;
    }

    enableAdminMode(nextPin);
    onUnlocked();
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/45 p-4 sm:items-center"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !checking) onCancel();
      }}
    >
      <form
        onSubmit={unlock}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-pin-title"
        className="w-full max-w-sm rounded-card bg-card p-6 shadow-xl"
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-full bg-accent/10 p-2 text-accent">
            <LockKeyhole className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="admin-pin-title" className="font-display text-lg text-primary">解锁管理模式</h2>
            <p className="mt-1 text-sm leading-5 text-secondary">输入 PIN 后，将在当前页面继续操作。</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={checking}
            className="-mr-2 -mt-2 rounded-full p-2 text-secondary hover:bg-divider/50 disabled:opacity-50"
            aria-label="关闭"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <input
          ref={inputRef}
          type="password"
          inputMode="text"
          autoComplete="current-password"
          value={pin}
          onChange={(event) => {
            setPin(event.target.value);
            if (error) setError('');
          }}
          placeholder="管理 PIN"
          className="mt-5 w-full rounded-input border border-divider bg-background px-4 py-3 text-base text-primary outline-none focus:border-accent"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'admin-pin-error' : undefined}
        />
        {error ? <p id="admin-pin-error" className="mt-2 text-sm text-danger">{error}</p> : null}

        <div className="mt-5 flex gap-3">
          <button type="button" onClick={onCancel} disabled={checking} className="flex-1 py-3 text-secondary disabled:opacity-50">取消</button>
          <button type="submit" disabled={checking} className="flex-1 rounded-input bg-primary py-3 text-white disabled:opacity-60">
            {checking ? '验证中…' : '解锁并继续'}
          </button>
        </div>
      </form>
    </div>
  );
}
