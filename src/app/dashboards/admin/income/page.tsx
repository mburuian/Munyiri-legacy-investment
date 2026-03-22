'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Car,
  TrendingUp,
  TrendingDown,
  CircleDollarSign,
  Calendar,
  Download,
  Search,
  ChevronDown,
  ChevronUp,
  Receipt,
  Loader2,
  AlertTriangle,
  DollarSign,
  BarChart3,
  Users
} from 'lucide-react';
import { auth } from '../../../../lib/firebase/config';

interface IncomeLog {
  id: string;
  amount: number;
  type: string;
  description: string;
  date: string;
  driver: {
    id: string;
    name: string;
    email: string;
  } | null;
  vehicle: {
    id: string;
    plateNumber: string;
    model: string;
  } | null;
  tripStart?: string | null;
  tripEnd?: string | null;
  distanceKm?: number | null;
}

interface IncomeSummary {
  total: number;
  count: number;
  byType: Array<{
    type: string;
    total: number;
    count: number;
  }>;
}

interface VehicleIncome {
  vehicleId: string;
  plateNumber: string;
  model: string;
  status: string;
  totalIncome: number;
  totalTrips: number;
  totalDistance: number;
  avgFarePerTrip: number;
  avgIncomePerKm: number;
  monthlyTrend: {
    month: string;
    income: number;
    trips: number;
  }[];
  topEarningDays: {
    date: string;
    income: number;
    trips: number;
  }[];
  recentTrips: {
    id: string;
    date: string;
    from: string;
    to: string;
    fare: number;
    distance: number;
  }[];
}

export default function IncomePage() {
  const [loading, setLoading] = useState(true);
  const [incomeLogs, setIncomeLogs] = useState<IncomeLog[]>([]);
  const [summary, setSummary] = useState<IncomeSummary | null>(null);
  const [vehiclesIncome, setVehiclesIncome] = useState<VehicleIncome[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'income' | 'trips' | 'plateNumber'>('income');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'year' | 'all'>('month');
  const [expandedVehicle, setExpandedVehicle] = useState<string | null>(null);
  const [exportLoading, setExportLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        window.location.href = '/auth/login';
        return;
      }
      fetchIncomeData();
    });

    return () => unsubscribe();
  }, [dateRange]);

  const fetchIncomeData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Not authenticated');
      
      const token = await user.getIdToken();
      
      // Calculate date range
      const now = new Date();
      let startDate: Date | null = null;
      let endDate: Date | null = null;
      
      switch (dateRange) {
        case 'today':
          startDate = new Date(now.setHours(0, 0, 0, 0));
          endDate = new Date(now.setHours(23, 59, 59, 999));
          break;
        case 'week':
          const weekStart = new Date(now);
          weekStart.setDate(now.getDate() - now.getDay());
          weekStart.setHours(0, 0, 0, 0);
          startDate = weekStart;
          endDate = new Date();
          break;
        case 'month':
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
          startDate = monthStart;
          endDate = new Date();
          break;
        case 'year':
          const yearStart = new Date(now.getFullYear(), 0, 1);
          startDate = yearStart;
          endDate = new Date();
          break;
        default:
          startDate = null;
          endDate = null;
      }
      
      let url = '/api/admin/income?limit=100';
      if (startDate) {
        url += `&startDate=${startDate.toISOString()}`;
      }
      if (endDate) {
        url += `&endDate=${endDate.toISOString()}`;
      }
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch income data');
      }
      
      const data = await response.json();
      setIncomeLogs(data.items || []);
      setSummary(data.summary || { total: 0, count: 0, byType: [] });
      
      // Process vehicles data from income logs
      const vehiclesMap = new Map<string, VehicleIncome>();
      
      (data.items || []).forEach((log: IncomeLog) => {
        if (log.vehicle) {
          const vehicleId = log.vehicle.id;
          if (!vehiclesMap.has(vehicleId)) {
            vehiclesMap.set(vehicleId, {
              vehicleId: vehicleId,
              plateNumber: log.vehicle.plateNumber,
              model: log.vehicle.model,
              status: 'active',
              totalIncome: 0,
              totalTrips: 0,
              totalDistance: 0,
              avgFarePerTrip: 0,
              avgIncomePerKm: 0,
              monthlyTrend: [],
              topEarningDays: [],
              recentTrips: []
            });
          }
          
          const vehicle = vehiclesMap.get(vehicleId)!;
          vehicle.totalIncome += log.amount;
          vehicle.totalTrips++;
          if (log.distanceKm) {
            vehicle.totalDistance += log.distanceKm;
          }
          
          // Add to recent trips
          vehicle.recentTrips.push({
            id: log.id,
            date: log.date,
            from: log.tripStart ? new Date(log.tripStart).toLocaleTimeString() : 'Start',
            to: log.tripEnd ? new Date(log.tripEnd).toLocaleTimeString() : 'End',
            fare: log.amount,
            distance: log.distanceKm || 0
          });
          
          // Sort recent trips by date
          vehicle.recentTrips.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          vehicle.recentTrips = vehicle.recentTrips.slice(0, 10);
          
          // Calculate averages
          vehicle.avgFarePerTrip = vehicle.totalIncome / vehicle.totalTrips;
          vehicle.avgIncomePerKm = vehicle.totalDistance > 0 ? vehicle.totalIncome / vehicle.totalDistance : 0;
        }
      });
      
      // Convert map to array and sort by income
      const vehiclesArray = Array.from(vehiclesMap.values())
        .sort((a, b) => b.totalIncome - a.totalIncome);
      
      setVehiclesIncome(vehiclesArray);
      
    } catch (err) {
      console.error('Error fetching income data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load income data');
      setIncomeLogs([]);
      setVehiclesIncome([]);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    setExportLoading(true);
    try {
      const user = auth.currentUser;
      const token = await user?.getIdToken();
      
      // Create CSV data
      const csvRows = [
        ['Vehicle', 'Total Income', 'Total Trips', 'Avg per Trip', 'Total Distance', 'Avg per km']
      ];
      
      vehiclesIncome.forEach(vehicle => {
        csvRows.push([
          vehicle.plateNumber,
          vehicle.totalIncome.toString(),
          vehicle.totalTrips.toString(),
          vehicle.avgFarePerTrip.toFixed(2),
          vehicle.totalDistance.toString(),
          vehicle.avgIncomePerKm.toFixed(2)
        ]);
      });
      
      const csvContent = csvRows.map(row => row.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `income-report-${dateRange}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Export error:', err);
      alert('Failed to export data');
    } finally {
      setExportLoading(false);
    }
  };

  const formatCurrency = (amount: number = 0) => {
    return `KES ${amount.toLocaleString()}`;
  };

  const formatNumber = (num: number = 0) => {
    return num.toLocaleString();
  };

  const getStatusColor = (status: string) => {
    return 'bg-green-500/20 text-green-400 border border-green-500/30';
  };

  // Safe filtering
  const filteredAndSortedVehicles = (vehiclesIncome || [])
    .filter(vehicle => {
      if (!vehicle) return false;
      const searchLower = searchTerm.toLowerCase();
      return (
        (vehicle.plateNumber?.toLowerCase() || '').includes(searchLower) ||
        (vehicle.model?.toLowerCase() || '').includes(searchLower)
      );
    })
    .sort((a, b) => {
      if (sortBy === 'income') {
        return sortOrder === 'desc' ? (b.totalIncome || 0) - (a.totalIncome || 0) : (a.totalIncome || 0) - (b.totalIncome || 0);
      }
      if (sortBy === 'trips') {
        return sortOrder === 'desc' ? (b.totalTrips || 0) - (a.totalTrips || 0) : (a.totalTrips || 0) - (b.totalTrips || 0);
      }
      return sortOrder === 'desc' 
        ? (b.plateNumber || '').localeCompare(a.plateNumber || '')
        : (a.plateNumber || '').localeCompare(b.plateNumber || '');
    });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-green-400/20 border-t-green-400 rounded-full animate-spin mx-auto mb-4"></div>
            <DollarSign className="w-8 h-8 text-green-400 absolute top-6 left-1/2 -translate-x-1/2 animate-pulse" />
          </div>
          <p className="text-gray-400">Loading income data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-10 h-10 text-rose-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">Error Loading Data</h2>
          <p className="text-gray-400 mb-6">{error}</p>
          <button
            onClick={fetchIncomeData}
            className="px-6 py-3 bg-gradient-to-r from-green-400 to-emerald-500 text-black rounded-xl font-semibold hover:from-green-300 hover:to-emerald-400 transition"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-10 w-96 h-96 bg-green-500/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 left-10 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl animate-pulse animation-delay-2000"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-xl border border-green-500/20 rounded-2xl mb-6 p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboards/admin"
                className="p-2 hover:bg-slate-800 rounded-xl transition border border-green-500/20"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <CircleDollarSign className="w-7 h-7 text-green-400" />
                  Income by Vehicle
                </h1>
                <p className="text-sm text-gray-500">Track earnings per vehicle with detailed analytics</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleExport}
                disabled={exportLoading}
                className="px-4 py-2 bg-slate-800 border border-green-500/20 rounded-xl text-gray-300 hover:bg-slate-700 transition flex items-center gap-2 disabled:opacity-50"
              >
                {exportLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                Export Report
              </button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-gradient-to-br from-green-500/10 to-emerald-600/10 backdrop-blur-sm border border-green-500/20 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-400 text-sm">Total Income</p>
                <CircleDollarSign className="w-5 h-5 text-green-400" />
              </div>
              <p className="text-3xl font-bold text-green-400">{formatCurrency(summary.total)}</p>
              <p className="text-sm text-gray-500 mt-2">From {summary.count} transactions</p>
            </div>

            <div className="bg-slate-800/50 backdrop-blur-sm border border-green-500/20 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-400 text-sm">Active Vehicles</p>
                <Car className="w-5 h-5 text-yellow-400" />
              </div>
              <p className="text-3xl font-bold">{vehiclesIncome.length}</p>
              <p className="text-sm text-gray-500 mt-2">Vehicles with income</p>
            </div>

            <div className="bg-slate-800/50 backdrop-blur-sm border border-green-500/20 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-400 text-sm">Total Trips</p>
                <TrendingUp className="w-5 h-5 text-blue-400" />
              </div>
              <p className="text-3xl font-bold">{formatNumber(summary.count)}</p>
              <p className="text-sm text-gray-500 mt-2">Income generating trips</p>
            </div>

            <div className="bg-slate-800/50 backdrop-blur-sm border border-green-500/20 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-400 text-sm">Average per Trip</p>
                <BarChart3 className="w-5 h-5 text-purple-400" />
              </div>
              <p className="text-3xl font-bold text-purple-400">
                {formatCurrency(summary.count > 0 ? summary.total / summary.count : 0)}
              </p>
              <p className="text-sm text-gray-500 mt-2">Per transaction</p>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-green-500/20 rounded-2xl p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setDateRange('today')}
                className={`px-4 py-2 rounded-xl transition ${
                  dateRange === 'today' 
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                    : 'bg-slate-700/30 text-gray-400 border border-green-500/10 hover:bg-slate-700/50'
                }`}
              >
                Today
              </button>
              <button
                onClick={() => setDateRange('week')}
                className={`px-4 py-2 rounded-xl transition ${
                  dateRange === 'week' 
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                    : 'bg-slate-700/30 text-gray-400 border border-green-500/10 hover:bg-slate-700/50'
                }`}
              >
                This Week
              </button>
              <button
                onClick={() => setDateRange('month')}
                className={`px-4 py-2 rounded-xl transition ${
                  dateRange === 'month' 
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                    : 'bg-slate-700/30 text-gray-400 border border-green-500/10 hover:bg-slate-700/50'
                }`}
              >
                This Month
              </button>
              <button
                onClick={() => setDateRange('year')}
                className={`px-4 py-2 rounded-xl transition ${
                  dateRange === 'year' 
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                    : 'bg-slate-700/30 text-gray-400 border border-green-500/10 hover:bg-slate-700/50'
                }`}
              >
                This Year
              </button>
              <button
                onClick={() => setDateRange('all')}
                className={`px-4 py-2 rounded-xl transition ${
                  dateRange === 'all' 
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                    : 'bg-slate-700/30 text-gray-400 border border-green-500/10 hover:bg-slate-700/50'
                }`}
              >
                All Time
              </button>
            </div>
            
            <div className="flex gap-2 flex-wrap">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search vehicle..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-slate-700/30 border border-green-500/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-green-500/50"
                />
              </div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-4 py-2 bg-slate-700/30 border border-green-500/20 rounded-xl text-white focus:outline-none focus:border-green-500/50"
              >
                <option value="income">Sort by Income</option>
                <option value="trips">Sort by Trips</option>
                <option value="plateNumber">Sort by Plate Number</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                className="p-2 bg-slate-700/30 border border-green-500/20 rounded-xl hover:bg-slate-700/50 transition"
              >
                {sortOrder === 'desc' ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Vehicles List */}
        <div className="space-y-4">
          {filteredAndSortedVehicles.length === 0 ? (
            <div className="bg-slate-800/50 backdrop-blur-sm border border-green-500/20 rounded-2xl p-12 text-center">
              <Car className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 text-lg">No vehicles found</p>
              <p className="text-gray-500 text-sm">Try adjusting your search or date range</p>
            </div>
          ) : (
            filteredAndSortedVehicles.map((vehicle) => (
              <div
                key={vehicle.vehicleId}
                className="bg-slate-800/50 backdrop-blur-sm border border-green-500/20 rounded-2xl overflow-hidden hover:border-green-500/40 transition"
              >
                {/* Vehicle Header */}
                <div
                  className="p-6 cursor-pointer hover:bg-slate-700/30 transition"
                  onClick={() => setExpandedVehicle(expandedVehicle === vehicle.vehicleId ? null : vehicle.vehicleId)}
                >
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-green-500/20 to-emerald-600/20 rounded-xl flex items-center justify-center border border-green-500/30">
                        <Car className="w-6 h-6 text-green-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold">{vehicle.plateNumber || 'N/A'}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(vehicle.status)}`}>
                            Active
                          </span>
                        </div>
                        <p className="text-sm text-gray-500">{vehicle.model || 'N/A'}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6 flex-wrap">
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Total Income</p>
                        <p className="text-xl font-bold text-green-400">{formatCurrency(vehicle.totalIncome)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Trips</p>
                        <p className="text-xl font-bold">{formatNumber(vehicle.totalTrips)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Avg per Trip</p>
                        <p className="text-sm font-medium">{formatCurrency(vehicle.avgFarePerTrip)}</p>
                      </div>
                      {expandedVehicle === vehicle.vehicleId ? (
                        <ChevronUp className="w-5 h-5 text-gray-500" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-500" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedVehicle === vehicle.vehicleId && (
                  <div className="border-t border-green-500/20 p-6 bg-slate-900/50">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Stats */}
                      <div className="space-y-4">
                        <h4 className="font-semibold flex items-center gap-2">
                          <BarChart3 className="w-4 h-4 text-green-400" />
                          Performance Metrics
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-slate-700/30 rounded-xl p-3">
                            <p className="text-xs text-gray-500">Total Distance</p>
                            <p className="text-lg font-bold">{formatNumber(vehicle.totalDistance)} km</p>
                          </div>
                          <div className="bg-slate-700/30 rounded-xl p-3">
                            <p className="text-xs text-gray-500">Income per km</p>
                            <p className="text-lg font-bold">{formatCurrency(vehicle.avgIncomePerKm)}</p>
                          </div>
                        </div>
                      </div>

                      {/* Recent Trips */}
                      {vehicle.recentTrips && vehicle.recentTrips.length > 0 && (
                        <div>
                          <h4 className="font-semibold flex items-center gap-2 mb-3">
                            <Receipt className="w-4 h-4 text-green-400" />
                            Recent Trips
                          </h4>
                          <div className="space-y-2 max-h-96 overflow-y-auto">
                            {vehicle.recentTrips.slice(0, 10).map((trip) => (
                              <div
                                key={trip.id}
                                className="p-3 bg-slate-700/30 rounded-xl border border-green-500/10"
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex items-center gap-2">
                                    <Calendar className="w-3 h-3 text-gray-500" />
                                    <span className="text-xs text-gray-500">
                                      {new Date(trip.date).toLocaleDateString()}
                                    </span>
                                  </div>
                                  <span className="text-sm font-semibold text-green-400">
                                    {formatCurrency(trip.fare)}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-sm">
                                    {trip.from} → {trip.to}
                                  </span>
                                  <span className="text-xs text-gray-500">{trip.distance || 0} km</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        .animate-pulse {
          animation: pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
      `}</style>
    </div>
  );
}