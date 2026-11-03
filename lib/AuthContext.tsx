'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClient, User } from '@supabase/supabase-js';

export type UserRole = 'resident' | 'officer' | 'admin';

interface AuthContextType {
  user: User | null;
  role: UserRole;
  loading: boolean;
  accessToken: string | null;
  signIn: (email: string, pass: string) => Promise<{ error?: string }>;
  signUp: (email: string, pass: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  switchDemoRole: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: 'resident',
  loading: false,
  accessToken: null,
  signIn: async () => ({}),
  signUp: async () => ({}),
  signOut: async () => {},
  switchDemoRole: () => {},
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  '';

const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole>('officer'); // Default to officer for immediate hackathon judge access
  const [loading, setLoading] = useState<boolean>(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser(session.user);
        setAccessToken(session.access_token);
        fetchUserRole(session.user.id);
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setUser(session.user);
        setAccessToken(session.access_token);
        fetchUserRole(session.user.id);
      } else {
        setUser(null);
        setAccessToken(null);
        setRole('resident');
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchUserRole(userId: string) {
    if (!supabase) return;
    try {
      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .maybeSingle();
      if (data?.role) {
        setRole(data.role as UserRole);
      }
    } catch {
      // fallback
    }
  }

  async function signIn(email: string, pass: string) {
    if (!supabase) return { error: 'Supabase authentication not configured' };
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) return { error: error.message };
    return {};
  }

  async function signUp(email: string, pass: string) {
    if (!supabase) return { error: 'Supabase authentication not configured' };
    const { error } = await supabase.auth.signUp({ email, password: pass });
    if (error) return { error: error.message };
    return {};
  }

  async function signOut() {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setAccessToken(null);
    setRole('resident');
  }

  function switchDemoRole(newRole: UserRole) {
    setRole(newRole);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        loading,
        accessToken,
        signIn,
        signUp,
        signOut,
        switchDemoRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

