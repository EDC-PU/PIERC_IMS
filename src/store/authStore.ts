import { create } from 'zustand';
import { UserProfile } from '@/types';

interface AuthState {
  user: UserProfile | null;
  originalUser: UserProfile | null;
  isImpersonating: boolean;
  loading: boolean;
  setUser: (user: UserProfile | null) => void;
  setLoading: (loading: boolean) => void;
  setAuth: (user: UserProfile | null, loading: boolean) => void;
  startImpersonation: (targetUser: UserProfile) => void;
  stopImpersonation: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  originalUser: null,
  isImpersonating: false,
  loading: true,
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
  setAuth: (user, loading) => {
    const state = get();
    // If currently impersonating, keep user as the impersonated user and update originalUser
    if (state.isImpersonating && state.originalUser) {
      set({ originalUser: user, loading });
    } else {
      set({ user, loading });
    }
  },
  startImpersonation: (targetUser: UserProfile) => {
    const state = get();
    const currentRealUser = state.originalUser || state.user;
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('pierc_impersonation', JSON.stringify({
          originalUid: currentRealUser?.uid,
          targetUid: targetUser.uid,
          targetUser
        }));
      } catch (err) {
        console.warn('Failed to save impersonation session:', err);
      }
    }
    set({
      originalUser: currentRealUser,
      user: targetUser,
      isImpersonating: true,
    });
  },
  stopImpersonation: () => {
    const state = get();
    const restoredUser = state.originalUser;
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem('pierc_impersonation');
      } catch (err) {
        console.warn('Failed to clear impersonation session:', err);
      }
    }
    set({
      user: restoredUser,
      originalUser: null,
      isImpersonating: false,
    });
  },
}));
