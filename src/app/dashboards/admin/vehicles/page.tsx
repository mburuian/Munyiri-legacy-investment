"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  PlusCircle,
  Search,
  Filter,
  Download,
  Car,
  Users,
  Calendar,
  Shield,
  Wrench,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  XCircle,
  CheckCircle,
  Clock,
  Fuel,
  Gauge,
  Navigation2,
  Radio,
  AlertCircle,
  FileText,
  Camera,
  MapPin,
  Truck,
  Palette,
  DollarSign,
  CreditCard,
  Phone,
  Mail,
  User,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  X,
  ChevronDown,
  ChevronUp,
  Activity,
  TrendingUp,
  CircleDollarSign,
  Key,
  Award,
  Star,
  IdCard,
  Hash,
  CalendarDays,
  FuelIcon,
  Battery,
  BatteryFull,
  BatteryMedium,
  BatteryLow,
  Settings,
  Info,
  Briefcase,
  Receipt,
  BarChart3,
  ImageIcon,
  Upload,
  GalleryHorizontalEnd,
  GripVertical,
  Loader2,
  RefreshCw,
  Zap,
  Users2
} from "lucide-react";
import { auth } from '../../../../lib/firebase/config';

// Types based on API response
interface Vehicle {
  id: string;
  plateNumber: string;
  model: string;
  capacity: number;
  status: 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE' | 'OUT_OF_SERVICE';
  driverId: string | null;
  driver?: {
    user: {
      name: string;
      email: string;
      phone: string;
    };
  } | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    incomeLogs: number;
    expenses: number;
    maintenance: number;
    alerts: number;
    trips: number;
    documents: number;
  };
  images?: { url: string; isPrimary: boolean }[]; // For future image support
}

interface ApiResponse {
  vehicles: Vehicle[];
  summary: {
    total: number;
    active: number;
    maintenance: number;
    inactive: number;
    outOfService: number;
    assigned: number;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'ACTIVE':
      return 'bg-green-500/20 text-green-400 border border-green-500/30';
    case 'MAINTENANCE':
      return 'bg-amber-500/20 text-amber-400 border border-amber-500/30';
    case 'INACTIVE':
      return 'bg-rose-500/20 text-rose-400 border border-rose-500/30';
    case 'OUT_OF_SERVICE':
      return 'bg-gray-500/20 text-gray-400 border border-gray-500/30';
    default:
      return 'bg-gray-500/20 text-gray-400 border border-gray-500/30';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'ACTIVE':
      return <CheckCircle className="w-3 h-3" />;
    case 'MAINTENANCE':
      return <Wrench className="w-3 h-3" />;
    case 'INACTIVE':
      return <XCircle className="w-3 h-3" />;
    default:
      return <AlertCircle className="w-3 h-3" />;
  }
};

const formatCurrency = (amount: number) => {
  return `KES ${amount.toLocaleString()}`;
};

export default function VehiclesPage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [filteredVehicles, setFilteredVehicles] = useState<Vehicle[]>([]);
  const [summary, setSummary] = useState<ApiResponse['summary'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [vehicleToDelete, setVehicleToDelete] = useState<Vehicle | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'status'>('recent');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 12;

  useEffect(() => {
    loadVehicles();
  }, [currentPage, statusFilter, searchQuery]);

  useEffect(() => {
    let filtered = [...vehicles];
    
    if (searchQuery) {
      filtered = filtered.filter(vehicle => 
        vehicle.plateNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vehicle.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (vehicle.driver?.user?.name || '').toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(vehicle => vehicle.status === statusFilter);
    }
    
    if (sortBy === 'name') {
      filtered.sort((a, b) => a.plateNumber.localeCompare(b.plateNumber));
    } else if (sortBy === 'status') {
      filtered.sort((a, b) => a.status.localeCompare(b.status));
    } else {
      filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    
    setFilteredVehicles(filtered);
  }, [vehicles, searchQuery, statusFilter, sortBy]);

  const loadVehicles = async (showRefresh = false) => {
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
      
      // Build query params
      const params = new URLSearchParams();
      params.append('page', currentPage.toString());
      params.append('limit', itemsPerPage.toString());
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (searchQuery) params.append('search', searchQuery);
      
      const response = await fetch(`/api/admin/vehicles?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.status === 401) {
        router.push('/auth/login');
        return;
      }
      
      if (!response.ok) throw new Error('Failed to fetch vehicles');
      
      const data: ApiResponse = await response.json();
      setVehicles(data.vehicles);
      setSummary(data.summary);
      setTotalPages(data.pagination.pages);
    } catch (error) {
      console.error('Error loading vehicles:', error);
      setError('Failed to load vehicles. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleViewDetails = async (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setShowDetailsModal(true);
  };

  const handleEdit = (vehicleId: string) => {
    router.push(`/dashboards/admin/vehicles/${vehicleId}/edit`);
  };

  const handleDeleteClick = (vehicle: Vehicle) => {
    setVehicleToDelete(vehicle);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!vehicleToDelete) return;
    setDeleteLoading(true);
    
    try {
      const user = auth.currentUser;
      if (!user) {
        router.push('/auth/login');
        return;
      }
      
      const token = await user.getIdToken();
      
      const response = await fetch(`/api/admin/vehicles/${vehicleToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) throw new Error('Failed to delete vehicle');
      
      await loadVehicles(true);
      setShowDeleteModal(false);
      setVehicleToDelete(null);
    } catch (error) {
      console.error('Error deleting vehicle:', error);
      setError('Failed to delete vehicle. Please try again.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const getPerformanceRating = (vehicle: Vehicle) => {
    const trips = vehicle._count?.trips || 0;
    const income = vehicle._count?.incomeLogs || 0;
    
    if (trips > 100 && income > 50) return { rating: 'Excellent', color: 'text-emerald-400', icon: Award };
    if (trips > 50 && income > 25) return { rating: 'Great', color: 'text-green-400', icon: Star };
    if (trips > 25 && income > 10) return { rating: 'Good', color: 'text-blue-400', icon: TrendingUp };
    if (trips > 10 && income > 5) return { rating: 'Fair', color: 'text-yellow-400', icon: Activity };
    return { rating: 'Low Activity', color: 'text-rose-400', icon: AlertTriangle };
  };

  const paginatedVehicles = filteredVehicles.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-yellow-400/20 border-t-yellow-400 rounded-full animate-spin mx-auto mb-4"></div>
            <Truck className="w-8 h-8 text-yellow-400 absolute top-6 left-1/2 -translate-x-1/2 animate-pulse" />
          </div>
          <p className="text-gray-400 mt-4">Loading fleet vehicles...</p>
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
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-yellow-500/5 rounded-full blur-3xl"></div>
      </div>

      {/* Header */}
      <div className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-xl border-b border-yellow-500/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-lg flex items-center justify-center shadow-lg shadow-yellow-500/30">
                  <Truck className="w-4 h-4 text-black" />
                </div>
                <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                  Fleet Management
                </h1>
              </div>
              <p className="text-xs sm:text-sm text-gray-500 flex items-center gap-2">
                <Radio className="w-3 h-3 text-yellow-400" />
                Managing {summary?.total || 0} vehicles • {summary?.active || 0} active • {summary?.assigned || 0} assigned
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => loadVehicles(true)}
                disabled={refreshing}
                className="p-2 bg-slate-800/50 border border-yellow-500/20 rounded-xl hover:bg-slate-700 transition disabled:opacity-50"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 text-gray-400 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              <div className="flex items-center gap-1 p-1 bg-slate-800/50 border border-yellow-500/20 rounded-xl">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition ${viewMode === 'grid' ? 'bg-yellow-500/20 text-yellow-400' : 'text-gray-500 hover:text-gray-300'}`}
                  title="Grid View"
                >
                  <div className="w-4 h-4 grid grid-cols-2 gap-0.5">
                    <div className="bg-current rounded-sm"></div>
                    <div className="bg-current rounded-sm"></div>
                    <div className="bg-current rounded-sm"></div>
                    <div className="bg-current rounded-sm"></div>
                  </div>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition ${viewMode === 'list' ? 'bg-yellow-500/20 text-yellow-400' : 'text-gray-500 hover:text-gray-300'}`}
                  title="List View"
                >
                  <div className="w-4 h-4 flex flex-col gap-0.5">
                    <div className="w-full h-0.5 bg-current rounded-sm"></div>
                    <div className="w-full h-0.5 bg-current rounded-sm"></div>
                    <div className="w-full h-0.5 bg-current rounded-sm"></div>
                  </div>
                </button>
              </div>
              <Link
                href="/dashboards/admin/vehicles/add-vehicle"
                className="px-3 sm:px-4 py-2 bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-black rounded-xl flex items-center gap-2 transition shadow-lg shadow-yellow-500/30 text-sm sm:text-base"
              >
                <PlusCircle className="w-4 h-4" />
                <span className="hidden sm:inline">Add Vehicle</span>
                <span className="sm:hidden">Add</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
              <span className="text-sm text-rose-300">{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-300">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Filters and Search */}
        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search by plate number, model, or driver..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-800/50 border border-yellow-500/20 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400/50 focus:ring-1 focus:ring-yellow-400/20 transition"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-800/50 border border-yellow-500/20 rounded-xl px-3 sm:px-4 py-2.5 text-sm text-white focus:outline-none focus:border-yellow-400/50"
            >
              <option value="all">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="MAINTENANCE">Maintenance</option>
              <option value="INACTIVE">Inactive</option>
              <option value="OUT_OF_SERVICE">Out of Service</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-800/50 border border-yellow-500/20 rounded-xl px-3 sm:px-4 py-2.5 text-sm text-white focus:outline-none focus:border-yellow-400/50"
            >
              <option value="recent">Most Recent</option>
              <option value="name">Plate Number</option>
              <option value="status">Status</option>
            </select>
            <button className="p-2.5 bg-slate-800/50 border border-yellow-500/20 rounded-xl hover:bg-slate-700 transition">
              <Download className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Stats Summary */}
        {summary && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm rounded-xl p-4 border border-yellow-500/20 hover:border-yellow-400/40 transition-all group">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs sm:text-sm text-gray-500">Total Fleet</p>
                <div className="w-8 h-8 bg-yellow-500/20 rounded-lg flex items-center justify-center group-hover:scale-110 transition">
                  <Truck className="w-4 h-4 text-yellow-400" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-white">{summary.total}</p>
              <p className="text-xs text-gray-500 mt-1">Vehicles in fleet</p>
            </div>
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm rounded-xl p-4 border border-green-500/20 hover:border-green-400/40 transition-all group">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs sm:text-sm text-gray-500">Active</p>
                <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center group-hover:scale-110 transition">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-green-400">{summary.active}</p>
              <p className="text-xs text-gray-500 mt-1">On the road</p>
            </div>
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm rounded-xl p-4 border border-amber-500/20 hover:border-amber-400/40 transition-all group">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs sm:text-sm text-gray-500">Maintenance</p>
                <div className="w-8 h-8 bg-amber-500/20 rounded-lg flex items-center justify-center group-hover:scale-110 transition">
                  <Wrench className="w-4 h-4 text-amber-400" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-amber-400">{summary.maintenance}</p>
              <p className="text-xs text-gray-500 mt-1">In service bay</p>
            </div>
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm rounded-xl p-4 border border-blue-500/20 hover:border-blue-400/40 transition-all group">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs sm:text-sm text-gray-500">Assigned</p>
                <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center group-hover:scale-110 transition">
                  <Users className="w-4 h-4 text-blue-400" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-blue-400">{summary.assigned}</p>
              <p className="text-xs text-gray-500 mt-1">With drivers</p>
            </div>
          </div>
        )}

        {/* Vehicles Display */}
        {filteredVehicles.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Truck className="w-12 h-12 text-yellow-400" />
            </div>
            <h3 className="text-xl font-medium text-white mb-2">No vehicles found</h3>
            <p className="text-gray-500 mb-8">
              {searchQuery || statusFilter !== 'all' 
                ? 'Try adjusting your filters to see more results'
                : 'Get started by adding your first vehicle to the fleet'}
            </p>
            <Link
              href="/dashboards/admin/vehicles/add-vehicle"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-yellow-400 to-amber-500 text-black rounded-xl font-semibold hover:from-yellow-300 hover:to-amber-400 transition shadow-lg shadow-yellow-500/30"
            >
              <PlusCircle className="w-5 h-5" />
              Add Your First Vehicle
            </Link>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {paginatedVehicles.map((vehicle) => {
              const performance = getPerformanceRating(vehicle);
              const PerformanceIcon = performance.icon;
              
              return (
                <div
                  key={vehicle.id}
                  className="group relative bg-slate-800/50 backdrop-blur-sm border border-yellow-500/20 rounded-2xl overflow-hidden hover:border-yellow-400/50 hover:shadow-xl hover:shadow-yellow-500/10 transition-all duration-300 cursor-pointer"
                  onClick={() => handleViewDetails(vehicle)}
                >
                  {/* Image Section */}
                  <div className="relative h-48 bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-60"></div>
                    <div className="relative z-10">
                      <Car className="w-20 h-20 text-yellow-400/30" />
                    </div>
                    
                    {/* Status Badge */}
                    <div className="absolute top-3 right-3 z-20">
                      <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(vehicle.status)} backdrop-blur-sm`}>
                        {getStatusIcon(vehicle.status)}
                        <span>{vehicle.status.replace('_', ' ')}</span>
                      </div>
                    </div>
                    
                    {/* Performance Badge */}
                    <div className="absolute bottom-3 left-3 z-20">
                      <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${performance.color} bg-black/50 backdrop-blur-sm`}>
                        <PerformanceIcon className="w-3 h-3" />
                        <span>{performance.rating}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Content Section */}
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-white group-hover:text-yellow-400 transition">
                          {vehicle.plateNumber}
                        </h3>
                        <p className="text-sm text-gray-400 mt-0.5">{vehicle.model}</p>
                        <p className="text-xs text-gray-500">Capacity: {vehicle.capacity} seats</p>
                      </div>
                    </div>
                    
                    {/* Quick Stats */}
                    <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-yellow-500/10">
                      <div className="text-center">
                        <p className="text-[10px] text-gray-500">Trips</p>
                        <p className="text-sm font-semibold text-white">{vehicle._count?.trips || 0}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-gray-500">Income</p>
                        <p className="text-sm font-semibold text-green-400">{vehicle._count?.incomeLogs || 0}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-gray-500">Alerts</p>
                        <p className="text-sm font-semibold text-amber-400">{vehicle._count?.alerts || 0}</p>
                      </div>
                    </div>
                    
                    {/* Driver Info */}
                    <div className="mt-3 pt-3 border-t border-yellow-500/10">
                      {vehicle.driver ? (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center flex-shrink-0">
                            <User className="w-3 h-3 text-black" />
                          </div>
                          <span className="text-xs text-gray-300 truncate">{vehicle.driver.user.name}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-3 h-3 text-gray-600" />
                          <span className="text-xs text-gray-600">No driver assigned</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                    <div className="flex gap-1">
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleViewDetails(vehicle); }} 
                        className="p-1.5 bg-slate-800/90 rounded-lg hover:bg-yellow-500/20 transition" 
                        title="View Details"
                      >
                        <Eye className="w-3.5 h-3.5 text-gray-300" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleEdit(vehicle.id); }} 
                        className="p-1.5 bg-slate-800/90 rounded-lg hover:bg-yellow-500/20 transition" 
                        title="Edit Vehicle"
                      >
                        <Edit className="w-3.5 h-3.5 text-gray-300" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDeleteClick(vehicle); }} 
                        className="p-1.5 bg-slate-800/90 rounded-lg hover:bg-rose-500/20 transition" 
                        title="Delete Vehicle"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-gray-300" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-slate-800/50 backdrop-blur-sm border border-yellow-500/20 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-yellow-500/20 bg-slate-900/50">
                    <th className="text-left py-4 px-4 sm:px-6 text-xs font-medium text-gray-400 uppercase tracking-wider">Vehicle</th>
                    <th className="text-left py-4 px-4 sm:px-6 text-xs font-medium text-gray-400 uppercase tracking-wider">Driver</th>
                    <th className="text-left py-4 px-4 sm:px-6 text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="text-left py-4 px-4 sm:px-6 text-xs font-medium text-gray-400 uppercase tracking-wider">Capacity</th>
                    <th className="text-left py-4 px-4 sm:px-6 text-xs font-medium text-gray-400 uppercase tracking-wider">Performance</th>
                    <th className="text-center py-4 px-4 sm:px-6 text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-yellow-500/10">
                  {paginatedVehicles.map((vehicle) => {
                    const performance = getPerformanceRating(vehicle);
                    const PerformanceIcon = performance.icon;
                    return (
                      <tr key={vehicle.id} onClick={() => handleViewDetails(vehicle)} className="hover:bg-yellow-500/5 transition-colors cursor-pointer">
                        <td className="py-4 px-4 sm:px-6">
                          <div>
                            <p className="font-medium text-white">{vehicle.plateNumber}</p>
                            <p className="text-xs text-gray-500">{vehicle.model}</p>
                          </div>
                        </td>
                        <td className="py-4 px-4 sm:px-6">
                          {vehicle.driver ? (
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-gray-500" />
                              <span className="text-sm text-gray-300">{vehicle.driver.user.name}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-600">Unassigned</span>
                          )}
                        </td>
                        <td className="py-4 px-4 sm:px-6">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(vehicle.status)}`}>
                            {getStatusIcon(vehicle.status)}
                            {vehicle.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-4 px-4 sm:px-6">
                          <span className="text-sm text-gray-300">{vehicle.capacity} seats</span>
                        </td>
                        <td className="py-4 px-4 sm:px-6">
                          <div className={`flex items-center gap-1 ${performance.color}`}>
                            <PerformanceIcon className="w-4 h-4" />
                            <span className="text-sm">{performance.rating}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4 sm:px-6">
                          <div className="flex items-center justify-center gap-1 sm:gap-2" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => handleViewDetails(vehicle)} className="p-1.5 hover:bg-slate-700 rounded-lg transition" title="View Details">
                              <Eye className="w-4 h-4 text-gray-400" />
                            </button>
                            <button onClick={() => handleEdit(vehicle.id)} className="p-1.5 hover:bg-slate-700 rounded-lg transition" title="Edit">
                              <Edit className="w-4 h-4 text-gray-400" />
                            </button>
                            <button onClick={() => handleDeleteClick(vehicle)} className="p-1.5 hover:bg-rose-500/20 rounded-lg transition" title="Delete">
                              <Trash2 className="w-4 h-4 text-gray-400" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination */}
        {filteredVehicles.length > 0 && totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 sm:mt-8">
            <p className="text-xs sm:text-sm text-gray-500 order-2 sm:order-1">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredVehicles.length)} of {filteredVehicles.length} vehicles
            </p>
            <div className="flex items-center gap-2 order-1 sm:order-2">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                disabled={currentPage === 1} 
                className="p-2 bg-slate-800/50 border border-yellow-500/20 rounded-lg hover:bg-slate-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) pageNum = i + 1;
                  else if (currentPage <= 3) pageNum = i + 1;
                  else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                  else pageNum = currentPage - 2 + i;
                  return (
                    <button 
                      key={pageNum} 
                      onClick={() => setCurrentPage(pageNum)} 
                      className={`w-8 h-8 rounded-lg text-sm transition ${currentPage === pageNum ? 'bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-medium' : 'bg-slate-800/50 border border-yellow-500/20 text-gray-400 hover:text-white'}`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                disabled={currentPage === totalPages} 
                className="p-2 bg-slate-800/50 border border-yellow-500/20 rounded-lg hover:bg-slate-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Vehicle Details Modal */}
      {showDetailsModal && selectedVehicle && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-gradient-to-b from-slate-900 to-slate-950 rounded-2xl border border-yellow-500/20 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-slate-900/95 backdrop-blur-sm border-b border-yellow-500/20 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-xl flex items-center justify-center">
                    <Truck className="w-6 h-6 text-black" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">{selectedVehicle.plateNumber}</h2>
                    <p className="text-sm text-gray-400">{selectedVehicle.model}</p>
                  </div>
                </div>
                <button onClick={() => setShowDetailsModal(false)} className="p-2 hover:bg-slate-800 rounded-lg transition">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Vehicle Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-800/30 rounded-xl p-4 border border-yellow-500/20">
                  <h3 className="text-sm font-semibold text-yellow-400 mb-3 flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    Vehicle Information
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-400">Plate Number</span>
                      <span className="text-sm font-medium text-white">{selectedVehicle.plateNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-400">Model</span>
                      <span className="text-sm font-medium text-white">{selectedVehicle.model}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-400">Capacity</span>
                      <span className="text-sm font-medium text-white">{selectedVehicle.capacity} seats</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-400">Status</span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedVehicle.status)}`}>
                        {getStatusIcon(selectedVehicle.status)}
                        {selectedVehicle.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-400">Added On</span>
                      <span className="text-sm font-medium text-white">
                        {new Date(selectedVehicle.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-800/30 rounded-xl p-4 border border-yellow-500/20">
                  <h3 className="text-sm font-semibold text-yellow-400 mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Driver Information
                  </h3>
                  {selectedVehicle.driver ? (
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-400">Name</span>
                        <span className="text-sm font-medium text-white">{selectedVehicle.driver.user.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-400">Email</span>
                        <span className="text-sm font-medium text-white">{selectedVehicle.driver.user.email}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-400">Phone</span>
                        <span className="text-sm font-medium text-white">{selectedVehicle.driver.user.phone || 'N/A'}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No driver assigned</p>
                  )}
                </div>

                <div className="bg-slate-800/30 rounded-xl p-4 border border-yellow-500/20">
                  <h3 className="text-sm font-semibold text-yellow-400 mb-3 flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    Performance Metrics
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-400">Total Trips</span>
                      <span className="text-sm font-medium text-white">{selectedVehicle._count?.trips || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-400">Income Logs</span>
                      <span className="text-sm font-medium text-green-400">{selectedVehicle._count?.incomeLogs || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-400">Expenses</span>
                      <span className="text-sm font-medium text-rose-400">{selectedVehicle._count?.expenses || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-400">Maintenance Records</span>
                      <span className="text-sm font-medium text-white">{selectedVehicle._count?.maintenance || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-400">Active Alerts</span>
                      <span className="text-sm font-medium text-amber-400">{selectedVehicle._count?.alerts || 0}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-800/30 rounded-xl p-4 border border-yellow-500/20">
                  <h3 className="text-sm font-semibold text-yellow-400 mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Documents
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-400">Documents</span>
                      <span className="text-sm font-medium text-white">{selectedVehicle._count?.documents || 0}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-yellow-500/20">
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    handleEdit(selectedVehicle.id);
                  }}
                  className="flex-1 px-4 py-2 bg-blue-500/20 text-blue-400 rounded-xl font-medium hover:bg-blue-500/30 transition flex items-center justify-center gap-2"
                >
                  <Edit className="w-4 h-4" />
                  Edit Vehicle
                </button>
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    handleDeleteClick(selectedVehicle);
                  }}
                  className="flex-1 px-4 py-2 bg-rose-500/20 text-rose-400 rounded-xl font-medium hover:bg-rose-500/30 transition flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Vehicle
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && vehicleToDelete && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-b from-slate-900 to-slate-950 rounded-2xl border border-yellow-500/20 max-w-md w-full p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-rose-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Delete Vehicle</h3>
              <p className="text-gray-400">Are you sure you want to delete <span className="text-yellow-400 font-medium">{vehicleToDelete.plateNumber}</span>? This action cannot be undone.</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4 mb-6 border border-yellow-500/10">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center">
                  <Truck className="w-5 h-5 text-yellow-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{vehicleToDelete.plateNumber}</p>
                  <p className="text-xs text-gray-500">{vehicleToDelete.model}</p>
                </div>
              </div>
              {vehicleToDelete.driver && (
                <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                  <User className="w-3 h-3" />
                  Assigned to: {vehicleToDelete.driver.user.name}
                </p>
              )}
              {(vehicleToDelete._count?.trips || 0) > 0 && (
                <p className="text-xs text-amber-400 mt-2 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  This vehicle has {vehicleToDelete._count?.trips} trip records that will be affected
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteModal(false)} className="flex-1 px-4 py-2 border border-gray-700 rounded-xl text-gray-300 font-medium hover:bg-gray-800 transition">
                Cancel
              </button>
              <button onClick={handleDeleteConfirm} disabled={deleteLoading} className="flex-1 px-4 py-2 bg-rose-500/20 text-rose-400 rounded-xl font-medium hover:bg-rose-500/30 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {deleteLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete Vehicle'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        .animate-pulse { animation: pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
        .animation-delay-2000 { animation-delay: 2s; }
      `}</style>
    </div>
  );
}