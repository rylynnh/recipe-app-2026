import { useEffect } from 'react';
import { Check, CircleAlert, X } from 'lucide-react';
import { useFeedbackStore } from '../../store/feedback';

export function FeedbackToast() {
  const { message, revision, tone, dismiss } = useFeedbackStore();
  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(dismiss, 3500);
    return () => window.clearTimeout(timer);
  }, [message, revision, dismiss]);
  return <div className="mise-feedback-region" role="status" aria-live="polite" aria-atomic="true">{message && <div className="mise-feedback">{tone === 'error' ? <CircleAlert size={17} aria-hidden="true" /> : <Check size={17} aria-hidden="true" />}<span>{message}</span><button type="button" aria-label="关闭提示" onClick={dismiss}><X size={16} /></button></div>}</div>;
}
