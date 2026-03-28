// app/dashboards/admin/vehicles/[id]/edit/page.tsx
"use client";

import { useState, useEffect, useRef, Suspense, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  Save,
  X,
  Truck,
  Car,
  Users,
  AlertTriangle,
  CheckCircle,
  Loader2,
  User,
  Hash,
  Edit,
  Info,
  Activity,
  Camera,
  Upload,
  Trash2,
  Star,
  StarOff,
  Image as ImageIcon,
  Plus,
  RefreshCw
} from "lucide-react";

// Firebase will be dynamically imported on client side only
let auth: any = null;
let onAuthStateChanged: any = null;

// Constants
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const VALID_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];

interface VehicleImage {
  id: string;
  url: string;
  type: string;
  isPrimary: boolean;
  fileName?: string;
  fileType?: string;
}

interface Driver {
  id: string;
  user: {
    name: string;
    email: string;
    phone: string;
    avatar?: string;
  };
  licenseNumber: string;
  status: string;
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
  images?: VehicleImage[];
  createdAt: string;
  updatedAt: string;
  _count?: {
    trips: number;
    incomeLogs: number;
    expenses: number;
    maintenance: number;
    alerts: number;
    documents: number;
  };
  summary?: {
    totalTrips: number;
    totalIncome: number;
    totalExpenses: number;
    maintenanceCost: number;
    netProfit: number;
    activeAlerts: number;
  };
}

function EditVehicleContent() {
  const router = useRouter();
  const params = useParams();
  const vehicleId = params.id as string;
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [firebaseReady, setFirebaseReady] = useState(false);
  const [formData, setFormData] = useState({
    plateNumber: '',
    model: '',
    capacity: '',
    status: 'ACTIVE',
    driverId: ''
  });

  // Load Firebase dynamically
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
      loadData();
    });

    return () => unsubscribe();
  }, [vehicleId, firebaseReady]);

  // Cleanup preview URLs
  useEffect(() => {
    return () => {
      imagePreviews.forEach(url => URL.revokeObjectURL(url));
    };
  }, [imagePreviews]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const user = auth?.currentUser;
      if (!user) {
        router.push('/auth/login');
        return;
      }
      
      const token = await user.getIdToken();
      
      // Load vehicle details
      const vehicleResponse = await fetch(`/api/admin/vehicles/${vehicleId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!vehicleResponse.ok) {
        if (vehicleResponse.status === 404) {
          throw new Error('Vehicle not found');
        }
        throw new Error('Failed to load vehicle');
      }
      
      const vehicleData = await vehicleResponse.json();
      
      // Fetch vehicle images
      const imagesResponse = await fetch(`/api/upload?entityType=vehicle&entityId=${vehicleId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (imagesResponse.ok) {
        const imagesData = await imagesResponse.json();
        vehicleData.images = imagesData.images || [];
      }
      
      setVehicle(vehicleData);
      setFormData({
        plateNumber: vehicleData.plateNumber || '',
        model: vehicleData.model || '',
        capacity: vehicleData.capacity?.toString() || '',
        status: vehicleData.status || 'ACTIVE',
        driverId: vehicleData.driverId || ''
      });
      
      // Load available drivers
      const driversResponse = await fetch('/api/admin/drivers?limit=100', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (driversResponse.ok) {
        const driversData = await driversResponse.json();
        setDrivers(driversData.items || []);
      }
      
    } catch (error: any) {
      console.error('Error loading data:', error);
      setError(error.message || 'Failed to load vehicle data');
    } finally {
      setLoading(false);
    }
  }, [vehicleId, router]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
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
      
      const response = await fetch(`/api/admin/vehicles/${vehicleId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plateNumber: formData.plateNumber,
          model: formData.model,
          capacity: parseInt(formData.capacity),
          status: formData.status,
          driverId: formData.driverId || null
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update vehicle');
      }
      
      setSuccess('Vehicle updated successfully!');
      
      // Reload data to refresh stats
      await loadData();
      
    } catch (error: any) {
      console.error('Error updating vehicle:', error);
      setError(error.message || 'Failed to update vehicle');
    } finally {
      setSaving(false);
    }
  }, [vehicleId, formData, router, loadData]);

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

  const uploadImageToAPI = useCallback(async (file: File, isMain: boolean = false): Promise<any> => {
    const user = auth?.currentUser;
    if (!user) throw new Error('Not authenticated');
    
    const token = await user.getIdToken();
    const formData = new FormData();
    formData.append('file', file);
    formData.append('imageType', isMain ? 'main' : 'gallery');
    formData.append('entityType', 'vehicle');
    formData.append('entityId', vehicleId);
    
    // If it's the first image or explicitly set as main, set as primary
    if (isMain || !vehicle?.images?.length) {
      formData.append('setPrimary', 'true');
    }

    const response = await fetch('/api/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to upload image');
    }

    return response.json();
  }, [vehicleId, vehicle?.images]);

  const handleUploadImages = useCallback(async () => {
    if (selectedFiles.length === 0) return;
    
    setUploading(true);
    setError(null);
    
    try {
      const hasExistingImages = vehicle?.images && vehicle.images.length > 0;
      
      // Upload all images in parallel
      const uploadPromises = selectedFiles.map((file, index) => 
        uploadImageToAPI(file, !hasExistingImages && index === 0)
      );
      
      await Promise.all(uploadPromises);
      
      setSuccess(`${selectedFiles.length} image(s) uploaded successfully!`);
      setSelectedFiles([]);
      setImagePreviews([]);
      
      // Reload vehicle data to show new images
      await loadData();
      
      setTimeout(() => setSuccess(null), 3000);
      
    } catch (error: any) {
      console.error('Error uploading images:', error);
      setError(error.message || 'Failed to upload images');
    } finally {
      setUploading(false);
    }
  }, [selectedFiles, vehicle?.images, uploadImageToAPI, loadData]);

  const handleDeleteImage = useCallback(async (imageId: string) => {
    if (!confirm('Are you sure you want to delete this image?')) return;
    
    try {
      const user = auth?.currentUser;
      if (!user) {
        router.push('/auth/login');
        return;
      }
      
      const token = await user.getIdToken();
      
      const response = await fetch(`/api/upload?imageId=${imageId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete image');
      }
      
      setSuccess('Image deleted successfully!');
      await loadData();
      
      setTimeout(() => setSuccess(null), 3000);
      
    } catch (error: any) {
      console.error('Error deleting image:', error);
      setError(error.message || 'Failed to delete image');
    }
  }, [router, loadData]);

  const handleSetPrimary = useCallback(async (imageId: string) => {
    try {
      const user = auth?.currentUser;
      if (!user) return;
      
      const token = await user.getIdToken();
      
      const response = await fetch(`/api/upload?imageId=${imageId}&action=set-primary`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to set primary image');
      }
      
      setSuccess('Primary image updated!');
      await loadData();
      
      setTimeout(() => setSuccess(null), 3000);
      
    } catch (error: any) {
      console.error('Error setting primary image:', error);
      setError(error.message || 'Failed to set primary image');
    }
  }, [loadData]);

  const removeSelectedFile = useCallback((index: number) => {
    URL.revokeObjectURL(imagePreviews[index]);
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  }, [imagePreviews]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'text-green-400 bg-green-500/10 border-green-500/30';
      case 'MAINTENANCE':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      case 'INACTIVE':
        return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
      case 'OUT_OF_SERVICE':
        return 'text-gray-400 bg-gray-500/10 border-gray-500/30';
      default:
        return 'text-gray-400 bg-gray-500/10 border-gray-500/30';
    }
  };

  // Show loading while Firebase initializes
  if (!firebaseReady) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-yellow-400 animate-spin mx-auto mb-4" />
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
            <Loader2 className="w-20 h-20 text-yellow-400 animate-spin mx-auto mb-4" />
            <Truck className="w-8 h-8 text-yellow-400 absolute top-6 left-1/2 -translate-x-1/2 animate-pulse" />
          </div>
          <p className="text-gray-400 mt-4">Loading vehicle details...</p>
        </div>
      </div>
    );
  }

  if (!vehicle && !loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-10 h-10 text-rose-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">Vehicle Not Found</h2>
          <p className="text-gray-400 mb-6">The vehicle you're looking for doesn't exist or has been removed.</p>
          <Link
            href="/dashboards/admin/vehicles"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-yellow-400 to-amber-500 text-black rounded-xl font-semibold hover:from-yellow-300 hover:to-amber-400 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Vehicles
          </Link>
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
            <div className="flex items-center gap-4">
              <Link
                href="/dashboards/admin/vehicles"
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
                    Edit Vehicle
                  </h1>
                </div>
                <p className="text-xs sm:text-sm text-gray-500 flex items-center gap-2">
                  <Truck className="w-3 h-3 text-yellow-400" />
                  Updating {vehicle?.plateNumber} • {vehicle?.model}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${getStatusColor(vehicle?.status || '')}`}>
                Current: {vehicle?.status?.replace('_', ' ')}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
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

        {/* Image Management Card */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-yellow-500/20 rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Camera className="w-5 h-5 text-yellow-400" />
            Vehicle Images
          </h2>
          
          {/* Existing Images */}
          {vehicle?.images && vehicle.images.length > 0 && (
            <div className="mb-6">
              <p className="text-sm text-gray-400 mb-3">Current Images ({vehicle.images.length})</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {vehicle.images.map((image) => (
                  <div key={image.id} className="relative group">
                    <div className="relative aspect-square bg-slate-900 rounded-lg overflow-hidden border border-yellow-500/20">
                      <img
                        src={image.url}
                        alt={vehicle.plateNumber}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      {image.isPrimary && (
                        <div className="absolute top-2 left-2 bg-yellow-400 text-black text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Star className="w-3 h-3" />
                          Primary
                        </div>
                      )}
                    </div>
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                      {!image.isPrimary && (
                        <button
                          onClick={() => handleSetPrimary(image.id)}
                          className="p-1.5 bg-slate-800/90 rounded-lg hover:bg-yellow-500/20 transition"
                          title="Set as primary"
                        >
                          <Star className="w-3.5 h-3.5 text-gray-400 hover:text-yellow-400" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteImage(image.id)}
                        className="p-1.5 bg-slate-800/90 rounded-lg hover:bg-rose-500/20 transition"
                        title="Delete image"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-rose-400" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload New Images */}
          <div>
            <p className="text-sm text-gray-400 mb-3">Add New Images</p>
            <div 
              className="border-2 border-dashed border-yellow-500/20 rounded-xl p-6 text-center hover:border-yellow-400/50 transition cursor-pointer"
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
              <Upload className="w-10 h-10 text-yellow-400/50 mx-auto mb-3" />
              <p className="text-sm text-gray-400">Click to upload images</p>
              <p className="text-xs text-gray-500 mt-1">JPEG, PNG, WebP up to 5MB each</p>
            </div>
            
            {/* Image Previews */}
            {imagePreviews.length > 0 && (
              <div className="mt-4">
                <p className="text-sm text-gray-400 mb-2">Ready to upload ({selectedFiles.length} images)</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="relative group">
                      <div className="relative aspect-square bg-slate-900 rounded-lg overflow-hidden border border-yellow-500/20">
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
                <button
                  onClick={handleUploadImages}
                  disabled={uploading}
                  className="mt-4 w-full px-4 py-2 bg-gradient-to-r from-yellow-400 to-amber-500 text-black rounded-xl font-medium hover:from-yellow-300 hover:to-amber-400 transition flex items-center justify-center gap-2 disabled:opacity-50"
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
            )}
          </div>
        </div>

        {/* Edit Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Vehicle Information Card */}
          <div className="bg-slate-800/50 backdrop-blur-sm border border-yellow-500/20 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Info className="w-5 h-5 text-yellow-400" />
              Vehicle Information
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Plate Number *
                </label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    value={formData.plateNumber}
                    onChange={(e) => setFormData({...formData, plateNumber: e.target.value.toUpperCase()})}
                    className="w-full bg-slate-900/50 border border-yellow-500/20 rounded-xl py-2.5 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400/50 focus:ring-1 focus:ring-yellow-400/20 transition"
                    placeholder="e.g., KCA 123A"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Model *
                </label>
                <div className="relative">
                  <Car className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    value={formData.model}
                    onChange={(e) => setFormData({...formData, model: e.target.value})}
                    className="w-full bg-slate-900/50 border border-yellow-500/20 rounded-xl py-2.5 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400/50 focus:ring-1 focus:ring-yellow-400/20 transition"
                    placeholder="e.g., Toyota Hiace"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Capacity (Seats) *
                </label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="number"
                    value={formData.capacity}
                    onChange={(e) => setFormData({...formData, capacity: e.target.value})}
                    className="w-full bg-slate-900/50 border border-yellow-500/20 rounded-xl py-2.5 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400/50 focus:ring-1 focus:ring-yellow-400/20 transition"
                    placeholder="e.g., 14"
                    min="1"
                    max="60"
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
                  <option value="MAINTENANCE">Maintenance</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="OUT_OF_SERVICE">Out of Service</option>
                </select>
              </div>
            </div>
          </div>

          {/* Driver Assignment Card */}
          <div className="bg-slate-800/50 backdrop-blur-sm border border-yellow-500/20 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-yellow-400" />
              Driver Assignment
            </h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Assign Driver (Optional)
              </label>
              <select
                value={formData.driverId}
                onChange={(e) => setFormData({...formData, driverId: e.target.value})}
                className="w-full bg-slate-900/50 border border-yellow-500/20 rounded-xl py-2.5 px-4 text-white focus:outline-none focus:border-yellow-400/50 focus:ring-1 focus:ring-yellow-400/20 transition"
              >
                <option value="">Unassigned</option>
                {drivers.map((driver) => (
                  <option key={driver.id} value={driver.id}>
                    {driver.user.name} - {driver.user.email}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-2">
                {formData.driverId ? 'Driver will be assigned to this vehicle' : 'Leave unassigned if no driver is assigned'}
              </p>
            </div>

            {/* Current Driver Info */}
            {vehicle?.driver && !formData.driverId && (
              <div className="mt-4 p-3 bg-slate-700/30 rounded-lg border border-yellow-500/20">
                <p className="text-xs text-gray-400 mb-2">Currently Assigned Driver:</p>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center">
                    <User className="w-4 h-4 text-black" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{vehicle.driver.user.name}</p>
                    <p className="text-xs text-gray-500">{vehicle.driver.user.email}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Vehicle Stats Card */}
          <div className="bg-slate-800/50 backdrop-blur-sm border border-yellow-500/20 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-yellow-400" />
              Vehicle Statistics
            </h2>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-xs text-gray-500">Trips</p>
                <p className="text-xl font-bold text-white">{vehicle?._count?.trips || vehicle?.summary?.totalTrips || 0}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500">Income Logs</p>
                <p className="text-xl font-bold text-green-400">{vehicle?._count?.incomeLogs || 0}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500">Expenses</p>
                <p className="text-xl font-bold text-rose-400">{vehicle?._count?.expenses || 0}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500">Alerts</p>
                <p className="text-xl font-bold text-amber-400">{vehicle?._count?.alerts || 0}</p>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-yellow-500/20">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Added On</span>
                <span className="text-white">{vehicle?.createdAt ? new Date(vehicle.createdAt).toLocaleDateString() : 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-gray-400">Last Updated</span>
                <span className="text-white">{vehicle?.updatedAt ? new Date(vehicle.updatedAt).toLocaleDateString() : 'N/A'}</span>
              </div>
              {vehicle?.summary && (
                <>
                  <div className="flex items-center justify-between text-sm mt-2">
                    <span className="text-gray-400">Total Income</span>
                    <span className="text-green-400 font-medium">KES {vehicle.summary.totalIncome?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-2">
                    <span className="text-gray-400">Net Profit</span>
                    <span className={`font-medium ${(vehicle.summary.netProfit || 0) >= 0 ? 'text-green-400' : 'text-rose-400'}`}>
                      KES {vehicle.summary.netProfit?.toLocaleString() || 0}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Link
              href="/dashboards/admin/vehicles"
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
      </div>

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
        .animate-pulse { animation: pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
        .animate-shake { animation: shake 0.5s ease-in-out; }
        .animation-delay-2000 { animation-delay: 2s; }
        .will-change-transform { will-change: transform, opacity; }
      `}</style>
    </div>
  );
}

function EditVehicleFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-12 h-12 text-yellow-400 animate-spin mx-auto mb-4" />
        <p className="text-gray-400">Loading vehicle details...</p>
      </div>
    </div>
  );
}

export default function EditVehiclePage() {
  return (
    <Suspense fallback={<EditVehicleFallback />}>
      <EditVehicleContent />
    </Suspense>
  );
}