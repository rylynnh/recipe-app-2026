import { useCallback, useRef, useState } from 'react';
import { isAdminMode } from '../lib/adminMode';

type ProtectedAction = () => void | Promise<void>;

export function useAdminGate() {
  const pendingActionRef = useRef<ProtectedAction | null>(null);
  const [pinDialogOpen, setPinDialogOpen] = useState(false);

  const requireAdmin = useCallback((action: ProtectedAction) => {
    if (isAdminMode()) {
      void action();
      return;
    }

    pendingActionRef.current = action;
    setPinDialogOpen(true);
  }, []);

  const cancelAdminUnlock = useCallback(() => {
    pendingActionRef.current = null;
    setPinDialogOpen(false);
  }, []);

  const continueAfterUnlock = useCallback(() => {
    const action = pendingActionRef.current;
    pendingActionRef.current = null;
    setPinDialogOpen(false);
    if (action) void action();
  }, []);

  return { pinDialogOpen, requireAdmin, cancelAdminUnlock, continueAfterUnlock };
}
