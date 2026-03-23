"use client";

import { useState, useEffect, Suspense } from "react";
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
  
  // Trip icons
  Route,
  MapPin,
  Calendar,
  Clock,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Filter,
  Search,
  X,
  
  // Status icons
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Award,
  Sparkles,
  Activity,
  UserCircle,
  Settings,
  Navigation2,
  Radio,
  Timer,
  
  // Action icons
  Download,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  CalendarRange,
  Gauge
} from "lucide-react";

// Firebase will be dynamically imported on client side only
let auth: any = null;
let onAuthStateChanged: any = null;

// Types
interface Trip {
  id: string;
  date: string;
  startTime: string;
  endTime: string | null;
  from: string;
  to: string;
  distance: number;
  earnings: number;
  status: 'completed' | 'in-progress' | 'cancelled';
  vehicle?: string;
}

interface TripStats {
  totalTrips: number;
  totalDistance: number;
  totalEarnings: number;
  averageDistance: number;
  averageFare: number;
  todayTrips: number;
  weeklyEarnings: number;
  monthlyEarnings: number;
  bestDay?: {
    date: string;
    earnings: number;
  };
}

interface ApiResponse {
  trips: Trip[];
  summary: TripStats;
}

type DateFilter = 'today' | 'week' | 'month' | 'custom';
type StatusFilter = 'all' | 'completed' | 'in-progress' | 'cancelled';

function TripsContent() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [firebaseReady, setFirebaseReady] = useState(false);
  
  // Data states
  const [trips, setTrips] = useState<Trip[]>([]);
  const [stats, setStats] = useState<TripStats | null>(null);
  
  // UI states
  const [showFilters, setShowFilters] = useState(false);
  const [dateFilter, setDateFilter] = useState<DateFilter>('month');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Load Firebase dynamically on client side only
  useEffect(() => {
    const loadFirebase = async () => {
      try {
        const firebaseModule = await import('../../../../lib/firebase/client');
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
      loadTrips();
    });

    return () => unsubscribe();
  }, [firebaseReady]);

  const loadTrips = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    
    setError(null);
    
    try {
      const user = auth?.currentUser;
      if (!user) {
        router.push('/auth/login');
        return;
      }

      const token = await user.getIdToken();
      
      // Build query params
      const params = new URLSearchParams();
      params.append('limit', '100'); // Get enough trips for stats
      
      const response = await fetch(`/api/driver/trips?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/auth/login');
          return;
        }
        throw new Error('Failed to load trips');
      }
      
      const data: ApiResponse = await response.json();
      
      setTrips(data.trips || []);
      setStats(data.summary || null);
      
    } catch (error) {
      console.error('Error loading trips:', error);
      setError('Failed to load trips. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Filter trips based on selected filters
  const getFilteredTrips = () => {
    let filtered = [...trips];
    
    // Date filter
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    if (dateFilter === 'today') {
      filtered = filtered.filter(trip => {
        const tripDate = new Date(trip.date);
        return tripDate >= today;
      });
    } else if (dateFilter === 'week') {
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      filtered = filtered.filter(trip => {
        const tripDate = new Date(trip.date);
        return tripDate >= weekAgo;
      });
    } else if (dateFilter === 'month') {
      const monthAgo = new Date(today);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      filtered = filtered.filter(trip => {
        const tripDate = new Date(trip.date);
        return tripDate >= monthAgo;
      });
    } else if (dateFilter === 'custom' && customStartDate && customEndDate) {
      const start = new Date(customStartDate);
      const end = new Date(customEndDate);
      end.setHours(23, 59, 59);
      filtered = filtered.filter(trip => {
        const tripDate = new Date(trip.date);
        return tripDate >= start && tripDate <= end;
      });
    }
    
    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(trip => trip.status === statusFilter);
    }
    
    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(trip => 
        trip.from.toLowerCase().includes(term) ||
        trip.to.toLowerCase().includes(term) ||
        trip.vehicle?.toLowerCase().includes(term)
      );
    }
    
    // Sort
    filtered.sort((a, b) => {
      const dateA = new Date(a.date + ' ' + a.startTime).getTime();
      const dateB = new Date(b.date + ' ' + b.startTime).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });
    
    return filtered;
  };

  // Get paginated trips
  const getPaginatedTrips = () => {
    const filtered = getFilteredTrips();
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return filtered.slice(start, end);
  };

  // Calculate filtered stats
  const getFilteredStats = () => {
    const filtered = getFilteredTrips();
    const totalEarnings = filtered.reduce((sum, trip) => sum + trip.earnings, 0);
    const totalDistance = filtered.reduce((sum, trip) => sum + trip.distance, 0);
    const completedTrips = filtered.filter(t => t.status === 'completed').length;
    
    return {
      totalTrips: filtered.length,
      completedTrips,
      totalEarnings,
      totalDistance,
      averageFare: filtered.length > 0 ? totalEarnings / filtered.length : 0,
      averageDistance: filtered.length > 0 ? totalDistance / filtered.length : 0
    };
  };

  const filteredStats = getFilteredStats();
  const filteredTrips = getFilteredTrips();
  const paginatedTrips = getPaginatedTrips();
  const totalPages = Math.ceil(filteredTrips.length / itemsPerPage);

  const formatCurrency = (amount: number) => {
    return `KES ${amount.toLocaleString()}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      completed: 'bg-green-500/20 text-green-400 border-green-500/30',
      'in-progress': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      cancelled: 'bg-rose-500/20 text-rose-400 border-rose-500/30'
    };
    return styles[status as keyof typeof styles] || styles.completed;
  };

  const resetFilters = () => {
    setDateFilter('month');
    setStatusFilter('all');
    setSearchTerm('');
    setCustomStartDate('');
    setCustomEndDate('');
    setCurrentPage(1);
  };

  // Show loading while Firebase initializes
  if (!firebaseReady) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-yellow-400/20 border-t-yellow-400 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 sm:w-20 sm:h-20 border-4 border-yellow-400/20 border-t-yellow-400 rounded-full animate-spin mx-auto mb-4"></div>
            <ClipboardList className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-400 absolute top-5 sm:top-6 left-1/2 -translate-x-1/2 animate-pulse" />
          </div>
          <p className="text-sm sm:text-base text-gray-400">Loading trip history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Header */}
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
                <ClipboardList className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" />
                Trip History
              </h1>
              <p className="text-xs text-gray-500">View and manage your trips</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl border transition ${
                showFilters 
                  ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' 
                  : 'border-yellow-500/20 hover:bg-slate-800'
              }`}
            >
              <Filter className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setViewMode(viewMode === 'list' ? 'grid' : 'list');
              }}
              className="p-1.5 sm:p-2 hover:bg-slate-800 rounded-lg sm:rounded-xl border border-yellow-500/20 hidden sm:block"
            >
              {viewMode === 'list' ? 'Grid' : 'List'}
            </button>
            <button
              onClick={() => loadTrips(true)}
              disabled={refreshing}
              className="p-1.5 sm:p-2 hover:bg-slate-800 rounded-lg sm:rounded-xl border border-yellow-500/20 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center">
              <span className="text-xs sm:text-sm font-bold text-black">
                {auth?.currentUser?.email?.charAt(0).toUpperCase() || 'D'}
              </span>
            </div>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="px-3 sm:px-4 md:px-6 py-3 bg-slate-800/50 border-t border-yellow-500/20">
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search locations..."
                  className="w-full bg-slate-900/50 border border-yellow-500/20 rounded-lg py-2 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400"
                />
              </div>

              {/* Date Filter */}
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as DateFilter)}
                className="bg-slate-900/50 border border-yellow-500/20 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-400"
              >
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="custom">Custom Range</option>
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="bg-slate-900/50 border border-yellow-500/20 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-400"
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="in-progress">In Progress</option>
                <option value="cancelled">Cancelled</option>
              </select>

              {/* Sort Order */}
              <button
                onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                className="px-3 py-2 bg-slate-900/50 border border-yellow-500/20 rounded-lg text-sm hover:bg-slate-800 transition flex items-center gap-2"
              >
                <Clock className="w-4 h-4" />
                {sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}
              </button>

              {/* Reset Filters */}
              <button
                onClick={resetFilters}
                className="px-3 py-2 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg text-sm hover:bg-rose-500/30 transition"
              >
                Reset
              </button>
            </div>

            {/* Custom Date Range */}
            {dateFilter === 'custom' && (
              <div className="flex gap-3 mt-3">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="flex-1 bg-slate-900/50 border border-yellow-500/20 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-400"
                />
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="flex-1 bg-slate-900/50 border border-yellow-500/20 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-400"
                />
              </div>
            )}
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="p-3 sm:p-4 md:p-6 max-w-7xl mx-auto">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <div className="bg-slate-800/50 backdrop-blur-sm border border-yellow-500/20 rounded-lg sm:rounded-xl p-3 sm:p-4">
            <p className="text-[10px] sm:text-xs text-gray-400 mb-1">Total Trips</p>
            <p className="text-lg sm:text-xl font-bold text-yellow-400">{filteredStats.totalTrips}</p>
            <p className="text-[8px] sm:text-xs text-gray-500 mt-1">{filteredStats.completedTrips} completed</p>
          </div>
          
          <div className="bg-slate-800/50 backdrop-blur-sm border border-yellow-500/20 rounded-lg sm:rounded-xl p-3 sm:p-4">
            <p className="text-[10px] sm:text-xs text-gray-400 mb-1">Total Earnings</p>
            <p className="text-lg sm:text-xl font-bold text-green-400">{formatCurrency(filteredStats.totalEarnings)}</p>
            <p className="text-[8px] sm:text-xs text-gray-500 mt-1">Avg {formatCurrency(filteredStats.averageFare)}/trip</p>
          </div>
          
          <div className="bg-slate-800/50 backdrop-blur-sm border border-yellow-500/20 rounded-lg sm:rounded-xl p-3 sm:p-4">
            <p className="text-[10px] sm:text-xs text-gray-400 mb-1">Total Distance</p>
            <p className="text-lg sm:text-xl font-bold text-blue-400">{filteredStats.totalDistance.toLocaleString()} km</p>
            <p className="text-[8px] sm:text-xs text-gray-500 mt-1">Avg {filteredStats.averageDistance.toFixed(1)} km/trip</p>
          </div>
          
          <div className="bg-slate-800/50 backdrop-blur-sm border border-yellow-500/20 rounded-lg sm:rounded-xl p-3 sm:p-4">
            <p className="text-[10px] sm:text-xs text-gray-400 mb-1">Success Rate</p>
            <p className="text-lg sm:text-xl font-bold text-purple-400">
              {filteredStats.totalTrips > 0 
                ? Math.round((filteredStats.completedTrips / filteredStats.totalTrips) * 100) 
                : 0}%
            </p>
            <p className="text-[8px] sm:text-xs text-gray-500 mt-1">Completed trips</p>
          </div>
        </div>

        {/* Trips List/Grid */}
        {filteredTrips.length > 0 ? (
          <>
            {viewMode === 'list' ? (
              <div className="bg-slate-800/50 backdrop-blur-sm border border-yellow-500/20 rounded-xl sm:rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-yellow-500/20 bg-slate-900/50">
                        <th className="text-left p-3 sm:p-4 text-xs sm:text-sm font-medium text-gray-400">Date & Time</th>
                        <th className="text-left p-3 sm:p-4 text-xs sm:text-sm font-medium text-gray-400">Route</th>
                        <th className="text-left p-3 sm:p-4 text-xs sm:text-sm font-medium text-gray-400 hidden sm:table-cell">Distance</th>
                        <th className="text-left p-3 sm:p-4 text-xs sm:text-sm font-medium text-gray-400">Earnings</th>
                        <th className="text-left p-3 sm:p-4 text-xs sm:text-sm font-medium text-gray-400">Status</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-yellow-500/10">
                      {paginatedTrips.map((trip) => (
                        <tr 
                          key={trip.id} 
                          className="hover:bg-yellow-500/5 transition cursor-pointer"
                          onClick={() => setSelectedTrip(trip)}
                        >
                          <td className="p-3 sm:p-4">
                            <div className="text-xs sm:text-sm font-medium">{formatDate(trip.date)}</div>
                            <div className="text-[10px] sm:text-xs text-gray-500 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatTime(trip.startTime)}
                              {trip.endTime && ` - ${formatTime(trip.endTime)}`}
                            </div>
                           </td>
                          <td className="p-3 sm:p-4">
                            <div className="text-xs sm:text-sm max-w-[150px] sm:max-w-[200px] truncate">
                              {trip.from} → {trip.to}
                            </div>
                            {trip.vehicle && (
                              <div className="text-[10px] text-gray-500">{trip.vehicle}</div>
                            )}
                           </td>
                          <td className="p-3 sm:p-4 hidden sm:table-cell">
                            <div className="text-sm">{trip.distance} km</div>
                           </td>
                          <td className="p-3 sm:p-4">
                            <div className="text-xs sm:text-sm font-bold text-yellow-400">
                              {formatCurrency(trip.earnings)}
                            </div>
                           </td>
                          <td className="p-3 sm:p-4">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] sm:text-xs font-medium border ${getStatusBadge(trip.status)}`}>
                              {trip.status === 'completed' && <CheckCircle className="w-3 h-3" />}
                              {trip.status === 'in-progress' && <Activity className="w-3 h-3" />}
                              {trip.status === 'cancelled' && <X className="w-3 h-3" />}
                              {trip.status}
                            </span>
                           </td>
                         </tr>
                      ))}
                    </tbody>
                   </table>
                </div>
              </div>
            ) : (
              // Grid View
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {paginatedTrips.map((trip) => (
                  <div
                    key={trip.id}
                    onClick={() => setSelectedTrip(trip)}
                    className="bg-slate-800/50 backdrop-blur-sm border border-yellow-500/20 rounded-lg sm:rounded-xl p-4 hover:border-yellow-400/50 transition cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-yellow-500/20 rounded-lg">
                          <Route className="w-4 h-4 text-yellow-400" />
                        </div>
                        <div>
                          <p className="text-xs font-medium">{formatDate(trip.date)}</p>
                          <p className="text-[10px] text-gray-500">{trip.startTime}</p>
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-[10px] font-medium border ${getStatusBadge(trip.status)}`}>
                        {trip.status}
                      </span>
                    </div>

                    <div className="space-y-2 mb-3">
                      <div className="flex items-center gap-2 text-xs">
                        <MapPin className="w-3 h-3 text-gray-500" />
                        <span className="truncate">{trip.from}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <MapPin className="w-3 h-3 text-gray-500" />
                        <span className="truncate">{trip.to}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-yellow-500/20">
                      <div className="flex items-center gap-2">
                        <Gauge className="w-3 h-3 text-gray-500" />
                        <span className="text-xs">{trip.distance} km</span>
                      </div>
                      <div className="text-sm font-bold text-yellow-400">
                        {formatCurrency(trip.earnings)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 sm:mt-6">
                <p className="text-xs sm:text-sm text-gray-500">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredTrips.length)} of {filteredTrips.length} trips
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 bg-slate-800/50 border border-yellow-500/20 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-700 transition"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 bg-slate-800/50 border border-yellow-500/20 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-700 transition"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="bg-slate-800/50 backdrop-blur-sm border border-yellow-500/20 rounded-xl sm:rounded-2xl p-8 sm:p-12 text-center">
            <ClipboardList className="w-12 h-12 sm:w-16 sm:h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg sm:text-xl font-semibold mb-2">No Trips Found</h3>
            <p className="text-sm text-gray-500 mb-6">
              {searchTerm || statusFilter !== 'all' || dateFilter !== 'month'
                ? 'Try adjusting your filters'
                : 'You haven\'t logged any trips yet'}
            </p>
            <Link
              href="/dashboards/drivers"
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-400 to-amber-500 text-black rounded-lg font-semibold hover:from-yellow-300 hover:to-amber-400 transition text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Link>
          </div>
        )}

        {/* Trip Details Modal */}
        {selectedTrip && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="bg-slate-900 border border-yellow-500/30 rounded-xl sm:rounded-2xl max-w-md w-full">
              <div className="p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Route className="w-5 h-5 text-yellow-400" />
                    Trip Details
                  </h3>
                  <button
                    onClick={() => setSelectedTrip(null)}
                    className="p-2 hover:bg-slate-800 rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Status Badge */}
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Status</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadge(selectedTrip.status)}`}>
                      {selectedTrip.status}
                    </span>
                  </div>

                  {/* Date & Time */}
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Date</span>
                    <span className="text-sm font-medium">{formatDate(selectedTrip.date)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Time</span>
                    <span className="text-sm font-medium">
                      {formatTime(selectedTrip.startTime)}
                      {selectedTrip.endTime && ` - ${formatTime(selectedTrip.endTime)}`}
                    </span>
                  </div>

                  {/* Route */}
                  <div className="border-t border-yellow-500/20 pt-4">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-3 h-3 text-green-400" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">From</p>
                        <p className="text-sm font-medium">{selectedTrip.from}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-3 h-3 text-red-400" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">To</p>
                        <p className="text-sm font-medium">{selectedTrip.to}</p>
                      </div>
                    </div>
                  </div>

                  {/* Trip Stats */}
                  <div className="grid grid-cols-2 gap-3 border-t border-yellow-500/20 pt-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Distance</p>
                      <p className="text-lg font-bold text-blue-400">{selectedTrip.distance} km</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Earnings</p>
                      <p className="text-lg font-bold text-green-400">{formatCurrency(selectedTrip.earnings)}</p>
                    </div>
                  </div>

                  {selectedTrip.vehicle && (
                    <div className="border-t border-yellow-500/20 pt-4">
                      <p className="text-xs text-gray-500 mb-1">Vehicle</p>
                      <p className="text-sm">{selectedTrip.vehicle}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function TripsFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-yellow-400/20 border-t-yellow-400 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-400">Loading...</p>
      </div>
    </div>
  );
}

export default function TripsPage() {
  return (
    <Suspense fallback={<TripsFallback />}>
      <TripsContent />
    </Suspense>
  );
}