"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import * as React from 'react';
import {
  ArrowLeft,
  UserCircle,
  Mail,
  Phone,
  IdCard,
  Car,
  Calendar,
  Star,
  TrendingUp,
  TrendingDown,
  CircleDollarSign,
  Award,
  AlertTriangle,
  FileText,
  Edit,
  Trash2,
  Download,
  Clock,
  MapPin,
  Gauge,
  Truck,
  Fuel,
  Wrench,
  CheckCircle,
  XCircle,
  Activity,
  Loader2
} from "lucide-react";
import { auth } from '../../../../../lib/firebase/config';

// Updated types to match API response
interface DriverDetailsResponse {
  success: boolean;
  driver: {
    id: string;
    name: string;
    email: string;
    phone: string;
    avatar: string | null;
    licenseNumber: string;
    status: string;
    joinedDate: string;
    lastActive: string;
  };
  vehicle: {
    id: string;
    plateNumber: string;
    model: string;
    capacity: number;
    status: string;
    totalTrips: number;
    totalDistance: number;
    totalEarnings: number;
    lastMaintenance: any;
    documents: Array<{
      type: string;
      expiryDate: string;
      status: string;
    }>;
  } | null;
  stats: {
    today: { income: number; trips: number; expenses: number };
    week: { income: number; trips: number; expenses: number };
    month: { income: number; trips: number; expenses: number };
    allTime: { income: number; trips: number; expenses: number; distance: number };
  };
  monthlyPerformance: Array<{
    month: string;
    income: number;
    trips: number;
  }>;
  recentActivity: {
    trips: Array<any>;
    income: Array<any>;
    expenses: Array<any>;
  };
  alerts: Array<any>;
  performance: Array<any>;
}

export default function DriverDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [driverData, setDriverData] = useState<DriverDetailsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    if (!id) {
      setError('Invalid driver ID');
      setLoading(false);
      return;
    }

    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.push('/auth/login');
        return;
      }
      loadDriver();
    });

    return () => unsubscribe();
  }, [id]);

  const loadDriver = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const user = auth.currentUser;
      if (!user) {
        router.push('/auth/login');
        return;
      }
      
      const token = await user.getIdToken();
      
      console.log('Fetching driver with ID:', id);
      
      const response = await fetch(`/api/admin/drivers/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Driver not found');
        }
        if (response.status === 403) {
          throw new Error('Admin access required');
        }
        if (response.status === 401) {
          router.push('/auth/login');
          return;
        }
        throw new Error('Failed to load driver');
      }
      
      const data = await response.json();
      console.log('Driver data loaded:', data);
      setDriverData(data);
    } catch (error: any) {
      console.error('Error loading driver:', error);
      setError(error.message || 'Failed to load driver');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this driver? This action cannot be undone.')) return;
    
    setDeleteLoading(true);
    try {
      const user = auth.currentUser;
      const token = await user?.getIdToken();
      
      const response = await fetch(`/api/admin/drivers/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to delete driver');
      
      router.push('/dashboards/admin/driver');
    } catch (error) {
      console.error('Error deleting driver:', error);
      alert('Failed to delete driver');
    } finally {
      setDeleteLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'bg-green-500/20 text-green-400 border border-green-500/30';
      case 'off-duty':
        return 'bg-gray-500/20 text-gray-400 border border-gray-500/30';
      case 'on-leave':
        return 'bg-amber-500/20 text-amber-400 border border-amber-500/30';
      case 'suspended':
        return 'bg-rose-500/20 text-rose-400 border border-rose-500/30';
      case 'terminated':
        return 'bg-red-500/20 text-red-400 border border-red-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border border-gray-500/30';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return <CheckCircle className="w-4 h-4" />;
      case 'off-duty':
        return <Clock className="w-4 h-4" />;
      case 'on-leave':
        return <Calendar className="w-4 h-4" />;
      case 'suspended':
        return <AlertTriangle className="w-4 h-4" />;
      case 'terminated':
        return <XCircle className="w-4 h-4" />;
      default:
        return <UserCircle className="w-4 h-4" />;
    }
  };

  const formatCurrency = (amount: number = 0) => {
    return `KES ${amount.toLocaleString()}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-yellow-400/20 border-t-yellow-400 rounded-full animate-spin mx-auto mb-4"></div>
            <UserCircle className="w-8 h-8 text-yellow-400 absolute top-6 left-1/2 -translate-x-1/2 animate-pulse" />
          </div>
          <p className="text-gray-400">Loading driver details...</p>
        </div>
      </div>
    );
  }

  if (error || !driverData) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-10 h-10 text-rose-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">Driver Not Found</h2>
          <p className="text-gray-400 mb-6">{error || 'The driver you are looking for does not exist'}</p>
          <Link
            href="/dashboards/admin/driver"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-yellow-400 to-amber-500 text-black rounded-xl font-semibold hover:from-yellow-300 hover:to-amber-400 transition shadow-lg shadow-yellow-500/30"
          >
            <ArrowLeft className="w-4 h-4" />
            Return to Drivers
          </Link>
        </div>
      </div>
    );
  }

  const { driver, vehicle, stats, recentActivity, performance, monthlyPerformance } = driverData;
  const latestPerformance = performance[0] || { tripsCount: 0, totalIncome: 0, rating: 0 };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-96 h-96 bg-yellow-500/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl animate-pulse animation-delay-2000"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-xl border border-yellow-500/20 rounded-2xl mb-6 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboards/admin/driver"
                className="p-2 hover:bg-slate-800 rounded-xl transition border border-yellow-500/20"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  Driver Profile
                  <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getStatusColor(driver.status)}`}>
                    {getStatusIcon(driver.status)}
                    {driver.status?.replace('-', ' ').toUpperCase()}
                  </span>
                </h1>
                <p className="text-sm text-gray-500">Driver ID: {driver.id}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => router.push(`/dashboards/admin/driver/${id}/edit`)}
                className="px-4 py-2 bg-yellow-500/20 text-yellow-400 rounded-xl hover:bg-yellow-500/30 transition flex items-center gap-2 border border-yellow-500/30"
              >
                <Edit className="w-4 h-4" />
                Edit
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteLoading}
                className="px-4 py-2 bg-rose-500/20 text-rose-400 rounded-xl hover:bg-rose-500/30 transition flex items-center gap-2 border border-rose-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleteLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                Delete
              </button>
              <button className="px-4 py-2 bg-slate-800 border border-yellow-500/20 rounded-xl text-gray-300 hover:bg-slate-700 transition flex items-center gap-2">
                <Download className="w-4 h-4" />
                Export
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Driver Info */}
          <div className="space-y-6">
            {/* Profile Card */}
            <div className="bg-slate-800/50 backdrop-blur-sm border border-yellow-500/20 rounded-2xl p-6">
              <div className="flex flex-col items-center text-center mb-6">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center mb-4">
                  {driver.avatar ? (
                    <img src={driver.avatar} alt={driver.name} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <UserCircle className="w-16 h-16 text-black" />
                  )}
                </div>
                <h2 className="text-xl font-bold">{driver.name}</h2>
                <p className="text-sm text-gray-400 mb-3">{driver.email}</p>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Calendar className="w-4 h-4" />
                  Joined {formatDate(driver.joinedDate)}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-xl border border-yellow-500/10">
                  <Phone className="w-5 h-5 text-yellow-400" />
                  <div>
                    <p className="text-xs text-gray-500">Phone</p>
                    <p className="text-sm font-medium">{driver.phone || 'Not provided'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-xl border border-yellow-500/10">
                  <IdCard className="w-5 h-5 text-yellow-400" />
                  <div>
                    <p className="text-xs text-gray-500">License Number</p>
                    <p className="text-sm font-medium">{driver.licenseNumber}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Performance Stats */}
            <div className="bg-slate-800/50 backdrop-blur-sm border border-yellow-500/20 rounded-2xl p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Award className="w-5 h-5 text-yellow-400" />
                Performance
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-slate-700/30 rounded-xl border border-yellow-500/10">
                  <Star className="w-5 h-5 text-yellow-400 mx-auto mb-2" />
                  <p className="text-xs text-gray-500">Rating</p>
                  <p className="text-xl font-bold">{latestPerformance.rating?.toFixed(1) || '0.0'}</p>
                </div>
                <div className="text-center p-3 bg-slate-700/30 rounded-xl border border-yellow-500/10">
                  <Activity className="w-5 h-5 text-blue-400 mx-auto mb-2" />
                  <p className="text-xs text-gray-500">Trips (All Time)</p>
                  <p className="text-xl font-bold">{stats.allTime.trips}</p>
                </div>
                <div className="text-center p-3 bg-slate-700/30 rounded-xl border border-yellow-500/10 col-span-2">
                  <CircleDollarSign className="w-5 h-5 text-green-400 mx-auto mb-2" />
                  <p className="text-xs text-gray-500">Total Revenue</p>
                  <p className="text-xl font-bold text-green-400">{formatCurrency(stats.allTime.income)}</p>
                </div>
              </div>
            </div>

            {/* Monthly Stats */}
            <div className="bg-slate-800/50 backdrop-blur-sm border border-yellow-500/20 rounded-2xl p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-yellow-400" />
                This Month
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Income</span>
                  <span className="text-green-400 font-semibold">{formatCurrency(stats.month.income)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Trips</span>
                  <span>{stats.month.trips}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Expenses</span>
                  <span className="text-rose-400">{formatCurrency(stats.month.expenses)}</span>
                </div>
                <div className="pt-2 border-t border-yellow-500/20">
                  <div className="flex justify-between items-center font-semibold">
                    <span>Net Profit</span>
                    <span className="text-yellow-400">{formatCurrency(stats.month.income - stats.month.expenses)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Middle & Right Columns - Vehicle & Recent Activity */}
          <div className="lg:col-span-2 space-y-6">
            {/* Assigned Vehicle */}
            {vehicle ? (
              <div className="bg-gradient-to-br from-yellow-500/10 to-amber-600/10 backdrop-blur-sm border border-yellow-500/20 rounded-2xl p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Car className="w-5 h-5 text-yellow-400" />
                  Assigned Vehicle
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-16 h-16 bg-slate-700 rounded-xl flex items-center justify-center border border-yellow-500/20">
                        <Truck className="w-8 h-8 text-yellow-400" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{vehicle.plateNumber}</p>
                        <p className="text-gray-400">{vehicle.model}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Capacity</span>
                        <span className="font-medium">{vehicle.capacity} seats</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Total Trips</span>
                        <span className="font-medium">{vehicle.totalTrips}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Total Distance</span>
                        <span className="font-medium">{vehicle.totalDistance.toLocaleString()} km</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="bg-slate-700/30 rounded-xl p-4 border border-yellow-500/10">
                      <div className="flex items-center gap-2 mb-2">
                        <Gauge className="w-4 h-4 text-yellow-400" />
                        <span className="text-sm font-medium">Vehicle Stats</span>
                      </div>
                      <p className="text-2xl font-bold">{formatCurrency(vehicle.totalEarnings)}</p>
                      <p className="text-xs text-gray-500">Total earnings from this vehicle</p>
                    </div>
                    {vehicle.documents && vehicle.documents.length > 0 && (
                      <div className="bg-slate-700/30 rounded-xl p-4 border border-yellow-500/10">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="w-4 h-4 text-amber-400" />
                          <span className="text-sm font-medium">Documents</span>
                        </div>
                        {vehicle.documents.slice(0, 2).map((doc, idx) => (
                          <div key={idx} className="flex justify-between text-sm mt-1">
                            <span>{doc.type}</span>
                            <span className={doc.status === 'expired' ? 'text-rose-400' : 'text-green-400'}>
                              {doc.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-800/50 backdrop-blur-sm border border-yellow-500/20 rounded-2xl p-6">
                <div className="text-center py-8">
                  <Car className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400">No vehicle assigned</p>
                  <button className="mt-3 text-sm text-yellow-400 hover:text-yellow-300">
                    Assign Vehicle
                  </button>
                </div>
              </div>
            )}

            {/* Recent Trips */}
            <div className="bg-slate-800/50 backdrop-blur-sm border border-yellow-500/20 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <FileText className="w-5 h-5 text-yellow-400" />
                  Recent Trips
                </h3>
                <Link 
                  href={`/dashboards/admin/driver/${id}/trips`}
                  className="text-sm text-yellow-400 hover:text-yellow-300"
                >
                  View All
                </Link>
              </div>

              {recentActivity.trips && recentActivity.trips.length > 0 ? (
                <div className="space-y-3">
                  {recentActivity.trips.map((trip) => (
                    <div key={trip.id} className="p-3 bg-slate-700/30 rounded-xl border border-yellow-500/10 hover:border-yellow-500/30 transition">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-yellow-400" />
                          <span className="text-sm font-medium">{trip.from || 'Unknown'} → {trip.to || 'Unknown'}</span>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          trip.status === 'COMPLETED' 
                            ? 'bg-green-500/20 text-green-400' 
                            : trip.status === 'IN_PROGRESS'
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-gray-500/20 text-gray-400'
                        }`}>
                          {trip.status?.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm text-gray-400">
                        <span>{formatDate(trip.date)} · {trip.distance || 0} km</span>
                        <span className="text-yellow-400">{formatCurrency(trip.fare || 0)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-4">No recent trips</p>
              )}
            </div>

            {/* Monthly Performance Chart */}
            {monthlyPerformance && monthlyPerformance.length > 0 && (
              <div className="bg-slate-800/50 backdrop-blur-sm border border-yellow-500/20 rounded-2xl p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-yellow-400" />
                  Monthly Performance
                </h3>
                <div className="space-y-2">
                  {monthlyPerformance.map((perf, index) => (
                    <div key={index} className="flex items-center justify-between p-2 hover:bg-slate-700/30 rounded-lg transition">
                      <span className="text-sm text-gray-400">{perf.month}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-sm">{perf.trips} trips</span>
                        <span className="text-sm text-green-400">{formatCurrency(perf.income)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
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