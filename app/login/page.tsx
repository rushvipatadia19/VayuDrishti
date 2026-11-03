'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function LoginPage() {
  const router = useRouter();
  const { signIn, signUp, role, user, signOut, loginAsOfficerDemo } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setSubmitting(true);

    if (isSignUp) {
      const res = await signUp(email, password);
      if (res.error) {
        setError(res.error);
      } else {
        setMessage('Registration successful! Please sign in.');
        setIsSignUp(false);
      }
    } else {
      const res = await signIn(email, password);
      if (res.error) {
        setError(res.error);
      } else {
        router.push('/');
      }
    }
    setSubmitting(false);
  }

  function handleDemoOfficerLogin() {
    loginAsOfficerDemo();
    router.push('/');
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md p-8 border-stone-200 shadow-sm bg-white">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 mb-3 font-serif font-bold text-xl">
            व
          </div>
          <h1 className="text-2xl font-serif font-bold text-stone-900">
            {user ? 'Account Settings' : isSignUp ? 'Create VayuDrishti Account' : 'Sign in to VayuDrishti'}
          </h1>
          <p className="text-sm text-stone-600 mt-1">
            {user
              ? `Signed in as ${user.email}`
              : 'Environmental Incident Reporting & Compliance Portal'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded bg-rose-50 border border-rose-200 text-rose-800 text-xs">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-4 p-3 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
            {message}
          </div>
        )}

        {/* Dedicated "Sign in as Officer (Demo)" button */}
        {!user && (
          <div className="mb-6 pb-6 border-b border-stone-200">
            <button
              type="button"
              onClick={handleDemoOfficerLogin}
              className="w-full py-3 px-4 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2 group"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 group-hover:animate-ping" />
              <span>Sign in as Officer (Demo)</span>
              <span className="text-emerald-200 text-xs font-normal">→ Instant Access</span>
            </button>
            <p className="text-[11px] text-stone-500 text-center mt-2">
              For hackathon evaluation: Grants immediate Officer permissions without credentials.
            </p>
          </div>
        )}

        {user ? (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-stone-50 border border-stone-200">
              <div className="text-xs text-stone-500 uppercase font-mono">Current Active Role</div>
              <div className="text-base font-semibold text-stone-900 mt-1 capitalize">
                Officer — Demo Mode
              </div>
              <div className="text-xs text-stone-600 mt-1">
                Authorized to inspect cases, run statutory analysis, log corrective actions, and download reports.
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="primary"
                className="flex-1 bg-emerald-800 hover:bg-emerald-900 text-white"
                onClick={() => router.push('/')}
              >
                Go to Dashboard
              </Button>
              <Button
                variant="secondary"
                className="text-rose-600 hover:bg-rose-50 border border-stone-200"
                onClick={signOut}
              >
                Sign Out
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Official Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="officer@cpcb.gov.in"
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:ring-1 focus:ring-emerald-600 focus:outline-none"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-medium text-stone-700">Password</label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-xs text-stone-500 hover:text-stone-800"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:ring-1 focus:ring-emerald-600 focus:outline-none"
              />
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold py-2.5"
            >
              {submitting ? 'Authenticating...' : isSignUp ? 'Register Account' : 'Sign In with Password'}
            </Button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError(null);
                  setMessage(null);
                }}
                className="text-xs text-emerald-800 hover:underline"
              >
                {isSignUp ? 'Already registered? Sign in' : "Don't have an account? Register"}
              </button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
