'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { 
  Eye, 
  EyeOff, 
  Mail, 
  Lock, 
  User, 
  Phone, 
  ArrowRight, 
  AlertCircle,
  Shield,
  Car,
  Navigation2,
  Radio,
  Users,
  CheckCircle,
  Clock,
  MapPin,
  FuelIcon,
  Wrench,
  CircleDollarSign
} from 'lucide-react';

// Firebase will be dynamically imported on client side only
let signUp: any = null;
let signInWithGoogle: any = null;

// Fixed building heights for city skyline
const buildingHeights = [45, 62, 38, 71, 53, 29, 64, 48, 55, 42, 67, 39, 58, 46, 51];

function RegisterForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [adminEmail, setAdminEmail] = useState<string>('');
  const [firebaseReady, setFirebaseReady] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });

  // Load Firebase dynamically on client side only
  useEffect(() => {
    const loadFirebase = async () => {
      try {
        const authModule = await import('../../../lib/firebase/auth');
        signUp = authModule.signUp;
        signInWithGoogle = authModule.signInWithGoogle;
        setFirebaseReady(true);
      } catch (error) {
        console.error('Failed to load Firebase:', error);
        setError('Failed to initialize authentication');
        setFirebaseReady(true);
      }
    };
    
    loadFirebase();
  }, []);

  // Get admin emails from environment variables
  useEffect(() => {
    const adminEmailsString = process.env.NEXT_PUBLIC_ADMIN_EMAILS || '';
    const firstAdminEmail = adminEmailsString.split(',')[0]?.trim() || '';
    setAdminEmail(firstAdminEmail);
  }, []);

  // Check if email is in admin list
  const isAdminEmail = (email: string): boolean => {
    const adminEmailsString = process.env.NEXT_PUBLIC_ADMIN_EMAILS || '';
    const adminEmails = adminEmailsString.split(',').map(e => e.trim());
    return adminEmails.includes(email);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const validateForm = () => {
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }
    if (!formData.email.includes('@')) {
      setError('Please enter a valid email address');
      return false;
    }
    if (!formData.fullName.trim()) {
      setError('Full name is required');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!firebaseReady || !signUp) {
      setError('Authentication is initializing. Please wait.');
      return;
    }

    if (!validateForm()) return;

    setLoading(true);

    try {
      // Determine role based on email
      const role = isAdminEmail(formData.email) ? 'admin' : 'driver';
      
      await signUp(
        formData.email,
        formData.password,
        formData.fullName,
        role,
        formData.phone
      );
      
      setSuccess('Account created successfully! Redirecting to login...');
      
      setTimeout(() => {
        router.push('/auth/login');
      }, 2000);
    } catch (err: any) {
      console.error('Sign up error:', err);
      
      if (err.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists. Please sign in instead.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password is too weak. Please use a stronger password.');
      } else {
        setError(err.message || 'Failed to create account');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setError('');
    
    if (!firebaseReady || !signInWithGoogle) {
      setError('Authentication is initializing. Please wait.');
      return;
    }
    
    setGoogleLoading(true);

    try {
      const userCredential = await signInWithGoogle();
      const user = userCredential.user;
      
      // Check if user email is admin
      const role = user.email && isAdminEmail(user.email) ? 'admin' : 'driver';
      
      setSuccess('Account created successfully! Redirecting to dashboard...');
      
      setTimeout(() => {
        if (role === 'admin') {
          router.push('/dashboards/admin');
        } else {
          router.push('/dashboards/driver');
        }
      }, 2000);
    } catch (err: any) {
      console.error('Google sign up error:', err);
      
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Sign-up cancelled. Please try again.');
      } else if (err.code === 'auth/account-exists-with-different-credential') {
        setError('An account already exists with the same email address using a different sign-in method.');
      } else {
        setError(err.message || 'Failed to sign up with Google');
      }
    } finally {
      setGoogleLoading(false);
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

  return (
    <div className="relative w-full max-w-5xl">
      <div className="bg-slate-900/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-yellow-500/20 overflow-hidden">
        <div className="grid md:grid-cols-2 min-h-[650px]">
          {/* Left Column - Logo & Branding */}
          <div className="relative bg-gradient-to-br from-slate-900 to-slate-800 p-8 md:p-12 flex flex-col items-center justify-center overflow-hidden border-r border-yellow-500/20">
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-0 -left-40 w-80 h-80 bg-yellow-500/20 rounded-full blur-3xl"></div>
              <div className="absolute bottom-0 -right-20 w-60 h-60 bg-amber-500/20 rounded-full blur-3xl"></div>
            </div>

            <div className="absolute bottom-0 left-0 w-full h-2 bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-400"></div>
            <div className="absolute top-20 left-10 w-20 h-20 opacity-5">
              <div className="grid grid-cols-4 gap-1">
                {[...Array(16)].map((_, i) => (
                  <div key={i} className="w-3 h-3 bg-yellow-400"></div>
                ))}
              </div>
            </div>

            <div className="relative text-center md:text-left flex flex-col items-center md:items-start">
              <div className="mb-8 relative">
                <div className="relative w-48 h-48 md:w-56 md:h-56 lg:w-64 lg:h-64 group">
                  <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full blur-2xl opacity-30 group-hover:opacity-50 transition-opacity"></div>
                  <div className="relative w-full h-full bg-slate-800 rounded-full p-4 border-4 border-yellow-400/30">
                    <Image 
                      src="/logo.png" 
                      alt="MLI Logo" 
                      fill
                      className="object-contain drop-shadow-2xl p-4"
                      priority
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-yellow-400 via-amber-400 to-orange-400 bg-clip-text text-transparent">
                  Munyiri Legacy
                </h2>
                <p className="text-lg md:text-xl lg:text-2xl text-gray-300 font-light flex items-center gap-2 justify-center md:justify-start">
                  <Navigation2 className="w-5 h-5 text-yellow-400" />
                  Driving Excellence, Delivering Legacy
                </p>
              </div>

              <div className="w-32 h-1 bg-gradient-to-r from-yellow-400 to-amber-400 rounded-full my-8 relative overflow-hidden">
                <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
              </div>

              <p className="text-gray-400 text-sm md:text-base max-w-sm text-center md:text-left leading-relaxed">
                Join East Africa's leading <span className="text-yellow-400">fleet management platform</span>. Track vehicles, manage drivers, and optimize your operations with real-time insights.
              </p>

              <div className="mt-6 flex flex-wrap gap-2 justify-center md:justify-start">
                <span className="inline-flex items-center gap-1 bg-slate-800/50 px-3 py-1 rounded-full text-xs text-gray-300 border border-yellow-500/20">
                  <Radio className="w-3 h-3 text-yellow-400" /> Live Tracking
                </span>
                <span className="inline-flex items-center gap-1 bg-slate-800/50 px-3 py-1 rounded-full text-xs text-gray-300 border border-yellow-500/20">
                  <FuelIcon className="w-3 h-3 text-yellow-400" /> Fuel Mgmt
                </span>
                <span className="inline-flex items-center gap-1 bg-slate-800/50 px-3 py-1 rounded-full text-xs text-gray-300 border border-yellow-500/20">
                  <Wrench className="w-3 h-3 text-yellow-400" /> Maintenance
                </span>
              </div>

              <div className="mt-10 grid grid-cols-2 gap-8 w-full">
                <div className="text-center md:text-left p-4 bg-slate-800/30 rounded-xl border border-yellow-500/10">
                  <div className="text-3xl md:text-4xl font-bold text-white flex items-center gap-2 justify-center md:justify-start">
                    <Car className="w-6 h-6 text-yellow-400" />
                    500+
                  </div>
                  <div className="text-xs md:text-sm text-gray-500 mt-1">Fleets Managed</div>
                </div>
                <div className="text-center md:text-left p-4 bg-slate-800/30 rounded-xl border border-yellow-500/10">
                  <div className="text-3xl md:text-4xl font-bold text-white flex items-center gap-2 justify-center md:justify-start">
                    <Users className="w-6 h-6 text-yellow-400" />
                    10k+
                  </div>
                  <div className="text-xs md:text-sm text-gray-500 mt-1">Vehicles Tracked</div>
                </div>
              </div>

              <div className="mt-8 inline-flex items-center gap-3 bg-slate-800/50 backdrop-blur-sm px-4 py-2 rounded-full border border-yellow-500/20">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
                </span>
                <span className="text-xs md:text-sm text-gray-300">2,847 vehicles online now</span>
              </div>
            </div>
          </div>

          {/* Right Column - Sign Up Form */}
          <div className="p-8 md:p-10">
            <div className="max-w-md mx-auto">
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-lg flex items-center justify-center">
                    <Car className="w-4 h-4 text-black" />
                  </div>
                  <h1 className="text-3xl font-bold text-white">Create Account</h1>
                </div>
                <p className="text-gray-400 flex items-center gap-2">
                  <span className="w-1 h-1 bg-yellow-400 rounded-full"></span>
                  Join Munyiri Legacy Investments
                </p>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              {success && (
                <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
                  <p className="text-green-400 text-sm">{success}</p>
                </div>
              )}

              {formData.email && isAdminEmail(formData.email) && (
                <div className="mb-6 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex items-center gap-2">
                  <Shield className="w-4 h-4 text-yellow-400" />
                  <p className="text-yellow-400 text-xs">Admin email detected. You'll be registered as an administrator.</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleChange}
                      required
                      className="w-full bg-slate-800/50 border border-gray-700 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 transition"
                      placeholder="John Doe"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="w-full bg-slate-800/50 border border-gray-700 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 transition"
                      placeholder="driver@example.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full bg-slate-800/50 border border-gray-700 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 transition"
                      placeholder="+254 712 345 678"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      className="w-full bg-slate-800/50 border border-gray-700 rounded-xl py-3 pl-10 pr-12 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 transition"
                      placeholder="Create a password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      required
                      className="w-full bg-slate-800/50 border border-gray-700 rounded-xl py-3 pl-10 pr-12 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 transition"
                      placeholder="Confirm your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {formData.password && (
                  <div className="space-y-2">
                    <div className="flex gap-1 h-1">
                      <div className={`flex-1 h-full rounded-full transition-colors ${formData.password.length >= 6 ? 'bg-yellow-400' : 'bg-gray-700'}`}></div>
                      <div className={`flex-1 h-full rounded-full transition-colors ${/[A-Z]/.test(formData.password) ? 'bg-yellow-400' : 'bg-gray-700'}`}></div>
                      <div className={`flex-1 h-full rounded-full transition-colors ${/[0-9]/.test(formData.password) ? 'bg-yellow-400' : 'bg-gray-700'}`}></div>
                      <div className={`flex-1 h-full rounded-full transition-colors ${/[^A-Za-z0-9]/.test(formData.password) ? 'bg-yellow-400' : 'bg-gray-700'}`}></div>
                    </div>
                    <p className="text-xs text-gray-500">Use 6+ characters with mix of letters, numbers & symbols</p>
                  </div>
                )}

                <div className="flex items-start">
                  <input
                    type="checkbox"
                    required
                    className="w-4 h-4 mt-1 bg-slate-800 border-gray-700 rounded text-yellow-400 focus:ring-yellow-500 focus:ring-offset-0"
                  />
                  <span className="ml-2 text-sm text-gray-400">
                    I agree to the{' '}
                    <Link href="/terms" className="text-yellow-400 hover:text-yellow-300 font-medium">Terms of Service</Link>{' '}
                    and{' '}
                    <Link href="/privacy" className="text-yellow-400 hover:text-yellow-300 font-medium">Privacy Policy</Link>
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-black font-semibold py-3 rounded-xl transition-all shadow-lg shadow-yellow-500/30 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>Create Account <ArrowRight className="w-5 h-5" /></>
                  )}
                </button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-gray-400">
                  Already have an account?{' '}
                  <Link href="/auth/login" className="text-yellow-400 hover:text-yellow-300 font-medium transition">Sign In</Link>
                </p>
              </div>

              <div className="mt-8">
                <div className="relative mb-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-yellow-500/20"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-slate-900 text-gray-500">Or continue with</span>
                  </div>
                </div>

                <button
                  onClick={handleGoogleSignUp}
                  disabled={googleLoading}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-white font-semibold py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed border border-yellow-500/20 hover:border-yellow-400/50"
                >
                  {googleLoading ? (
                    <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                      </svg>
                      <span>Sign up with Google</span>
                    </>
                  )}
                </button>
              </div>

              <div className="mt-6 flex items-center justify-center gap-4 text-xs text-gray-600">
                <span className="flex items-center gap-1"><Shield className="w-3 h-3 text-yellow-400/50" /> Secure</span>
                <span className="w-1 h-1 bg-yellow-500/30 rounded-full"></span>
                <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-yellow-400/50" /> 24/7 Support</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="text-center mt-6">
        <Link href="/" className="text-gray-500 hover:text-yellow-400 text-sm transition inline-flex items-center gap-2 group">
          <ArrowRight className="w-4 h-4 rotate-180 group-hover:-translate-x-1 transition-transform" />
          Back to Home
        </Link>
      </div>
    </div>
  );
}

function RegisterFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-yellow-400/20 border-t-yellow-400 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-400">Loading...</p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4 font-sans overflow-x-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full opacity-10">
          <div className="relative w-full h-full">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="absolute w-full h-0.5 bg-yellow-400"
                style={{
                  top: `${i * 5}%`,
                  transform: `translateX(${i % 2 === 0 ? '-50%' : '0'})`,
                  animation: `moveRoad ${15 + i}s linear infinite`,
                  opacity: 0.3
                }}
              />
            ))}
          </div>
        </div>
        
        <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-yellow-500/5 to-transparent">
          <div className="flex justify-around items-end h-full">
            {buildingHeights.map((height, i) => (
              <div
                key={i}
                className="w-16 bg-yellow-500/10"
                style={{ height: `${height}px`, transform: `skewX(-10deg)` }}
              />
            ))}
          </div>
        </div>

        <div className="absolute -top-40 -right-40 w-96 h-96 bg-yellow-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl animate-pulse animation-delay-2000"></div>
      </div>

      <Suspense fallback={<RegisterFallback />}>
        <RegisterForm />
      </Suspense>

      <style jsx>{`
        @keyframes moveRoad {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animation-delay-2000 { animation-delay: 2s; }
      `}</style>
    </div>
  );
}