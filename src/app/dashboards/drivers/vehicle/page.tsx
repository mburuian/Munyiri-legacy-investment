"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  // Navigation icons
  Home,
  Car,
  ClipboardList,
  Receipt,
  Bell,
  LogOut,
  Menu,
  ChevronRight,
  ArrowLeft,
  
  // Vehicle icons
  Gauge,
  Fuel,
  Wrench,
  Calendar,
  Clock,
  Shield,
  FileText,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Download,
  Upload,
  Camera,
  MapPin,
  Phone,
  Mail,
  User,
  Building2,
  CreditCard,
  CalendarDays,
  Settings,
  
  // Status icons
  Activity,
  Sparkles,
  UserCircle,
  Radio,
  Timer,
  Navigation2,
  Award,
  Zap,
  AlertCircle,
  
  // Document icons
  FileCheck,
  FileWarning,
  FileClock,
  FileX,
  
  // Maintenance icons
  Wrench as Tool,
  Droplets,
  Braces,
  Battery,
  Fan,
  Thermometer,
  
  // Action icons
  PlusCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  RotateCw,
  
  // Additional icons
  CalendarCheck,
  AlertOctagon,
  Info,
  MoreVertical,
  Eye,
  EyeOff
} from "lucide-react";
import { auth } from '../../../../lib/firebase/config';

// Types
interface Vehicle {
  id: string;
  plateNumber: string;
  model: string;
  capacity: number;
  status: 'active' | 'inactive' | 'maintenance' | 'out_of_service';
  fuelLevel: number;
  odometer: number;
  nextService: string;
  insuranceExpiry: string;
  lastService?: string;
  year?: number;
  color?: string;
  vin?: string;
  engineNumber?: string;
  fuelType?: 'petrol' | 'diesel' | 'electric' | 'hybrid';
  transmission?: 'manual' | 'automatic';
}

interface Document {
  id: string;
  type: 'INSURANCE' | 'LOG_BOOK' | 'LICENSE' | 'INSPECTION' | 'PHOTO' | 'RECEIPT' | 'OTHER';
  name: string;
  fileUrl: string;
  uploadedAt: string;
  expiryDate?: string;
  status: 'valid' | 'expiring' | 'expired';
  notes?: string;
}

interface MaintenanceRecord {
  id: string;
  type: 'OIL_CHANGE' | 'TIRE_ROTATION' | 'BRAKE_REPLACEMENT' | 'ENGINE_SERVICE' | 'TRANSMISSION' | 'ELECTRICAL' | 'GENERAL_SERVICE' | 'INSPECTION' | 'ACCIDENT_REPAIR' | 'ROUTINE_MAINTENANCE' | 'OTHER';
  description: string;
  cost: number;
  date: string;
  completedAt?: string;
  odometer: number;
  performedBy?: string;
  nextDueDate?: string;
  nextDueKm?: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  notes?: string;
  garageName?: string;
  garageContact?: string;
  receipt?: string;
}

interface Alert {
  id: string;
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  description: string;
  dueDate?: string;
  resolved: boolean;
}

interface VehicleStats {
  totalDistance: number;
  averageFuelEfficiency: number;
  totalMaintenanceCost: number;
  lastServiceDate: string;
  lastServiceOdometer?: number;
  daysUntilNextService: number;
  kmUntilNextService: number;
  insuranceDaysLeft: number;
  totalTrips: number;
  totalEarnings: number;
  totalExpenses: number;
  nextServiceType?: string;
}

interface ApiResponse {
  vehicle: Vehicle;
  documents: Document[];
  maintenance: MaintenanceRecord[];
  alerts: Alert[];
  stats: VehicleStats;
}

export default function MyCarPage() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  // Data states
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceRecord[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [stats, setStats] = useState<VehicleStats | null>(null);
  
  // UI states
  const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'maintenance' | 'stats'>('overview');
  const [expandedSections, setExpandedSections] = useState({
    documents: true,
    maintenance: true,
    alerts: true,
    stats: true
  });
  const [showAllAlerts, setShowAllAlerts] = useState(false);

  useEffect(() => {
    loadVehicleData();
  }, []);

  const loadVehicleData = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    
    setError(null);
    
    try {
      const user = auth.currentUser;
      if (!user) {
        router.push('/auth/login');
        return;
      }

      const token = await user.getIdToken();
      const response = await fetch('/api/driver/vehicle', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/auth/login');
          return;
        }
        if (response.status === 404) {
          setError('No vehicle assigned to you yet');
          return;
        }
        throw new Error('Failed to load vehicle data');
      }
      
      const data: ApiResponse = await response.json();
      
      setVehicle(data.vehicle);
      setDocuments(data.documents || []);
      setMaintenance(data.maintenance || []);
      setAlerts(data.alerts || []);
      setStats(data.stats || null);
      
    } catch (error) {
      console.error('Error loading vehicle data:', error);
      setError('Failed to load vehicle data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const getStatusColor = (status: string) => {
    const colors = {
      active: 'text-green-400 bg-green-500/20 border-green-500/30',
      inactive: 'text-gray-400 bg-gray-500/20 border-gray-500/30',
      maintenance: 'text-amber-400 bg-amber-500/20 border-amber-500/30',
      out_of_service: 'text-rose-400 bg-rose-500/20 border-rose-500/30',
      pending: 'text-amber-400 bg-amber-500/20 border-amber-500/30',
      in_progress: 'text-blue-400 bg-blue-500/20 border-blue-500/30',
      completed: 'text-green-400 bg-green-500/20 border-green-500/30',
      cancelled: 'text-gray-400 bg-gray-500/20 border-gray-500/30',
      valid: 'text-green-400 bg-green-500/20 border-green-500/30',
      expiring: 'text-amber-400 bg-amber-500/20 border-amber-500/30',
      expired: 'text-rose-400 bg-rose-500/20 border-rose-500/30'
    };
    return colors[status as keyof typeof colors] || 'text-gray-400 bg-gray-500/20 border-gray-500/30';
  };

  const getSeverityIcon = (severity: string) => {
    switch(severity) {
      case 'CRITICAL': return <AlertOctagon className="w-4 h-4 text-rose-400" />;
      case 'HIGH': return <AlertTriangle className="w-4 h-4 text-orange-400" />;
      case 'MEDIUM': return <AlertCircle className="w-4 h-4 text-amber-400" />;
      default: return <Info className="w-4 h-4 text-blue-400" />;
    }
  };

  const getMaintenanceIcon = (type: string) => {
    const icons = {
      OIL_CHANGE: Droplets,
      TIRE_ROTATION: RotateCw,
      BRAKE_REPLACEMENT: Braces,
      ENGINE_SERVICE: Fan,
      TRANSMISSION: Settings,
      ELECTRICAL: Battery,
      GENERAL_SERVICE: Wrench,
      INSPECTION: FileCheck,
      ACCIDENT_REPAIR: Wrench,
      ROUTINE_MAINTENANCE: RefreshCw,
      OTHER: Wrench
    };
    return icons[type as keyof typeof icons] || Wrench;
  };

  const getDocumentIcon = (type: string) => {
    const icons = {
      INSURANCE: Shield,
      LOG_BOOK: FileText,
      LICENSE: FileCheck,
      INSPECTION: FileClock,
      PHOTO: Camera,
      RECEIPT: Receipt,
      OTHER: FileText
    };
    return icons[type as keyof typeof icons] || FileText;
  };

  const formatCurrency = (amount: number) => {
    return `KES ${amount.toLocaleString()}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return `${Math.abs(diffDays)} days ago`;
    } else if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Tomorrow';
    } else if (diffDays < 7) {
      return `In ${diffDays} days`;
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `In ${weeks} ${weeks === 1 ? 'week' : 'weeks'}`;
    } else {
      return formatDate(dateString);
    }
  };

  const getMaintenanceStatusBadge = (record: MaintenanceRecord) => {
    if (record.status === 'COMPLETED') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-[10px] font-medium">
          <CheckCircle className="w-3 h-3" />
          Completed
        </span>
      );
    } else if (record.status === 'PENDING') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-500/20 text-amber-400 rounded-full text-[10px] font-medium">
          <Clock className="w-3 h-3" />
          Pending
        </span>
      );
    } else if (record.status === 'IN_PROGRESS') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full text-[10px] font-medium">
          <Activity className="w-3 h-3" />
          In Progress
        </span>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 sm:w-20 sm:h-20 border-4 border-yellow-400/20 border-t-yellow-400 rounded-full animate-spin mx-auto mb-4"></div>
            <Car className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-400 absolute top-5 sm:top-6 left-1/2 -translate-x-1/2 animate-pulse" />
          </div>
          <p className="text-sm sm:text-base text-gray-400">Loading vehicle details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-8 h-8 sm:w-10 sm:h-10 text-rose-400" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-4">No Vehicle Assigned</h2>
          <p className="text-sm sm:text-base text-gray-400 mb-6">{error}</p>
          <Link
            href="/dashboards/drivers"
            className="px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-yellow-400 to-amber-500 text-black rounded-xl font-semibold hover:from-yellow-300 hover:to-amber-400 transition shadow-lg shadow-yellow-500/30 inline-flex items-center gap-2 text-sm sm:text-base"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        <div className="text-center">
          <Car className="w-12 h-12 sm:w-16 sm:h-16 text-gray-600 mx-auto mb-4" />
          <h2 className="text-lg sm:text-xl font-semibold text-white mb-2">No Vehicle Data</h2>
          <p className="text-sm sm:text-base text-gray-400 mb-6">Unable to load vehicle information</p>
          <button
            onClick={() => loadVehicleData()}
            className="px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-yellow-400 to-amber-500 text-black rounded-xl font-semibold hover:from-yellow-300 hover:to-amber-400 transition shadow-lg shadow-yellow-500/30 text-sm sm:text-base"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Filter and sort alerts
  const sortedAlerts = [...alerts].sort((a, b) => {
    const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    return (severityOrder[a.severity] || 4) - (severityOrder[b.severity] || 4);
  });

  const visibleAlerts = showAllAlerts ? sortedAlerts : sortedAlerts.slice(0, 3);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Header - More compact on mobile */}
      <header className="sticky top-0 z-30 bg-slate-900/80 backdrop-blur-xl border-b border-yellow-500/20">
        <div className="flex items-center justify-between px-3 sm:px-4 md:px-6 py-3 sm:py-4">
          <div className="flex items-center gap-2 sm:gap-4">
            <Link
              href="/dashboards/drivers"
              className="p-1.5 sm:p-2 hover:bg-slate-800 rounded-lg sm:rounded-xl border border-yellow-500/20"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </Link>
            <div>
              <h1 className="text-base sm:text-lg md:text-xl font-bold flex items-center gap-1 sm:gap-2">
                <Car className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" />
                My Vehicle
              </h1>
              <p className="text-xs text-gray-500">{vehicle.plateNumber} · {vehicle.model}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button 
              onClick={() => loadVehicleData(true)}
              disabled={refreshing}
              className="p-1.5 sm:p-2 hover:bg-slate-800 rounded-lg sm:rounded-xl border border-yellow-500/20 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center">
              <span className="text-xs sm:text-sm font-bold text-black">
                {auth.currentUser?.email?.charAt(0).toUpperCase() || 'D'}
              </span>
            </div>
          </div>
        </div>

        {/* Tabs - Scrollable on mobile */}
        <div className="px-3 sm:px-4 md:px-6 flex gap-1 sm:gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {(['overview', 'documents', 'maintenance', 'stats'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                activeTab === tab 
                  ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' 
                  : 'text-gray-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </header>

      {/* Main Content - Smaller padding on mobile */}
      <main className="p-3 sm:p-4 md:p-6 max-w-7xl mx-auto">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-4 sm:space-y-6">
            {/* Vehicle Header Card - More compact */}
            <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl sm:rounded-2xl border border-yellow-500/20 p-4 sm:p-6 overflow-hidden">
              <div className="absolute top-0 right-0 w-48 sm:w-64 h-48 sm:h-64 bg-yellow-500/10 rounded-full blur-3xl"></div>
              
              <div className="relative">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 bg-slate-700 rounded-xl sm:rounded-2xl flex items-center justify-center border-2 border-yellow-400/30">
                      <Car className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 text-yellow-400" />
                    </div>
                    <div>
                      <h2 className="text-lg sm:text-xl md:text-2xl font-bold">{vehicle.plateNumber}</h2>
                      <p className="text-xs sm:text-sm text-gray-400">{vehicle.model}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium border ${getStatusColor(vehicle.status)}`}>
                          {vehicle.status.replace('_', ' ').toUpperCase()}
                        </span>
                        {vehicle.year && (
                          <span className="text-xs text-gray-500">• {vehicle.year}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Quick Stats - Hidden on mobile, shown in grid below */}
                  <div className="hidden sm:flex gap-4">
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Total Trips</p>
                      <p className="text-lg font-bold text-blue-400">{stats?.totalTrips || 0}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Total Earnings</p>
                      <p className="text-lg font-bold text-green-400">{formatCurrency(stats?.totalEarnings || 0)}</p>
                    </div>
                  </div>
                </div>

                {/* Mobile Quick Stats */}
                <div className="flex sm:hidden justify-between mb-4 pb-3 border-b border-yellow-500/20">
                  <div>
                    <p className="text-xs text-gray-500">Total Trips</p>
                    <p className="text-base font-bold text-blue-400">{stats?.totalTrips || 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Total Earnings</p>
                    <p className="text-base font-bold text-green-400">{formatCurrency(stats?.totalEarnings || 0)}</p>
                  </div>
                </div>

                {/* Vehicle Specs Grid - 2 columns on mobile */}
                <div className="grid grid-cols-2 gap-2 sm:gap-4">
                  <div className="bg-slate-800/50 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-yellow-500/20">
                    <Gauge className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400 mb-1 sm:mb-2" />
                    <p className="text-[10px] sm:text-xs text-gray-500">Odometer</p>
                    <p className="text-sm sm:text-base font-semibold">{vehicle.odometer?.toLocaleString() || 0} km</p>
                  </div>
                  
                  <div className="bg-slate-800/50 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-yellow-500/20">
                    <Fuel className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400 mb-1 sm:mb-2" />
                    <p className="text-[10px] sm:text-xs text-gray-500">Fuel Level</p>
                    <p className="text-sm sm:text-base font-semibold">{vehicle.fuelLevel}%</p>
                    <div className="w-full h-1 bg-slate-700 rounded-full mt-1 sm:mt-2">
                      <div 
                        className="h-full bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full"
                        style={{ width: `${vehicle.fuelLevel}%` }}
                      />
                    </div>
                  </div>
                  
                  <div className="bg-slate-800/50 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-yellow-500/20">
                    <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400 mb-1 sm:mb-2" />
                    <p className="text-[10px] sm:text-xs text-gray-500">Next Service</p>
                    <p className="text-sm sm:text-base font-semibold">{vehicle.nextService}</p>
                    <p className="text-[10px] sm:text-xs text-amber-400 mt-1">{stats?.kmUntilNextService || 0} km left</p>
                  </div>
                  
                  <div className="bg-slate-800/50 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-yellow-500/20">
                    <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400 mb-1 sm:mb-2" />
                    <p className="text-[10px] sm:text-xs text-gray-500">Insurance</p>
                    <p className="text-sm sm:text-base font-semibold">{vehicle.insuranceExpiry}</p>
                    <p className="text-[10px] sm:text-xs text-amber-400 mt-1">{stats?.insuranceDaysLeft || 0} days left</p>
                  </div>
                </div>

                {/* Additional Vehicle Details - Compact */}
                {(vehicle.vin || vehicle.engineNumber || vehicle.color || vehicle.fuelType || vehicle.transmission) && (
                  <div className="mt-4 sm:mt-6 grid grid-cols-2 gap-2 sm:gap-4 pt-3 sm:pt-4 border-t border-yellow-500/20">
                    {vehicle.vin && (
                      <div>
                        <p className="text-[10px] sm:text-xs text-gray-500">VIN</p>
                        <p className="text-xs font-mono truncate">{vehicle.vin}</p>
                      </div>
                    )}
                    {vehicle.engineNumber && (
                      <div>
                        <p className="text-[10px] sm:text-xs text-gray-500">Engine</p>
                        <p className="text-xs font-mono truncate">{vehicle.engineNumber}</p>
                      </div>
                    )}
                    {vehicle.color && (
                      <div>
                        <p className="text-[10px] sm:text-xs text-gray-500">Color</p>
                        <p className="text-xs">{vehicle.color}</p>
                      </div>
                    )}
                    {vehicle.fuelType && (
                      <div>
                        <p className="text-[10px] sm:text-xs text-gray-500">Fuel</p>
                        <p className="text-xs capitalize">{vehicle.fuelType}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Active Alerts - Enhanced with maintenance alerts */}
            {alerts.length > 0 && (
              <div className="bg-slate-800/50 backdrop-blur-sm border border-yellow-500/20 rounded-xl sm:rounded-2xl p-4 sm:p-6">
                <div 
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => toggleSection('alerts')}
                >
                  <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
                    Active Alerts
                    <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded-full text-xs">
                      {alerts.length}
                    </span>
                  </h3>
                  {expandedSections.alerts ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>

                {expandedSections.alerts && (
                  <div className="mt-3 sm:mt-4 space-y-2 sm:space-y-3">
                    {visibleAlerts.map((alert) => (
                      <div 
                        key={alert.id} 
                        className={`p-3 sm:p-4 rounded-lg sm:rounded-xl border ${
                          alert.severity === 'CRITICAL' ? 'border-rose-500/30 bg-rose-500/10' :
                          alert.severity === 'HIGH' ? 'border-orange-500/30 bg-orange-500/10' :
                          alert.severity === 'MEDIUM' ? 'border-amber-500/30 bg-amber-500/10' :
                          'border-blue-500/30 bg-blue-500/10'
                        }`}
                      >
                        <div className="flex items-start gap-2 sm:gap-3">
                          {getSeverityIcon(alert.severity)}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-xs sm:text-sm font-medium">{alert.title}</p>
                              {alert.dueDate && (
                                <span className="text-[10px] sm:text-xs text-amber-400 whitespace-nowrap">
                                  {formatRelativeTime(alert.dueDate)}
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] sm:text-xs text-gray-400 mt-1 line-clamp-2">{alert.description}</p>
                            
                            {/* Maintenance specific info */}
                            {alert.type === 'MAINTENANCE' && stats?.nextServiceType && (
                              <div className="mt-2 flex items-center gap-2 text-[10px]">
                                <span className="text-gray-500">Service:</span>
                                <span className="text-amber-400">{stats.nextServiceType}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {alerts.length > 3 && (
                      <button
                        onClick={() => setShowAllAlerts(!showAllAlerts)}
                        className="mt-2 text-xs text-yellow-400 hover:text-yellow-300 flex items-center gap-1"
                      >
                        {showAllAlerts ? 'Show less' : `View all ${alerts.length} alerts`}
                        {showAllAlerts ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Maintenance Summary Card - New */}
            {maintenance.length > 0 && (
              <div className="bg-slate-800/50 backdrop-blur-sm border border-yellow-500/20 rounded-xl sm:rounded-2xl p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
                  <Wrench className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" />
                  Maintenance Summary
                </h3>
                
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div className="bg-slate-800/30 rounded-lg p-3">
                    <p className="text-[10px] sm:text-xs text-gray-500">Last Service</p>
                    <p className="text-sm sm:text-base font-semibold text-blue-400">
                      {stats?.lastServiceDate || 'Never'}
                    </p>
                    {stats?.lastServiceOdometer && (
                      <p className="text-[10px] text-gray-500 mt-1">
                        at {stats.lastServiceOdometer.toLocaleString()} km
                      </p>
                    )}
                  </div>
                  
                  <div className="bg-slate-800/30 rounded-lg p-3">
                    <p className="text-[10px] sm:text-xs text-gray-500">Next Service</p>
                    <p className="text-sm sm:text-base font-semibold text-amber-400">
                      {stats?.daysUntilNextService ? `In ${stats.daysUntilNextService} days` : 'Not scheduled'}
                    </p>
                    {stats?.kmUntilNextService ? (
                      <p className="text-[10px] text-gray-500 mt-1">
                        {stats.kmUntilNextService.toLocaleString()} km remaining
                      </p>
                    ) : (
                      <p className="text-[10px] text-gray-500 mt-1">{vehicle.nextService}</p>
                    )}
                  </div>
                </div>
                
                <div className="mt-3 pt-3 border-t border-yellow-500/20">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-400">Total Maintenance Cost</span>
                    <span className="text-sm font-bold text-purple-400">{formatCurrency(stats?.totalMaintenanceCost || 0)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Recent Documents - Compact */}
            {documents.length > 0 && (
              <div className="bg-slate-800/50 backdrop-blur-sm border border-yellow-500/20 rounded-xl sm:rounded-2xl p-4 sm:p-6">
                <div 
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => toggleSection('documents')}
                >
                  <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                    <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" />
                    Recent Documents
                  </h3>
                  {expandedSections.documents ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>

                {expandedSections.documents && (
                  <div className="mt-3 sm:mt-4 space-y-2">
                    {documents.slice(0, 3).map((doc) => {
                      const Icon = getDocumentIcon(doc.type);
                      return (
                        <a
                          key={doc.id}
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-slate-800/30 rounded-lg sm:rounded-xl border border-yellow-500/20 hover:border-yellow-400/50 transition"
                        >
                          <div className={`p-1.5 sm:p-2 rounded-lg ${
                            doc.status === 'valid' ? 'bg-green-500/20' :
                            doc.status === 'expiring' ? 'bg-amber-500/20' :
                            'bg-rose-500/20'
                          }`}>
                            <Icon className={`w-3 h-3 sm:w-4 sm:h-4 ${
                              doc.status === 'valid' ? 'text-green-400' :
                              doc.status === 'expiring' ? 'text-amber-400' :
                              'text-rose-400'
                            }`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs sm:text-sm font-medium truncate">{doc.name}</p>
                            <p className="text-[10px] sm:text-xs text-gray-500">
                              {doc.expiryDate ? `Expires: ${formatDate(doc.expiryDate)}` : `Uploaded: ${formatDate(doc.uploadedAt)}`}
                            </p>
                          </div>
                          <Download className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500 flex-shrink-0" />
                        </a>
                      );
                    })}
                  </div>
                )}
                
                {documents.length > 3 && (
                  <button
                    onClick={() => setActiveTab('documents')}
                    className="mt-3 text-xs text-yellow-400 hover:text-yellow-300 flex items-center gap-1"
                  >
                    View all {documents.length} documents
                    <ChevronRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}

            {/* Recent Maintenance - Enhanced */}
            {maintenance.length > 0 && (
              <div className="bg-slate-800/50 backdrop-blur-sm border border-yellow-500/20 rounded-xl sm:rounded-2xl p-4 sm:p-6">
                <div 
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => toggleSection('maintenance')}
                >
                  <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                    <Wrench className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" />
                    Recent Maintenance
                  </h3>
                  {expandedSections.maintenance ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>

                {expandedSections.maintenance && (
                  <div className="mt-3 sm:mt-4 space-y-2 sm:space-y-3">
                    {maintenance.slice(0, 3).map((record) => {
                      const Icon = getMaintenanceIcon(record.type);
                      return (
                        <div key={record.id} className="p-3 sm:p-4 bg-slate-800/30 rounded-lg sm:rounded-xl border border-yellow-500/20">
                          <div className="flex items-start gap-2 sm:gap-3">
                            <div className={`p-1.5 sm:p-2 rounded-lg ${
                              record.status === 'COMPLETED' ? 'bg-green-500/20' :
                              record.status === 'IN_PROGRESS' ? 'bg-blue-500/20' :
                              record.status === 'PENDING' ? 'bg-amber-500/20' :
                              'bg-gray-500/20'
                            }`}>
                              <Icon className={`w-3 h-3 sm:w-4 sm:h-4 ${
                                record.status === 'COMPLETED' ? 'text-green-400' :
                                record.status === 'IN_PROGRESS' ? 'text-blue-400' :
                                record.status === 'PENDING' ? 'text-amber-400' :
                                'text-gray-400'
                              }`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                <p className="text-xs sm:text-sm font-medium">
                                  {record.description || record.type.replace(/_/g, ' ')}
                                </p>
                                {getMaintenanceStatusBadge(record)}
                              </div>
                              <div className="flex flex-wrap gap-2 sm:gap-3 text-[10px] sm:text-xs text-gray-500">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {formatDate(record.date)}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Gauge className="w-3 h-3" />
                                  {record.odometer.toLocaleString()} km
                                </span>
                                <span className="font-medium text-purple-400">
                                  {formatCurrency(record.cost)}
                                </span>
                              </div>
                              
                              {/* Next due info for completed maintenance */}
                              {record.status === 'COMPLETED' && (record.nextDueDate || record.nextDueKm) && (
                                <div className="mt-2 pt-2 border-t border-yellow-500/10 text-[10px]">
                                  <p className="text-gray-500">Next due:</p>
                                  <div className="flex gap-3 mt-1">
                                    {record.nextDueDate && (
                                      <span className="text-amber-400 flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        {formatDate(record.nextDueDate)}
                                      </span>
                                    )}
                                    {record.nextDueKm && (
                                      <span className="text-amber-400 flex items-center gap-1">
                                        <Gauge className="w-3 h-3" />
                                        {record.nextDueKm.toLocaleString()} km
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                
                {maintenance.length > 3 && (
                  <button
                    onClick={() => setActiveTab('maintenance')}
                    className="mt-3 text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
                  >
                    View all {maintenance.length} records
                    <ChevronRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Documents Tab - Keep existing but more compact */}
        {activeTab === 'documents' && (
          <div className="space-y-4 sm:space-y-6">
            <div className="bg-slate-800/50 backdrop-blur-sm border border-yellow-500/20 rounded-xl sm:rounded-2xl p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
                <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" />
                All Documents
              </h3>

              {documents.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {documents.map((doc) => {
                    const Icon = getDocumentIcon(doc.type);
                    return (
                      <a
                        key={doc.id}
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group bg-slate-800/30 rounded-lg sm:rounded-xl border border-yellow-500/20 p-3 sm:p-4 hover:border-yellow-400/50 transition"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className={`p-2 sm:p-3 rounded-lg ${
                            doc.status === 'valid' ? 'bg-green-500/20' :
                            doc.status === 'expiring' ? 'bg-amber-500/20' :
                            'bg-rose-500/20'
                          }`}>
                            <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${
                              doc.status === 'valid' ? 'text-green-400' :
                              doc.status === 'expiring' ? 'text-amber-400' :
                              'text-rose-400'
                            }`} />
                          </div>
                          <span className={`text-[10px] sm:text-xs px-2 py-1 rounded-full ${getStatusColor(doc.status)}`}>
                            {doc.status}
                          </span>
                        </div>
                        
                        <h4 className="text-xs sm:text-sm font-medium mb-1 group-hover:text-yellow-400 transition truncate">{doc.name}</h4>
                        <p className="text-[10px] sm:text-xs text-gray-500 mb-2">{doc.type.replace('_', ' ')}</p>
                        
                        {doc.expiryDate ? (
                          <div className="flex items-center gap-1 text-[10px]">
                            <Calendar className="w-3 h-3 text-gray-500" />
                            <span className={doc.status === 'expiring' ? 'text-amber-400' : doc.status === 'expired' ? 'text-rose-400' : 'text-gray-400'}>
                              Expires: {formatDate(doc.expiryDate)}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-[10px]">
                            <Clock className="w-3 h-3 text-gray-500" />
                            <span className="text-gray-400">Uploaded: {formatDate(doc.uploadedAt)}</span>
                          </div>
                        )}
                      </a>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 sm:py-12 text-gray-500">
                  <FileText className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 text-gray-600" />
                  <p className="text-sm sm:text-base mb-2">No Documents</p>
                  <p className="text-xs sm:text-sm">No documents have been uploaded for this vehicle yet.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Maintenance Tab - Enhanced */}
        {activeTab === 'maintenance' && (
          <div className="space-y-4 sm:space-y-6">
            {/* Maintenance Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
              <div className="bg-slate-800/50 backdrop-blur-sm border border-yellow-500/20 rounded-lg sm:rounded-xl p-3 sm:p-4">
                <p className="text-[10px] sm:text-xs text-gray-400 mb-1">Total Cost</p>
                <p className="text-base sm:text-lg font-bold text-purple-400">{formatCurrency(stats?.totalMaintenanceCost || 0)}</p>
                <p className="text-[8px] sm:text-xs text-gray-500 mt-1">All time</p>
              </div>
              
              <div className="bg-slate-800/50 backdrop-blur-sm border border-yellow-500/20 rounded-lg sm:rounded-xl p-3 sm:p-4">
                <p className="text-[10px] sm:text-xs text-gray-400 mb-1">Last Service</p>
                <p className="text-sm sm:text-base font-bold text-blue-400">{stats?.lastServiceDate || 'Never'}</p>
                <p className="text-[8px] sm:text-xs text-gray-500 mt-1">{stats?.daysUntilNextService || 0} days until next</p>
              </div>
              
              <div className="bg-slate-800/50 backdrop-blur-sm border border-yellow-500/20 rounded-lg sm:rounded-xl p-3 sm:p-4 col-span-2 sm:col-span-1">
                <p className="text-[10px] sm:text-xs text-gray-400 mb-1">Next Service</p>
                <p className="text-sm sm:text-base font-bold text-amber-400">{vehicle.nextService}</p>
                <p className="text-[8px] sm:text-xs text-gray-500 mt-1">{stats?.kmUntilNextService || 0} km left</p>
              </div>
            </div>

            {/* Maintenance History */}
            <div className="bg-slate-800/50 backdrop-blur-sm border border-yellow-500/20 rounded-xl sm:rounded-2xl p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
                <Wrench className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" />
                Maintenance History
              </h3>

              {maintenance.length > 0 ? (
                <div className="space-y-3 sm:space-y-4">
                  {maintenance.map((record) => {
                    const Icon = getMaintenanceIcon(record.type);
                    return (
                      <div key={record.id} className="bg-slate-800/30 rounded-lg sm:rounded-xl border border-yellow-500/20 p-3 sm:p-4">
                        <div className="flex flex-col gap-3">
                          <div className="flex items-start gap-2 sm:gap-3">
                            <div className={`p-2 sm:p-3 rounded-lg ${
                              record.status === 'COMPLETED' ? 'bg-green-500/20' :
                              record.status === 'IN_PROGRESS' ? 'bg-blue-500/20' :
                              record.status === 'PENDING' ? 'bg-amber-500/20' :
                              'bg-gray-500/20'
                            }`}>
                              <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${
                                record.status === 'COMPLETED' ? 'text-green-400' :
                                record.status === 'IN_PROGRESS' ? 'text-blue-400' :
                                record.status === 'PENDING' ? 'text-amber-400' :
                                'text-gray-400'
                              }`} />
                            </div>
                            <div className="flex-1">
                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                <h4 className="text-xs sm:text-sm font-medium">
                                  {record.description || record.type.replace(/_/g, ' ')}
                                </h4>
                                {getMaintenanceStatusBadge(record)}
                              </div>
                              <div className="flex flex-wrap gap-2 sm:gap-3 text-[10px] sm:text-xs text-gray-500">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {formatDate(record.date)}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Gauge className="w-3 h-3" />
                                  {record.odometer.toLocaleString()} km
                                </span>
                                <span className="font-medium text-purple-400">
                                  {formatCurrency(record.cost)}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          {record.garageName && (
                            <div className="flex items-center gap-2 text-[10px] sm:text-xs text-gray-400 border-t border-yellow-500/10 pt-2">
                              <Building2 className="w-3 h-3" />
                              <span>{record.garageName}</span>
                              {record.garageContact && (
                                <>
                                  <span>·</span>
                                  <Phone className="w-3 h-3" />
                                  <span>{record.garageContact}</span>
                                </>
                              )}
                            </div>
                          )}

                          {record.notes && (
                            <p className="text-[10px] sm:text-xs text-gray-500 italic border-t border-yellow-500/10 pt-2">
                              "{record.notes}"
                            </p>
                          )}

                          {(record.nextDueDate || record.nextDueKm) && (
                            <div className="border-t border-yellow-500/10 pt-2">
                              <p className="text-[10px] sm:text-xs text-gray-500 mb-1">Next Service Due:</p>
                              <div className="flex gap-3 text-[10px] sm:text-xs">
                                {record.nextDueDate && (
                                  <span className="text-amber-400 flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {formatDate(record.nextDueDate)}
                                  </span>
                                )}
                                {record.nextDueKm && (
                                  <span className="text-amber-400 flex items-center gap-1">
                                    <Gauge className="w-3 h-3" />
                                    {record.nextDueKm.toLocaleString()} km
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 sm:py-12 text-gray-500">
                  <Wrench className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 text-gray-600" />
                  <p className="text-sm sm:text-base mb-2">No Maintenance Records</p>
                  <p className="text-xs sm:text-sm">No maintenance history available for this vehicle.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Statistics Tab - Keep existing but compact */}
        {activeTab === 'stats' && (
          <div className="space-y-4 sm:space-y-6">
            {/* Stats Grid - 2 columns on mobile */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="bg-slate-800/50 backdrop-blur-sm border border-yellow-500/20 rounded-lg sm:rounded-xl p-3 sm:p-4">
                <Gauge className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-400 mb-2" />
                <p className="text-[10px] sm:text-xs text-gray-400">Total Distance</p>
                <p className="text-sm sm:text-base font-bold">{stats?.totalDistance?.toLocaleString() || 0} km</p>
              </div>
              
              <div className="bg-slate-800/50 backdrop-blur-sm border border-yellow-500/20 rounded-lg sm:rounded-xl p-3 sm:p-4">
                <Fuel className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-400 mb-2" />
                <p className="text-[10px] sm:text-xs text-gray-400">Avg Efficiency</p>
                <p className="text-sm sm:text-base font-bold">{stats?.averageFuelEfficiency?.toFixed(1) || 0} km/L</p>
              </div>
              
              <div className="bg-slate-800/50 backdrop-blur-sm border border-yellow-500/20 rounded-lg sm:rounded-xl p-3 sm:p-4">
                <Receipt className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400 mb-2" />
                <p className="text-[10px] sm:text-xs text-gray-400">Total Expenses</p>
                <p className="text-sm sm:text-base font-bold">{formatCurrency(stats?.totalExpenses || 0)}</p>
              </div>
              
              <div className="bg-slate-800/50 backdrop-blur-sm border border-yellow-500/20 rounded-lg sm:rounded-xl p-3 sm:p-4">
                <Activity className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400 mb-2" />
                <p className="text-[10px] sm:text-xs text-gray-400">Total Trips</p>
                <p className="text-sm sm:text-base font-bold">{stats?.totalTrips || 0}</p>
              </div>
            </div>

            {/* Maintenance Cost Breakdown */}
            <div className="bg-slate-800/50 backdrop-blur-sm border border-yellow-500/20 rounded-xl sm:rounded-2xl p-4 sm:p-6">
              <h3 className="text-sm sm:text-base font-semibold mb-3 flex items-center gap-2">
                <Wrench className="w-4 h-4 text-purple-400" />
                Maintenance Cost Breakdown
              </h3>
              
              {maintenance.length > 0 ? (
                <div className="space-y-2">
                  {Object.entries(
                    maintenance.reduce((acc, record) => {
                      const type = record.type.replace(/_/g, ' ');
                      acc[type] = (acc[type] || 0) + record.cost;
                      return acc;
                    }, {} as Record<string, number>)
                  ).map(([type, cost]) => (
                    <div key={type} className="flex items-center justify-between text-xs sm:text-sm">
                      <span className="text-gray-400 truncate max-w-[60%]">{type}</span>
                      <span className="font-medium">{formatCurrency(cost)}</span>
                    </div>
                  ))}
                  
                  <div className="pt-2 mt-2 border-t border-yellow-500/20">
                    <div className="flex items-center justify-between font-bold text-sm">
                      <span>Total</span>
                      <span className="text-purple-400">{formatCurrency(stats?.totalMaintenanceCost || 0)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-center text-gray-500 py-4 text-sm">No maintenance data available</p>
              )}
            </div>
          </div>
        )}
      </main>

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}