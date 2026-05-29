'use client';

import React, { createContext, useContext, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, onValue, update } from 'firebase/database';
import { auth, db } from '@/lib/firebase';
import { useAuthStore } from '@/store/authStore';
import { UserProfile } from '@/types';

const AuthContext = createContext({});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const { setAuth, setLoading } = useAuthStore();

  useEffect(() => {
    // Safety timeout to prevent permanent loading state
    const timeoutId = setTimeout(() => {
      setLoading(false);
    }, 5000);

    let unsubscribeOnValue: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      // Clean up previous onValue listener if it exists
      if (unsubscribeOnValue) {
        unsubscribeOnValue();
        unsubscribeOnValue = undefined;
      }

      if (firebaseUser) {
        const userRef = ref(db, `users/${firebaseUser.uid}`);
        
        // Use onValue with cleanup and error handling
        unsubscribeOnValue = onValue(userRef, (snapshot) => {
          const profile = snapshot.val() as UserProfile;
          if (profile) {
            // Safeguard: Ensure role, uid, displayName, and email are always present
            const updatedProfile = {
              ...profile,
              role: profile.role || 'user',
              displayName: profile.displayName || (profile as any).name || firebaseUser.displayName || 'User',
              email: profile.email || firebaseUser.email || '',
              uid: profile.uid || firebaseUser.uid,
            } as UserProfile;
            
            // If the database is missing these properties, patch them back to the database atomically so it's clean
            if (!profile.role || !profile.uid || !profile.displayName) {
              const patchUpdates: any = {};
              if (!profile.role) patchUpdates.role = 'user';
              if (!profile.uid) patchUpdates.uid = firebaseUser.uid;
              if (!profile.displayName) patchUpdates.displayName = profile.displayName || (profile as any).name || firebaseUser.displayName || 'User';
              if (!profile.email) patchUpdates.email = firebaseUser.email || '';
              update(userRef, patchUpdates).catch(console.error);
            }
            
            setAuth(updatedProfile, false);
          } else {
            // If profile doesn't exist yet, set basic info but don't hang
            setAuth({
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || '',
              photoURL: firebaseUser.photoURL || '',
              role: 'user',
              onboardingCompleted: false,
              createdAt: Date.now(),
            }, false);
          }
        }, (error) => {
          console.error("RTDB Profile Fetch Error:", error);
          // Set a fallback profile to prevent redirect loops
          setAuth({
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || 'User',
            photoURL: firebaseUser.photoURL || '',
            role: 'user',
            onboardingCompleted: false,
            createdAt: Date.now(),
          }, false);
        });
      } else {
        setAuth(null, false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeOnValue) unsubscribeOnValue();
      clearTimeout(timeoutId);
    };
  }, [setAuth, setLoading]);

  return (
    <AuthContext.Provider value={{}}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
