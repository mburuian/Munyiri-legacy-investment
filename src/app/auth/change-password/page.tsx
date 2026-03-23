// app/auth/change-password/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Key, Loader2, AlertCircle, CheckCircle, Shield } from 'lucide-react';

// Dynamically import Firebase only on client side
let updatePassword: any = null;
let getAuth: any = null;

export default function ChangePasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isFirstLogin = searchParams.get('firstLogin') === 'true';
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [firebaseReady, setFirebaseReady] = useState(false);
  const [auth, setAuth] = useState<any>(null);

  // Load Firebase dynamically on client side only
  useEffect(() => {
    const loadFirebase = async () => {
      try {
        // Dynamic import of Firebase client
        const firebaseModule = await import('../../../lib/firebase/client');
        const authModule = await import('firebase/auth');
        
        setAuth(firebaseModule.auth);
        updatePassword = authModule.updatePassword;
        setFirebaseReady(true);
      } catch (error) {
        console.error('Failed to load Firebase:', error);
        setError('Failed to initialize authentication');
        setFirebaseReady(true);
      }
    };
    
    loadFirebase();
  }, []);

  const validatePassword = (password: string) => {
    const requirements = [
      { regex: /.{8,}/, message: 'At least 8 characters' },
      { regex: /[A-Z]/, message: 'One uppercase letter' },
      { regex: /[a-z]/, message: 'One lowercase letter' },
      { regex: /[0-9]/, message: 'One number' },
      { regex: /[^A-Za-z0-9]/, message: 'One special character' }
    ];

    return requirements.map(req => ({
      met: req.regex.test(password),
      message: req.message
    }));
  };

  const passwordRequirements = validatePassword(newPassword);
  const isPasswordValid = passwordRequirements.every(req => req.met);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!firebaseReady || !auth) {
      setError('Authentication is initializing. Please wait.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!isPasswordValid) {
      setError('Please meet all password requirements');
      return;
    }

    setLoading(true);

    try {
      const user = auth.currentUser;
      if (!user) {
        router.push('/auth/login');
        return;
      }

      // Update password in Firebase
      await updatePassword(user, newPassword);

      // Get ID token to update claims
      const token = await user.getIdToken();
      
      // Call API to update custom claims (remove mustChangePassword flag)
      const response = await fetch('/api/auth/update-claims', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          mustChangePassword: false
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update user claims');
      }

      setSuccess(true);

      // Redirect after 3 seconds
      setTimeout(() => {
        router.push('/dashboards/drivers');
      }, 3000);

    } catch (error: any) {
      console.error('Password change error:', error);
      
      // Handle specific Firebase errors
      if (error.code === 'auth/weak-password') {
        setError('Password is too weak. Please choose a stronger password.');
      } else if (error.code === 'auth/requires-recent-login') {
        setError('Please log in again to change your password.');
        setTimeout(() => {
          router.push('/auth/login');
        }, 2000);
      } else {
        setError(error.message || 'Failed to change password');
      }
    } finally {
      setLoading(false);
    }
  };

  // Show loading while Firebase initializes
  if (!firebaseReady) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-yellow-400/20 border-t-yellow-400 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-800/50 backdrop-blur-sm border border-yellow-500/20 rounded-2xl p-8 text-center">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Password Changed!</h2>
          <p className="text-gray-400 mb-6">
            Your password has been successfully updated. Redirecting to dashboard...
          </p>
          <div className="w-8 h-8 border-4 border-yellow-400/20 border-t-yellow-400 rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-2xl mb-4">
            <Shield className="w-10 h-10 text-black" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            {isFirstLogin ? 'Set Your Password' : 'Change Password'}
          </h1>
          <p className="text-gray-400">
            {isFirstLogin 
              ? 'Create a strong password for your account' 
              : 'Update your account password'}
          </p>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm border border-yellow-500/20 rounded-2xl p-8">
          {error && (
            <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
              <p className="text-rose-400 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                New Password
              </label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-slate-900/50 border border-yellow-500/20 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400/20 transition"
                  placeholder="Enter new password"
                  required
                />
              </div>

              {/* Password Requirements */}
              <div className="mt-3 space-y-2">
                {passwordRequirements.map((req, index) => (
                  <div key={index} className="flex items-center gap-2 text-xs">
                    {req.met ? (
                      <CheckCircle className="w-3 h-3 text-green-400" />
                    ) : (
                      <div className="w-3 h-3 rounded-full border border-gray-600" />
                    )}
                    <span className={req.met ? 'text-green-400' : 'text-gray-500'}>
                      {req.message}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-slate-900/50 border border-yellow-500/20 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400/20 transition"
                  placeholder="Confirm new password"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !isPasswordValid}
              className="w-full bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-semibold py-3 rounded-xl hover:from-yellow-300 hover:to-amber-400 transition-all shadow-lg shadow-yellow-500/30 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Updating...
                </>
              ) : (
                isFirstLogin ? 'Set Password' : 'Change Password'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}