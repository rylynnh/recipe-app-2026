import { create } from 'zustand';

interface FeedbackState {
  message: string;
  revision: number;
  tone: 'success' | 'error';
  show: (message: string, tone?: 'success' | 'error') => void;
  dismiss: () => void;
}

export const useFeedbackStore = create<FeedbackState>((set) => ({
  message: '',
  revision: 0,
  tone: 'success',
  show: (message, tone = 'success') => set((state) => ({ message, tone, revision: state.revision + 1 })),
  dismiss: () => set({ message: '' }),
}));

export const notify = (message: string, tone: 'success' | 'error' = 'success') => useFeedbackStore.getState().show(message, tone);
