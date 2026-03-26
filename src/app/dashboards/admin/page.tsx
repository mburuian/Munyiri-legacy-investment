"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  LayoutDashboard,
  Truck,
  Users,
  DollarSign,
  CreditCard,
  BarChart3,
  FileText,
  Bell,
  Settings,
  Shield,
  LogOut,
  Menu,
  TrendingUp,
  TrendingDown,
  CircleDollarSign,
  Car,
  Wrench,
  PlusCircle,
  Download,
  Filter,
  Search,
  Eye,
  Edit,
  MoreHorizontal,
  AlertTriangle,
  Calendar,
  Clock,
  UserPlus,
  Trash2,
  MapPin,
  Navigation,
  Compass,
  PieChart,
  LineChart,
  Activity,
  Zap,
  Navigation2,
  FuelIcon,
  Radio,
  Timer,
  Gauge,
  UserCheck,
  KeyRound,
  Award,
  X,
  RefreshCw,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  Battery,
  BatteryFull,
  BatteryMedium,
  BatteryLow,
  Image as ImageIcon
} from "lucide-react";

// Firebase will be dynamically imported on client side only
let auth: any = null;
let onAuthStateChanged: any = null;

// Types based on API responses
interface DashboardStats {
  incomeToday: number;
  incomeWeek: number;
  incomeMonth: number;
  expensesToday: number;
  expensesWeek: number;
  expensesMonth: number;
  netProfit: number;
  activeVehicles: number;
  maintenanceVehicles: number;
  totalVehicles: number;
  activeDrivers: number;
  totalDrivers: number;
  pendingAlerts: number;
}

interface VehicleImage {
  id: string;
  url: string;
  type: string;
  isPrimary: boolean;
  fileName: string;
  fileType: string;
  createdAt: string;
}

interface Vehicle {
  id: string;
  plateNumber: string;
  model: string;
  status: string;
  fuelLevel?: number;
  nextService?: string;
  insuranceExpiry?: string;
  mainImage?: string | null;
  images?: VehicleImage[];
  driver?: {
    user: {
      name: string;
    }
  } | null;
}

interface Driver {
  id: string;
  name: string;
  email: string;
  phone?: string;
  licenseNumber?: string;
  assignedVehicle?: {
    plateNumber: string;
    model: string;
  } | null;
  tripsCompleted: number;
  totalRevenue: number;
  status: string;
  rating: number;
}

interface IncomeLog {
  id: string;
  vehicle_reg: string;
  driver_name: string;
  type: string;
  amount: number;
  date: string;
}

interface ExpenseLog {
  id: string;
  vehicle_reg: string;
  description: string;
  amount: number;
  date: string;
}

interface Alert {
  id: string;
  vehicle_reg: string;
  type: string;
  severity: string;
  description: string;
  due_date: string;
}

const defaultStats: DashboardStats = {
  incomeToday: 0,
  incomeWeek: 0,
  incomeMonth: 0,
  expensesToday: 0,
  expensesWeek: 0,
  expensesMonth: 0,
  netProfit: 0,
  activeVehicles: 0,
  maintenanceVehicles: 0,
  totalVehicles: 0,
  activeDrivers: 0,
  totalDrivers: 0,
  pendingAlerts: 0
};

// Sidebar Menu
const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboards/admin", active: true },
  { icon: Truck, label: "Vehicles", href: "/dashboards/admin/vehicles" },
  { icon: Users, label: "Drivers", href: "/dashboards/admin/driver" },
  { icon: DollarSign, label: "Income", href: "/dashboards/admin/income" },
  { icon: FileText, label: "Reports", href: "/dashboards/admin/reports" },
  { icon: Shield, label: "Integrations", href: "/dashboards/admin/integrations" },
];

const formatCurrency = (amount: number | undefined | null = 0) => {
  if (amount === undefined || amount === null) return "KES 0";
  return `KES ${amount.toLocaleString()}`;
};

const safeToString = (value: number | undefined | null): string => {
  if (value === undefined || value === null) return "0";
  return value.toString();
};

const getInitials = (name: string, email: string) => {
  if (name && name !== 'Admin') {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  }
  return email.substring(0, 2).toUpperCase();
};

function DashboardContent() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'today' | 'week' | 'month'>('month');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>(defaultStats);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [incomeLogs, setIncomeLogs] = useState<IncomeLog[]>([]);
  const [expenseLogs, setExpenseLogs] = useState<ExpenseLog[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [user, setUser] = useState<{
    name: string;
    email: string;
    initials: string;
  } | null>(null);
  const [mounted, setMounted] = useState(false);
  const [notifications, setNotifications] = useState<Alert[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [firebaseReady, setFirebaseReady] = useState(false);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

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
        setFirebaseReady(true);
      }
    };
    
    loadFirebase();
  }, []);

  useEffect(() => {
    setMounted(true);
    if (!firebaseReady) return;
    
    const unsubscribe = onAuthStateChanged(auth, async (user: any) => {
      if (!user) {
        router.push('/auth/login');
        return;
      }
      
      const userName = user.displayName || 'Admin';
      const userEmail = user.email || 'admin@munyirilegacy.com';
      setUser({
        name: userName,
        email: userEmail,
        initials: getInitials(userName, userEmail)
      });
      
      await loadDashboardData();
    });

    return () => unsubscribe();
  }, [firebaseReady, router]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      const user = auth?.currentUser;
      if (!user) {
        router.push('/auth/login');
        return;
      }
      
      const token = await user.getIdToken();
      
      const [
        statsResponse,
        vehiclesResponse,
        driversResponse,
        incomeResponse,
        expenseResponse,
        alertsResponse
      ] = await Promise.all([
        fetch('/api/admin/stats', {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch('/api/admin/vehicles', {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch('/api/admin/drivers', {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch('/api/admin/income?limit=5', {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch('/api/admin/expenses?limit=5', {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch('/api/admin/alerts', {
          headers: { 'Authorization': `Bearer ${token}` },
        })
      ]);

      if (statsResponse.status === 401 || vehiclesResponse.status === 401 || driversResponse.status === 401) {
        router.push('/auth/login');
        return;
      }

      const [statsData, vehiclesData, driversData, incomeData, expenseData, alertsData] = await Promise.all([
        statsResponse.ok ? statsResponse.json() : Promise.resolve(null),
        vehiclesResponse.ok ? vehiclesResponse.json() : Promise.resolve({ items: [] }),
        driversResponse.ok ? driversResponse.json() : Promise.resolve({ items: [] }),
        incomeResponse.ok ? incomeResponse.json() : Promise.resolve({ items: [] }),
        expenseResponse.ok ? expenseResponse.json() : Promise.resolve({ items: [] }),
        alertsResponse.ok ? alertsResponse.json() : Promise.resolve({ items: [] })
      ]);

      // Handle stats data
      if (statsData) {
        const statsObj = statsData.stats || statsData;
        setStats({
          incomeToday: statsObj.income?.today || statsData.incomeToday || 0,
          incomeWeek: statsObj.income?.week || statsData.incomeWeek || 0,
          incomeMonth: statsObj.income?.month || statsData.incomeMonth || 0,
          expensesToday: statsObj.expenses?.today || statsData.expensesToday || 0,
          expensesWeek: statsObj.expenses?.week || statsData.expensesWeek || 0,
          expensesMonth: statsObj.expenses?.month || statsData.expensesMonth || 0,
          netProfit: statsObj.profit?.month || statsData.netProfit || 0,
          activeVehicles: statsObj.vehicles?.active || statsData.activeVehicles || 0,
          maintenanceVehicles: statsObj.vehicles?.maintenance || statsData.maintenanceVehicles || 0,
          totalVehicles: statsObj.vehicles?.total || statsData.totalVehicles || 0,
          activeDrivers: statsObj.users?.activeDrivers || statsData.activeDrivers || 0,
          totalDrivers: statsObj.users?.drivers || statsData.totalDrivers || 0,
          pendingAlerts: statsObj.alerts?.active || statsData.pendingAlerts || 0
        });
      }
      
      // Handle vehicles data
      let vehiclesArray: Vehicle[] = [];
      if (vehiclesData) {
        if (Array.isArray(vehiclesData)) {
          vehiclesArray = vehiclesData;
        } else if (vehiclesData.items && Array.isArray(vehiclesData.items)) {
          vehiclesArray = vehiclesData.items;
        } else if (vehiclesData.vehicles && Array.isArray(vehiclesData.vehicles)) {
          vehiclesArray = vehiclesData.vehicles;
        }
      }
      
      // Fetch images for each vehicle from the upload API
      const vehiclesWithImages = await Promise.all(
        vehiclesArray.map(async (vehicle) => {
          try {
            console.log(`Fetching images for vehicle ${vehicle.id} (${vehicle.plateNumber})`);
            const imagesResponse = await fetch(`/api/upload?entityType=vehicle&entityId=${vehicle.id}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (imagesResponse.ok) {
              const imagesData = await imagesResponse.json();
              console.log(`📸 Vehicle ${vehicle.plateNumber} has ${imagesData.images?.length || 0} images`);
              if (imagesData.images && imagesData.images.length > 0) {
                const firstImage = imagesData.images[0];
                console.log(`  First image URL type: ${firstImage.url?.substring(0, 50)}...`);
                console.log(`  Is primary: ${firstImage.isPrimary}`);
              }
              return { 
                ...vehicle, 
                images: imagesData.images || [],
                mainImage: null // Clear any old mainImage to use images array
              };
            } else {
              console.error(`Failed to fetch images for vehicle ${vehicle.id}: ${imagesResponse.status}`);
              return { 
                ...vehicle, 
                images: [],
                mainImage: null
              };
            }
          } catch (error) {
            console.error(`Error fetching images for vehicle ${vehicle.id}:`, error);
            return { 
              ...vehicle, 
              images: [],
              mainImage: null
            };
          }
        })
      );
      
      setVehicles(vehiclesWithImages);
      
      // Handle drivers data
      let driversArray: Driver[] = [];
      if (driversData) {
        if (Array.isArray(driversData)) {
          driversArray = driversData;
        } else if (driversData.items && Array.isArray(driversData.items)) {
          driversArray = driversData.items;
        } else if (driversData.drivers && Array.isArray(driversData.drivers)) {
          driversArray = driversData.drivers;
        }
      }
      setDrivers(driversArray);
      
      // Handle income logs
      let incomeArray: IncomeLog[] = [];
      if (incomeData) {
        if (Array.isArray(incomeData)) {
          incomeArray = incomeData;
        } else if (incomeData.items && Array.isArray(incomeData.items)) {
          incomeArray = incomeData.items;
        }
      }
      setIncomeLogs(incomeArray);
      
      // Handle expense logs
      let expenseArray: ExpenseLog[] = [];
      if (expenseData) {
        if (Array.isArray(expenseData)) {
          expenseArray = expenseData;
        } else if (expenseData.items && Array.isArray(expenseData.items)) {
          expenseArray = expenseData.items;
        }
      }
      setExpenseLogs(expenseArray);
      
      // Handle alerts
      let alertsArray: Alert[] = [];
      if (alertsData) {
        if (Array.isArray(alertsData)) {
          alertsArray = alertsData;
        } else if (alertsData.items && Array.isArray(alertsData.items)) {
          alertsArray = alertsData.items;
        } else if (alertsData.alerts && Array.isArray(alertsData.alerts)) {
          alertsArray = alertsData.alerts;
        }
      }
      setAlerts(alertsArray);
      setNotifications(alertsArray);
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setStats(defaultStats);
      setVehicles([]);
      setDrivers([]);
      setIncomeLogs([]);
      setExpenseLogs([]);
      setAlerts([]);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
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

  const handleAddVehicle = () => {
    router.push('/dashboards/admin/vehicles/add-vehicle');
  };

  const handleAddDriver = () => {
    router.push('/dashboards/admin/admit-driver');
  };

  const handleLogIncome = () => {
    router.push('/dashboards/admin/income/add');
  };

  const handleLogExpense = () => {
    router.push('/dashboards/admin/expenses/add');
  };

  const vehiclesNeedingService = vehicles.filter(v => {
    if (!v.nextService) return false;
    const daysUntilService = Math.ceil((new Date(v.nextService).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
    return daysUntilService <= 7 && daysUntilService >= 0;
  });

  const getVehiclePrimaryImage = (vehicle: Vehicle): string | null => {
    // Debug: Log what we have
    console.log(`Getting image for vehicle ${vehicle.plateNumber}:`, {
      hasImages: !!vehicle.images,
      imagesCount: vehicle.images?.length || 0,
      hasMainImage: !!vehicle.mainImage
    });

    // First check if we have images from the API (vehicle.images array)
    if (vehicle.images && vehicle.images.length > 0) {
      const primaryImage = vehicle.images.find(img => img.isPrimary);
      const imageUrl = primaryImage?.url || vehicle.images[0]?.url;
      if (imageUrl) {
        // Validate that it's a proper image URL (starts with data:image or http)
        if (imageUrl.startsWith('data:image') || imageUrl.startsWith('http')) {
          console.log(`✅ Using API image for ${vehicle.plateNumber}`);
          return imageUrl;
        } else {
          console.warn(`⚠️ Invalid image URL format for ${vehicle.plateNumber}:`, imageUrl.substring(0, 100));
        }
      }
    }
    
    // Check if there's a mainImage that looks like base64 (starts with data:image)
    if (vehicle.mainImage && vehicle.mainImage.startsWith('data:image')) {
      console.log(`✅ Using base64 mainImage for ${vehicle.plateNumber}`);
      return vehicle.mainImage;
    }
    
    console.log(`❌ No valid image found for ${vehicle.plateNumber}`);
    return null;
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

  if (!mounted) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-yellow-400/20 border-t-yellow-400 rounded-full animate-spin mx-auto mb-4"></div>
            <Car className="w-8 h-8 text-yellow-400 absolute top-6 left-1/2 -translate-x-1/2 animate-pulse" />
          </div>
          <p className="text-gray-400">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-gray-100 font-sans overflow-x-hidden">
      {/* Animated background */}
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
        
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-yellow-500/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl animate-pulse animation-delay-2000"></div>
      </div>
      
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 z-50 h-full w-72 
        bg-slate-900/95 backdrop-blur-xl border-r border-yellow-500/20
        transform transition-transform duration-300 ease-in-out
        lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-400"></div>
        
        <div className="flex flex-col h-full">
          {/* Logo Area */}
          <div className="p-6 border-b border-yellow-500/20">
            <div className="flex items-center gap-3">
              <div className="relative w-12 h-12 flex-shrink-0">
                {!logoError ? (
                  <Image
                    src="/logo.png"
                    alt="MLI Fleet Logo"
                    fill
                    className="object-contain rounded-xl"
                    onError={() => setLogoError(true)}
                  />
                ) : (
                  <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-xl flex items-center justify-center shadow-lg shadow-yellow-500/20">
                    <Car className="w-6 h-6 text-black" />
                  </div>
                )}
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">
                  <span className="text-yellow-400">MLI</span>
                  <span className="text-gray-300"> Fleet</span>
                </h1>
                <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                  <Navigation2 className="w-3 h-3 text-yellow-400" />
                  Command Center
                </p>
              </div>
            </div>
            
            <div className="mt-4 flex items-center gap-2">
              <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
              <span className="text-xs text-gray-500">Production · Live Data</span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-6 px-4">
            <div className="space-y-1">
              {menuItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all group ${
                    item.active 
                      ? 'bg-gradient-to-r from-yellow-500/20 to-amber-600/10 text-yellow-400 border border-yellow-500/30' 
                      : 'text-gray-400 hover:text-yellow-400 hover:bg-yellow-500/5'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="w-5 h-5" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </div>
                </Link>
              ))}
            </div>
          </nav>

          {/* User Profile */}
          {user && (
            <div className="p-4 border-t border-yellow-500/20">
              <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-slate-800/50 to-slate-800/30 rounded-xl border border-yellow-500/10">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center text-black font-bold text-sm">
                  {user.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user.name}</p>
                  <p className="text-xs text-gray-500 truncate">{user.email}</p>
                </div>
                <button 
                  onClick={handleLogout}
                  className="p-2 hover:bg-slate-700 rounded-lg transition flex-shrink-0"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:pl-72 min-h-screen relative z-10">
        {/* Top Navigation */}
        <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-xl border-b border-yellow-500/20">
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 hover:bg-slate-800 rounded-xl lg:hidden border border-yellow-500/20"
              >
                <Menu className="w-5 h-5" />
              </button>
              
              {/* Logo in header for mobile */}
              <div className="flex items-center gap-2 lg:hidden">
                {!logoError ? (
                  <div className="relative w-8 h-8">
                    <Image
                      src="/logo.png"
                      alt="Logo"
                      fill
                      className="object-contain"
                      onError={() => setLogoError(true)}
                    />
                  </div>
                ) : (
                  <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-lg flex items-center justify-center">
                    <Car className="w-4 h-4 text-black" />
                  </div>
                )}
                <span className="text-sm font-semibold text-yellow-400">MLI Fleet</span>
              </div>
              
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search vehicles, drivers, transactions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-64 lg:w-96 bg-slate-800/50 border border-yellow-500/20 rounded-xl py-2 pl-10 pr-4 text-sm text-gray-300 placeholder-gray-500 focus:outline-none focus:border-yellow-400/50 focus:ring-1 focus:ring-yellow-400/20 transition"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-1 p-1 bg-slate-800/50 border border-yellow-500/20 rounded-xl">
                {(['today', 'week', 'month'] as const).map((tf) => (
                  <button
                    key={tf}
                    onClick={() => setSelectedTimeframe(tf)}
                    className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-medium transition ${
                      selectedTimeframe === tf
                        ? 'bg-gradient-to-r from-yellow-400 to-amber-500 text-black'
                        : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    {tf.charAt(0).toUpperCase() + tf.slice(1)}
                  </button>
                ))}
              </div>

              <div className="relative">
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 hover:bg-slate-800 rounded-xl border border-yellow-500/20"
                >
                  <Bell className="w-5 h-5" />
                  {notifications.length > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-slate-900 animate-pulse"></span>
                  )}
                </button>
                
                {showNotifications && (
                  <div className="absolute right-0 top-12 w-80 bg-slate-900 border border-yellow-500/30 rounded-2xl shadow-2xl z-50 overflow-hidden">
                    <div className="p-4 border-b border-yellow-500/20">
                      <h3 className="font-semibold">Notifications</h3>
                      <p className="text-xs text-gray-500">You have {notifications.length} unread alerts</p>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.slice(0, 5).map((alert) => (
                        <div key={alert.id} className="p-4 border-b border-yellow-500/10 hover:bg-yellow-500/5 transition cursor-pointer">
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-lg ${
                              alert.severity === 'high' ? 'bg-rose-500/20' : 
                              alert.severity === 'medium' ? 'bg-amber-500/20' : 'bg-blue-500/20'
                            }`}>
                              {alert.type === 'insurance' && <Shield className="w-4 h-4 text-rose-400" />}
                              {alert.type === 'maintenance' && <Wrench className="w-4 h-4 text-amber-400" />}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium">{alert.vehicle_reg}</p>
                              <p className="text-xs text-gray-400 mt-1">{alert.description}</p>
                              <p className="text-[10px] text-gray-500 mt-1">Due: {new Date(alert.due_date).toLocaleDateString()}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <button className="w-full p-3 text-center text-sm text-yellow-400 hover:bg-yellow-500/10 transition">
                      View All Notifications
                    </button>
                  </div>
                )}
              </div>

              <button className="hidden sm:block p-2 hover:bg-slate-800 rounded-xl border border-yellow-500/20">
                <Filter className="w-5 h-5" />
              </button>

              {user && (
                <div className="hidden lg:flex items-center gap-2 pl-2 border-l border-yellow-500/20">
                  <div className="text-right">
                    <p className="text-xs text-gray-400">Signed in as</p>
                    <p className="text-sm font-medium text-yellow-400 truncate max-w-[150px]">{user.email}</p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center text-black font-bold text-xs">
                    {user.initials}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="p-4 sm:p-6 space-y-6">
          {/* Welcome Section */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                Welcome back, {user?.name || 'Admin'}! 
                <span className="text-yellow-400 ml-2">👋</span>
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-1 flex items-center gap-2">
                <Radio className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-400" />
                Real-time operational overview
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs sm:text-sm bg-slate-800/50 px-3 py-1.5 rounded-full border border-yellow-500/20 self-start sm:self-auto">
              <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-400" />
              <span className="text-gray-400">Last updated: {new Date().toLocaleTimeString()}</span>
            </div>
          </div>

          {/* Main Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Vehicles Card */}
            <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm border-2 border-yellow-400/40 rounded-2xl p-5 hover:shadow-xl hover:shadow-yellow-500/10 transition-all group">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-400 font-medium">Fleet Status</span>
                <div className="p-2 bg-yellow-500/20 rounded-xl group-hover:scale-110 transition">
                  <Car className="w-5 h-5 text-yellow-400" />
                </div>
              </div>
              <div className="flex items-baseline gap-2 mb-2">
                <p className="text-3xl font-bold text-white">{safeToString(stats.totalVehicles)}</p>
                <span className="text-sm text-gray-500">Total Vehicles</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-green-400 flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  Active: {safeToString(stats.activeVehicles)}
                </span>
                <span className="text-amber-400 flex items-center gap-1">
                  <div className="w-2 h-2 bg-amber-400 rounded-full"></div>
                  Maint: {safeToString(stats.maintenanceVehicles)}
                </span>
              </div>
              <div className="mt-3 h-1.5 w-full bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full transition-all"
                  style={{ width: `${(stats.activeVehicles / (stats.totalVehicles || 1)) * 100}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {Math.round((stats.activeVehicles / (stats.totalVehicles || 1)) * 100)}% fleet utilization
              </p>
            </div>

            {/* Drivers Card */}
            <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm border-2 border-blue-400/40 rounded-2xl p-5 hover:shadow-xl hover:shadow-blue-500/10 transition-all group">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-400 font-medium">Driver Team</span>
                <div className="p-2 bg-blue-500/20 rounded-xl group-hover:scale-110 transition">
                  <Users className="w-5 h-5 text-blue-400" />
                </div>
              </div>
              <div className="flex items-baseline gap-2 mb-2">
                <p className="text-3xl font-bold text-white">{safeToString(stats.totalDrivers)}</p>
                <span className="text-sm text-gray-500">Total Drivers</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-green-400 flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  Active: {safeToString(stats.activeDrivers)}
                </span>
                <span className="text-gray-400">
                  {Math.round((stats.activeDrivers / (stats.totalDrivers || 1)) * 100)}% active
                </span>
              </div>
              <div className="mt-3 h-1.5 w-full bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full transition-all"
                  style={{ width: `${(stats.activeDrivers / (stats.totalDrivers || 1)) * 100}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Driver-to-vehicle ratio: {stats.totalDrivers > 0 ? (stats.totalVehicles / stats.totalDrivers).toFixed(1) : '0'} vehicles/driver
              </p>
            </div>

            {/* Income Card */}
            <div className="bg-slate-800/50 backdrop-blur-sm border border-yellow-500/20 rounded-2xl p-5 hover:border-yellow-400/50 transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Monthly Income</span>
                <TrendingUp className="w-4 h-4 text-green-400" />
              </div>
              <p className="text-2xl font-bold">{formatCurrency(stats.incomeMonth)}</p>
              <p className="text-xs text-gray-500 mt-2">+15.7% from last month</p>
              <div className="mt-3 pt-3 border-t border-yellow-500/10">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Today: {formatCurrency(stats.incomeToday)}</span>
                  <span className="text-gray-500">Week: {formatCurrency(stats.incomeWeek)}</span>
                </div>
              </div>
            </div>

            {/* Net Profit Card */}
            <div className="bg-slate-800/50 backdrop-blur-sm border border-yellow-500/20 rounded-2xl p-5 hover:border-yellow-400/50 transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Net Profit</span>
                <CircleDollarSign className="w-4 h-4 text-yellow-400" />
              </div>
              <p className="text-2xl font-bold text-yellow-400">{formatCurrency(stats.netProfit)}</p>
              <p className="text-xs text-gray-500 mt-2">After expenses</p>
              <div className="mt-3 pt-3 border-t border-yellow-500/10">
                <div className="flex justify-between text-xs">
                  <span className="text-rose-400">Expenses: {formatCurrency(stats.expensesMonth)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard 
              label="Pending Alerts"
              value={safeToString(stats.pendingAlerts)}
              icon={AlertTriangle}
              color="amber"
            />
            <StatCard 
              label="Active Vehicles"
              value={safeToString(stats.activeVehicles)}
              icon={Car}
              color="green"
            />
            <StatCard 
              label="Active Drivers"
              value={safeToString(stats.activeDrivers)}
              icon={UserCheck}
              color="blue"
            />
            <StatCard 
              label="Maintenance"
              value={safeToString(stats.maintenanceVehicles)}
              icon={Wrench}
              color="orange"
            />
          </div>

          {/* Vehicles Needing Service Banner */}
          {vehiclesNeedingService.length > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/20 rounded-xl">
                  <Wrench className="w-5 h-5 text-amber-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-amber-400">Vehicles Due for Service</p>
                  <p className="text-xs text-gray-400">
                    {vehiclesNeedingService.length} vehicle(s) require maintenance within the next 7 days
                  </p>
                </div>
                <Link href="/dashboards/admin/vehicles?filter=service" className="text-xs text-amber-400 hover:text-amber-300">
                  View Details →
                </Link>
              </div>
            </div>
          )}

          {/* Vehicles Table with Images */}
          <div className="bg-slate-800/50 backdrop-blur-sm border border-yellow-500/20 rounded-2xl overflow-hidden">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 sm:p-6 border-b border-yellow-500/20">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Truck className="w-5 h-5 text-yellow-400" />
                Fleet Overview ({vehicles.length} vehicles)
              </h3>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button 
                  onClick={handleAddVehicle}
                  className="flex-1 sm:flex-none px-4 py-2 bg-gradient-to-r from-yellow-400 to-amber-500 text-black rounded-xl text-sm font-medium hover:from-yellow-300 hover:to-amber-400 transition flex items-center justify-center gap-2"
                >
                  <PlusCircle className="w-4 h-4" />
                  Add Vehicle
                </button>
                <button className="p-2 hover:bg-slate-700 rounded-lg border border-yellow-500/20">
                  <Download className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-6">
              {vehicles.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px]">
                    <thead>
                      <tr className="border-b border-yellow-500/20">
                        <th className="text-left py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Image</th>
                        <th className="text-left py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Plate Number</th>
                        <th className="text-left py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Model</th>
                        <th className="text-left py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Driver</th>
                        <th className="text-left py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                        <th className="text-left py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Next Service</th>
                        <th className="text-center py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-yellow-500/10">
                      {vehicles.slice(0, 5).map((vehicle) => {
                        const primaryImage = getVehiclePrimaryImage(vehicle);
                        return (
                          <tr key={vehicle.id} className="hover:bg-yellow-500/5 transition-colors">
                            <td className="py-3">
                              {primaryImage ? (
                                <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-slate-700">
                                  <img
                                    src={primaryImage}
                                    alt={vehicle.plateNumber || 'Vehicle'}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      console.error(`Failed to load image for vehicle ${vehicle.plateNumber}`);
                                      console.error(`Image URL: ${primaryImage.substring(0, 100)}...`);
                                      e.currentTarget.style.display = 'none';
                                      // Show fallback
                                      const parent = e.currentTarget.parentElement;
                                      if (parent) {
                                        const fallback = document.createElement('div');
                                        fallback.className = 'w-full h-full flex items-center justify-center';
                                        fallback.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-gray-500"><rect x="2" y="5" width="20" height="14" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>';
                                        parent.appendChild(fallback);
                                        e.currentTarget.remove();
                                      }
                                    }}
                                  />
                                </div>
                              ) : (
                                <div className="w-12 h-12 rounded-lg bg-slate-700 flex items-center justify-center">
                                  <ImageIcon className="w-6 h-6 text-gray-500" />
                                </div>
                              )}
                             </td>
                            <td className="py-3 font-medium">{vehicle.plateNumber || 'N/A'}</td>
                            <td className="py-3 text-gray-400">{vehicle.model || 'N/A'}</td>
                            <td className="py-3 text-gray-400">{vehicle.driver?.user?.name || 'Unassigned'}</td>
                            <td className="py-3">
                              <StatusBadge status={vehicle.status || 'INACTIVE'} />
                             </td>
                            <td className="py-3">
                              <span className={`text-xs ${getServiceStatus(vehicle.nextService)}`}>
                                {vehicle.nextService ? new Date(vehicle.nextService).toLocaleDateString() : 'Not set'}
                              </span>
                             </td>
                            <td className="py-3">
                              <div className="flex items-center justify-center gap-2">
                                <button 
                                  onClick={() => router.push(`/dashboards/admin/vehicles/${vehicle.id}`)}
                                  className="p-1 hover:bg-slate-700 rounded-lg transition"
                                >
                                  <Eye className="w-4 h-4 text-gray-400" />
                                </button>
                                <button 
                                  onClick={() => router.push(`/dashboards/admin/vehicles/${vehicle.id}/edit`)}
                                  className="p-1 hover:bg-slate-700 rounded-lg transition"
                                >
                                  <Edit className="w-4 h-4 text-gray-400" />
                                </button>
                              </div>
                             </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Car className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-500">No vehicles found</p>
                  <button 
                    onClick={handleAddVehicle}
                    className="mt-3 text-sm text-yellow-400 hover:text-yellow-300"
                  >
                    Add your first vehicle
                  </button>
                </div>
              )}
              
              {vehicles.length > 5 && (
                <div className="mt-4 text-center">
                  <Link href="/dashboards/admin/vehicles" className="text-sm text-yellow-400 hover:text-yellow-300">
                    View all {vehicles.length} vehicles →
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Drivers Table */}
          <div className="bg-slate-800/50 backdrop-blur-sm border border-yellow-500/20 rounded-2xl overflow-hidden">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 sm:p-6 border-b border-yellow-500/20">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Users className="w-5 h-5 text-yellow-400" />
                Driver Performance ({drivers.length} drivers)
              </h3>
              <button 
                onClick={handleAddDriver}
                className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-yellow-400 to-amber-500 text-black rounded-xl text-sm font-medium hover:from-yellow-300 hover:to-amber-400 transition flex items-center justify-center gap-2"
              >
                <PlusCircle className="w-4 h-4" />
                Add Driver
              </button>
            </div>

            <div className="p-4 sm:p-6">
              {drivers.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[700px]">
                    <thead>
                      <tr className="border-b border-yellow-500/20">
                        <th className="text-left py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Driver</th>
                        <th className="text-left py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Vehicle</th>
                        <th className="text-right py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Trips</th>
                        <th className="text-right py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Revenue</th>
                        <th className="text-left py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                        <th className="text-left py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Rating</th>
                        <th className="text-center py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-yellow-500/10">
                      {drivers.slice(0, 5).map((driver) => (
                        <tr key={driver.id} className="hover:bg-yellow-500/5 transition-colors">
                          <td className="py-3">
                            <div>
                              <span className="font-medium text-sm">{driver.name || 'N/A'}</span>
                              <p className="text-xs text-gray-500 truncate max-w-[150px]">{driver.email || 'N/A'}</p>
                            </div>
                           </td>
                          <td className="py-3 text-sm text-gray-400">{driver.assignedVehicle?.plateNumber || 'Unassigned'}</td>
                          <td className="py-3 text-right text-sm font-medium">{(driver.tripsCompleted || 0).toLocaleString()}</td>
                          <td className="py-3 text-right text-sm text-yellow-400">{formatCurrency(driver.totalRevenue || 0)}</td>
                          <td className="py-3">
                            <DriverStatusBadge status={driver.status || 'OFF_DUTY'} />
                           </td>
                          <td className="py-3">
                            <div className="flex items-center gap-1">
                              <Award className="w-3 h-3 text-yellow-400" />
                              <span className="text-sm">{(driver.rating || 0).toFixed(1)}</span>
                            </div>
                           </td>
                          <td className="py-3">
                            <div className="flex items-center justify-center gap-2">
                              <button 
                                onClick={() => router.push(`/dashboards/admin/drivers/${driver.id}`)}
                                className="p-1 hover:bg-slate-700 rounded-lg transition"
                              >
                                <Eye className="w-4 h-4 text-gray-400" />
                              </button>
                              <button 
                                onClick={() => router.push(`/dashboards/admin/drivers/${driver.id}/edit`)}
                                className="p-1 hover:bg-slate-700 rounded-lg transition"
                              >
                                <Edit className="w-4 h-4 text-gray-400" />
                              </button>
                            </div>
                           </td>
                         </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-500">No drivers found</p>
                  <button 
                    onClick={handleAddDriver}
                    className="mt-3 text-sm text-yellow-400 hover:text-yellow-300"
                  >
                    Add your first driver
                  </button>
                </div>
              )}
              
              {drivers.length > 5 && (
                <div className="mt-4 text-center">
                  <Link href="/dashboards/admin/drivers" className="text-sm text-yellow-400 hover:text-yellow-300">
                    View all {drivers.length} drivers →
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions Panel */}
          <div className="bg-slate-800/50 backdrop-blur-sm border border-yellow-500/20 rounded-2xl p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-400" />
              Quick Actions
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <QuickActionButton
                icon={PlusCircle}
                label="Add Vehicle"
                color="yellow"
                onClick={handleAddVehicle}
              />
              <QuickActionButton
                icon={UserPlus}
                label="Add Driver"
                color="blue"
                onClick={handleAddDriver}
              />
              <QuickActionButton
                icon={DollarSign}
                label="Log Income"
                color="yellow"
                onClick={handleLogIncome}
              />
              <QuickActionButton
                icon={CreditCard}
                label="Log Expense"
                color="rose"
                onClick={handleLogExpense}
              />
            </div>
          </div>
        </div>
      </main>

      <style jsx>{`
        @keyframes moveRoad {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
      `}</style>
    </div>
  );
}

function DashboardFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-yellow-400/20 border-t-yellow-400 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-400">Loading...</p>
      </div>
    </div>
  );
}

// Helper Components
interface StatCardProps {
  label: string;
  value: string;
  icon: React.ElementType;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon: Icon, color }) => {
  const colorClasses: Record<string, string> = {
    amber: "text-amber-400 bg-amber-500/10 border-amber-500/30",
    green: "text-green-400 bg-green-500/10 border-green-500/30",
    blue: "text-blue-400 bg-blue-500/10 border-blue-500/30",
    orange: "text-orange-400 bg-orange-500/10 border-orange-500/30",
  };

  return (
    <div className={`bg-slate-800/50 backdrop-blur-sm border rounded-xl p-4 ${colorClasses[color]?.split(' ')[2] || 'border-yellow-500/30'}`}>
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-400">{label}</span>
        <Icon className={`w-4 h-4 ${colorClasses[color]?.split(' ')[0] || 'text-yellow-400'}`} />
      </div>
      <p className="text-2xl font-bold mt-2">{value}</p>
    </div>
  );
};

const StatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, string> = {
    ACTIVE: "bg-green-500/20 text-green-400 border border-green-500/30",
    MAINTENANCE: "bg-amber-500/20 text-amber-400 border border-amber-500/30",
    INACTIVE: "bg-rose-500/20 text-rose-400 border border-rose-500/30",
    OUT_OF_SERVICE: "bg-red-500/20 text-red-400 border border-red-500/30"
  };
  
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.INACTIVE}`}>
      {status?.replace(/_/g, ' ') || 'Unknown'}
    </span>
  );
};

const DriverStatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, string> = {
    ACTIVE: "bg-green-500/20 text-green-400 border border-green-500/30",
    OFF_DUTY: "bg-gray-500/20 text-gray-400 border border-gray-500/30",
    ON_LEAVE: "bg-amber-500/20 text-amber-400 border border-amber-500/30",
    SUSPENDED: "bg-rose-500/20 text-rose-400 border border-rose-500/30",
    TERMINATED: "bg-red-500/20 text-red-400 border border-red-500/30"
  };
  
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.OFF_DUTY}`}>
      {status?.replace(/_/g, ' ') || 'Unknown'}
    </span>
  );
};

const getServiceStatus = (nextService?: string): string => {
  if (!nextService) return "text-gray-500";
  const daysUntil = Math.ceil((new Date(nextService).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
  if (daysUntil <= 0) return "text-red-400";
  if (daysUntil <= 7) return "text-amber-400";
  return "text-gray-400";
};

interface QuickActionButtonProps {
  icon: React.ElementType;
  label: string;
  color: string;
  onClick: () => void;
}

const QuickActionButton: React.FC<QuickActionButtonProps> = ({ icon: Icon, label, color, onClick }) => {
  const colorClasses: Record<string, string> = {
    yellow: "from-yellow-500/10 to-amber-600/5 border-yellow-500/20 text-yellow-400 hover:from-yellow-500/20 hover:to-amber-600/10",
    blue: "from-blue-500/10 to-blue-600/5 border-blue-500/20 text-blue-400 hover:from-blue-500/20 hover:to-blue-600/10",
    rose: "from-rose-500/10 to-rose-600/5 border-rose-500/20 text-rose-400 hover:from-rose-500/20 hover:to-rose-600/10",
    purple: "from-purple-500/10 to-purple-600/5 border-purple-500/20 text-purple-400 hover:from-purple-500/20 hover:to-purple-600/10",
  };

  return (
    <button
      onClick={onClick}
      className={`p-3 sm:p-4 bg-gradient-to-br ${colorClasses[color]} rounded-xl hover:shadow-lg transition-all group border`}
    >
      <Icon className={`w-4 h-4 sm:w-5 sm:h-5 mx-auto mb-1 sm:mb-2 group-hover:scale-110 transition`} />
      <span className="text-[10px] sm:text-xs font-medium">{label}</span>
    </button>
  );
};

export default function AdminDashboard() {
  return (
    <Suspense fallback={<DashboardFallback />}>
      <DashboardContent />
    </Suspense>
  );
}