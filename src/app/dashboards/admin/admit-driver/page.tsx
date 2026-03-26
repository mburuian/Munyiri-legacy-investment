'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
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
  Wrench,
  Star,
  Award,
  TrendingUp,
  MapPin,
  Clock,
  Check,
  ChevronRight,
  Filter,
  Grid3x3,
  List,
  Eye,
  Info,
  Hash,
  CalendarDays,
  CreditCard,
  DollarSign,
  Battery,
  Settings,
  Truck,
  Briefcase,
  FileText,
  Activity,
  PlusCircle
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
  make?: string;
  year?: number;
  color?: string;
  fuelType?: string;
  currentOdometer?: number;
  dailyTarget?: number;
  monthlyTarget?: number;
  driver?: {
    user: {
      name: string;
    }
  } | null;
  _count?: {
    trips: number;
    maintenance: number;
    incomeLogs: number;
    expenses: number;
  };
  mainImage?: string | null;
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
  const [filteredVehicles, setFilteredVehicles] = useState<Vehicle[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterType, setFilterType] = useState<'all' | 'high-performance' | 'low-usage'>('all');
  const [firebaseReady, setFirebaseReady] = useState(false);
  const [formStep, setFormStep] = useState<'details' | 'vehicle'>('details');
  
  const [formData, setFormData] = useState<FormData>({
    fullName: '',
    email: '',
    phone: '',
    licenseNumber: '',
    vehicleId: '',
  });

  // Check if driver details are complete
  const isDriverDetailsComplete = () => {
    return formData.fullName.trim() !== '' && 
           formData.email.trim() !== '' && 
           formData.email.includes('@') && 
           formData.phone.trim() !== '' && 
           formData.licenseNumber.trim() !== '';
  };

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
        
        // Filter unassigned vehicles
        const availableVehicles = (data.vehicles || []).filter((v: any) => !v.driverId);
        setVehicles(availableVehicles);
        setFilteredVehicles(availableVehicles);
      } catch (error) {
        console.error('Error fetching vehicles:', error);
        setError('Failed to load available vehicles');
      } finally {
        setVehiclesLoading(false);
      }
    };

    fetchVehicles();
  }, []);

  // Filter and sort vehicles
  useEffect(() => {
    let filtered = [...vehicles];
    
    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(vehicle => 
        vehicle.plateNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vehicle.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (vehicle.make?.toLowerCase() || '').includes(searchTerm.toLowerCase())
      );
    }
    
    // Performance filter
    if (filterType === 'high-performance') {
      filtered = filtered.filter(v => (v._count?.trips || 0) > 50);
    } else if (filterType === 'low-usage') {
      filtered = filtered.filter(v => (v._count?.trips || 0) < 10);
    }
    
    // Sort by trips count (most active first)
    filtered.sort((a, b) => (b._count?.trips || 0) - (a._count?.trips || 0));
    
    setFilteredVehicles(filtered);
  }, [vehicles, searchTerm, filterType]);

  const handleVehicleSelect = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setFormData(prev => ({
      ...prev,
      vehicleId: vehicle.id,
    }));
    setSearchTerm('');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
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

  const handleNextStep = () => {
    if (!formData.fullName.trim()) {
      setError('Full name is required');
      return;
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      setError('Valid email is required');
      return;
    }
    if (!formData.phone.trim()) {
      setError('Phone number is required');
      return;
    }
    if (!formData.licenseNumber.trim()) {
      setError('License number is required');
      return;
    }
    
    // Clear any existing errors
    setError('');
    // Move to vehicle selection step
    setFormStep('vehicle');
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

  const getVehiclePerformanceIcon = (trips: number = 0) => {
    if (trips > 100) return <Award className="w-4 h-4 text-amber-400" />;
    if (trips > 50) return <Star className="w-4 h-4 text-yellow-400" />;
    if (trips > 25) return <TrendingUp className="w-4 h-4 text-green-400" />;
    return <Activity className="w-4 h-4 text-gray-400" />;
  };

  // Calculate progress percentage
  const getProgressPercentage = () => {
    if (formStep === 'details') {
      const fields = [formData.fullName, formData.email, formData.phone, formData.licenseNumber];
      const filledCount = fields.filter(f => f.trim() !== '').length;
      return (filledCount / 4) * 50;
    } else {
      return selectedVehicle ? 100 : 75;
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
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-gradient-to-b from-slate-900 to-slate-950 rounded-2xl border border-yellow-500/20 max-w-md w-full p-6 shadow-2xl">
            <div className="text-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-black" />
              </div>
              <h3 className="text-xl font-bold text-white">Driver Admitted Successfully!</h3>
              <p className="text-sm text-gray-400 mt-1">
                The driver has been added to the system
              </p>
            </div>

            {/* Assigned Vehicle Info */}
            <div className="bg-slate-800/50 border border-yellow-500/20 rounded-xl p-4 mb-4">
              <h4 className="font-medium text-yellow-400 mb-3 flex items-center gap-2">
                <Car className="w-4 h-4" />
                Assigned Vehicle
              </h4>
              <div className="flex items-center gap-3">
                {success.vehicle.mainImage ? (
                  <div className="relative w-16 h-16 rounded-lg overflow-hidden">
                    <Image
                      src={success.vehicle.mainImage}
                      alt={success.vehicle.plateNumber}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                ) : (
                  <div className="w-16 h-16 bg-slate-700 rounded-lg flex items-center justify-center">
                    <Car className="w-8 h-8 text-yellow-400" />
                  </div>
                )}
                <div className="flex-1">
                  <p className="font-medium text-white">{success.vehicle.plateNumber}</p>
                  <p className="text-sm text-gray-400">{success.vehicle.model}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Users className="w-3 h-3 text-gray-500" />
                    <span className="text-xs text-gray-500">{success.vehicle.capacity} seats</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Credentials */}
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <Key className="w-4 h-4 text-amber-400" />
                <h4 className="font-medium text-amber-400">Temporary Login Credentials</h4>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Email:</span>
                  <span className="text-amber-300 font-mono text-xs">{success.credentials.email}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Password:</span>
                  <span className="text-amber-300 font-mono text-xs">{success.credentials.password}</span>
                </div>
              </div>
              <p className="text-xs text-amber-400/70 mt-3 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Share these credentials securely with the driver
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowCredentials(false);
                  router.push('/dashboards/admin/drivers');
                }}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-yellow-400 to-amber-500 text-black rounded-xl font-medium hover:from-yellow-300 hover:to-amber-400 transition"
              >
                View All Drivers
              </button>
              <button
                onClick={() => {
                  setShowCredentials(false);
                  setFormStep('details');
                  setFormData({
                    fullName: '',
                    email: '',
                    phone: '',
                    licenseNumber: '',
                    vehicleId: '',
                  });
                  setSelectedVehicle(null);
                }}
                className="px-4 py-2 border border-yellow-500/20 text-gray-300 rounded-xl font-medium hover:bg-slate-800 transition"
              >
                Admit Another
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-3 animate-shake">
          <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
          <p className="text-rose-400 text-sm flex-1">{error}</p>
          <button onClick={() => setError('')} className="text-rose-400 hover:text-rose-300">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => formStep === 'vehicle' && setFormStep('details')}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                formStep === 'details' 
                  ? 'bg-yellow-500 text-black' 
                  : formStep === 'vehicle' 
                    ? 'bg-yellow-500/30 text-yellow-400 cursor-pointer hover:bg-yellow-500/50'
                    : 'bg-slate-700 text-gray-400'
              }`}
            >
              1
            </button>
            <div className={`h-0.5 w-16 transition-all ${formStep === 'vehicle' ? 'bg-yellow-500' : 'bg-slate-700'}`} />
            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
              formStep === 'vehicle' 
                ? 'bg-yellow-500 text-black' 
                : 'bg-slate-700 text-gray-400'
            }`}>
              2
            </div>
          </div>
          <div className="text-sm text-gray-500">
            Step {formStep === 'details' ? '1' : '2'} of 2
          </div>
        </div>
        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full transition-all duration-500"
            style={{ width: `${getProgressPercentage()}%` }}
          />
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Driver Details Card */}
        {formStep === 'details' && (
          <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-yellow-500/20 rounded-2xl overflow-hidden animate-slideUp">
            <div className="px-6 py-4 bg-gradient-to-r from-slate-900/50 to-slate-800/50 border-b border-yellow-500/20">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <User className="w-5 h-5 text-yellow-400" />
                Driver Details
              </h2>
              <p className="text-xs text-gray-500 mt-1 ml-7">Personal information and license details</p>
            </div>
            
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Full Name <span className="text-rose-400">*</span>
                </label>
                <div className="relative group">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-yellow-400 transition" />
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    className="w-full bg-slate-900/50 border border-yellow-500/20 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400/20 transition"
                    placeholder="John Doe"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email <span className="text-rose-400">*</span>
                </label>
                <div className="relative group">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-yellow-400 transition" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full bg-slate-900/50 border border-yellow-500/20 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400/20 transition"
                    placeholder="driver@example.com"
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Phone Number <span className="text-rose-400">*</span>
                </label>
                <div className="relative group">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-yellow-400 transition" />
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full bg-slate-900/50 border border-yellow-500/20 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400/20 transition"
                    placeholder="+254 712 345 678"
                  />
                </div>
              </div>

              {/* License Number */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  License Number <span className="text-rose-400">*</span>
                </label>
                <div className="relative group">
                  <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-yellow-400 transition" />
                  <input
                    type="text"
                    name="licenseNumber"
                    value={formData.licenseNumber}
                    onChange={handleChange}
                    className="w-full bg-slate-900/50 border border-yellow-500/20 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400/20 transition"
                    placeholder="DL-1234-5678"
                  />
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-yellow-500/20 flex justify-end">
              <button
                type="button"
                onClick={handleNextStep}
                disabled={!isDriverDetailsComplete()}
                className={`px-6 py-2 rounded-xl font-medium flex items-center gap-2 transition ${
                  isDriverDetailsComplete()
                    ? 'bg-gradient-to-r from-yellow-400 to-amber-500 text-black hover:from-yellow-300 hover:to-amber-400'
                    : 'bg-slate-700 text-gray-500 cursor-not-allowed'
                }`}
              >
                Next: Select Vehicle
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Vehicle Assignment Card */}
        {formStep === 'vehicle' && (
          <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-yellow-500/20 rounded-2xl overflow-hidden animate-slideUp">
            <div className="px-6 py-4 bg-gradient-to-r from-slate-900/50 to-slate-800/50 border-b border-yellow-500/20">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Car className="w-5 h-5 text-yellow-400" />
                    Assign Vehicle
                  </h2>
                  <p className="text-xs text-gray-500 mt-1 ml-7">Select an available vehicle from the fleet</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-lg transition ${viewMode === 'grid' ? 'bg-yellow-500/20 text-yellow-400' : 'text-gray-500 hover:text-gray-300'}`}
                  >
                    <Grid3x3 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-lg transition ${viewMode === 'list' ? 'bg-yellow-500/20 text-yellow-400' : 'text-gray-500 hover:text-gray-300'}`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              {/* Search and Filters */}
              <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search by plate number, model, or make..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-900/50 border border-yellow-500/20 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400/50 focus:ring-1 focus:ring-yellow-400/20 transition"
                  />
                </div>
                <div className="flex gap-2">
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as any)}
                    className="bg-slate-900/50 border border-yellow-500/20 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-yellow-400/50"
                  >
                    <option value="all">All Vehicles</option>
                    <option value="high-performance">High Performance</option>
                    <option value="low-usage">Low Usage</option>
                  </select>
                </div>
              </div>

              {vehiclesLoading ? (
                <div className="text-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-yellow-400 mx-auto mb-3" />
                  <p className="text-gray-500">Loading available vehicles...</p>
                </div>
              ) : filteredVehicles.length > 0 ? (
                viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[500px] overflow-y-auto">
                    {filteredVehicles.map((vehicle) => (
                      <button
                        key={vehicle.id}
                        type="button"
                        onClick={() => handleVehicleSelect(vehicle)}
                        className={`group text-left transition-all rounded-xl p-4 border-2 ${
                          selectedVehicle?.id === vehicle.id
                            ? 'border-yellow-400 bg-yellow-500/10'
                            : 'border-yellow-500/20 bg-slate-800/50 hover:border-yellow-400/50 hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-16 h-16 bg-gradient-to-br from-yellow-500/20 to-amber-600/20 rounded-xl flex items-center justify-center flex-shrink-0">
                            <Car className="w-8 h-8 text-yellow-400" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-1">
                              <div>
                                <h3 className="font-semibold text-white group-hover:text-yellow-400 transition">
                                  {vehicle.plateNumber}
                                </h3>
                                <p className="text-xs text-gray-500">{vehicle.model}</p>
                              </div>
                              {getVehiclePerformanceIcon(vehicle._count?.trips)}
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2 mt-2">
                              <div className="flex items-center gap-1">
                                <Users className="w-3 h-3 text-gray-500" />
                                <span className="text-xs text-gray-400">{vehicle.capacity} seats</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Gauge className="w-3 h-3 text-gray-500" />
                                <span className="text-xs text-gray-400">{vehicle._count?.trips || 0} trips</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Fuel className="w-3 h-3 text-gray-500" />
                                <span className="text-xs text-gray-400">{vehicle.fuelType || 'N/A'}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Wrench className="w-3 h-3 text-gray-500" />
                                <span className="text-xs text-gray-400">{vehicle._count?.maintenance || 0} maint</span>
                              </div>
                            </div>

                            {selectedVehicle?.id === vehicle.id && (
                              <div className="mt-2 flex items-center gap-1 text-green-400">
                                <Check className="w-3 h-3" />
                                <span className="text-xs">Selected</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[500px] overflow-y-auto">
                    {filteredVehicles.map((vehicle) => (
                      <button
                        key={vehicle.id}
                        type="button"
                        onClick={() => handleVehicleSelect(vehicle)}
                        className={`w-full text-left transition-all rounded-xl p-4 border ${
                          selectedVehicle?.id === vehicle.id
                            ? 'border-yellow-400 bg-yellow-500/10'
                            : 'border-yellow-500/20 bg-slate-800/50 hover:border-yellow-400/50 hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-yellow-500/20 to-amber-600/20 rounded-lg flex items-center justify-center">
                              <Car className="w-6 h-6 text-yellow-400" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-white">{vehicle.plateNumber}</p>
                                <p className="text-xs text-gray-500">{vehicle.model}</p>
                              </div>
                              <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                                <span className="flex items-center gap-1">
                                  <Users className="w-3 h-3" />
                                  {vehicle.capacity} seats
                                </span>
                                <span className="flex items-center gap-1">
                                  <Gauge className="w-3 h-3" />
                                  {vehicle._count?.trips || 0} trips
                                </span>
                                <span className="flex items-center gap-1">
                                  <Fuel className="w-3 h-3" />
                                  {vehicle.fuelType || 'N/A'}
                                </span>
                              </div>
                            </div>
                          </div>
                          {selectedVehicle?.id === vehicle.id && (
                            <Check className="w-5 h-5 text-green-400" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )
              ) : (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Car className="w-10 h-10 text-yellow-400" />
                  </div>
                  <h3 className="text-lg font-medium text-white mb-2">No vehicles available</h3>
                  <p className="text-gray-500 mb-6">All vehicles are currently assigned to drivers</p>
                  <Link
                    href="/dashboards/admin/vehicles/add-vehicle"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-400 to-amber-500 text-black rounded-lg font-medium hover:from-yellow-300 hover:to-amber-400 transition"
                  >
                    <PlusCircle className="w-4 h-4" />
                    Add New Vehicle
                  </Link>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-yellow-500/20 flex justify-between">
              <button
                type="button"
                onClick={() => setFormStep('details')}
                className="px-6 py-2 border border-yellow-500/20 rounded-xl text-gray-300 font-medium hover:bg-slate-800 transition"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading || !selectedVehicle}
                className="px-8 py-2 bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-medium rounded-xl shadow-lg shadow-yellow-500/30 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:from-yellow-300 hover:to-amber-400 transition"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Admitting Driver...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Admit Driver
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </form>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
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
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
        .animate-slideUp { animation: slideUp 0.4s ease-out; }
        .animate-shake { animation: shake 0.5s ease-in-out; }
        .animation-delay-2000 { animation-delay: 2s; }
      `}</style>
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
              className="p-2 hover:bg-slate-800 rounded-xl transition border border-yellow-500/20 group"
            >
              <ArrowLeft className="w-5 h-5 text-gray-400 group-hover:text-yellow-400 transition" />
            </Link>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-lg flex items-center justify-center shadow-lg shadow-yellow-500/30">
                  <Users className="w-4 h-4 text-black" />
                </div>
                <h1 className="text-2xl font-bold text-white">Admit New Driver</h1>
              </div>
              <p className="text-sm text-gray-500 flex items-center gap-2">
                <Radio className="w-3 h-3 text-yellow-400" />
                Add a new driver and assign an available vehicle from the fleet
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        <Suspense fallback={<AdmitDriverFallback />}>
          <AdmitDriverForm />
        </Suspense>
      </div>
    </div>
  );
}