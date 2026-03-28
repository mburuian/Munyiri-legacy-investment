"use client";

import { useState, useEffect, Suspense, useCallback, useMemo, memo, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  PlusCircle,
  Search,
  Filter,
  Download,
  Users,
  Truck,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Edit,
  Trash2,
  Eye,
  X,
  User,
  Phone,
  Mail,
  MapPin,
  DollarSign,
  TrendingUp,
  Award,
  IdCard,
  Gauge,
  MoreHorizontal,
  Activity,
  Loader2,
  Camera,
  Upload
} from "lucide-react";

// Firebase will be dynamically imported on client side only
let auth: any = null;
let onAuthStateChanged: any = null;

// Constants
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const VALID_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];

// Types
interface Driver {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  avatar?: string | null;
  licenseNumber: string;
  status: string;
  createdAt: string;
  rating?: number | null;
  tripsCompleted?: number;
  totalRevenue?: number;
  assignedVehicle?: {
    id: string;
    plateNumber: string;
    model: string;
    capacity: number;
    status: string;
  } | null;
}

interface DriversResponse {
  drivers: Driver[];
  summary: {
    totalDrivers: number;
    activeDrivers: number;
    offDutyDrivers: number;
    onLeaveDrivers: number;
    suspendedDrivers: number;
    terminatedDrivers: number;
    assignedDrivers: number;
    unassignedDrivers: number;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Constants
const ITEMS_PER_PAGE = 12;
const DEBOUNCE_DELAY = 300;

// Memoized Components
const StatusBadge = memo(({ status }: { status: string }) => {
  const getStatusConfig = (status: string) => {
    const s = status?.toLowerCase();
    switch (s) {
      case 'active': return { color: 'text-green-400', bg: 'bg-green-500/20', border: 'border-green-500/30', icon: CheckCircle };
      case 'off-duty': return { color: 'text-gray-400', bg: 'bg-gray-500/20', border: 'border-gray-500/30', icon: Clock };
      case 'on-leave': return { color: 'text-amber-400', bg: 'bg-amber-500/20', border: 'border-amber-500/30', icon: Calendar };
      case 'suspended': return { color: 'text-rose-400', bg: 'bg-rose-500/20', border: 'border-rose-500/30', icon: AlertTriangle };
      case 'terminated': return { color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/30', icon: XCircle };
      default: return { color: 'text-gray-400', bg: 'bg-gray-500/20', border: 'border-gray-500/30', icon: User };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1 ${config.bg} ${config.color} border ${config.border}`}>
      <Icon className="w-3 h-3" />
      {status?.replace('-', ' ').toUpperCase()}
    </span>
  );
});

StatusBadge.displayName = 'StatusBadge';

const DriverCard = memo(({ driver, onView, onEdit, onDelete, onUploadPhoto }: { 
  driver: Driver; 
  onView: (id: string) => void; 
  onEdit: (id: string) => void; 
  onDelete: (driver: Driver) => void;
  onUploadPhoto: (driver: Driver) => void;
}) => {
  const [imageError, setImageError] = useState(false);

  return (
    <div
      onClick={() => onView(driver.id)}
      className="group bg-slate-800/50 backdrop-blur-sm border border-yellow-500/20 rounded-2xl overflow-hidden hover:border-yellow-400/50 hover:shadow-xl hover:shadow-yellow-500/10 transition-all cursor-pointer will-change-transform"
    >
      <div className="relative h-32 bg-gradient-to-br from-yellow-500/20 to-amber-600/20 flex items-center justify-center">
        {driver.avatar && !imageError ? (
          <img
            src={driver.avatar}
            alt={driver.name}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center">
            <User className="w-10 h-10 text-black" />
          </div>
        )}
        
        {/* Upload Photo Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onUploadPhoto(driver);
          }}
          className="absolute bottom-2 right-2 p-1.5 bg-black/60 rounded-full hover:bg-yellow-500 transition opacity-0 group-hover:opacity-100 backdrop-blur-sm"
          title="Upload Photo"
        >
          <Camera className="w-3.5 h-3.5 text-white" />
        </button>
        
        <div className="absolute top-3 right-3">
          <StatusBadge status={driver.status} />
        </div>
      </div>

      <div className="p-4">
        <h3 className="text-lg font-semibold text-white mb-1 truncate">{driver.name}</h3>
        <p className="text-sm text-gray-400 mb-3 truncate">{driver.email}</p>
        
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
          <IdCard className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">{driver.licenseNumber}</span>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-yellow-500/10">
          <div className="text-center">
            <p className="text-xs text-gray-500">Trips</p>
            <p className="text-sm font-medium text-white">{driver.tripsCompleted || 0}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500">Revenue</p>
            <p className="text-sm font-medium text-green-400">
              KES {driver.totalRevenue?.toLocaleString() || '0'}
            </p>
          </div>
        </div>

        {driver.assignedVehicle ? (
          <div className="mt-3 flex items-center gap-2 text-xs text-gray-500 truncate">
            <Truck className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{driver.assignedVehicle.plateNumber} - {driver.assignedVehicle.model}</span>
          </div>
        ) : (
          <div className="mt-3 text-xs text-gray-600">
            No vehicle assigned
          </div>
        )}
      </div>
      
      {/* Action Buttons */}
      <div className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity z-20">
        <div className="flex gap-1">
          <button 
            onClick={(e) => { e.stopPropagation(); onView(driver.id); }} 
            className="p-1.5 bg-slate-800/90 rounded-lg hover:bg-yellow-500/20 transition" 
            title="View Details"
          >
            <Eye className="w-3.5 h-3.5 text-gray-300" />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onEdit(driver.id); }} 
            className="p-1.5 bg-slate-800/90 rounded-lg hover:bg-yellow-500/20 transition" 
            title="Edit Driver"
          >
            <Edit className="w-3.5 h-3.5 text-gray-300" />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onDelete(driver); }} 
            className="p-1.5 bg-slate-800/90 rounded-lg hover:bg-rose-500/20 transition" 
            title="Delete Driver"
          >
            <Trash2 className="w-3.5 h-3.5 text-gray-300" />
          </button>
        </div>
      </div>
    </div>
  );
});

DriverCard.displayName = 'DriverCard';

const DriverRow = memo(({ driver, onView, onEdit, onDelete, onUploadPhoto }: { 
  driver: Driver; 
  onView: (id: string) => void; 
  onEdit: (id: string) => void; 
  onDelete: (driver: Driver) => void;
  onUploadPhoto: (driver: Driver) => void;
}) => {
  const [imageError, setImageError] = useState(false);

  return (
    <tr 
      onClick={() => onView(driver.id)}
      className="hover:bg-yellow-500/5 transition-colors cursor-pointer"
    >
      <td className="py-4 px-6">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {driver.avatar && !imageError ? (
                <img
                  src={driver.avatar}
                  alt={driver.name}
                  className="w-full h-full object-cover"
                  onError={() => setImageError(true)}
                />
              ) : (
                <User className="w-5 h-5 text-black" />
              )}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUploadPhoto(driver);
              }}
              className="absolute -bottom-1 -right-1 p-1 bg-black/70 rounded-full hover:bg-yellow-500 transition opacity-0 group-hover:opacity-100"
              title="Upload Photo"
            >
              <Camera className="w-2.5 h-2.5 text-white" />
            </button>
          </div>
          <div>
            <p className="font-medium text-white">{driver.name}</p>
            <p className="text-xs text-gray-500">{driver.email}</p>
          </div>
        </div>
       </td>
      <td className="py-4 px-6">
        <div className="flex items-center gap-2 text-sm">
          <Phone className="w-3 h-3 text-gray-500" />
          <span className="text-gray-300">{driver.phone}</span>
        </div>
       </td>
      <td className="py-4 px-6">
        <div className="flex items-center gap-2">
          <IdCard className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-300">{driver.licenseNumber}</span>
        </div>
       </td>
      <td className="py-4 px-6">
        <StatusBadge status={driver.status} />
       </td>
      <td className="py-4 px-6">
        <span className="text-sm text-gray-300">{driver.tripsCompleted || 0}</span>
       </td>
      <td className="py-4 px-6">
        <span className="text-sm text-green-400">KES {driver.totalRevenue?.toLocaleString() || '0'}</span>
       </td>
      <td className="py-4 px-6">
        {driver.assignedVehicle ? (
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-300">{driver.assignedVehicle.plateNumber}</span>
          </div>
        ) : (
          <span className="text-sm text-gray-600">Unassigned</span>
        )}
       </td>
      <td className="py-4 px-6">
        <div className="flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => onView(driver.id)}
            className="p-1.5 hover:bg-slate-700 rounded-lg transition"
            aria-label="View driver"
          >
            <Eye className="w-4 h-4 text-gray-400" />
          </button>
          <button
            onClick={() => onEdit(driver.id)}
            className="p-1.5 hover:bg-slate-700 rounded-lg transition"
            aria-label="Edit driver"
          >
            <Edit className="w-4 h-4 text-gray-400" />
          </button>
          <button
            onClick={() => onDelete(driver)}
            className="p-1.5 hover:bg-slate-700 rounded-lg transition"
            aria-label="Delete driver"
          >
            <Trash2 className="w-4 h-4 text-gray-400" />
          </button>
        </div>
       </td>
     </tr>
  );
});

DriverRow.displayName = 'DriverRow';

// Main Component
function DriversContent() {
  const router = useRouter();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [summary, setSummary] = useState<DriversResponse['summary'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [firebaseReady, setFirebaseReady] = useState(false);
  const [user, setUser] = useState<any>(null);
  
  // Photo upload modal state
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [selectedDriverForPhoto, setSelectedDriverForPhoto] = useState<Driver | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Search and filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'status' | 'trips' | 'revenue'>('name');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  
  // Modal states
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [driverToDelete, setDriverToDelete] = useState<Driver | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

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
      setUser(user);
      loadDrivers();
    });

    return () => unsubscribe();
  }, [firebaseReady, router]);

  // Cleanup preview URL
  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  // Memoized filtered and sorted drivers
  const filteredDrivers = useMemo(() => {
    let filtered = drivers.filter(driver => {
      const matchesSearch = 
        driver.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        driver.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        driver.phone.includes(searchQuery) ||
        driver.licenseNumber.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || driver.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });

    switch (sortBy) {
      case 'name':
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'status':
        filtered.sort((a, b) => a.status.localeCompare(b.status));
        break;
      case 'trips':
        filtered.sort((a, b) => (b.tripsCompleted || 0) - (a.tripsCompleted || 0));
        break;
      case 'revenue':
        filtered.sort((a, b) => (b.totalRevenue || 0) - (a.totalRevenue || 0));
        break;
    }

    return filtered;
  }, [drivers, searchQuery, statusFilter, sortBy]);

  // Pagination
  const totalPages = Math.ceil(filteredDrivers.length / ITEMS_PER_PAGE);
  const paginatedDrivers = useMemo(() => 
    filteredDrivers.slice(
      (currentPage - 1) * ITEMS_PER_PAGE,
      currentPage * ITEMS_PER_PAGE
    ),
    [filteredDrivers, currentPage]
  );

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, sortBy]);

  // Debounced search handler
  const handleSearch = useCallback((value: string) => {
    const timeoutId = setTimeout(() => setSearchQuery(value), DEBOUNCE_DELAY);
    return () => clearTimeout(timeoutId);
  }, []);

  // Load drivers
  const loadDrivers = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const token = await user?.getIdToken();
      
      const response = await fetch('/api/admin/drivers', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache',
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch drivers');
      const data: DriversResponse = await response.json();
      
      // Fetch avatars for drivers
      const driversWithAvatars = await Promise.all(
        (data.drivers || []).map(async (driver) => {
          try {
            const imagesResponse = await fetch(`/api/upload?entityType=driver&entityId=${driver.id}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (imagesResponse.ok) {
              const imagesData = await imagesResponse.json();
              if (imagesData.images && imagesData.images.length > 0) {
                return { ...driver, avatar: imagesData.images[0]?.url };
              }
            }
          } catch (error) {
            console.error(`Error fetching avatar for driver ${driver.id}:`, error);
          }
          return driver;
        })
      );
      
      setDrivers(driversWithAvatars);
      setSummary(data.summary);
    } catch (error) {
      console.error('Error loading drivers:', error);
      setError('Failed to load drivers. Please try again.');
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  }, [user]);

  // Upload driver photo
  const uploadDriverPhoto = useCallback(async () => {
    if (!selectedDriverForPhoto || !selectedFile || !user) return;
    
    setUploadingPhoto(true);
    setError(null);
    
    try {
      const token = await user.getIdToken();
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('imageType', 'avatar');
      formData.append('entityType', 'driver');
      formData.append('entityId', selectedDriverForPhoto.id);
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload photo');
      }
      
      const data = await response.json();
      
      setSuccess(`Photo uploaded for ${selectedDriverForPhoto.name}`);
      setShowPhotoModal(false);
      setSelectedFile(null);
      setImagePreview(null);
      setSelectedDriverForPhoto(null);
      
      // Reload drivers to show new avatar
      await loadDrivers();
      
      setTimeout(() => setSuccess(null), 3000);
      
    } catch (error: any) {
      console.error('Error uploading photo:', error);
      setError(error.message || 'Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
    }
  }, [selectedDriverForPhoto, selectedFile, user, loadDrivers]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file
    if (!VALID_IMAGE_TYPES.includes(file.type)) {
      setError('Invalid file type. Please upload JPEG, PNG, or WebP.');
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setError(`File too large. Maximum size is ${MAX_IMAGE_SIZE / 1024 / 1024}MB.`);
      return;
    }
    
    setSelectedFile(file);
    const preview = URL.createObjectURL(file);
    setImagePreview(preview);
    setError(null);
  }, []);

  const handleOpenPhotoModal = useCallback((driver: Driver) => {
    setSelectedDriverForPhoto(driver);
    setSelectedFile(null);
    setImagePreview(null);
    setShowPhotoModal(true);
    setError(null);
  }, []);

  const handleDeletePhoto = useCallback(async (driver: Driver) => {
    if (!confirm(`Are you sure you want to remove ${driver.name}'s photo?`)) return;
    
    try {
      const token = await user?.getIdToken();
      
      const response = await fetch(`/api/upload?entityType=driver&entityId=${driver.id}&type=avatar`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete photo');
      }
      
      setSuccess(`Photo removed for ${driver.name}`);
      await loadDrivers();
      
      setTimeout(() => setSuccess(null), 3000);
      
    } catch (error: any) {
      console.error('Error deleting photo:', error);
      setError(error.message || 'Failed to delete photo');
    }
  }, [user, loadDrivers]);

  // Navigation handlers
  const handleViewDetails = useCallback((driverId: string) => {
    router.push(`/dashboards/admin/driver/${driverId}`);
  }, [router]);

  const handleEdit = useCallback((driverId: string) => {
    router.push(`/dashboards/admin/driver/${driverId}/edit`);
  }, [router]);

  const handleDeleteClick = useCallback((driver: Driver) => {
    setDriverToDelete(driver);
    setShowDeleteModal(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!driverToDelete || !user) return;
    
    setDeleteLoading(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/admin/drivers/${driverToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to delete driver');

      await loadDrivers();
      setShowDeleteModal(false);
      setDriverToDelete(null);
      setSuccess('Driver deleted successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Error deleting driver:', error);
      setError('Failed to delete driver. Please try again.');
    } finally {
      setDeleteLoading(false);
    }
  }, [driverToDelete, user, loadDrivers]);

  const handleExport = useCallback(async () => {
    try {
      const token = await user?.getIdToken();
      const response = await fetch('/api/admin/drivers/export', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        method: 'POST',
        body: JSON.stringify({ drivers: filteredDrivers }),
      });
      
      if (!response.ok) throw new Error('Export failed');
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `drivers_export_${new Date().toISOString()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
      setError('Failed to export drivers');
    }
  }, [filteredDrivers, user]);

  // Loading states
  if (!firebaseReady || initialLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-yellow-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading drivers...</p>
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
          <h2 className="text-2xl font-bold text-white mb-4">Error Loading Drivers</h2>
          <p className="text-gray-400 mb-6">{error}</p>
          <button
            onClick={loadDrivers}
            className="px-6 py-3 bg-gradient-to-r from-yellow-400 to-amber-500 text-black rounded-xl font-semibold hover:from-yellow-300 hover:to-amber-400 transition shadow-lg shadow-yellow-500/30"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-gray-100">
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
                <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Users className="w-4 h-4 text-black" />
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-white">Drivers</h1>
              </div>
              <p className="text-sm text-gray-500 flex items-center gap-2">
                <Activity className="w-3 h-3 text-yellow-400" />
                {filteredDrivers.length} drivers in your fleet
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              {/* View Toggle */}
              <div className="flex items-center gap-1 p-1 bg-slate-800/50 border border-yellow-500/20 rounded-xl">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition ${
                    viewMode === 'grid' 
                      ? 'bg-yellow-500/20 text-yellow-400' 
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
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
                  className={`p-2 rounded-lg transition ${
                    viewMode === 'list' 
                      ? 'bg-yellow-500/20 text-yellow-400' 
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
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
                href="/dashboards/admin/admit-driver"
                className="px-3 sm:px-4 py-2 bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-black rounded-xl flex items-center gap-2 transition shadow-lg shadow-yellow-500/30 text-sm sm:text-base"
              >
                <PlusCircle className="w-4 h-4" />
                <span className="hidden sm:inline">Add Driver</span>
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
            <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-300">
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
            <button onClick={() => setSuccess(null)} className="text-green-400 hover:text-green-300">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Filters and Search */}
        <div className="flex flex-col lg:flex-row gap-4 mb-6 sm:mb-8">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search by name, email, phone, or license..."
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full bg-slate-800/50 border border-yellow-500/20 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400/50 focus:ring-1 focus:ring-yellow-400/20 transition"
            />
          </div>
          
          <div className="flex gap-2 flex-wrap">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-800/50 border border-yellow-500/20 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-yellow-400/50"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="off-duty">Off Duty</option>
              <option value="on-leave">On Leave</option>
              <option value="suspended">Suspended</option>
              <option value="terminated">Terminated</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-800/50 border border-yellow-500/20 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-yellow-400/50"
            >
              <option value="name">Sort: Name</option>
              <option value="status">Sort: Status</option>
              <option value="trips">Sort: Most Trips</option>
              <option value="revenue">Sort: Highest Revenue</option>
            </select>

            <button 
              onClick={handleExport}
              className="p-2.5 bg-slate-800/50 border border-yellow-500/20 rounded-xl hover:bg-slate-700 transition"
              aria-label="Export drivers"
            >
              <Download className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Stats Summary */}
        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-6 sm:mb-8">
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-yellow-500/20">
              <p className="text-xs sm:text-sm text-gray-500">Total Drivers</p>
              <p className="text-xl sm:text-2xl font-bold text-white">{summary.totalDrivers}</p>
            </div>
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-yellow-500/20">
              <p className="text-xs sm:text-sm text-gray-500">Active</p>
              <p className="text-xl sm:text-2xl font-bold text-green-400">{summary.activeDrivers}</p>
            </div>
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-yellow-500/20">
              <p className="text-xs sm:text-sm text-gray-500">Off Duty</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-400">{summary.offDutyDrivers}</p>
            </div>
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-yellow-500/20">
              <p className="text-xs sm:text-sm text-gray-500">On Leave</p>
              <p className="text-xl sm:text-2xl font-bold text-amber-400">{summary.onLeaveDrivers}</p>
            </div>
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-yellow-500/20 col-span-2 sm:col-span-1">
              <p className="text-xs sm:text-sm text-gray-500">Assigned</p>
              <p className="text-xl sm:text-2xl font-bold text-blue-400">{summary.assignedDrivers}</p>
            </div>
          </div>
        )}

        {/* Drivers Grid/List */}
        {filteredDrivers.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Users className="w-12 h-12 text-yellow-400" />
            </div>
            <h3 className="text-xl font-medium text-white mb-2">No drivers found</h3>
            <p className="text-gray-500 mb-8">
              {searchQuery || statusFilter !== 'all' 
                ? 'Try adjusting your filters'
                : 'Get started by adding your first driver'}
            </p>
            <Link
              href="/dashboards/admin/admit-driver"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-yellow-400 to-amber-500 text-black rounded-xl font-semibold hover:from-yellow-300 hover:to-amber-400 transition shadow-lg shadow-yellow-500/30"
            >
              <PlusCircle className="w-5 h-5" />
              Add Driver
            </Link>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {paginatedDrivers.map((driver) => (
              <DriverCard
                key={driver.id}
                driver={driver}
                onView={handleViewDetails}
                onEdit={handleEdit}
                onDelete={handleDeleteClick}
                onUploadPhoto={handleOpenPhotoModal}
              />
            ))}
          </div>
        ) : (
          <div className="bg-slate-800/50 backdrop-blur-sm border border-yellow-500/20 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b border-yellow-500/20 bg-slate-900/50">
                    <th className="text-left py-3 sm:py-4 px-4 sm:px-6 text-xs font-medium text-gray-400 uppercase tracking-wider">Driver</th>
                    <th className="text-left py-3 sm:py-4 px-4 sm:px-6 text-xs font-medium text-gray-400 uppercase tracking-wider">Contact</th>
                    <th className="text-left py-3 sm:py-4 px-4 sm:px-6 text-xs font-medium text-gray-400 uppercase tracking-wider">License</th>
                    <th className="text-left py-3 sm:py-4 px-4 sm:px-6 text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="text-left py-3 sm:py-4 px-4 sm:px-6 text-xs font-medium text-gray-400 uppercase tracking-wider">Trips</th>
                    <th className="text-left py-3 sm:py-4 px-4 sm:px-6 text-xs font-medium text-gray-400 uppercase tracking-wider">Revenue</th>
                    <th className="text-left py-3 sm:py-4 px-4 sm:px-6 text-xs font-medium text-gray-400 uppercase tracking-wider">Vehicle</th>
                    <th className="text-center py-3 sm:py-4 px-4 sm:px-6 text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-yellow-500/10">
                  {paginatedDrivers.map((driver) => (
                    <DriverRow
                      key={driver.id}
                      driver={driver}
                      onView={handleViewDetails}
                      onEdit={handleEdit}
                      onDelete={handleDeleteClick}
                      onUploadPhoto={handleOpenPhotoModal}
                    />
                  ))}
                </tbody>
               </table>
            </div>
          </div>
        )}

        {/* Pagination */}
        {filteredDrivers.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 sm:mt-8">
            <p className="text-sm text-gray-500 order-2 sm:order-1">
              Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredDrivers.length)} of {filteredDrivers.length} drivers
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
              <span className="text-sm text-gray-400">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 bg-slate-800/50 border border-yellow-500/20 rounded-lg hover:bg-slate-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Photo Upload Modal */}
      {showPhotoModal && selectedDriverForPhoto && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-gradient-to-b from-slate-900 to-slate-950 rounded-2xl border border-yellow-500/20 max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-lg flex items-center justify-center">
                  <Camera className="w-5 h-5 text-black" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Upload Driver Photo</h2>
                  <p className="text-xs text-gray-400">{selectedDriverForPhoto.name}</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setShowPhotoModal(false);
                  setSelectedFile(null);
                  setImagePreview(null);
                  setSelectedDriverForPhoto(null);
                  setError(null);
                }}
                className="p-1 hover:bg-slate-800 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Photo */}
            {selectedDriverForPhoto.avatar && (
              <div className="mb-4">
                <p className="text-sm text-gray-400 mb-2">Current Photo</p>
                <div className="relative w-24 h-24 mx-auto">
                  <div className="w-24 h-24 rounded-full bg-slate-800 border-2 border-yellow-500/30 overflow-hidden">
                    <img
                      src={selectedDriverForPhoto.avatar}
                      alt={selectedDriverForPhoto.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <button
                    onClick={() => handleDeletePhoto(selectedDriverForPhoto)}
                    className="absolute -top-2 -right-2 p-1.5 bg-rose-500/90 rounded-full hover:bg-rose-500 transition"
                    title="Remove photo"
                  >
                    <Trash2 className="w-3 h-3 text-white" />
                  </button>
                </div>
              </div>
            )}

            {/* Upload New Photo */}
            <div 
              className="border-2 border-dashed border-yellow-500/20 rounded-xl p-6 text-center hover:border-yellow-400/50 transition cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              {imagePreview ? (
                <div className="relative">
                  <div className="relative w-32 h-32 mx-auto rounded-full overflow-hidden bg-slate-800">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                      setImagePreview(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="absolute top-0 right-0 p-1 bg-rose-500/80 rounded-full hover:bg-rose-500 transition"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ) : (
                <>
                  <Upload className="w-10 h-10 text-yellow-400/50 mx-auto mb-3" />
                  <p className="text-sm text-gray-400">Click to upload photo</p>
                  <p className="text-xs text-gray-500 mt-1">JPEG, PNG, WebP up to 5MB</p>
                </>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowPhotoModal(false);
                  setSelectedFile(null);
                  setImagePreview(null);
                  setSelectedDriverForPhoto(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-700 rounded-xl text-gray-300 font-medium hover:bg-gray-800 transition"
              >
                Cancel
              </button>
              <button
                onClick={uploadDriverPhoto}
                disabled={uploadingPhoto || !selectedFile}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-yellow-400 to-amber-500 text-black rounded-xl font-medium hover:from-yellow-300 hover:to-amber-400 transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {uploadingPhoto ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Upload Photo
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && driverToDelete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-2xl border border-yellow-500/20 max-w-md w-full p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-rose-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Delete Driver</h3>
              <p className="text-gray-400">
                Are you sure you want to delete {driverToDelete.name}? This action cannot be undone.
              </p>
            </div>

            <div className="bg-slate-800/50 rounded-xl p-4 mb-6 border border-yellow-500/10">
              <div className="flex items-center gap-3 mb-2">
                <User className="w-4 h-4 text-yellow-400" />
                <span className="text-sm font-medium text-white">{driverToDelete.name}</span>
              </div>
              <p className="text-xs text-gray-500">{driverToDelete.email}</p>
              {driverToDelete.assignedVehicle && (
                <p className="text-xs text-gray-500 mt-2">
                  Assigned to: {driverToDelete.assignedVehicle.plateNumber}
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-2 border border-gray-700 rounded-xl text-gray-300 font-medium hover:bg-gray-800 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleteLoading}
                className="flex-1 px-4 py-2 bg-rose-500/20 text-rose-400 rounded-xl font-medium hover:bg-rose-500/30 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {deleteLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete Driver'
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
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-2px); }
          20%, 40%, 60%, 80% { transform: translateX(2px); }
        }
        .animate-pulse {
          animation: pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .will-change-transform {
          will-change: transform, opacity;
        }
      `}</style>
    </div>
  );
}

// Loading fallback
function DriversFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-12 h-12 text-yellow-400 animate-spin mx-auto mb-4" />
        <p className="text-gray-400">Loading drivers...</p>
      </div>
    </div>
  );
}

export default function DriversPage() {
  return (
    <Suspense fallback={<DriversFallback />}>
      <DriversContent />
    </Suspense>
  );
}