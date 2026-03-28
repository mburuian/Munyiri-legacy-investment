"use client";

import { useState, useEffect, Suspense, useCallback, useMemo, memo, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  PlusCircle,
  Search,
  Download,
  Car,
  Users,
  Wrench,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  XCircle,
  CheckCircle,
  Radio,
  AlertCircle,
  FileText,
  Truck,
  User,
  Edit,
  Trash2,
  Eye,
  X,
  Loader2,
  RefreshCw,
  Activity,
  Info,
  Camera,
  Upload,
  Star,
  StarOff,
} from "lucide-react";

// Firebase will be dynamically imported on client side only
let auth: any = null;
let onAuthStateChanged: any = null;

// Types
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
  images?: VehicleImage[];
}

// Constants
const ITEMS_PER_PAGE = 12;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache
const DEBOUNCE_DELAY = 300;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const VALID_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];

// Memoized Helper Components
const StatusBadge = memo(({ status }: { status: string }) => {
  const getStatusConfig = (status: string) => {
    const s = status?.toUpperCase();
    switch (s) {
      case 'ACTIVE':
        return { color: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/30', icon: CheckCircle, label: 'Active' };
      case 'MAINTENANCE':
        return { color: 'text-amber-400', bg: 'bg-amber-500/20', border: 'border-amber-500/30', icon: Wrench, label: 'Maintenance' };
      case 'INACTIVE':
        return { color: 'text-rose-400', bg: 'bg-rose-500/20', border: 'border-rose-500/30', icon: XCircle, label: 'Inactive' };
      case 'OUT_OF_SERVICE':
        return { color: 'text-gray-400', bg: 'bg-gray-500/20', border: 'border-gray-500/30', icon: AlertCircle, label: 'Out of Service' };
      default:
        return { color: 'text-gray-400', bg: 'bg-gray-500/20', border: 'border-gray-500/30', icon: AlertCircle, label: status };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.color} border ${config.border}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
});

StatusBadge.displayName = 'StatusBadge';

const StatCard = memo(({ label, value, icon: Icon, color, subtext }: { 
  label: string; 
  value: number; 
  icon: React.ElementType; 
  color: string;
  subtext?: string;
}) => {
  const colorClasses: Record<string, string> = {
    yellow: "from-yellow-500/20 to-amber-600/10 border-yellow-500/20 group-hover:border-yellow-400/40",
    emerald: "from-emerald-500/20 to-emerald-600/10 border-emerald-500/20 group-hover:border-emerald-400/40",
    amber: "from-amber-500/20 to-amber-600/10 border-amber-500/20 group-hover:border-amber-400/40",
    blue: "from-blue-500/20 to-blue-600/10 border-blue-500/20 group-hover:border-blue-400/40",
  };

  const iconColors: Record<string, string> = {
    yellow: "text-yellow-400",
    emerald: "text-emerald-400",
    amber: "text-amber-400",
    blue: "text-blue-400",
  };

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} backdrop-blur-sm rounded-xl p-4 border transition-all group`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs sm:text-sm text-gray-500">{label}</p>
        <div className={`w-8 h-8 bg-${color}-500/20 rounded-lg flex items-center justify-center group-hover:scale-110 transition`}>
          <Icon className={`w-4 h-4 ${iconColors[color]}`} />
        </div>
      </div>
      <p className="text-2xl sm:text-3xl font-bold text-white">{value.toLocaleString()}</p>
      {subtext && <p className="text-xs text-gray-500 mt-1">{subtext}</p>}
    </div>
  );
});

StatCard.displayName = 'StatCard';

const VehicleCard = memo(({ 
  vehicle, 
  onView, 
  onEdit, 
  onDelete,
  onUploadImage,
  getPrimaryImage 
}: { 
  vehicle: Vehicle; 
  onView: (v: Vehicle) => void; 
  onEdit: (id: string) => void; 
  onDelete: (v: Vehicle) => void;
  onUploadImage: (vehicleId: string) => void;
  getPrimaryImage: (v: Vehicle) => string | null;
}) => {
  const [imageError, setImageError] = useState(false);
  
  const primaryImage = useMemo(() => {
    if (imageError) return null;
    return getPrimaryImage(vehicle);
  }, [vehicle, imageError, getPrimaryImage]);

  return (
    <div
      className="group relative bg-slate-800/50 backdrop-blur-sm border border-yellow-500/20 rounded-2xl overflow-hidden hover:border-yellow-400/50 hover:shadow-xl hover:shadow-yellow-500/10 transition-all duration-300 cursor-pointer will-change-transform"
      onClick={() => onView(vehicle)}
    >
      {/* Image Section */}
      <div className="relative h-48 bg-gradient-to-br from-slate-800 to-slate-900 overflow-hidden">
        {primaryImage ? (
          <div className="relative w-full h-full">
            <img
              src={primaryImage}
              alt={vehicle.plateNumber}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              loading="lazy"
              onError={() => setImageError(true)}
            />
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Car className="w-20 h-20 text-yellow-400/30" />
          </div>
        )}
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-60"></div>
        
        {/* Status Badge */}
        <div className="absolute top-3 right-3 z-20">
          <StatusBadge status={vehicle.status} />
        </div>

        {/* Upload Button Overlay */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onUploadImage(vehicle.id);
          }}
          className="absolute bottom-3 right-3 z-20 p-2 bg-black/50 rounded-full hover:bg-yellow-500/80 transition backdrop-blur-sm opacity-0 group-hover:opacity-100"
          title="Upload Image"
        >
          <Camera className="w-4 h-4 text-white" />
        </button>
      </div>
      
      {/* Content Section */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h3 className="text-lg font-bold text-white group-hover:text-yellow-400 transition truncate">
              {vehicle.plateNumber}
            </h3>
            <p className="text-sm text-gray-400 mt-0.5 truncate">{vehicle.model}</p>
          </div>
        </div>
        
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-yellow-500/10">
          <div className="text-center">
            <p className="text-[10px] text-gray-500">Trips</p>
            <p className="text-sm font-semibold text-white">{vehicle._count?.trips || 0}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-gray-500">Capacity</p>
            <p className="text-sm font-semibold text-white">{vehicle.capacity}</p>
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
            onClick={(e) => { e.stopPropagation(); onView(vehicle); }} 
            className="p-1.5 bg-slate-800/90 rounded-lg hover:bg-yellow-500/20 transition" 
            title="View Details"
          >
            <Eye className="w-3.5 h-3.5 text-gray-300" />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onEdit(vehicle.id); }} 
            className="p-1.5 bg-slate-800/90 rounded-lg hover:bg-yellow-500/20 transition" 
            title="Edit Vehicle"
          >
            <Edit className="w-3.5 h-3.5 text-gray-300" />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onDelete(vehicle); }} 
            className="p-1.5 bg-slate-800/90 rounded-lg hover:bg-rose-500/20 transition" 
            title="Delete Vehicle"
          >
            <Trash2 className="w-3.5 h-3.5 text-gray-300" />
          </button>
        </div>
      </div>
    </div>
  );
});

VehicleCard.displayName = 'VehicleCard';

const VehicleRow = memo(({ 
  vehicle, 
  onView, 
  onEdit, 
  onDelete,
  onUploadImage,
  getPrimaryImage 
}: { 
  vehicle: Vehicle; 
  onView: (v: Vehicle) => void; 
  onEdit: (id: string) => void; 
  onDelete: (v: Vehicle) => void;
  onUploadImage: (vehicleId: string) => void;
  getPrimaryImage: (v: Vehicle) => string | null;
}) => {
  const [imageError, setImageError] = useState(false);
  
  const primaryImage = useMemo(() => {
    if (imageError) return null;
    return getPrimaryImage(vehicle);
  }, [vehicle, imageError, getPrimaryImage]);

  return (
    <tr onClick={() => onView(vehicle)} className="hover:bg-yellow-500/5 transition-colors cursor-pointer">
      <td className="py-4 px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="relative">
            {primaryImage ? (
              <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-slate-700 flex-shrink-0">
                <img
                  src={primaryImage}
                  alt={vehicle.plateNumber}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={() => setImageError(true)}
                />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-lg bg-slate-700 flex items-center justify-center flex-shrink-0">
                <Car className="w-6 h-6 text-gray-500" />
              </div>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUploadImage(vehicle.id);
              }}
              className="absolute -bottom-1 -right-1 p-1 bg-black/70 rounded-full hover:bg-yellow-500 transition opacity-0 group-hover:opacity-100"
              title="Upload Image"
            >
              <Camera className="w-3 h-3 text-white" />
            </button>
          </div>
          <div>
            <p className="font-medium text-white">{vehicle.plateNumber}</p>
            <p className="text-xs text-gray-500">{vehicle.model}</p>
          </div>
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
        <StatusBadge status={vehicle.status} />
        </td>
      <td className="py-4 px-4 sm:px-6">
        <span className="text-sm text-gray-300">{vehicle.capacity} seats</span>
        </td>
      <td className="py-4 px-4 sm:px-6">
        <span className="text-sm text-gray-300">{vehicle._count?.trips || 0}</span>
        </td>
      <td className="py-4 px-4 sm:px-6">
        <div className="flex items-center justify-center gap-1 sm:gap-2" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => onView(vehicle)} className="p-1.5 hover:bg-slate-700 rounded-lg transition" title="View Details">
            <Eye className="w-4 h-4 text-gray-400" />
          </button>
          <button onClick={() => onEdit(vehicle.id)} className="p-1.5 hover:bg-slate-700 rounded-lg transition" title="Edit">
            <Edit className="w-4 h-4 text-gray-400" />
          </button>
          <button onClick={() => onDelete(vehicle)} className="p-1.5 hover:bg-rose-500/20 rounded-lg transition" title="Delete">
            <Trash2 className="w-4 h-4 text-gray-400" />
          </button>
        </div>
        </td>
    </tr>
  );
});

VehicleRow.displayName = 'VehicleRow';

function VehiclesContent() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [summary, setSummary] = useState<ApiResponse['summary'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showImageUploadModal, setShowImageUploadModal] = useState(false);
  const [vehicleToDelete, setVehicleToDelete] = useState<Vehicle | null>(null);
  const [vehicleToUpload, setVehicleToUpload] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'status'>('recent');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [firebaseReady, setFirebaseReady] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Memoized filtered and sorted vehicles
  const filteredVehicles = useMemo(() => {
    let filtered = [...vehicles];
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(vehicle => 
        vehicle.plateNumber.toLowerCase().includes(query) ||
        vehicle.model.toLowerCase().includes(query) ||
        (vehicle.driver?.user?.name || '').toLowerCase().includes(query)
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
    
    return filtered;
  }, [vehicles, searchQuery, statusFilter, sortBy]);

  // Pagination
  const totalPagesMemo = Math.ceil(filteredVehicles.length / ITEMS_PER_PAGE);
  const paginatedVehicles = useMemo(() => 
    filteredVehicles.slice(
      (currentPage - 1) * ITEMS_PER_PAGE,
      currentPage * ITEMS_PER_PAGE
    ),
    [filteredVehicles, currentPage]
  );

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, sortBy]);

  // Cleanup preview URLs
  useEffect(() => {
    return () => {
      imagePreviews.forEach(url => URL.revokeObjectURL(url));
    };
  }, [imagePreviews]);

  // Debounced search handler
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const timeoutId = setTimeout(() => setSearchQuery(e.target.value), DEBOUNCE_DELAY);
    return () => clearTimeout(timeoutId);
  }, []);

  const getVehiclePrimaryImage = useCallback((vehicle: Vehicle): string | null => {
    if (vehicle.images && vehicle.images.length > 0) {
      const primaryImage = vehicle.images.find(img => img.isPrimary);
      const imageUrl = primaryImage?.url || vehicle.images[0]?.url;
      if (imageUrl && (imageUrl.startsWith('data:image') || imageUrl.startsWith('http'))) {
        return imageUrl;
      }
    }
    return null;
  }, []);

  // Load Firebase dynamically
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
      loadVehicles();
    });

    return () => unsubscribe();
  }, [firebaseReady, router, refreshKey, statusFilter, currentPage]);

  const loadVehicles = useCallback(async (showRefresh = false) => {
    if (!auth) return;
    
    if (showRefresh) setRefreshing(true);
    else if (!vehicles.length) setLoading(true);
    setError(null);
    
    try {
      const user = auth.currentUser;
      if (!user) {
        router.push('/auth/login');
        return;
      }
      
      const token = await user.getIdToken();
      
      const cacheKey = `vehicles_${currentPage}_${statusFilter}`;
      const cachedData = !showRefresh ? sessionStorage.getItem(cacheKey) : null;
      const cacheTime = sessionStorage.getItem(`${cacheKey}_time`);
      
      if (cachedData && cacheTime && (Date.now() - parseInt(cacheTime)) < CACHE_DURATION) {
        const data = JSON.parse(cachedData);
        setVehicles(data.vehicles);
        setSummary(data.summary);
        setTotalPages(data.totalPages);
        setLoading(false);
        setInitialLoading(false);
        if (showRefresh) setRefreshing(false);
        return;
      }
      
      const params = new URLSearchParams();
      params.append('page', currentPage.toString());
      params.append('limit', ITEMS_PER_PAGE.toString());
      if (statusFilter !== 'all') params.append('status', statusFilter);
      
      const response = await fetch(`/api/admin/vehicles?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
      });
      
      if (response.status === 401) {
        router.push('/auth/login');
        return;
      }
      
      if (!response.ok) throw new Error('Failed to fetch vehicles');
      
      const data: ApiResponse = await response.json();
      
      // Fetch images for all vehicles in parallel
      const vehiclesWithImages = await Promise.all(
        (data.vehicles || []).map(async (vehicle) => {
          try {
            const imagesResponse = await fetch(`/api/upload?entityType=vehicle&entityId=${vehicle.id}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (imagesResponse.ok) {
              const imagesData = await imagesResponse.json();
              return { ...vehicle, images: imagesData.images || [] };
            }
          } catch (error) {
            console.error(`Error fetching images for vehicle ${vehicle.id}:`, error);
          }
          return { ...vehicle, images: [] };
        })
      );
      
      setVehicles(vehiclesWithImages);
      setSummary(data.summary);
      setTotalPages(data.pagination.pages);
      
      // Cache data
      sessionStorage.setItem(cacheKey, JSON.stringify({
        vehicles: vehiclesWithImages,
        summary: data.summary,
        totalPages: data.pagination.pages
      }));
      sessionStorage.setItem(`${cacheKey}_time`, Date.now().toString());
      
    } catch (error) {
      console.error('Error loading vehicles:', error);
      setError('Failed to load vehicles. Please try again.');
    } finally {
      setLoading(false);
      setInitialLoading(false);
      setRefreshing(false);
    }
  }, [router, currentPage, statusFilter, vehicles.length]);

  const handleRefresh = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  const handleViewDetails = useCallback((vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setShowDetailsModal(true);
  }, []);

  const handleEdit = useCallback((vehicleId: string) => {
    router.push(`/dashboards/admin/vehicles/${vehicleId}/edit`);
  }, [router]);

  const handleDeleteClick = useCallback((vehicle: Vehicle) => {
    setVehicleToDelete(vehicle);
    setShowDeleteModal(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!vehicleToDelete || !auth) return;
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
      setSuccess('Vehicle deleted successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Error deleting vehicle:', error);
      setError('Failed to delete vehicle. Please try again.');
    } finally {
      setDeleteLoading(false);
    }
  }, [vehicleToDelete, router, loadVehicles]);

  const handleOpenImageUpload = useCallback((vehicleId: string) => {
    setVehicleToUpload(vehicleId);
    setShowImageUploadModal(true);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    const validFiles: File[] = [];
    const errors: string[] = [];
    
    files.forEach(file => {
      if (!VALID_IMAGE_TYPES.includes(file.type)) {
        errors.push(`${file.name} is not a valid image type. Please upload JPEG, PNG, or WebP.`);
      } else if (file.size > MAX_IMAGE_SIZE) {
        errors.push(`${file.name} exceeds 5MB limit.`);
      } else {
        validFiles.push(file);
      }
    });
    
    if (errors.length > 0) {
      setError(errors[0]);
      setTimeout(() => setError(null), 3000);
    }
    
    if (validFiles.length === 0) return;
    
    setSelectedFiles(prev => [...prev, ...validFiles]);
    
    // Create preview URLs
    const newPreviews = validFiles.map(file => URL.createObjectURL(file));
    setImagePreviews(prev => [...prev, ...newPreviews]);
  }, []);

  const handleUploadImages = useCallback(async () => {
    if (!vehicleToUpload || selectedFiles.length === 0 || !auth) return;
    
    setUploading(true);
    setError(null);
    
    try {
      const user = auth.currentUser;
      if (!user) {
        router.push('/auth/login');
        return;
      }
      
      const token = await user.getIdToken();
      const formData = new FormData();
      
      selectedFiles.forEach(file => {
        formData.append('images', file);
      });
      
      // Check if vehicle already has images
      const vehicle = vehicles.find(v => v.id === vehicleToUpload);
      const hasImages = vehicle?.images && vehicle.images.length > 0;
      
      // If no images exist, set first as primary
      if (!hasImages) {
        formData.append('setPrimary', 'true');
      }
      
      const response = await fetch(`/api/admin/vehicles/${vehicleToUpload}/images`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to upload images');
      }
      
      setSuccess(`${selectedFiles.length} image(s) uploaded successfully!`);
      setSelectedFiles([]);
      setImagePreviews([]);
      setShowImageUploadModal(false);
      setVehicleToUpload(null);
      
      // Clear cache and reload vehicles
      sessionStorage.removeItem(`vehicles_${currentPage}_${statusFilter}`);
      await loadVehicles(true);
      
      setTimeout(() => setSuccess(null), 3000);
      
    } catch (error: any) {
      console.error('Error uploading images:', error);
      setError(error.message || 'Failed to upload images');
    } finally {
      setUploading(false);
    }
  }, [vehicleToUpload, selectedFiles, router, loadVehicles, vehicles, currentPage, statusFilter]);

  const removeSelectedFile = useCallback((index: number) => {
    URL.revokeObjectURL(imagePreviews[index]);
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  }, [imagePreviews]);

  // Loading states
  if (!firebaseReady || initialLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-yellow-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading fleet management...</p>
        </div>
      </div>
    );
  }

  if (loading && vehicles.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <Loader2 className="w-20 h-20 text-yellow-400 animate-spin mx-auto mb-4" />
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
        <div className="absolute top-20 left-10 w-96 h-96 bg-yellow-500/5 rounded-full blur-3xl animate-pulse will-change-transform"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl animate-pulse animation-delay-2000 will-change-transform"></div>
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
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-2 bg-slate-800/50 border border-yellow-500/20 rounded-xl hover:bg-slate-700 transition disabled:opacity-50"
                title="Refresh"
                aria-label="Refresh"
              >
                <RefreshCw className={`w-4 h-4 text-gray-400 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              <div className="flex items-center gap-1 p-1 bg-slate-800/50 border border-yellow-500/20 rounded-xl">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition ${viewMode === 'grid' ? 'bg-yellow-500/20 text-yellow-400' : 'text-gray-500 hover:text-gray-300'}`}
                  title="Grid View"
                  aria-label="Grid view"
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
                  aria-label="List view"
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
        {/* Alerts */}
        {error && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center justify-between animate-shake">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
              <span className="text-sm text-rose-300">{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-300" aria-label="Dismiss">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        
        {success && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-xl flex items-center justify-between animate-fadeIn">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span className="text-sm text-green-300">{success}</span>
            </div>
            <button onClick={() => setSuccess(null)} className="text-green-400 hover:text-green-300" aria-label="Dismiss">
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
              onChange={handleSearchChange}
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
            <button className="p-2.5 bg-slate-800/50 border border-yellow-500/20 rounded-xl hover:bg-slate-700 transition" aria-label="Export">
              <Download className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Stats Summary */}
        {summary && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
            <StatCard label="Total Fleet" value={summary.total} icon={Truck} color="yellow" subtext="Vehicles in fleet" />
            <StatCard label="Active" value={summary.active} icon={CheckCircle} color="emerald" subtext="On the road" />
            <StatCard label="Maintenance" value={summary.maintenance} icon={Wrench} color="amber" subtext="In service bay" />
            <StatCard label="Assigned" value={summary.assigned} icon={Users} color="blue" subtext="With drivers" />
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
            {paginatedVehicles.map((vehicle) => (
              <VehicleCard
                key={vehicle.id}
                vehicle={vehicle}
                onView={handleViewDetails}
                onEdit={handleEdit}
                onDelete={handleDeleteClick}
                onUploadImage={handleOpenImageUpload}
                getPrimaryImage={getVehiclePrimaryImage}
              />
            ))}
          </div>
        ) : (
          <div className="bg-slate-800/50 backdrop-blur-sm border border-yellow-500/20 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b border-yellow-500/20 bg-slate-900/50">
                    <th className="text-left py-4 px-4 sm:px-6 text-xs font-medium text-gray-400 uppercase tracking-wider">Vehicle</th>
                    <th className="text-left py-4 px-4 sm:px-6 text-xs font-medium text-gray-400 uppercase tracking-wider">Driver</th>
                    <th className="text-left py-4 px-4 sm:px-6 text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="text-left py-4 px-4 sm:px-6 text-xs font-medium text-gray-400 uppercase tracking-wider">Capacity</th>
                    <th className="text-left py-4 px-4 sm:px-6 text-xs font-medium text-gray-400 uppercase tracking-wider">Trips</th>
                    <th className="text-center py-4 px-4 sm:px-6 text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-yellow-500/10">
                  {paginatedVehicles.map((vehicle) => (
                    <VehicleRow
                      key={vehicle.id}
                      vehicle={vehicle}
                      onView={handleViewDetails}
                      onEdit={handleEdit}
                      onDelete={handleDeleteClick}
                      onUploadImage={handleOpenImageUpload}
                      getPrimaryImage={getVehiclePrimaryImage}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination */}
        {filteredVehicles.length > 0 && totalPagesMemo > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 sm:mt-8">
            <p className="text-xs sm:text-sm text-gray-500 order-2 sm:order-1">
              Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredVehicles.length)} of {filteredVehicles.length} vehicles
            </p>
            <div className="flex items-center gap-2 order-1 sm:order-2">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                disabled={currentPage === 1} 
                className="p-2 bg-slate-800/50 border border-yellow-500/20 rounded-lg hover:bg-slate-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex gap-1">
                {Array.from({ length: Math.min(5, totalPagesMemo) }, (_, i) => {
                  let pageNum;
                  if (totalPagesMemo <= 5) pageNum = i + 1;
                  else if (currentPage <= 3) pageNum = i + 1;
                  else if (currentPage >= totalPagesMemo - 2) pageNum = totalPagesMemo - 4 + i;
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
                onClick={() => setCurrentPage(p => Math.min(totalPagesMemo, p + 1))} 
                disabled={currentPage === totalPagesMemo} 
                className="p-2 bg-slate-800/50 border border-yellow-500/20 rounded-lg hover:bg-slate-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Image Upload Modal */}
      {showImageUploadModal && vehicleToUpload && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-gradient-to-b from-slate-900 to-slate-950 rounded-2xl border border-yellow-500/20 max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-lg flex items-center justify-center">
                  <Camera className="w-5 h-5 text-black" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Upload Images</h2>
                  <p className="text-xs text-gray-400">Add photos to vehicle gallery</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setShowImageUploadModal(false);
                  setSelectedFiles([]);
                  setImagePreviews([]);
                  setVehicleToUpload(null);
                }}
                className="p-1 hover:bg-slate-800 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div 
              className="border-2 border-dashed border-yellow-500/20 rounded-xl p-8 text-center hover:border-yellow-400/50 transition cursor-pointer mb-4"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
              <Upload className="w-12 h-12 text-yellow-400/50 mx-auto mb-3" />
              <p className="text-sm text-gray-400">Click to upload images</p>
              <p className="text-xs text-gray-500 mt-1">JPEG, PNG, WebP up to 5MB each</p>
            </div>

            {imagePreviews.length > 0 && (
              <div className="mt-4">
                <p className="text-sm text-gray-400 mb-2">Ready to upload ({selectedFiles.length} images)</p>
                <div className="grid grid-cols-3 gap-3 max-h-64 overflow-y-auto">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="relative group">
                      <div className="relative aspect-square bg-slate-800 rounded-lg overflow-hidden">
                        <img
                          src={preview}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <button
                        onClick={() => removeSelectedFile(index)}
                        className="absolute top-1 right-1 p-1 bg-rose-500/80 rounded-full hover:bg-rose-500 transition"
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowImageUploadModal(false);
                  setSelectedFiles([]);
                  setImagePreviews([]);
                  setVehicleToUpload(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-700 rounded-xl text-gray-300 font-medium hover:bg-gray-800 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleUploadImages}
                disabled={uploading || selectedFiles.length === 0}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-yellow-400 to-amber-500 text-black rounded-xl font-medium hover:from-yellow-300 hover:to-amber-400 transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Upload {selectedFiles.length} Image{selectedFiles.length !== 1 ? 's' : ''}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vehicle Details Modal */}
      {showDetailsModal && selectedVehicle && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-gradient-to-b from-slate-900 to-slate-950 rounded-2xl border border-yellow-500/20 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-slate-900/95 backdrop-blur-sm border-b border-yellow-500/20 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center">
                    {(() => {
                      const primaryImage = getVehiclePrimaryImage(selectedVehicle);
                      if (primaryImage) {
                        return (
                          <img
                            src={primaryImage}
                            alt={selectedVehicle.plateNumber}
                            className="w-full h-full object-cover"
                          />
                        );
                      }
                      return <Truck className="w-6 h-6 text-black" />;
                    })()}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">{selectedVehicle.plateNumber}</h2>
                    <p className="text-sm text-gray-400">{selectedVehicle.model}</p>
                  </div>
                </div>
                <button onClick={() => setShowDetailsModal(false)} className="p-2 hover:bg-slate-800 rounded-lg transition" aria-label="Close">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-800/30 rounded-xl p-4 border border-yellow-500/20">
                  <h3 className="text-sm font-semibold text-yellow-400 mb-3 flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    Vehicle Information
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Plate Number</span>
                      <span className="text-sm font-medium text-white">{selectedVehicle.plateNumber}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Model</span>
                      <span className="text-sm font-medium text-white">{selectedVehicle.model}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Capacity</span>
                      <span className="text-sm font-medium text-white">{selectedVehicle.capacity} seats</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Status</span>
                      <StatusBadge status={selectedVehicle.status} />
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Added On</span>
                      <span className="text-sm font-medium text-white">
                        {new Date(selectedVehicle.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
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
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-400">Name</span>
                        <span className="text-sm font-medium text-white">{selectedVehicle.driver.user.name}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-400">Email</span>
                        <span className="text-sm font-medium text-white">{selectedVehicle.driver.user.email}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-400">Phone</span>
                        <span className="text-sm font-medium text-white">{selectedVehicle.driver.user.phone || 'N/A'}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-4">No driver assigned</p>
                  )}
                </div>

                <div className="bg-slate-800/30 rounded-xl p-4 border border-yellow-500/20">
                  <h3 className="text-sm font-semibold text-yellow-400 mb-3 flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    Activity Metrics
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Total Trips</span>
                      <span className="text-sm font-semibold text-white">{selectedVehicle._count?.trips || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Income Logs</span>
                      <span className="text-sm font-semibold text-emerald-400">{selectedVehicle._count?.incomeLogs || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Expenses</span>
                      <span className="text-sm font-semibold text-rose-400">{selectedVehicle._count?.expenses || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Maintenance Records</span>
                      <span className="text-sm font-semibold text-amber-400">{selectedVehicle._count?.maintenance || 0}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-800/30 rounded-xl p-4 border border-yellow-500/20">
                  <h3 className="text-sm font-semibold text-yellow-400 mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Documentation
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Documents</span>
                      <span className="text-sm font-semibold text-white">{selectedVehicle._count?.documents || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Last Updated</span>
                      <span className="text-sm font-medium text-white">
                        {new Date(selectedVehicle.updatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

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
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn">
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
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.05); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-2px); }
          20%, 40%, 60%, 80% { transform: translateX(2px); }
        }
        .animate-pulse { animation: pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
        .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
        .animate-shake { animation: shake 0.5s ease-in-out; }
        .animation-delay-2000 { animation-delay: 2s; }
        .will-change-transform { will-change: transform, opacity; }
      `}</style>
    </div>
  );
}

// Types for API response
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

function VehiclesFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-12 h-12 text-yellow-400 animate-spin mx-auto mb-4" />
        <p className="text-gray-400">Loading vehicles...</p>
      </div>
    </div>
  );
}

export default function VehiclesPage() {
  return (
    <Suspense fallback={<VehiclesFallback />}>
      <VehiclesContent />
    </Suspense>
  );
}