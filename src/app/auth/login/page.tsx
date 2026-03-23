"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  Eye, 
  EyeOff, 
  Mail, 
  Lock, 
  ArrowRight, 
  AlertCircle,
  Shield,
  Car,
  Navigation2,
  Radio,
  Users,
  Clock,
  KeyRound,
  UserCheck
} from "lucide-react";

// Firebase will be dynamically imported on client side only
let signInWithEmailAndPassword: any = null;
let signInWithPopup: any = null;
let GoogleAuthProvider: any = null;
let auth: any = null;

// Building heights for skyline
const buildingHeights = [45, 62, 38, 71, 53, 29, 64, 48, 55, 42, 67, 39, 58, 46, 51];

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [adminEmails, setAdminEmails] = useState<string[]>([]);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [firebaseReady, setFirebaseReady] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });

  // Load Firebase dynamically on client side only
  useEffect(() => {
    const loadFirebase = async () => {
      try {
        const firebaseModule = await import('../../../lib/firebase/client');
        const authModule = await import('firebase/auth');
        
        auth = firebaseModule.auth;
        signInWithEmailAndPassword = authModule.signInWithEmailAndPassword;
        signInWithPopup = authModule.signInWithPopup;
        GoogleAuthProvider = authModule.GoogleAuthProvider;
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
    const adminEmailsString = process.env.NEXT_PUBLIC_ADMIN_EMAILS || "";
    const emails = adminEmailsString.split(",").map(e => e.trim()).filter(e => e);
    setAdminEmails(emails);
  }, []);

  // Check if email is in admin list
  const isAdminEmail = (email: string): boolean => {
    return adminEmails.includes(email);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const redirectBasedOnRoleAndClaims = async (user: any) => {
    if (!user) return;
    
    // Get the ID token result to check custom claims
    const idTokenResult = await user.getIdTokenResult();
    
    // Check if user needs to change password (first time login)
    if (idTokenResult.claims.mustChangePassword) {
      router.push("/auth/change-password");
    } else if (isAdminEmail(user.email)) {
      router.push("/dashboards/admin");
    } else {
      router.push("/dashboards/drivers");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!firebaseReady || !auth) {
      setError('Authentication is initializing. Please wait.');
      return;
    }
    
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, formData.email, formData.password);
      await redirectBasedOnRoleAndClaims(userCredential.user);
    } catch (err: any) {
      console.error("Login error:", err);
      
      switch (err.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          setError('Invalid email or password');
          break;
        case 'auth/too-many-requests':
          setError('Too many failed attempts. Please try again later.');
          break;
        default:
          setError(err.message || "Failed to sign in");
      }
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    
    if (!firebaseReady || !auth) {
      setError('Authentication is initializing. Please wait.');
      return;
    }
    
    setGoogleLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      await redirectBasedOnRoleAndClaims(userCredential.user);
    } catch (err: any) {
      console.error("Google sign-in error:", err);
      setError(err.message || "Failed to sign in with Google");
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

  if (isRedirecting) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-yellow-400/20 border-t-yellow-400 rounded-full animate-spin mx-auto mb-4"></div>
            <Car className="w-8 h-8 text-yellow-400 absolute top-6 left-1/2 -translate-x-1/2 animate-pulse" />
          </div>
          <p className="text-white text-lg">Redirecting to dashboard...</p>
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
                East Africa's leading <span className="text-yellow-400">fleet management platform</span>. Track vehicles, manage drivers, and optimize your operations with real-time insights.
              </p>

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

          {/* Right Column - Login Form */}
          <div className="p-8 md:p-10">
            <div className="max-w-md mx-auto">
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-lg flex items-center justify-center">
                    <KeyRound className="w-4 h-4 text-black" />
                  </div>
                  <h1 className="text-3xl font-bold text-white">Welcome Back</h1>
                </div>
                <p className="text-gray-400 flex items-center gap-2">
                  <span className="w-1 h-1 bg-yellow-400 rounded-full"></span>
                  Sign in to access your fleet dashboard
                </p>
              </div>

              <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                <p className="text-xs text-blue-400 flex items-start gap-2">
                  <Shield className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>
                    <strong>🔐 First time logging in?</strong> Use the temporary password provided by your admin. 
                    You'll be prompted to set a new password immediately.
                  </span>
                </p>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              {formData.email && isAdminEmail(formData.email) && (
                <div className="mb-6 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex items-center gap-2">
                  <Shield className="w-4 h-4 text-yellow-400" />
                  <p className="text-yellow-400 text-xs">Admin login detected. You'll be redirected to admin dashboard.</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
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
                      placeholder="Enter your email"
                      disabled={loading || googleLoading}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      className="w-full bg-slate-800/50 border border-gray-700 rounded-xl py-3 pl-10 pr-12 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 transition"
                      placeholder="Enter your password"
                      disabled={loading || googleLoading}
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

                <div className="flex items-center justify-between">
                  <label className="flex items-center">
                    <input type="checkbox" className="w-4 h-4 bg-slate-800 border-gray-700 rounded text-yellow-400 focus:ring-yellow-500" />
                    <span className="ml-2 text-sm text-gray-400">Remember me</span>
                  </label>
                  <Link href="/forgot-password" className="text-sm text-yellow-400 hover:text-yellow-300 transition">
                    Forgot Password?
                  </Link>
                </div>

                <button
                  type="submit"
                  disabled={loading || googleLoading}
                  className="w-full bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-black font-semibold py-3 rounded-xl transition-all shadow-lg shadow-yellow-500/30 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>Sign In <ArrowRight className="w-5 h-5" /></>
                  )}
                </button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-gray-400">
                  Don't have an account?{' '}
                  <Link href="/auth/signup" className="text-yellow-400 hover:text-yellow-300 font-medium transition">
                    Create Account
                  </Link>
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
                  onClick={handleGoogleSignIn}
                  disabled={googleLoading || loading}
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
                      <span>Sign in with Google</span>
                    </>
                  )}
                </button>
              </div>

              <div className="mt-8 pt-6 border-t border-yellow-500/20">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <UserCheck className="w-4 h-4 text-yellow-400" />
                  <span>Drivers: Please use credentials provided by your administrator</span>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-center gap-4 text-xs text-gray-600">
                <span className="flex items-center gap-1"><Shield className="w-3 h-3 text-yellow-400/50" /> Secure Login</span>
                <span className="w-1 h-1 bg-yellow-500/30 rounded-full"></span>
                <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-yellow-400/50" /> 24/7 Access</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoginFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-yellow-400/20 border-t-yellow-400 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-400">Loading...</p>
      </div>
    </div>
  );
}

export default function LoginPage() {
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

      <Suspense fallback={<LoginFallback />}>
        <LoginForm />
      </Suspense>

      <div className="text-center mt-6 relative z-10">
        <Link href="/" className="text-gray-500 hover:text-yellow-400 text-sm transition inline-flex items-center gap-2 group">
          <ArrowRight className="w-4 h-4 rotate-180 group-hover:-translate-x-1 transition-transform" />
          Back to Home
        </Link>
      </div>

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