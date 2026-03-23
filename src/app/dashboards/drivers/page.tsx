"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Home,
  Car,
  ClipboardList,
  Receipt,
  Bell,
  LogOut,
  Menu,
  ChevronRight,
  TrendingUp,
  DollarSign,
  Calendar,
  Clock,
  MapPin,
  Fuel,
  Wrench,
  Send,
  Navigation,
  CheckCircle,
  AlertTriangle,
  Award,
  Sparkles,
  Activity,
  UserCircle,
  Settings,
  Navigation2,
  Radio,
  Timer,
  FuelIcon,
  Banknote,
  Route,
  Gauge,
  X,
  Loader2,
  Zap,
  Shield,
  Target,
  Star,
  Trophy,
  RefreshCw,
  Wallet,
  TrendingDown,
  Battery,
  BatteryFull,
  BatteryMedium,
  BatteryLow,
  Info,
  ChevronDown,
  ChevronUp,
  CalendarDays,
  Download,
  Share2,
  Eye,
  EyeOff,
  Users,
  Coffee,
  Gift,
  Compass,
  Radar,
  Signal,
  Wifi,
  Truck,
  Navigation as NavigationIcon
} from "lucide-react";

// Firebase will be dynamically imported on client side only
let auth: any = null;
let onAuthStateChanged: any = null;

// Types
interface Trip {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  from: string;
  to: string;
  distance: number;
  earnings: number;
  status: 'completed' | 'in-progress' | 'cancelled';
}

interface Expense {
  id: string;
  category: 'fuel' | 'maintenance' | 'other';
  amount: number;
  date: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected';
}

interface Vehicle {
  id: string;
  plateNumber: string;
  model: string;
  fuelLevel: number;
  odometer: number;
  nextService: string;
  insuranceExpiry: string;
  status: 'active' | 'idle' | 'maintenance';
}

interface DriverStats {
  todayEarnings: number;
  todayTrips: number;
  weekEarnings: number;
  monthEarnings: number;
  totalTrips: number;
  fuelLogged: number;
  fuelEfficiency: number;
  todayDistance: number;
}

interface DriverData {
  id: string;
  name: string;
  email: string;
  phone: string;
  licenseNumber: string;
  status: string;
}

interface ApiResponse {
  driver: DriverData;
  vehicle: Vehicle | null;
  recentTrips: Trip[];
  recentExpenses: Expense[];
  stats: DriverStats;
}

type QuickAction = 'trip' | 'fuel' | 'expense';

interface QuickActionForm {
  type: QuickAction;
  amount: string;
  description: string;
  from?: string;
  to?: string;
  location?: string;
  distance?: number;
}

const menuItems = [
  { icon: Home, label: "Dashboard", href: "/dashboards/drivers", active: true },
  { icon: Car, label: "My Vehicle", href: "/dashboards/drivers/vehicle" },
  { icon: ClipboardList, label: "Trip History", href: "/dashboards/drivers/trips" },
  { icon: Receipt, label: "Expenses", href: "/dashboards/drivers/expenses" },
  { icon: Settings, label: "Settings", href: "/dashboards/drivers/settings" },
];

function DriverDashboardContent() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [driver, setDriver] = useState<DriverData | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [stats, setStats] = useState<DriverStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [greeting, setGreeting] = useState("");
  const [firebaseReady, setFirebaseReady] = useState(false);
  
  // Quick action states
  const [showQuickAction, setShowQuickAction] = useState<QuickAction | null>(null);
  const [quickActionForm, setQuickActionForm] = useState<QuickActionForm>({
    type: 'trip',
    amount: '',
    description: '',
    from: '',
    to: '',
    location: '',
    distance: 0
  });
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showLiveTracking, setShowLiveTracking] = useState(false);

  // Load Firebase dynamically on client side only
  useEffect(() => {
    const loadFirebase = async () => {
      try {
        const firebaseModule = await import('../../../lib/firebase/client');
        const authModule = await import('firebase/auth');
        
        auth = firebaseModule.auth;
        onAuthStateChanged = authModule.onAuthStateChanged;
        setFirebaseReady(true);
      } catch (error) {
        console.error('Failed to load Firebase:', error);
        setError('Failed to initialize authentication');
        setFirebaseReady(true);
      }
    };
    
    loadFirebase();
  }, []);

  useEffect(() => {
    if (!firebaseReady) return;
    
    const unsubscribe = onAuthStateChanged(auth, (user: any) => {
      if (!user) {
        router.push('/auth/login');
        return;
      }
      loadDriverData();
    });

    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    setGreeting(getGreeting());
    
    return () => {
      unsubscribe();
      clearInterval(timer);
    };
  }, [firebaseReady]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  const loadDriverData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const user = auth?.currentUser;
      if (!user) {
        router.push('/auth/login');
        return;
      }

      const token = await user.getIdToken();
      const response = await fetch('/api/driver/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        if (response.status === 401) router.push('/auth/login');
        throw new Error('Failed to load driver data');
      }
      
      const data: ApiResponse = await response.json();
      
      setDriver(data.driver);
      setVehicle(data.vehicle);
      setTrips(data.recentTrips || []);
      setExpenses(data.recentExpenses || []);
      setStats(data.stats);
      
    } catch (error) {
      console.error('Error loading driver data:', error);
      setError('Failed to load driver data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAction = (action: QuickAction) => {
    setShowQuickAction(action);
    setQuickActionForm({
      type: action,
      amount: '',
      description: '',
      from: '',
      to: '',
      location: '',
      distance: 0
    });
  };

  const handleQuickActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const user = auth?.currentUser;
      if (!user) {
        router.push('/auth/login');
        return;
      }
      
      const token = await user.getIdToken();
      
      let endpoint = '';
      let body: any = {};
      
      switch (showQuickAction) {
        case 'trip':
          endpoint = '/api/driver/trips';
          body = {
            startLocation: quickActionForm.from || 'Unknown',
            endLocation: quickActionForm.to || 'Unknown',
            distance: quickActionForm.distance || 0,
            fare: parseFloat(quickActionForm.amount),
            notes: quickActionForm.description
          };
          break;
          
        case 'fuel':
          endpoint = '/api/driver/expenses';
          body = {
            category: 'FUEL',
            amount: parseFloat(quickActionForm.amount),
            description: quickActionForm.description,
            location: quickActionForm.location
          };
          break;
          
        case 'expense':
          endpoint = '/api/driver/expenses';
          body = {
            category: 'OTHER',
            amount: parseFloat(quickActionForm.amount),
            description: quickActionForm.description
          };
          break;
      }
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });
      
      if (!response.ok) throw new Error('Failed to submit');
      
      setSuccessMessage(getSuccessMessage(showQuickAction!));
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      
      setShowQuickAction(null);
      await loadDriverData();
      
    } catch (error) {
      console.error('Error submitting:', error);
      setError('Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const getSuccessMessage = (action: QuickAction) => {
    const messages = {
      trip: '✓ Trip logged successfully!',
      fuel: '⛽ Fuel expense recorded',
      expense: '💰 Expense added'
    };
    return messages[action];
  };

  const handleLogout = async () => {
    try {
      if (auth) {
        await auth.signOut();
      }
      router.push('/auth/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const todayDistance = trips
    .filter(trip => {
      const tripDate = new Date(trip.date);
      const today = new Date();
      return tripDate.toDateString() === today.toDateString();
    })
    .reduce((sum, trip) => sum + (trip.distance || 0), 0);

  const getFuelIcon = (level: number) => {
    if (level >= 75) return <BatteryFull className="w-5 h-5 text-green-400" />;
    if (level >= 40) return <BatteryMedium className="w-5 h-5 text-yellow-400" />;
    return <BatteryLow className="w-5 h-5 text-red-400" />;
  };

  // Show loading while Firebase initializes
  if (!firebaseReady) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-yellow-400/20 border-t-yellow-400 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-yellow-400/20 border-t-yellow-400 rounded-full animate-spin mx-auto mb-4"></div>
            <Car className="w-8 h-8 text-yellow-400 absolute top-6 left-1/2 -translate-x-1/2 animate-pulse" />
          </div>
          <p className="text-gray-400">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-10 h-10 text-rose-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">Error Loading Dashboard</h2>
          <p className="text-gray-400 mb-6">{error}</p>
          <button
            onClick={loadDriverData}
            className="px-6 py-3 bg-gradient-to-r from-yellow-400 to-amber-500 text-black rounded-xl font-semibold hover:from-yellow-300 hover:to-amber-400 transition shadow-lg shadow-yellow-500/30"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Success Toast */}
      {showSuccess && (
        <div className="fixed top-4 right-4 z-50 animate-slide-down">
          <div className="bg-green-500/90 backdrop-blur-sm text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-3 border border-green-400/30">
            <CheckCircle className="w-5 h-5" />
            <span>{successMessage}</span>
          </div>
        </div>
      )}

      {/* Quick Action Modal */}
      {showQuickAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-yellow-500/30 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold flex items-center gap-2">
                  {showQuickAction === 'trip' && <Route className="w-5 h-5 text-yellow-400" />}
                  {showQuickAction === 'fuel' && <FuelIcon className="w-5 h-5 text-yellow-400" />}
                  {showQuickAction === 'expense' && <Receipt className="w-5 h-5 text-purple-400" />}
                  {showQuickAction === 'trip' && 'Log Trip'}
                  {showQuickAction === 'fuel' && 'Add Fuel'}
                  {showQuickAction === 'expense' && 'Add Expense'}
                </h3>
                <button
                  onClick={() => setShowQuickAction(null)}
                  className="p-2 hover:bg-slate-800 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleQuickActionSubmit} className="space-y-4">
                {showQuickAction === 'trip' && (
                  <>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">From</label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                          type="text"
                          value={quickActionForm.from}
                          onChange={(e) => setQuickActionForm({...quickActionForm, from: e.target.value})}
                          className="w-full bg-slate-800/50 border border-yellow-500/20 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400 transition"
                          placeholder="Starting point"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-2">To</label>
                      <div className="relative">
                        <Navigation className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                          type="text"
                          value={quickActionForm.to}
                          onChange={(e) => setQuickActionForm({...quickActionForm, to: e.target.value})}
                          className="w-full bg-slate-800/50 border border-yellow-500/20 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400 transition"
                          placeholder="Destination"
                          required
                        />
                      </div>
                    </div>

                    <div className="bg-slate-800/30 rounded-xl p-4 border border-yellow-500/20">
                      <p className="text-sm text-gray-400">Distance (km)</p>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={quickActionForm.distance}
                          onChange={(e) => setQuickActionForm({...quickActionForm, distance: parseFloat(e.target.value)})}
                          className="w-full bg-transparent text-xl font-bold text-yellow-400 focus:outline-none"
                          placeholder="0"
                          step="0.1"
                          min="0"
                          required
                        />
                        <span className="text-sm text-gray-500">km</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        GPS auto-calculation coming soon
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Earnings (KES)</label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                          type="number"
                          value={quickActionForm.amount}
                          onChange={(e) => setQuickActionForm({...quickActionForm, amount: e.target.value})}
                          className="w-full bg-slate-800/50 border border-yellow-500/20 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400 transition"
                          placeholder="Enter fare amount"
                          required
                          step="0.01"
                          min="0"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Trip Description (Optional)</label>
                      <input
                        type="text"
                        value={quickActionForm.description}
                        onChange={(e) => setQuickActionForm({...quickActionForm, description: e.target.value})}
                        className="w-full bg-slate-800/50 border border-yellow-500/20 rounded-xl py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400 transition"
                        placeholder="e.g., Airport transfer"
                      />
                    </div>
                  </>
                )}

                {showQuickAction === 'fuel' && (
                  <>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Amount (KES)</label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                          type="number"
                          value={quickActionForm.amount}
                          onChange={(e) => setQuickActionForm({...quickActionForm, amount: e.target.value})}
                          className="w-full bg-slate-800/50 border border-yellow-500/20 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400 transition"
                          placeholder="Enter amount"
                          required
                          step="0.01"
                          min="0"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Fuel Station</label>
                      <input
                        type="text"
                        value={quickActionForm.description}
                        onChange={(e) => setQuickActionForm({...quickActionForm, description: e.target.value})}
                        className="w-full bg-slate-800/50 border border-yellow-500/20 rounded-xl py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400 transition"
                        placeholder="e.g., Shell, Bika"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Location (Optional)</label>
                      <input
                        type="text"
                        value={quickActionForm.location}
                        onChange={(e) => setQuickActionForm({...quickActionForm, location: e.target.value})}
                        className="w-full bg-slate-800/50 border border-yellow-500/20 rounded-xl py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400 transition"
                        placeholder="e.g., Mombasa Road"
                      />
                    </div>
                  </>
                )}

                {showQuickAction === 'expense' && (
                  <>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Amount (KES)</label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                          type="number"
                          value={quickActionForm.amount}
                          onChange={(e) => setQuickActionForm({...quickActionForm, amount: e.target.value})}
                          className="w-full bg-slate-800/50 border border-yellow-500/20 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400 transition"
                          placeholder="Enter amount"
                          required
                          step="0.01"
                          min="0"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Description</label>
                      <input
                        type="text"
                        value={quickActionForm.description}
                        onChange={(e) => setQuickActionForm({...quickActionForm, description: e.target.value})}
                        className="w-full bg-slate-800/50 border border-yellow-500/20 rounded-xl py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400 transition"
                        placeholder="e.g., Car wash, Repairs"
                        required
                      />
                    </div>
                  </>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-semibold py-3 rounded-xl hover:from-yellow-300 hover:to-amber-400 transition-all shadow-lg shadow-yellow-500/30 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-6"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Submit
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Live Tracking Coming Soon Banner */}
      <div className="fixed bottom-4 right-4 z-40">
        <button
          onClick={() => setShowLiveTracking(!showLiveTracking)}
          className="group relative bg-gradient-to-r from-blue-600 to-cyan-600 rounded-full p-3 shadow-lg hover:shadow-xl transition-all duration-300"
        >
          <Radar className="w-6 h-6 text-white animate-pulse" />
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-ping"></span>
        </button>
        
        {showLiveTracking && (
          <div className="absolute bottom-16 right-0 w-72 bg-slate-900/95 backdrop-blur-xl border border-blue-500/30 rounded-2xl p-4 shadow-2xl animate-slide-up">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-blue-500/20 rounded-xl">
                <Radar className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h4 className="font-semibold text-sm">Live GPS Tracking</h4>
                <p className="text-xs text-gray-400">Coming Soon</p>
              </div>
            </div>
            <p className="text-xs text-gray-300 mb-3">
              Real-time vehicle tracking, route optimization, and automatic trip logging will be available in the next update.
            </p>
            <div className="flex items-center gap-2 text-[10px] text-gray-500">
              <Signal className="w-3 h-3" />
              <span>GPS integration in progress</span>
            </div>
          </div>
        )}
      </div>

      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full opacity-5">
          <div className="relative w-full h-full">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="absolute w-full h-0.5 bg-yellow-400"
                style={{
                  top: `${i * 5}%`,
                  transform: `translateX(${i % 2 === 0 ? '-50%' : '0'})`,
                  animation: `moveRoad ${15 + i}s linear infinite`,
                  opacity: 0.2
                }}
              />
            ))}
          </div>
        </div>
        
        <div className="absolute top-20 left-10 w-96 h-96 bg-yellow-500/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl animate-pulse animation-delay-2000"></div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 z-50 h-full w-72 
        bg-slate-900/90 backdrop-blur-xl border-r border-yellow-500/20
        transform transition-transform duration-300 ease-in-out
        lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-yellow-500/20">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-xl flex items-center justify-center text-black font-bold text-xl shadow-lg shadow-yellow-500/20">
                <Navigation2 className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Driver Portal</h2>
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <Radio className="w-3 h-3 text-yellow-400" />
                  Online · Live
                </p>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-slate-800/50 rounded-xl border border-yellow-500/20">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center">
                  <UserCircle className="w-8 h-8 text-black" />
                </div>
                <div>
                  <p className="font-semibold">{driver?.name || 'Driver'}</p>
                  <p className="text-xs text-gray-400">ID: {driver?.licenseNumber || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {menuItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-yellow-400 hover:bg-yellow-500/10 rounded-xl transition-all group"
              >
                <item.icon className="w-5 h-5" />
                <span className="text-sm font-medium">{item.label}</span>
                <ChevronRight className="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            ))}
          </nav>

          <div className="p-4 border-t border-yellow-500/20">
            <button 
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3 w-full text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all"
            >
              <LogOut className="w-5 h-5" />
              <span className="text-sm font-medium">Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:pl-72 min-h-screen">
        <header className="sticky top-0 z-30 bg-slate-900/80 backdrop-blur-xl border-b border-yellow-500/20">
          <div className="flex items-center justify-between px-4 md:px-6 py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 hover:bg-slate-800 rounded-xl lg:hidden border border-yellow-500/20"
              >
                <Menu className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                <div>
                  <p className="text-sm font-medium">{formatDate(currentTime)}</p>
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <Timer className="w-3 h-3" />
                    {formatTime(currentTime)} EAT
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button className="relative p-2 hover:bg-slate-800 rounded-xl border border-yellow-500/20">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-slate-900"></span>
              </button>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center">
                <span className="text-sm font-bold text-black">
                  {driver?.name?.split(' ').map(n => n[0]).join('') || 'DR'}
                </span>
              </div>
            </div>
          </div>
        </header>

        <div className="p-4 md:p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                {greeting}, {driver?.name?.split(' ')[0] || 'Driver'}!
                <Sparkles className="w-5 h-5 text-yellow-400" />
              </h1>
              <p className="text-gray-500 text-sm flex items-center gap-2">
                <Radio className="w-3 h-3 text-yellow-400" />
                Track your earnings, trips, and expenses in real-time
              </p>
            </div>
            
            <div className="hidden md:flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs text-gray-500">Today's Earnings</p>
                <p className="text-lg font-bold text-yellow-400">
                  KES {stats?.todayEarnings?.toLocaleString() || '0'}
                </p>
              </div>
              <div className="w-px h-10 bg-yellow-500/20"></div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Today's Trips</p>
                <p className="text-lg font-bold text-blue-400">{stats?.todayTrips || 0}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={() => handleQuickAction('trip')}
              className="group relative bg-gradient-to-br from-yellow-500/20 to-amber-500/20 border border-yellow-500/30 rounded-xl p-6 hover:border-yellow-400/50 transition-all overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <Route className="w-8 h-8 text-yellow-400 mx-auto mb-3" />
              <p className="text-lg font-semibold">Log Trip</p>
              <p className="text-sm text-gray-400">Add trip details & earnings</p>
            </button>

            <button
              onClick={() => handleQuickAction('fuel')}
              className="group relative bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 rounded-xl p-6 hover:border-blue-400/50 transition-all overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <FuelIcon className="w-8 h-8 text-blue-400 mx-auto mb-3" />
              <p className="text-lg font-semibold">Add Fuel</p>
              <p className="text-sm text-gray-400">Log fuel purchase</p>
            </button>

            <button
              onClick={() => handleQuickAction('expense')}
              className="group relative bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-xl p-6 hover:border-purple-400/50 transition-all overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <Receipt className="w-8 h-8 text-purple-400 mx-auto mb-3" />
              <p className="text-lg font-semibold">Add Expense</p>
              <p className="text-sm text-gray-400">Other expenses</p>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="group relative bg-slate-800/50 backdrop-blur-sm border border-yellow-500/20 rounded-2xl p-6 hover:border-yellow-400/50 transition-all overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <Banknote className="w-8 h-8 text-yellow-400" />
                  <TrendingUp className="w-4 h-4 text-yellow-400" />
                </div>
                <p className="text-sm text-gray-400 mb-1">Today's Earnings</p>
                <p className="text-2xl font-bold">KES {stats?.todayEarnings?.toLocaleString() || '0'}</p>
                <p className="text-xs text-yellow-400 mt-2">
                  {stats?.todayTrips || 0} trips completed
                </p>
              </div>
            </div>

            <div className="group relative bg-slate-800/50 backdrop-blur-sm border border-yellow-500/20 rounded-2xl p-6 hover:border-blue-400/50 transition-all overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <Route className="w-8 h-8 text-blue-400" />
                  <Activity className="w-4 h-4 text-blue-400" />
                </div>
                <p className="text-sm text-gray-400 mb-1">Today's Distance</p>
                <p className="text-2xl font-bold">{todayDistance || stats?.todayDistance || 0} km</p>
                <p className="text-xs text-blue-400 mt-2">
                  {stats?.fuelEfficiency?.toFixed(1) || '0'} km/L average
                </p>
              </div>
            </div>

            <div className="group relative bg-slate-800/50 backdrop-blur-sm border border-yellow-500/20 rounded-2xl p-6 hover:border-purple-400/50 transition-all overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <Gauge className="w-8 h-8 text-purple-400" />
                  <FuelIcon className="w-4 h-4 text-purple-400" />
                </div>
                <p className="text-sm text-gray-400 mb-1">Fuel Efficiency</p>
                <p className="text-2xl font-bold">{stats?.fuelEfficiency?.toFixed(1) || '0'} km/L</p>
                <p className="text-xs text-purple-400 mt-2">
                  {stats?.fuelLogged?.toFixed(1) || '0'} L used today
                </p>
              </div>
            </div>

            <div className="group relative bg-slate-800/50 backdrop-blur-sm border border-yellow-500/20 rounded-2xl p-6 hover:border-rose-400/50 transition-all overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-rose-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <Receipt className="w-8 h-8 text-rose-400" />
                  <TrendingDown className="w-4 h-4 text-rose-400" />
                </div>
                <p className="text-sm text-gray-400 mb-1">Today's Expenses</p>
                <p className="text-2xl font-bold">
                  KES {expenses
                    .filter(e => {
                      const expDate = new Date(e.date);
                      const today = new Date();
                      return expDate.toDateString() === today.toDateString();
                    })
                    .reduce((sum, e) => sum + e.amount, 0)
                    .toLocaleString() || '0'}
                </p>
                <p className="text-xs text-rose-400 mt-2">
                  Net: KES {(stats?.todayEarnings || 0) - expenses
                    .filter(e => {
                      const expDate = new Date(e.date);
                      const today = new Date();
                      return expDate.toDateString() === today.toDateString();
                    })
                    .reduce((sum, e) => sum + e.amount, 0)}
                </p>
              </div>
            </div>
          </div>

          {vehicle && (
            <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border border-yellow-500/20 p-6 overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-500/10 rounded-full blur-3xl"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Car className="w-5 h-5 text-yellow-400" />
                    Your Assigned Vehicle
                  </h2>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${
                    vehicle.status === 'active' 
                      ? 'bg-green-500/20 text-green-400 border-green-500/30'
                      : vehicle.status === 'idle'
                      ? 'bg-gray-500/20 text-gray-400 border-gray-500/30'
                      : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                  }`}>
                    {vehicle.status}
                  </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-1">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-20 h-20 bg-slate-700 rounded-xl flex items-center justify-center border border-yellow-500/20">
                        <Car className="w-10 h-10 text-yellow-400" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{vehicle.plateNumber}</p>
                        <p className="text-gray-400">{vehicle.model}</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-400">Fuel Level</span>
                          <span className="font-medium">{vehicle.fuelLevel}%</span>
                        </div>
                        <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full"
                            style={{ width: `${vehicle.fuelLevel}%` }}
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-gray-500">Odometer</p>
                          <p className="font-medium">{vehicle.odometer?.toLocaleString() || 0} km</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Next Service</p>
                          <p className="font-medium text-amber-400">{vehicle.nextService}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-2 grid grid-cols-2 gap-4">
                    <div className="bg-slate-800/50 rounded-xl p-4 border border-yellow-500/20">
                      <p className="text-sm text-gray-400 mb-1">Insurance Expiry</p>
                      <p className="text-lg font-semibold">{vehicle.insuranceExpiry}</p>
                      <p className="text-xs text-yellow-400 mt-1">45 days remaining</p>
                    </div>
                    <div className="bg-slate-800/50 rounded-xl p-4 border border-yellow-500/20">
                      <p className="text-sm text-gray-400 mb-1">Service Due</p>
                      <p className="text-lg font-semibold">500 km</p>
                      <p className="text-xs text-amber-400 mt-1">Approx. 2 days</p>
                    </div>
                    <div className="bg-slate-800/50 rounded-xl p-4 border border-yellow-500/20">
                      <p className="text-sm text-gray-400 mb-1">Today's Usage</p>
                      <p className="text-lg font-semibold">{todayDistance || stats?.todayDistance || 0} km</p>
                      <p className="text-xs text-blue-400 mt-1">{stats?.todayTrips || 0} trips</p>
                    </div>
                    <div className="bg-slate-800/50 rounded-xl p-4 border border-yellow-500/20">
                      <p className="text-sm text-gray-400 mb-1">Fuel Efficiency</p>
                      <p className="text-lg font-semibold">{stats?.fuelEfficiency?.toFixed(1) || '8.2'} km/L</p>
                      <p className="text-xs text-purple-400 mt-1">Above average</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-slate-800/50 backdrop-blur-sm border border-yellow-500/20 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-yellow-400" />
                  Recent Trips
                </h3>
                <Link href="/dashboards/drivers/trips" className="text-sm text-yellow-400 hover:text-yellow-300 flex items-center gap-1">
                  View All
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>

              {trips.length > 0 ? (
                <div className="space-y-3">
                  {trips.slice(0, 5).map((trip) => (
                    <div key={trip.id} className="flex items-center justify-between p-3 bg-slate-800/30 rounded-xl border border-yellow-500/20 hover:bg-slate-800/50 transition">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-yellow-500/20 rounded-lg">
                          <Route className="w-4 h-4 text-yellow-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{trip.from} → {trip.to}</p>
                          <p className="text-xs text-gray-500">{trip.date} • {trip.distance} km</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-yellow-400">KES {trip.earnings?.toLocaleString() || 0}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          trip.status === 'completed' 
                            ? 'bg-green-500/20 text-green-400'
                            : trip.status === 'in-progress'
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'bg-rose-500/20 text-rose-400'
                        }`}>
                          {trip.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <ClipboardList className="w-12 h-12 mx-auto mb-3 text-gray-600" />
                  <p>No trips yet</p>
                  <button
                    onClick={() => handleQuickAction('trip')}
                    className="mt-3 text-sm text-yellow-400 hover:text-yellow-300"
                  >
                    Log your first trip
                  </button>
                </div>
              )}
            </div>

            <div className="bg-slate-800/50 backdrop-blur-sm border border-yellow-500/20 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-purple-400" />
                  Recent Expenses
                </h3>
                <Link href="/dashboards/drivers/expenses" className="text-sm text-purple-400 hover:text-purple-300 flex items-center gap-1">
                  View All
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>

              {expenses.length > 0 ? (
                <div className="space-y-3">
                  {expenses.slice(0, 5).map((expense) => (
                    <div key={expense.id} className="flex items-center justify-between p-3 bg-slate-800/30 rounded-xl border border-yellow-500/20 hover:bg-slate-800/50 transition">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          expense.category === 'fuel' ? 'bg-yellow-500/20' : 
                          expense.category === 'maintenance' ? 'bg-amber-500/20' :
                          'bg-gray-500/20'
                        }`}>
                          {expense.category === 'fuel' ? 
                            <FuelIcon className="w-4 h-4 text-yellow-400" /> : 
                            expense.category === 'maintenance' ?
                            <Wrench className="w-4 h-4 text-amber-400" /> :
                            <Receipt className="w-4 h-4 text-gray-400" />
                          }
                        </div>
                        <div>
                          <p className="text-sm font-medium">{expense.description}</p>
                          <p className="text-xs text-gray-500">{expense.date}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold">KES {expense.amount?.toLocaleString() || 0}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          expense.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                          expense.status === 'pending' ? 'bg-amber-500/20 text-amber-400' :
                          'bg-rose-500/20 text-rose-400'
                        }`}>
                          {expense.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Receipt className="w-12 h-12 mx-auto mb-3 text-gray-600" />
                  <p>No expenses yet</p>
                  <button
                    onClick={() => handleQuickAction('expense')}
                    className="mt-3 text-sm text-purple-400 hover:text-purple-300"
                  >
                    Log your first expense
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <style jsx>{`
        @keyframes moveRoad {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes slideDown {
          from { transform: translateY(-100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-down {
          animation: slideDown 0.3s ease-out;
        }
        .animate-slide-up {
          animation: slideUp 0.3s ease-out;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
      `}</style>
    </div>
  );
}

function DriverDashboardFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-yellow-400/20 border-t-yellow-400 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-400">Loading...</p>
      </div>
    </div>
  );
}

export default function DriverDashboard() {
  return (
    <Suspense fallback={<DriverDashboardFallback />}>
      <DriverDashboardContent />
    </Suspense>
  );
}