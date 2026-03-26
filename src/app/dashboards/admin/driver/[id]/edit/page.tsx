// app/dashboards/admin/drivers/[id]/edit/page.tsx
"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  IdCard,
  Car,
  Truck,
  Save,
  X,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Edit,
  Users,
  Calendar,
  Clock,
  Activity,
  Star,
  Award,
  TrendingUp,
  AlertCircle,
  Key,
  MapPin,
  Fuel,
  Wrench,
  DollarSign,
  Info,
  RefreshCw,
  UserCheck,
  UserX,
  ChevronRight,
  ChevronLeft,
  Search,
  Filter,
  Eye,
  Trash2,
  FileText  // Add this line
} from "lucide-react";

// Firebase imports
let auth: any = null;
let onAuthStateChanged: any = null;

interface Driver {
  id: string;
  userId: string;
  licenseNumber: string;
  status: 'ACTIVE' | 'OFF_DUTY' | 'ON_LEAVE' | 'SUSPENDED' | 'TERMINATED';
  createdAt: string;
  updatedAt: string;
  user: {
    name: string;
    email: string;
    phone: string;
    avatar?: string | null;
  };
  assignedVehicle?: Vehicle | null;
  performance?: {
    tripsCount: number;
    totalIncome: number;
    totalExpenses: number;
    netProfit: number;
    rating: number;
    fuelEfficiency: number;
  };
  stats?: {
    todayTrips: number;
    weekTrips: number;
    monthTrips: number;
    totalTrips: number;
    todayEarnings: number;
    weekEarnings: number;
    monthEarnings: number;
    totalEarnings: number;
  };
}

interface Vehicle {
  id: string;
  plateNumber: string;
  model: string;
  capacity: number;
  status: 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE' | 'OUT_OF_SERVICE';
  driverId: string | null;
  mainImage?: string | null;
  _count?: {
    trips: number;
  };
}

interface AvailableVehicle extends Vehicle {
  isAssigned: boolean;
}

function EditDriverContent() {
  const router = useRouter();
  const params = useParams();
  const driverId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [driver, setDriver] = useState<Driver | null>(null);
  const [availableVehicles, setAvailableVehicles] = useState<AvailableVehicle[]>([]);
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [searchVehicleTerm, setSearchVehicleTerm] = useState('');
  const [firebaseReady, setFirebaseReady] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'performance' | 'documents'>('details');
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    licenseNumber: '',
    status: 'ACTIVE'
  });

  // Load Firebase
  useEffect(() => {
    const loadFirebase = async () => {
      try {
        const firebaseModule = await import('../../../../../../lib/firebase/client');
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

    return () => unsubscribe();
  }, [driverId, firebaseReady]);

  const loadDriverData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const user = auth?.currentUser;
      if (!user) {
        router.push('/auth/login');
        return;
      }
      
      const token = await user.getIdToken();
      
      // Load driver details
      const driverResponse = await fetch(`/api/admin/drivers/${driverId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!driverResponse.ok) {
        if (driverResponse.status === 404) {
          throw new Error('Driver not found');
        }
        throw new Error('Failed to load driver data');
      }
      
      const driverData = await driverResponse.json();
      setDriver(driverData);
      setFormData({
        name: driverData.user?.name || '',
        email: driverData.user?.email || '',
        phone: driverData.user?.phone || '',
        licenseNumber: driverData.licenseNumber || '',
        status: driverData.status || 'ACTIVE'
      });
      
      // Load available vehicles (unassigned)
      const vehiclesResponse = await fetch('/api/admin/vehicles?limit=100', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (vehiclesResponse.ok) {
        const vehiclesData = await vehiclesResponse.json();
        const allVehicles = vehiclesData.vehicles || [];
        
        // Mark which vehicle is currently assigned to this driver
        const vehiclesWithAssignment = allVehicles.map((vehicle: Vehicle) => ({
          ...vehicle,
          isAssigned: vehicle.driverId === driverId
        }));
        
        setAvailableVehicles(vehiclesWithAssignment);
      }
      
    } catch (error: any) {
      console.error('Error loading driver data:', error);
      setError(error.message || 'Failed to load driver data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    
    try {
      const user = auth?.currentUser;
      if (!user) {
        router.push('/auth/login');
        return;
      }
      
      const token = await user.getIdToken();
      
      const response = await fetch(`/api/admin/drivers/${driverId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          licenseNumber: formData.licenseNumber,
          status: formData.status
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update driver');
      }
      
      setSuccess('Driver updated successfully!');
      
      // Reload data to refresh
      await loadDriverData();
      
      setTimeout(() => setSuccess(null), 3000);
      
    } catch (error: any) {
      console.error('Error updating driver:', error);
      setError(error.message || 'Failed to update driver');
    } finally {
      setSaving(false);
    }
  };

  const handleAssignVehicle = async (vehicleId: string | null) => {
    setSaving(true);
    setError(null);
    
    try {
      const user = auth?.currentUser;
      if (!user) {
        router.push('/auth/login');
        return;
      }
      
      const token = await user.getIdToken();
      
      const response = await fetch(`/api/admin/drivers/${driverId}/vehicle`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ vehicleId }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to assign vehicle');
      }
      
      setSuccess(vehicleId ? 'Vehicle assigned successfully!' : 'Vehicle unassigned successfully!');
      setShowVehicleModal(false);
      
      // Reload data to refresh
      await loadDriverData();
      
      setTimeout(() => setSuccess(null), 3000);
      
    } catch (error: any) {
      console.error('Error assigning vehicle:', error);
      setError(error.message || 'Failed to assign vehicle');
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      case 'OFF_DUTY':
        return 'text-gray-400 bg-gray-500/10 border-gray-500/30';
      case 'ON_LEAVE':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      case 'SUSPENDED':
        return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
      case 'TERMINATED':
        return 'text-red-400 bg-red-500/10 border-red-500/30';
      default:
        return 'text-gray-400 bg-gray-500/10 border-gray-500/30';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'Active';
      case 'OFF_DUTY':
        return 'Off Duty';
      case 'ON_LEAVE':
        return 'On Leave';
      case 'SUSPENDED':
        return 'Suspended';
      case 'TERMINATED':
        return 'Terminated';
      default:
        return status;
    }
  };

  const getRatingStars = (rating: number = 0) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - Math.ceil(rating);
    
    return (
      <div className="flex items-center gap-0.5">
        {[...Array(fullStars)].map((_, i) => (
          <Star key={`full-${i}`} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
        ))}
        {hasHalfStar && <Star className="w-4 h-4 fill-yellow-400 text-yellow-400 half-star" />}
        {[...Array(emptyStars)].map((_, i) => (
          <Star key={`empty-${i}`} className="w-4 h-4 text-gray-600" />
        ))}
      </div>
    );
  };

  const filteredVehicles = availableVehicles.filter(vehicle =>
    vehicle.plateNumber.toLowerCase().includes(searchVehicleTerm.toLowerCase()) ||
    vehicle.model.toLowerCase().includes(searchVehicleTerm.toLowerCase())
  );

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
            <User className="w-8 h-8 text-yellow-400 absolute top-6 left-1/2 -translate-x-1/2 animate-pulse" />
          </div>
          <p className="text-gray-400 mt-4">Loading driver details...</p>
        </div>
      </div>
    );
  }

  if (!driver && !loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-10 h-10 text-rose-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">Driver Not Found</h2>
          <p className="text-gray-400 mb-6">The driver you're looking for doesn't exist or has been removed.</p>
          <Link
            href="/dashboards/admin/drivers"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-yellow-400 to-amber-500 text-black rounded-xl font-semibold hover:from-yellow-300 hover:to-amber-400 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Drivers
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-96 h-96 bg-yellow-500/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl animate-pulse animation-delay-2000"></div>
      </div>

      {/* Header */}
      <div className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-xl border-b border-yellow-500/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboards/admin/drivers"
                className="p-2 hover:bg-slate-800 rounded-xl border border-yellow-500/20 transition"
              >
                <ArrowLeft className="w-5 h-5 text-gray-400" />
              </Link>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-lg flex items-center justify-center shadow-lg shadow-yellow-500/30">
                    <Edit className="w-4 h-4 text-black" />
                  </div>
                  <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                    Edit Driver
                  </h1>
                </div>
                <p className="text-xs sm:text-sm text-gray-500 flex items-center gap-2">
                  <User className="w-3 h-3 text-yellow-400" />
                  Updating {driver?.user?.name} • ID: {driver?.licenseNumber}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${getStatusColor(driver?.status || '')}`}>
                Status: {getStatusLabel(driver?.status || '')}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Alerts */}
        {error && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center justify-between animate-shake">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
              <span className="text-sm text-rose-300">{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-300">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        
        {success && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-xl flex items-center justify-between animate-slideDown">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span className="text-sm text-green-300">{success}</span>
            </div>
            <button onClick={() => setSuccess(null)} className="text-green-400 hover:text-green-300">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-yellow-500/20">
          <button
            onClick={() => setActiveTab('details')}
            className={`px-4 py-2 text-sm font-medium transition-all border-b-2 ${
              activeTab === 'details'
                ? 'border-yellow-400 text-yellow-400'
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            <User className="w-4 h-4 inline mr-2" />
            Driver Details
          </button>
          <button
            onClick={() => setActiveTab('performance')}
            className={`px-4 py-2 text-sm font-medium transition-all border-b-2 ${
              activeTab === 'performance'
                ? 'border-yellow-400 text-yellow-400'
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            <Activity className="w-4 h-4 inline mr-2" />
            Performance
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            className={`px-4 py-2 text-sm font-medium transition-all border-b-2 ${
              activeTab === 'documents'
                ? 'border-yellow-400 text-yellow-400'
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            <FileText className="w-4 h-4 inline mr-2" />
            Documents
          </button>
        </div>

        {/* Driver Details Form */}
        {activeTab === 'details' && (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Driver Information Card */}
            <div className="bg-slate-800/50 backdrop-blur-sm border border-yellow-500/20 rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-yellow-400" />
                Personal Information
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Full Name *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full bg-slate-900/50 border border-yellow-500/20 rounded-xl py-2.5 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400/50 focus:ring-1 focus:ring-yellow-400/20 transition"
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Email *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full bg-slate-900/50 border border-yellow-500/20 rounded-xl py-2.5 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400/50 focus:ring-1 focus:ring-yellow-400/20 transition"
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Phone Number *
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      className="w-full bg-slate-900/50 border border-yellow-500/20 rounded-xl py-2.5 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400/50 focus:ring-1 focus:ring-yellow-400/20 transition"
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    License Number *
                  </label>
                  <div className="relative">
                    <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="text"
                      value={formData.licenseNumber}
                      onChange={(e) => setFormData({...formData, licenseNumber: e.target.value})}
                      className="w-full bg-slate-900/50 border border-yellow-500/20 rounded-xl py-2.5 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400/50 focus:ring-1 focus:ring-yellow-400/20 transition"
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    className="w-full bg-slate-900/50 border border-yellow-500/20 rounded-xl py-2.5 px-4 text-white focus:outline-none focus:border-yellow-400/50 focus:ring-1 focus:ring-yellow-400/20 transition"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="OFF_DUTY">Off Duty</option>
                    <option value="ON_LEAVE">On Leave</option>
                    <option value="SUSPENDED">Suspended</option>
                    <option value="TERMINATED">Terminated</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Assigned Vehicle Card */}
            <div className="bg-slate-800/50 backdrop-blur-sm border border-yellow-500/20 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Car className="w-5 h-5 text-yellow-400" />
                  Assigned Vehicle
                </h2>
                <button
                  type="button"
                  onClick={() => setShowVehicleModal(true)}
                  className="px-4 py-2 text-sm bg-yellow-500/20 text-yellow-400 rounded-lg hover:bg-yellow-500/30 transition"
                >
                  {driver?.assignedVehicle ? 'Change Vehicle' : 'Assign Vehicle'}
                </button>
              </div>
              
              {driver?.assignedVehicle ? (
                <div className="p-4 bg-slate-700/30 rounded-lg border border-yellow-500/20">
                  <div className="flex items-center gap-4">
                    {driver.assignedVehicle.mainImage ? (
                      <div className="relative w-16 h-16 rounded-lg overflow-hidden">
                        <Image
                          src={driver.assignedVehicle.mainImage}
                          alt={driver.assignedVehicle.plateNumber}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                    ) : (
                      <div className="w-16 h-16 bg-slate-700 rounded-lg flex items-center justify-center">
                        <Car className="w-8 h-8 text-gray-500" />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="font-medium text-white">{driver.assignedVehicle.plateNumber}</p>
                      <p className="text-sm text-gray-400">{driver.assignedVehicle.model}</p>
                      <p className="text-xs text-gray-500">Capacity: {driver.assignedVehicle.capacity} seats</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAssignVehicle(null)}
                      className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center border-2 border-dashed border-yellow-500/20 rounded-lg">
                  <Car className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-500">No vehicle assigned</p>
                  <p className="text-xs text-gray-600 mt-1">Click "Assign Vehicle" to assign a vehicle to this driver</p>
                </div>
              )}
            </div>

            {/* Form Actions */}
            <div className="flex gap-3 pt-4">
              <Link
                href="/dashboards/admin/drivers"
                className="flex-1 px-4 py-3 bg-slate-700/50 border border-gray-600 rounded-xl text-gray-300 font-medium hover:bg-slate-700 transition text-center"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-yellow-400 to-amber-500 text-black rounded-xl font-medium hover:from-yellow-300 hover:to-amber-400 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Performance Tab */}
        {activeTab === 'performance' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-yellow-500/20">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-gray-500">Total Trips</p>
                  <Activity className="w-4 h-4 text-blue-400" />
                </div>
                <p className="text-2xl font-bold text-white">{driver?.stats?.totalTrips || 0}</p>
              </div>
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-yellow-500/20">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-gray-500">Total Earnings</p>
                  <DollarSign className="w-4 h-4 text-green-400" />
                </div>
                <p className="text-2xl font-bold text-green-400">
                  KES {driver?.stats?.totalEarnings?.toLocaleString() || 0}
                </p>
              </div>
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-yellow-500/20">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-gray-500">Rating</p>
                  <Star className="w-4 h-4 text-yellow-400" />
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold text-white">{driver?.performance?.rating?.toFixed(1) || 'N/A'}</p>
                  {driver?.performance?.rating && getRatingStars(driver.performance.rating)}
                </div>
              </div>
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-yellow-500/20">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-gray-500">Fuel Efficiency</p>
                  <Fuel className="w-4 h-4 text-amber-400" />
                </div>
                <p className="text-2xl font-bold text-white">{driver?.performance?.fuelEfficiency?.toFixed(1) || 'N/A'} km/L</p>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-slate-800/50 backdrop-blur-sm border border-yellow-500/20 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 text-yellow-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">Today's Earnings</p>
                      <p className="text-xs text-gray-500">Trips: {driver?.stats?.todayTrips || 0}</p>
                    </div>
                  </div>
                  <p className="text-lg font-bold text-green-400">KES {driver?.stats?.todayEarnings?.toLocaleString() || 0}</p>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                      <Calendar className="w-4 h-4 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">This Week</p>
                      <p className="text-xs text-gray-500">Trips: {driver?.stats?.weekTrips || 0}</p>
                    </div>
                  </div>
                  <p className="text-lg font-bold text-green-400">KES {driver?.stats?.weekEarnings?.toLocaleString() || 0}</p>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                      <Calendar className="w-4 h-4 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">This Month</p>
                      <p className="text-xs text-gray-500">Trips: {driver?.stats?.monthTrips || 0}</p>
                    </div>
                  </div>
                  <p className="text-lg font-bold text-green-400">KES {driver?.stats?.monthEarnings?.toLocaleString() || 0}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Documents Tab */}
        {activeTab === 'documents' && (
          <div className="bg-slate-800/50 backdrop-blur-sm border border-yellow-500/20 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Driver Documents</h3>
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500">Document management coming soon</p>
              <p className="text-xs text-gray-600 mt-2">Upload and manage driver documents, licenses, and certifications</p>
            </div>
          </div>
        )}
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
                    <p className="text-sm text-gray-400">Select a vehicle to assign to {driver?.user?.name}</p>
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
                    <p className="text-xs text-gray-600 mt-1">All vehicles are currently assigned</p>
                  </div>
                ) : (
                  filteredVehicles.map((vehicle) => (
                    <button
                      key={vehicle.id}
                      onClick={() => handleAssignVehicle(vehicle.id)}
                      disabled={vehicle.isAssigned && vehicle.driverId !== driver?.id}
                      className={`w-full text-left p-4 rounded-xl border transition-all ${
                        vehicle.isAssigned && vehicle.driverId === driver?.id
                          ? 'border-yellow-400 bg-yellow-500/10'
                          : vehicle.isAssigned
                          ? 'border-gray-600 bg-gray-800/50 opacity-50 cursor-not-allowed'
                          : 'border-yellow-500/20 bg-slate-800/50 hover:border-yellow-400/50 hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {vehicle.mainImage ? (
                          <div className="relative w-12 h-12 rounded-lg overflow-hidden">
                            <Image
                              src={vehicle.mainImage}
                              alt={vehicle.plateNumber}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          </div>
                        ) : (
                          <div className="w-12 h-12 bg-slate-700 rounded-lg flex items-center justify-center">
                            <Car className="w-6 h-6 text-gray-500" />
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-white">{vehicle.plateNumber}</p>
                            {vehicle.isAssigned && vehicle.driverId === driver?.id && (
                              <span className="text-xs text-yellow-400">Currently Assigned</span>
                            )}
                            {vehicle.isAssigned && vehicle.driverId !== driver?.id && (
                              <span className="text-xs text-gray-500">Assigned to another driver</span>
                            )}
                          </div>
                          <p className="text-sm text-gray-400">{vehicle.model}</p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {vehicle.capacity} seats
                            </span>
                            <span className="flex items-center gap-1">
                              <Activity className="w-3 h-3" />
                              {vehicle._count?.trips || 0} trips
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))
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
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-2px); }
          20%, 40%, 60%, 80% { transform: translateX(2px); }
        }
        .animate-pulse { animation: pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
        .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
        .animate-slideDown { animation: slideDown 0.3s ease-out; }
        .animate-shake { animation: shake 0.5s ease-in-out; }
        .animation-delay-2000 { animation-delay: 2s; }
        
        .half-star {
          clip-path: polygon(0% 0%, 50% 0%, 50% 100%, 0% 100%);
        }
      `}</style>
    </div>
  );
}

function EditDriverFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-yellow-400/20 border-t-yellow-400 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-400">Loading...</p>
      </div>
    </div>
  );
}

export default function EditDriverPage() {
  return (
    <Suspense fallback={<EditDriverFallback />}>
      <EditDriverContent />
    </Suspense>
  );
}