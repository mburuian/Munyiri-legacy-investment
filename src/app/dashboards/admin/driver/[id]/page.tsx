// src/app/dashboards/admin/drivers/[id]/page.tsx
"use client";

import { useState, useEffect, Suspense } from "react";
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
  Loader2,
  Edit2,
  Save,
  X,
  Check,
  ChevronDown,
  Users,
  Search
} from "lucide-react";

// Firebase will be dynamically imported on client side only
let auth: any = null;
let onAuthStateChanged: any = null;

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

interface VehicleOption {
  id: string;
  plateNumber: string;
  model: string;
  capacity: number;
  status: string;
  driverId: string | null;
}

function DriverDetailContent({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [driverData, setDriverData] = useState<DriverDetailsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [firebaseReady, setFirebaseReady] = useState(false);
  const [availableVehicles, setAvailableVehicles] = useState<VehicleOption[]>([]);
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [searchVehicleTerm, setSearchVehicleTerm] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  // Editable fields state
  const [editablePhone, setEditablePhone] = useState('');
  const [editableLicense, setEditableLicense] = useState('');
  const [editableStatus, setEditableStatus] = useState('');

  // Load Firebase dynamically on client side only
  useEffect(() => {
    const loadFirebase = async () => {
      try {
        const firebaseModule = await import('../../../../../lib/firebase/client');
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
    
    if (!id) {
      setError('Invalid driver ID');
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user: any) => {
      if (!user) {
        router.push('/auth/login');
        return;
      }
      loadDriver();
      loadAvailableVehicles();
    });

    return () => unsubscribe();
  }, [id, firebaseReady]);

  const loadDriver = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const user = auth?.currentUser;
      if (!user) {
        router.push('/auth/login');
        return;
      }
      
      const token = await user.getIdToken();
      
      const response = await fetch(`/api/admin/drivers/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        if (response.status === 404) throw new Error('Driver not found');
        if (response.status === 403) throw new Error('Admin access required');
        if (response.status === 401) {
          router.push('/auth/login');
          return;
        }
        throw new Error('Failed to load driver');
      }
      
      const data = await response.json();
      setDriverData(data);
      setEditablePhone(data.driver?.phone || '');
      setEditableLicense(data.driver?.licenseNumber || '');
      setEditableStatus(data.driver?.status || 'active');
    } catch (error: any) {
      console.error('Error loading driver:', error);
      setError(error.message || 'Failed to load driver');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableVehicles = async () => {
    try {
      const user = auth?.currentUser;
      const token = await user?.getIdToken();
      
      const response = await fetch('/api/admin/vehicles?limit=100', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        const vehicles = data.vehicles || data.items || [];
        setAvailableVehicles(vehicles);
      }
    } catch (error) {
      console.error('Error loading vehicles:', error);
    }
  };

  const handleUpdateField = async (field: string, value: string) => {
    setSaving(true);
    setError(null);
    
    try {
      const user = auth?.currentUser;
      const token = await user?.getIdToken();
      
      const updateData: any = {};
      if (field === 'phone') updateData.phone = value;
      if (field === 'licenseNumber') updateData.licenseNumber = value;
      if (field === 'status') updateData.status = value;
      
      const response = await fetch(`/api/admin/drivers/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });
      
      if (!response.ok) throw new Error('Failed to update');
      
      // Update local state
      if (driverData) {
        setDriverData({
          ...driverData,
          driver: {
            ...driverData.driver,
            [field]: value
          }
        });
      }
      
      setEditingField(null);
      // Show success message briefly
      const successMsg = document.createElement('div');
      successMsg.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-slideDown';
      successMsg.textContent = `${field} updated successfully!`;
      document.body.appendChild(successMsg);
      setTimeout(() => successMsg.remove(), 3000);
      
    } catch (error) {
      console.error('Error updating field:', error);
      setError(`Failed to update ${field}`);
    } finally {
      setSaving(false);
    }
  };

  const handleAssignVehicle = async (vehicleId: string | null) => {
    setSaving(true);
    setError(null);
    
    try {
      const user = auth?.currentUser;
      const token = await user?.getIdToken();
      
      const response = await fetch(`/api/admin/drivers/${id}/vehicle`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ vehicleId })
      });
      
      if (!response.ok) throw new Error('Failed to assign vehicle');
      
      await loadDriver();
      setShowVehicleModal(false);
      
      const successMsg = document.createElement('div');
      successMsg.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-slideDown';
      successMsg.textContent = vehicleId ? 'Vehicle assigned successfully!' : 'Vehicle unassigned successfully!';
      document.body.appendChild(successMsg);
      setTimeout(() => successMsg.remove(), 3000);
      
    } catch (error) {
      console.error('Error assigning vehicle:', error);
      setError('Failed to assign vehicle');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this driver? This action cannot be undone.')) return;
    
    setDeleteLoading(true);
    try {
      const user = auth?.currentUser;
      const token = await user?.getIdToken();
      
      const response = await fetch(`/api/admin/drivers/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Failed to delete driver');
      
      router.push('/dashboards/admin/drivers');
    } catch (error) {
      console.error('Error deleting driver:', error);
      alert('Failed to delete driver');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleExport = () => {
    if (!driverData) return;
    
    const exportData = {
      driver: driverData.driver,
      vehicle: driverData.vehicle,
      stats: driverData.stats,
      monthlyPerformance: driverData.monthlyPerformance
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `driver_${driverData.driver.id}_${new Date().toISOString()}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
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

  const filteredVehicles = availableVehicles.filter(vehicle =>
    vehicle.plateNumber.toLowerCase().includes(searchVehicleTerm.toLowerCase()) ||
    vehicle.model.toLowerCase().includes(searchVehicleTerm.toLowerCase())
  );

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
            href="/dashboards/admin/drivers"
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
  const latestPerformance = performance && performance.length > 0 ? performance[0] : { tripsCount: 0, totalIncome: 0, rating: 0 };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-96 h-96 bg-yellow-500/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl animate-pulse animation-delay-2000"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Header */}
        <div className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-xl border border-yellow-500/20 rounded-2xl mb-6 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboards/admin/drivers"
                className="p-2 hover:bg-slate-800 rounded-xl transition border border-yellow-500/20"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2 flex-wrap">
                  Driver Profile
                  <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getStatusColor(driver.status)}`}>
                    {getStatusIcon(driver.status)}
                    {driver.status?.replace('-', ' ').toUpperCase()}
                  </span>
                </h1>
                <p className="text-xs sm:text-sm text-gray-500">Driver ID: {driver.id}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                disabled={deleteLoading}
                className="px-3 sm:px-4 py-2 bg-rose-500/20 text-rose-400 rounded-xl hover:bg-rose-500/30 transition flex items-center gap-2 border border-rose-500/30 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
              >
                {deleteLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">Delete</span>
              </button>
              <button
                onClick={handleExport}
                className="px-3 sm:px-4 py-2 bg-slate-800 border border-yellow-500/20 rounded-xl text-gray-300 hover:bg-slate-700 transition flex items-center gap-2 text-sm sm:text-base"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Export</span>
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
                {/* Phone - Editable */}
                <div className="flex items-center justify-between p-3 bg-slate-700/30 rounded-xl border border-yellow-500/10 group">
                  <div className="flex items-center gap-3 flex-1">
                    <Phone className="w-5 h-5 text-yellow-400" />
                    <div className="flex-1">
                      <p className="text-xs text-gray-500">Phone</p>
                      {editingField === 'phone' ? (
                        <div className="flex items-center gap-2 mt-1">
                          <input
                            type="tel"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="bg-slate-800 border border-yellow-500/30 rounded-lg px-2 py-1 text-sm text-white"
                            autoFocus
                          />
                          <button
                            onClick={() => handleUpdateField('phone', editValue)}
                            disabled={saving}
                            className="p-1 text-green-400 hover:bg-green-500/20 rounded"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingField(null)}
                            className="p-1 text-rose-400 hover:bg-rose-500/20 rounded"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">{driver.phone || 'Not provided'}</p>
                          <button
                            onClick={() => {
                              setEditValue(driver.phone || '');
                              setEditingField('phone');
                            }}
                            className="opacity-0 group-hover:opacity-100 transition p-1 hover:bg-slate-600 rounded"
                          >
                            <Edit2 className="w-3 h-3 text-gray-400" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* License Number - Editable */}
                <div className="flex items-center justify-between p-3 bg-slate-700/30 rounded-xl border border-yellow-500/10 group">
                  <div className="flex items-center gap-3 flex-1">
                    <IdCard className="w-5 h-5 text-yellow-400" />
                    <div className="flex-1">
                      <p className="text-xs text-gray-500">License Number</p>
                      {editingField === 'license' ? (
                        <div className="flex items-center gap-2 mt-1">
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="bg-slate-800 border border-yellow-500/30 rounded-lg px-2 py-1 text-sm text-white"
                            autoFocus
                          />
                          <button
                            onClick={() => handleUpdateField('licenseNumber', editValue)}
                            disabled={saving}
                            className="p-1 text-green-400 hover:bg-green-500/20 rounded"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingField(null)}
                            className="p-1 text-rose-400 hover:bg-rose-500/20 rounded"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">{driver.licenseNumber}</p>
                          <button
                            onClick={() => {
                              setEditValue(driver.licenseNumber);
                              setEditingField('license');
                            }}
                            className="opacity-0 group-hover:opacity-100 transition p-1 hover:bg-slate-600 rounded"
                          >
                            <Edit2 className="w-3 h-3 text-gray-400" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Status - Editable */}
                <div className="flex items-center justify-between p-3 bg-slate-700/30 rounded-xl border border-yellow-500/10 group">
                  <div className="flex items-center gap-3 flex-1">
                    <Activity className="w-5 h-5 text-yellow-400" />
                    <div className="flex-1">
                      <p className="text-xs text-gray-500">Status</p>
                      {editingField === 'status' ? (
                        <div className="flex items-center gap-2 mt-1">
                          <select
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="bg-slate-800 border border-yellow-500/30 rounded-lg px-2 py-1 text-sm text-white"
                          >
                            <option value="active">Active</option>
                            <option value="off-duty">Off Duty</option>
                            <option value="on-leave">On Leave</option>
                            <option value="suspended">Suspended</option>
                            <option value="terminated">Terminated</option>
                          </select>
                          <button
                            onClick={() => handleUpdateField('status', editValue)}
                            disabled={saving}
                            className="p-1 text-green-400 hover:bg-green-500/20 rounded"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingField(null)}
                            className="p-1 text-rose-400 hover:bg-rose-500/20 rounded"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium capitalize">{driver.status?.replace('-', ' ')}</p>
                          <button
                            onClick={() => {
                              setEditValue(driver.status);
                              setEditingField('status');
                            }}
                            className="opacity-0 group-hover:opacity-100 transition p-1 hover:bg-slate-600 rounded"
                          >
                            <Edit2 className="w-3 h-3 text-gray-400" />
                          </button>
                        </div>
                      )}
                    </div>
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
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Car className="w-5 h-5 text-yellow-400" />
                    Assigned Vehicle
                  </h3>
                  <button
                    onClick={() => setShowVehicleModal(true)}
                    className="px-3 py-1.5 text-sm bg-yellow-500/20 text-yellow-400 rounded-lg hover:bg-yellow-500/30 transition"
                  >
                    Change Vehicle
                  </button>
                </div>
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
                    <button
                      onClick={() => handleAssignVehicle(null)}
                      className="w-full px-4 py-2 bg-rose-500/20 text-rose-400 rounded-lg hover:bg-rose-500/30 transition text-sm"
                    >
                      Unassign Vehicle
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-800/50 backdrop-blur-sm border border-yellow-500/20 rounded-2xl p-6">
                <div className="text-center py-8">
                  <Car className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400">No vehicle assigned</p>
                  <button
                    onClick={() => setShowVehicleModal(true)}
                    className="mt-3 text-sm text-yellow-400 hover:text-yellow-300"
                  >
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
                  href={`/dashboards/admin/drivers/${id}/trips`}
                  className="text-sm text-yellow-400 hover:text-yellow-300"
                >
                  View All
                </Link>
              </div>

              {recentActivity.trips && recentActivity.trips.length > 0 ? (
                <div className="space-y-3">
                  {recentActivity.trips.slice(0, 5).map((trip: any) => (
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
                  {monthlyPerformance.slice(0, 6).map((perf: any, index: number) => (
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

      {/* Vehicle Assignment Modal */}
      {showVehicleModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-gradient-to-b from-slate-900 to-slate-950 rounded-2xl border border-yellow-500/20 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-slate-900/95 backdrop-blur-sm border-b border-yellow-500/20 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-xl flex items-center justify-center">
                    <Car className="w-6 h-6 text-black" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Assign Vehicle</h2>
                    <p className="text-sm text-gray-400">Select a vehicle to assign to {driver.name}</p>
                  </div>
                </div>
                <button onClick={() => setShowVehicleModal(false)} className="p-2 hover:bg-slate-800 rounded-lg transition">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search by plate number or model..."
                  value={searchVehicleTerm}
                  onChange={(e) => setSearchVehicleTerm(e.target.value)}
                  className="w-full bg-slate-800/50 border border-yellow-500/20 rounded-xl py-2.5 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400/50"
                />
              </div>

              {/* Vehicle List */}
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {filteredVehicles.length === 0 ? (
                  <div className="text-center py-8">
                    <Car className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-500">No vehicles available</p>
                    <Link
                      href="/dashboards/admin/vehicles/add-vehicle"
                      className="mt-3 inline-block text-sm text-yellow-400 hover:text-yellow-300"
                    >
                      Add a new vehicle →
                    </Link>
                  </div>
                ) : (
                  filteredVehicles.map((vehicle) => {
                    const isCurrentlyAssigned = vehicle.driverId === id;
                    const isAssignedToOther = !!(vehicle.driverId && vehicle.driverId !== id);
                    
                    return (
                      <button
                        key={vehicle.id}
                        onClick={() => handleAssignVehicle(vehicle.id)}
                        disabled={isAssignedToOther}
                        className={`w-full text-left p-4 rounded-xl border transition-all ${
                          isCurrentlyAssigned
                            ? 'border-yellow-400 bg-yellow-500/10 cursor-not-allowed opacity-75'
                            : isAssignedToOther
                            ? 'border-gray-600 bg-gray-800/50 opacity-50 cursor-not-allowed'
                            : 'border-yellow-500/20 bg-slate-800/50 hover:border-yellow-400/50 hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-slate-700 rounded-lg flex items-center justify-center">
                            <Car className="w-6 h-6 text-gray-500" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <p className="font-medium text-white">{vehicle.plateNumber}</p>
                              {isCurrentlyAssigned && (
                                <span className="text-xs text-yellow-400">Currently Assigned</span>
                              )}
                              {isAssignedToOther && (
                                <span className="text-xs text-gray-500">Assigned to another driver</span>
                              )}
                            </div>
                            <p className="text-sm text-gray-400">{vehicle.model}</p>
                            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {vehicle.capacity} seats
                              </span>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-pulse {
          animation: pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
        .animate-slideDown {
          animation: slideDown 0.3s ease-out;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
      `}</style>
    </div>
  );
}

function DriverDetailFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-yellow-400/20 border-t-yellow-400 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-400">Loading...</p>
      </div>
    </div>
  );
}

export default function DriverDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  
  return (
    <Suspense fallback={<DriverDetailFallback />}>
      <DriverDetailContent id={id} />
    </Suspense>
  );
}