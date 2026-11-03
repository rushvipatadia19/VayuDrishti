'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export type UserRole = 'resident' | 'officer';

interface AuthContextType {
  role: UserRole;
  isOfficer: boolean;
  user: { email: string } | null;
  loginAsOfficerDemo: () => void;
  signIn: (email: string, pass: string) => Promise<{ error?: string }>;
  signUp: (email: string, pass: string) => Promise<{ error?: string }>;
  signOut: () => void;
  switchDemoRole: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType>({
  role: 'officer',
  isOfficer: true,
  user: null,
  loginAsOfficerDemo: () => {},
  signIn: async () => ({}),
  signUp: async () => ({}),
  signOut: () => {},
  switchDemoRole: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<UserRole>('officer');
  const [user, setUser] = useState<{ email: string } | null>(null);

  useEffect(() => {
    // Persist demo officer session across browser refreshes
    try {
      const savedRole = localStorage.getItem('vayu_demo_role') as UserRole | null;
      const savedUser = localStorage.getItem('vayu_demo_user');
      if (savedRole) {
        setRole(savedRole);
      }
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
    } catch {
      // Ignore local storage error
    }
  }, []);

  function loginAsOfficerDemo() {
    setRole('officer');
    const demoUser = { email: 'officer.demo@cpcb.gov.in' };
    setUser(demoUser);
    try {
      localStorage.setItem('vayu_demo_role', 'officer');
      localStorage.setItem('vayu_demo_user', JSON.stringify(demoUser));
    } catch {
      // Ignore
    }
  }

  async function signIn(email: string, pass: string) {
    if (!email || !pass) {
      return { error: 'Please enter both email and password.' };
    }
    // Authenticate user into Officer role for demo
    setRole('officer');
    const authedUser = { email };
    setUser(authedUser);
    try {
      localStorage.setItem('vayu_demo_role', 'officer');
      localStorage.setItem('vayu_demo_user', JSON.stringify(authedUser));
    } catch {
      // Ignore
    }
    return {};
  }

  async function signUp(email: string, pass: string) {
    if (!email || !pass) {
      return { error: 'Please provide valid credentials.' };
    }
    return {};
  }

  function signOut() {
    setUser(null);
    setRole('resident');
    try {
      localStorage.removeItem('vayu_demo_role');
      localStorage.removeItem('vayu_demo_user');
    } catch {
      // Ignore
    }
  }

  function switchDemoRole(newRole: UserRole) {
    setRole(newRole);
    try {
      localStorage.setItem('vayu_demo_role', newRole);
    } catch {
      // Ignore
    }
  }

  return (
    <AuthContext.Provider
      value={{
        role,
        isOfficer: role === 'officer',
        user,
        loginAsOfficerDemo,
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
