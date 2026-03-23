'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  User,
  Mail,
  Phone,
  IdCard,
  Car,
  Palette,
  Calendar,
  Shield,
  Loader2,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Key,
  Navigation2,
  Radio,
  Users,
  Search,
  X,
  Gauge,
  Fuel,
  Wrench
} from 'lucide-react';

// Firebase will be dynamically imported on client side only
let createUserWithEmailAndPassword: any = null;
let auth: any = null;

interface FormData {
  fullName: string;
  email: string;
  phone: string;
  licenseNumber: string;
  vehicleId: string;
}

interface Vehicle {
  id: string;
  plateNumber: string;
  model: string;
  capacity: number;
  status: string;
  driver?: {
    user: {
      name: string;
    }
  } | null;
  _count?: {
    trips: number;
    maintenance: number;
  };
}

interface SuccessData {
  credentials: {
    email: string;
    password: string;
  };
  driverId: string;
  vehicle: Vehicle;
}

function AdmitDriverForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [vehiclesLoading, setVehiclesLoading] = useState(true);
  const [success, setSuccess] = useState<SuccessData | null>(null);
  const [error, setError] = useState('');
  const [showCredentials, setShowCredentials] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showVehicleDropdown, setShowVehicleDropdown] = useState(false);
  const [firebaseReady, setFirebaseReady] = useState(false);
  
  const [formData, setFormData] = useState<FormData>({
    fullName: '',
    email: '',
    phone: '',
    licenseNumber: '',
    vehicleId: '',
  });

  // Load Firebase dynamically on client side only
  useEffect(() => {
    const loadFirebase = async () => {
      try {
        const firebaseModule = await import('../../../../lib/firebase/client');
        const authModule = await import('firebase/auth');
        
        auth = firebaseModule.auth;
        createUserWithEmailAndPassword = authModule.createUserWithEmailAndPassword;
        setFirebaseReady(true);
      } catch (error) {
        console.error('Failed to load Firebase:', error);
        setError('Failed to initialize authentication');
        setFirebaseReady(true);
      }
    };
    
    loadFirebase();
  }, []);

  // Fetch available vehicles
  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const response = await fetch('/api/admin/vehicles?status=ACTIVE');
        if (!response.ok) throw new Error('Failed to fetch vehicles');
        const data = await response.json();
        
        // Filter unassigned vehicles client-side
        const availableVehicles = (data.vehicles || []).filter((v: any) => !v.driverId);
        setVehicles(availableVehicles);
      } catch (error) {
        console.error('Error fetching vehicles:', error);
        setError('Failed to load available vehicles');
      } finally {
        setVehiclesLoading(false);
      }
    };

    fetchVehicles();
  }, []);

  // Filter vehicles based on search
  const filteredVehicles = vehicles.filter(vehicle => 
    vehicle.plateNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vehicle.model.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedVehicle = vehicles.find(v => v.id === formData.vehicleId);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleVehicleSelect = (vehicle: Vehicle) => {
    setFormData(prev => ({
      ...prev,
      vehicleId: vehicle.id,
    }));
    setShowVehicleDropdown(false);
    setSearchTerm('');
  };

  const generatePassword = () => {
    const length = 10;
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * charset.length);
      password += charset[randomIndex];
    }
    return password;
  };

  const validateForm = (): boolean => {
    if (!formData.fullName.trim()) {
      setError('Full name is required');
      return false;
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      setError('Valid email is required');
      return false;
    }
    if (!formData.phone.trim()) {
      setError('Phone number is required');
      return false;
    }
    if (!formData.licenseNumber.trim()) {
      setError('License number is required');
      return false;
    }
    if (!formData.vehicleId) {
      setError('Please select a vehicle to assign');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(null);

    if (!firebaseReady || !auth || !createUserWithEmailAndPassword) {
      setError('Authentication is initializing. Please wait.');
      return;
    }

    if (!validateForm()) return;

    setLoading(true);

    try {
      // Generate temporary password
      const tempPassword = generatePassword();

      // Create user in Firebase
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        formData.email, 
        tempPassword
      );
      
      const firebaseUser = userCredential.user;

      // Create driver in database
      const response = await fetch('/api/admin/drivers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          licenseNumber: formData.licenseNumber,
          status: 'active',
          vehicleId: formData.vehicleId,
        }),
      });

      if (!response.ok) {
        // If driver creation fails, delete the Firebase user
        await firebaseUser.delete();
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create driver record');
      }

      const driverData = await response.json();

      setSuccess({
        credentials: {
          email: formData.email,
          password: tempPassword,
        },
        driverId: driverData.id,
        vehicle: selectedVehicle!,
      });
      
      // Reset form
      setFormData({
        fullName: '',
        email: '',
        phone: '',
        licenseNumber: '',
        vehicleId: '',
      });

      setShowCredentials(true);

    } catch (err: any) {
      console.error('Error admitting driver:', err);
      
      if (err.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists. Please use a different email.');
      } else {
        setError(err.message || 'Failed to admit driver');
      }
    } finally {
      setLoading(false);
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
    <>
      {/* Success Modal */}
      {showCredentials && success && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-2xl border border-yellow-500/20 max-w-md w-full p-6 shadow-2xl">
            <div className="text-center mb-4">
              <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-yellow-400" />
              </div>
              <h3 className="text-xl font-bold text-white">Driver Admitted Successfully!</h3>
              <p className="text-sm text-gray-400 mt-1">
                The driver has been added to the system
              </p>
            </div>

            {/* Assigned Vehicle Info */}
            <div className="bg-slate-800/50 border border-yellow-500/20 rounded-xl p-4 mb-4">
              <h4 className="font-medium text-yellow-400 mb-2 flex items-center gap-2">
                <Car className="w-4 h-4" />
                Assigned Vehicle
              </h4>
              <div className="space-y-1 text-sm">
                <p className="text-gray-300">
                  <span className="text-gray-500">Plate:</span> {success.vehicle.plateNumber}
                </p>
                <p className="text-gray-300">
                  <span className="text-gray-500">Model:</span> {success.vehicle.model}
                </p>
                <p className="text-gray-300">
                  <span className="text-gray-500">Capacity:</span> {success.vehicle.capacity} seats
                </p>
              </div>
            </div>

            {/* Credentials */}
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <Key className="w-4 h-4 text-amber-400" />
                <h4 className="font-medium text-amber-400">Temporary Login Credentials</h4>
              </div>
              <div className="space-y-2 text-sm">
                <p className="text-amber-300">
                  <span className="font-medium">Email:</span> {success.credentials.email}
                </p>
                <p className="text-amber-300">
                  <span className="font-medium">Temporary Password:</span> {success.credentials.password}
                </p>
              </div>
              <p className="text-xs text-amber-400/70 mt-3">
                ⚠️ Share these credentials securely with the driver
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowCredentials(false)}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-yellow-400 to-amber-500 text-black rounded-xl font-medium hover:from-yellow-300 hover:to-amber-400 transition"
              >
                Got it
              </button>
              <button
                onClick={() => {
                  setShowCredentials(false);
                  router.push('/dashboards/admin/drivers');
                }}
                className="px-4 py-2 border border-yellow-500/20 text-gray-300 rounded-xl font-medium hover:bg-slate-800 transition"
              >
                View All Drivers
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
          <p className="text-rose-400 text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Driver Details Card */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-yellow-500/20 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 bg-slate-900/50 border-b border-yellow-500/20">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <User className="w-5 h-5 text-yellow-400" />
              Driver Details
            </h2>
          </div>
          
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Full Name <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  className="w-full bg-slate-900/50 border border-yellow-500/20 rounded-xl py-2.5 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400/20 transition"
                  placeholder="John Doe"
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full bg-slate-900/50 border border-yellow-500/20 rounded-xl py-2.5 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400/20 transition"
                  placeholder="driver@example.com"
                  required
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Phone Number <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full bg-slate-900/50 border border-yellow-500/20 rounded-xl py-2.5 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400/20 transition"
                  placeholder="+254 712 345 678"
                  required
                />
              </div>
            </div>

            {/* License Number */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                License Number <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  name="licenseNumber"
                  value={formData.licenseNumber}
                  onChange={handleChange}
                  className="w-full bg-slate-900/50 border border-yellow-500/20 rounded-xl py-2.5 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400/20 transition"
                  placeholder="DL-1234-5678"
                  required
                />
              </div>
            </div>
          </div>
        </div>

        {/* Vehicle Assignment Card */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-yellow-500/20 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 bg-slate-900/50 border-b border-yellow-500/20">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Car className="w-5 h-5 text-yellow-400" />
              Assign Vehicle
            </h2>
          </div>
          
          <div className="p-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Select Vehicle <span className="text-rose-400">*</span>
            </label>
            
            {/* Vehicle Search/Select */}
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  placeholder={selectedVehicle ? selectedVehicle.plateNumber : "Search by plate number or model..."}
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setShowVehicleDropdown(true);
                  }}
                  onFocus={() => setShowVehicleDropdown(true)}
                  className="w-full bg-slate-900/50 border border-yellow-500/20 rounded-xl py-2.5 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400/20 transition"
                  disabled={vehiclesLoading}
                />
                {selectedVehicle && (
                  <button
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, vehicleId: '' }));
                      setSearchTerm('');
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-700 rounded-lg transition"
                  >
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                )}
              </div>

              {/* Vehicle Dropdown */}
              {showVehicleDropdown && !selectedVehicle && (
                <div className="absolute z-10 mt-2 w-full bg-slate-800 border border-yellow-500/20 rounded-xl shadow-2xl max-h-96 overflow-y-auto">
                  {vehiclesLoading ? (
                    <div className="p-4 text-center text-gray-500">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                      Loading vehicles...
                    </div>
                  ) : filteredVehicles.length > 0 ? (
                    filteredVehicles.map((vehicle) => (
                      <button
                        key={vehicle.id}
                        type="button"
                        onClick={() => handleVehicleSelect(vehicle)}
                        className="w-full px-4 py-3 text-left hover:bg-slate-700 transition border-b border-yellow-500/10 last:border-0"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-yellow-500/20 to-amber-600/20 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Car className="w-5 h-5 text-yellow-400" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <p className="font-medium text-white">{vehicle.plateNumber}</p>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                vehicle.status === 'ACTIVE' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                              }`}>
                                {vehicle.status}
                              </span>
                            </div>
                            <p className="text-sm text-gray-400">{vehicle.model}</p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {vehicle.capacity} seats
                              </span>
                              <span className="flex items-center gap-1">
                                <Gauge className="w-3 h-3" />
                                {vehicle._count?.trips || 0} trips
                              </span>
                              <span className="flex items-center gap-1">
                                <Wrench className="w-3 h-3" />
                                {vehicle._count?.maintenance || 0} maint
                              </span>
                            </div>
                          </div>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="p-8 text-center">
                      <Car className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-400 font-medium mb-1">No vehicles available</p>
                      <p className="text-sm text-gray-600 mb-4">All vehicles are currently assigned</p>
                      <Link
                        href="/dashboards/admin/vehicles/add"
                        className="inline-flex items-center gap-2 text-sm text-yellow-400 hover:text-yellow-300"
                      >
                        Add New Vehicle →
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Selected Vehicle Info */}
            {selectedVehicle && (
              <div className="mt-4 p-4 bg-slate-900/50 border border-yellow-500/20 rounded-xl">
                <h4 className="text-sm font-medium text-yellow-400 mb-3 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Selected Vehicle Details
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Plate Number</p>
                    <p className="font-medium text-white">{selectedVehicle.plateNumber}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Model</p>
                    <p className="font-medium text-white">{selectedVehicle.model}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Capacity</p>
                    <p className="font-medium text-white">{selectedVehicle.capacity} seats</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Status</p>
                    <p className={`font-medium ${
                      selectedVehicle.status === 'ACTIVE' ? 'text-green-400' : 'text-gray-400'
                    }`}>
                      {selectedVehicle.status}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {!vehiclesLoading && vehicles.length === 0 && (
              <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                <p className="text-amber-400 text-sm">
                  No available vehicles found. Please add a vehicle first.
                </p>
                <Link
                  href="/dashboards/admin/vehicles/add"
                  className="mt-2 inline-flex items-center gap-2 text-sm text-yellow-400 hover:text-yellow-300"
                >
                  Add Vehicle →
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-3">
          <Link
            href="/dashboards/admin/drivers"
            className="px-6 py-3 border border-yellow-500/20 rounded-xl text-gray-300 font-medium hover:bg-slate-800 transition"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading || vehiclesLoading || !selectedVehicle || !firebaseReady}
            className="px-8 py-3 bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-medium rounded-xl shadow-lg shadow-yellow-500/30 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:from-yellow-300 hover:to-amber-400 transition"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Admitting Driver...
              </>
            ) : (
              'Admit Driver'
            )}
          </button>
        </div>
      </form>
    </>
  );
}

function AdmitDriverFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-yellow-400/20 border-t-yellow-400 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-400">Loading...</p>
      </div>
    </div>
  );
}

export default function AdmitDriverPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-gray-100">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-96 h-96 bg-yellow-500/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl animate-pulse animation-delay-2000"></div>
      </div>

      {/* Header */}
      <div className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-xl border-b border-yellow-500/20">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboards/admin/drivers"
              className="p-2 hover:bg-slate-800 rounded-xl transition border border-yellow-500/20"
            >
              <ArrowLeft className="w-5 h-5 text-gray-400" />
            </Link>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-lg flex items-center justify-center">
                  <Users className="w-4 h-4 text-black" />
                </div>
                <h1 className="text-2xl font-bold text-white">Admit New Driver</h1>
              </div>
              <p className="text-sm text-gray-500 flex items-center gap-2">
                <Radio className="w-3 h-3 text-yellow-400" />
                Add a new driver and assign an existing vehicle
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <Suspense fallback={<AdmitDriverFallback />}>
          <AdmitDriverForm />
        </Suspense>
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