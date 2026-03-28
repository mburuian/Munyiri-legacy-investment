// app/dashboards/admin/vehicles/add-vehicle/page.tsx

"use client";

import { useState, useEffect, Suspense, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Car,
  Upload,
  X,
  Plus,
  Calendar,
  Shield,
  Wrench,
  Gauge,
  Palette,
  Hash,
  FileText,
  Camera,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Radio,
  Truck,
  CreditCard,
  DollarSign,
  Trash2,
  Save,
} from "lucide-react";

// Firebase will be dynamically imported on client side only
let auth: any = null;
let onAuthStateChanged: any = null;

interface FormData {
  // Basic Information
  regNumber: string;
  make: string;
  model: string;
  year: number;
  color: string;
  chassisNumber: string;
  engineNumber: string;
  
  // Insurance Details
  insuranceProvider: string;
  insurancePolicyNo: string;
  insuranceExpiry: string;
  insuranceCoverType: string;
  insurancePremium: number;
  
  // License & Registration
  licenseNumber: string;
  licenseExpiry: string;
  registrationDate: string;
  
  // Service & Maintenance
  lastServiceDate: string;
  lastServiceOdometer: number;
  nextServiceDate: string;
  nextServiceOdometer: number;
  serviceIntervalKm: number;
  serviceIntervalMonths: number;
  
  // Odometer & Fuel
  currentOdometer: number;
  fuelType: string;
  fuelTankCapacity: number;
  avgFuelConsumption: number;
  
  // Financial
  purchaseDate: string;
  purchasePrice: number;
  dailyTarget: number;
  monthlyTarget: number;
  
  // Technical Specs
  transmission: string;
  engineCapacity: string;
  seatingCapacity: number;
  
  // Additional
  notes: string;
}

// Section progress tracking
const sections = [
  { id: 'basic', name: 'Basic Info', icon: Car, description: 'Vehicle identification details' },
  { id: 'insurance', name: 'Insurance', icon: Shield, description: 'Insurance coverage information' },
  { id: 'service', name: 'Service', icon: Wrench, description: 'Maintenance schedule' },
  { id: 'specs', name: 'Specifications', icon: Gauge, description: 'Technical specifications' },
  { id: 'financial', name: 'Financial', icon: CreditCard, description: 'Financial targets & costs' },
  { id: 'images', name: 'Images', icon: Camera, description: 'Vehicle photos' },
];

// Constants
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_ADDITIONAL_IMAGES = 10;
const VALID_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];

function AddVehicleContent() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [activeSection, setActiveSection] = useState('basic');
  const [completedSections, setCompletedSections] = useState<Set<string>>(new Set());
  const [firebaseReady, setFirebaseReady] = useState(false);
  const [formProgress, setFormProgress] = useState(0);
  const [user, setUser] = useState<any>(null);
  
  // Images state
  const [mainImageFile, setMainImageFile] = useState<File | null>(null);
  const [mainImagePreview, setMainImagePreview] = useState<string | null>(null);
  const [additionalImageFiles, setAdditionalImageFiles] = useState<File[]>([]);
  const [additionalImagePreviews, setAdditionalImagePreviews] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  
  // Refs
  const mainImageInputRef = useRef<HTMLInputElement>(null);
  const additionalImagesInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState<FormData>({
    regNumber: '',
    make: '',
    model: '',
    year: new Date().getFullYear(),
    color: '',
    chassisNumber: '',
    engineNumber: '',
    
    insuranceProvider: '',
    insurancePolicyNo: '',
    insuranceExpiry: '',
    insuranceCoverType: 'Comprehensive',
    insurancePremium: 0,
    
    licenseNumber: '',
    licenseExpiry: '',
    registrationDate: '',
    
    lastServiceDate: '',
    lastServiceOdometer: 0,
    nextServiceDate: '',
    nextServiceOdometer: 0,
    serviceIntervalKm: 5000,
    serviceIntervalMonths: 6,
    
    currentOdometer: 0,
    fuelType: 'Diesel',
    fuelTankCapacity: 0,
    avgFuelConsumption: 0,
    
    purchaseDate: '',
    purchasePrice: 0,
    dailyTarget: 5000,
    monthlyTarget: 150000,
    
    transmission: 'Manual',
    engineCapacity: '',
    seatingCapacity: 14,
    
    notes: ''
  });

  // Load Firebase dynamically
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

  // Check authentication
  useEffect(() => {
    if (!firebaseReady) return;
    
    const unsubscribe = onAuthStateChanged(auth, (user: any) => {
      if (!user) {
        router.push('/auth/login');
        return;
      }
      setUser(user);
    });

    return () => unsubscribe();
  }, [firebaseReady, router]);

  // Calculate next service dates
  useEffect(() => {
    if (formData.lastServiceDate && formData.serviceIntervalMonths) {
      const lastDate = new Date(formData.lastServiceDate);
      const nextDate = new Date(lastDate);
      nextDate.setMonth(nextDate.getMonth() + formData.serviceIntervalMonths);
      setFormData(prev => ({
        ...prev,
        nextServiceDate: nextDate.toISOString().split('T')[0]
      }));
    }

    if (formData.lastServiceOdometer && formData.serviceIntervalKm) {
      setFormData(prev => ({
        ...prev,
        nextServiceOdometer: prev.lastServiceOdometer + prev.serviceIntervalKm
      }));
    }
  }, [formData.lastServiceDate, formData.lastServiceOdometer, formData.serviceIntervalKm, formData.serviceIntervalMonths]);

  // Calculate form progress
  useEffect(() => {
    let completed = 0;
    const total = sections.length;
    
    if (formData.regNumber && formData.make && formData.model) completed++;
    if (formData.insuranceExpiry) completed++;
    if (mainImageFile) completed++;
    if (formData.lastServiceDate || formData.currentOdometer) completed++;
    if (formData.fuelType || formData.transmission) completed++;
    if (formData.purchasePrice || formData.dailyTarget) completed++;
    
    setFormProgress((completed / total) * 100);
    
    const newCompleted = new Set(completedSections);
    if (formData.regNumber && formData.make && formData.model) newCompleted.add('basic');
    if (formData.insuranceExpiry) newCompleted.add('insurance');
    if (mainImageFile) newCompleted.add('images');
    if (formData.lastServiceDate || formData.currentOdometer) newCompleted.add('service');
    if (formData.fuelType || formData.transmission) newCompleted.add('specs');
    if (formData.purchasePrice || formData.dailyTarget) newCompleted.add('financial');
    setCompletedSections(newCompleted);
  }, [formData, mainImageFile]);

  const fileToPreview = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const validateImage = (file: File): { valid: boolean; error?: string } => {
    if (!VALID_IMAGE_TYPES.includes(file.type)) {
      return { valid: false, error: 'Invalid file type. Only JPEG, PNG, and WebP images are allowed.' };
    }
    if (file.size > MAX_IMAGE_SIZE) {
      return { valid: false, error: `File too large. Maximum size is ${MAX_IMAGE_SIZE / 1024 / 1024}MB.` };
    }
    return { valid: true };
  };

  const handleMainImageChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const validation = validateImage(file);
    if (!validation.valid) {
      setError(validation.error || 'Invalid image');
      return;
    }
    
    try {
      const preview = await fileToPreview(file);
      setMainImageFile(file);
      setMainImagePreview(preview);
      setError(null);
    } catch (err) {
      setError('Failed to process image');
    }
  }, []);

  const handleAdditionalImagesChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (additionalImageFiles.length + files.length > MAX_ADDITIONAL_IMAGES) {
      setError(`Maximum ${MAX_ADDITIONAL_IMAGES} additional images allowed`);
      return;
    }
    
    const validFiles: File[] = [];
    const errors: string[] = [];
    
    for (const file of files) {
      const validation = validateImage(file);
      if (validation.valid) {
        validFiles.push(file);
      } else if (validation.error) {
        errors.push(validation.error);
      }
    }
    
    if (errors.length > 0) {
      setError(errors[0]);
      return;
    }
    
    try {
      const previews = await Promise.all(validFiles.map(fileToPreview));
      setAdditionalImageFiles(prev => [...prev, ...validFiles]);
      setAdditionalImagePreviews(prev => [...prev, ...previews]);
      setError(null);
    } catch (err) {
      setError('Failed to process images');
    }
  }, [additionalImageFiles.length]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
      setError('Please drop image files only');
      return;
    }
    
    if (additionalImageFiles.length + imageFiles.length > MAX_ADDITIONAL_IMAGES) {
      setError(`Maximum ${MAX_ADDITIONAL_IMAGES} additional images allowed`);
      return;
    }
    
    const validFiles: File[] = [];
    const errors: string[] = [];
    
    for (const file of imageFiles) {
      const validation = validateImage(file);
      if (validation.valid) {
        validFiles.push(file);
      } else if (validation.error) {
        errors.push(validation.error);
      }
    }
    
    if (errors.length > 0) {
      setError(errors[0]);
      return;
    }
    
    try {
      const previews = await Promise.all(validFiles.map(fileToPreview));
      setAdditionalImageFiles(prev => [...prev, ...validFiles]);
      setAdditionalImagePreviews(prev => [...prev, ...previews]);
      setError(null);
    } catch (err) {
      setError('Failed to process images');
    }
  }, [additionalImageFiles.length]);

  const removeAdditionalImage = useCallback((index: number) => {
    setAdditionalImageFiles(prev => prev.filter((_, i) => i !== index));
    setAdditionalImagePreviews(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value,
    }));
    if (error) setError(null);
  }, [error]);

  const validateForm = useCallback((): boolean => {
    if (!formData.regNumber.trim()) {
      setError('Registration number is required');
      setActiveSection('basic');
      return false;
    }
    if (!formData.make.trim()) {
      setError('Make is required');
      setActiveSection('basic');
      return false;
    }
    if (!formData.model.trim()) {
      setError('Model is required');
      setActiveSection('basic');
      return false;
    }
    if (!formData.insuranceExpiry) {
      setError('Insurance expiry date is required');
      setActiveSection('insurance');
      return false;
    }
    if (!mainImageFile) {
      setError('Main vehicle image is required');
      setActiveSection('images');
      return false;
    }
    return true;
  }, [formData, mainImageFile]);

  const uploadImageToAPI = useCallback(async (file: File, vehicleId: string, imageType: 'main' | 'gallery'): Promise<any> => {
    const token = await user.getIdToken();
    const formDataUpload = new FormData();
    formDataUpload.append('file', file);
    formDataUpload.append('imageType', imageType);
    formDataUpload.append('entityType', 'vehicle');
    formDataUpload.append('entityId', vehicleId);
    
    if (imageType === 'main') {
      formDataUpload.append('setPrimary', 'true');
    }

    const response = await fetch('/api/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formDataUpload,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to upload image');
    }

    return response.json();
  }, [user]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!validateForm()) return;
    
    if (!user) {
      setError('You must be logged in to add a vehicle');
      return;
    }

    setLoading(true);

    try {
      const token = await user.getIdToken();
      
      // Create the vehicle - fixed duplicate property issue
      const vehiclePayload = {
        plateNumber: formData.regNumber.toUpperCase(),
        model: `${formData.make} ${formData.model}`,
        capacity: formData.seatingCapacity,
        status: 'ACTIVE',
        driverId: null,
        // Insurance details
        insuranceProvider: formData.insuranceProvider,
        insurancePolicyNo: formData.insurancePolicyNo,
        insuranceExpiry: formData.insuranceExpiry ? new Date(formData.insuranceExpiry).toISOString() : null,
        insuranceCoverType: formData.insuranceCoverType,
        insurancePremium: formData.insurancePremium,
        // License details
        licenseNumber: formData.licenseNumber,
        licenseExpiry: formData.licenseExpiry ? new Date(formData.licenseExpiry).toISOString() : null,
        registrationDate: formData.registrationDate ? new Date(formData.registrationDate).toISOString() : null,
        // Service details
        lastServiceDate: formData.lastServiceDate ? new Date(formData.lastServiceDate).toISOString() : null,
        lastServiceOdometer: formData.lastServiceOdometer,
        nextServiceDate: formData.nextServiceDate ? new Date(formData.nextServiceDate).toISOString() : null,
        nextServiceOdometer: formData.nextServiceOdometer,
        serviceIntervalKm: formData.serviceIntervalKm,
        serviceIntervalMonths: formData.serviceIntervalMonths,
        // Odometer & Fuel
        currentOdometer: formData.currentOdometer,
        fuelType: formData.fuelType,
        fuelTankCapacity: formData.fuelTankCapacity,
        avgFuelConsumption: formData.avgFuelConsumption,
        // Financial
        purchaseDate: formData.purchaseDate ? new Date(formData.purchaseDate).toISOString() : null,
        purchasePrice: formData.purchasePrice,
        dailyTarget: formData.dailyTarget,
        monthlyTarget: formData.monthlyTarget,
        // Technical specs
        transmission: formData.transmission,
        engineCapacity: formData.engineCapacity,
        // Additional
        notes: formData.notes,
        // Other fields
        color: formData.color,
        chassisNumber: formData.chassisNumber,
        engineNumber: formData.engineNumber,
        year: formData.year,
      };

      const response = await fetch('/api/admin/vehicles', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(vehiclePayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create vehicle');
      }

      const createdVehicle = await response.json();
      const vehicleId = createdVehicle.id;

      // Upload images
      setUploadingImages(true);
      
      // Upload main image
      if (mainImageFile) {
        await uploadImageToAPI(mainImageFile, vehicleId, 'main');
      }
      
      // Upload additional images in parallel
      if (additionalImageFiles.length > 0) {
        await Promise.all(
          additionalImageFiles.map(file => uploadImageToAPI(file, vehicleId, 'gallery'))
        );
      }
      
      setSuccess(true);
      
      // Clear cache for vehicles list
      sessionStorage.removeItem('vehicles_1_all');
      
      // Auto redirect after 2 seconds
      setTimeout(() => {
        router.push('/dashboards/admin/vehicles');
      }, 2000);

    } catch (err: any) {
      console.error('Error creating vehicle:', err);
      setError(err.message || 'Failed to create vehicle');
    } finally {
      setLoading(false);
      setUploadingImages(false);
    }
  }, [formData, user, mainImageFile, additionalImageFiles, validateForm, uploadImageToAPI, router]);

  const scrollToSection = useCallback((sectionId: string) => {
    setActiveSection(sectionId);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const getSectionStatus = useCallback((sectionId: string) => {
    if (completedSections.has(sectionId)) {
      return <CheckCircle className="w-4 h-4 text-green-400" />;
    }
    if (activeSection === sectionId) {
      return <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />;
    }
    return <div className="w-2 h-2 bg-slate-600 rounded-full" />;
  }, [activeSection, completedSections]);

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

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-gray-100">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-96 h-96 bg-yellow-500/5 rounded-full blur-3xl animate-pulse will-change-transform"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl animate-pulse animation-delay-2000 will-change-transform"></div>
      </div>

      {/* Header */}
      <div className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-xl border-b border-yellow-500/20">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboards/admin/vehicles"
                className="p-2 hover:bg-slate-800 rounded-xl transition border border-yellow-500/20 group"
              >
                <ArrowLeft className="w-5 h-5 text-gray-400 group-hover:text-yellow-400 transition" />
              </Link>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-xl flex items-center justify-center shadow-lg shadow-yellow-500/20">
                    <Truck className="w-5 h-5 text-black" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-white">Add New Vehicle</h1>
                    <p className="text-sm text-gray-500 flex items-center gap-2">
                      <Radio className="w-3 h-3 text-yellow-400" />
                      Register a new vehicle to your fleet
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="flex-1 max-w-md">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                <span>Form Progress</span>
                <span>{Math.round(formProgress)}%</span>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full transition-all duration-500"
                  style={{ width: `${formProgress}%` }}
                />
              </div>
            </div>
          </div>

          {/* Section Navigation */}
          <div className="flex overflow-x-auto gap-2 mt-4 pb-2 scrollbar-thin">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => scrollToSection(section.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition whitespace-nowrap ${
                  activeSection === section.id
                    ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-slate-800/50'
                }`}
              >
                <section.icon className="w-4 h-4" />
                <span className="text-sm font-medium">{section.name}</span>
                {getSectionStatus(section.id)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Success Message */}
        {success && (
          <div className="mb-6 p-4 bg-green-500/20 border border-green-500/30 rounded-xl flex items-center gap-3 animate-slideDown">
            <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-5 h-5 text-green-400" />
            </div>
            <div className="flex-1">
              <p className="text-green-400 font-medium">Vehicle created successfully!</p>
              <p className="text-sm text-green-500/70">Redirecting to vehicles list...</p>
            </div>
            <div className="w-24 h-1 bg-green-500/30 rounded-full overflow-hidden">
              <div className="h-full bg-green-400 rounded-full animate-progress"></div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-rose-500/20 border border-rose-500/30 rounded-xl flex items-start gap-3 animate-shake">
            <div className="w-10 h-10 bg-rose-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
            </div>
            <div className="flex-1">
              <p className="text-rose-400 font-medium">Error</p>
              <p className="text-sm text-rose-400/70">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="p-1 hover:bg-rose-500/20 rounded-lg transition"
            >
              <X className="w-4 h-4 text-rose-400" />
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information Section */}
          <section id="basic" className="scroll-mt-24">
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-yellow-500/20 rounded-2xl overflow-hidden hover:border-yellow-400/30 transition group">
              <div className="px-6 py-4 bg-gradient-to-r from-slate-900/50 to-slate-800/50 border-b border-yellow-500/20 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <div className="w-8 h-8 bg-yellow-500/10 rounded-lg flex items-center justify-center">
                      <Car className="w-4 h-4 text-yellow-400" />
                    </div>
                    Basic Information
                  </h2>
                  <p className="text-xs text-gray-500 mt-1 ml-10">Vehicle identification and registration details</p>
                </div>
                {completedSections.has('basic') && (
                  <span className="px-2 py-1 bg-green-500/10 text-green-400 rounded-lg text-xs font-medium flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Completed
                  </span>
                )}
              </div>
              
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Registration Number <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative group">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-yellow-400 transition" />
                    <input
                      type="text"
                      name="regNumber"
                      value={formData.regNumber}
                      onChange={handleChange}
                      className="w-full bg-slate-900/50 border border-yellow-500/20 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400/20 transition"
                      placeholder="KCD 123A"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Make <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="make"
                    value={formData.make}
                    onChange={handleChange}
                    className="w-full bg-slate-900/50 border border-yellow-500/20 rounded-xl py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400/20 transition"
                    placeholder="Toyota"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Model <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="model"
                    value={formData.model}
                    onChange={handleChange}
                    className="w-full bg-slate-900/50 border border-yellow-500/20 rounded-xl py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400/20 transition"
                    placeholder="Hilux"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Year
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type="number"
                      name="year"
                      value={formData.year}
                      onChange={handleChange}
                      min="1900"
                      max={new Date().getFullYear() + 1}
                      className="w-full bg-slate-900/50 border border-yellow-500/20 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400/20 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Color
                  </label>
                  <div className="relative">
                    <Palette className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type="text"
                      name="color"
                      value={formData.color}
                      onChange={handleChange}
                      className="w-full bg-slate-900/50 border border-yellow-500/20 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400/20 transition"
                      placeholder="White"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Chassis Number
                  </label>
                  <input
                    type="text"
                    name="chassisNumber"
                    value={formData.chassisNumber}
                    onChange={handleChange}
                    className="w-full bg-slate-900/50 border border-yellow-500/20 rounded-xl py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400/20 transition"
                    placeholder="VIN123456789"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Engine Number
                  </label>
                  <input
                    type="text"
                    name="engineNumber"
                    value={formData.engineNumber}
                    onChange={handleChange}
                    className="w-full bg-slate-900/50 border border-yellow-500/20 rounded-xl py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400/20 transition"
                    placeholder="ENG123456"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Insurance Details Section */}
          <section id="insurance" className="scroll-mt-24">
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-yellow-500/20 rounded-2xl overflow-hidden hover:border-yellow-400/30 transition">
              <div className="px-6 py-4 bg-gradient-to-r from-slate-900/50 to-slate-800/50 border-b border-yellow-500/20 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <div className="w-8 h-8 bg-yellow-500/10 rounded-lg flex items-center justify-center">
                      <Shield className="w-4 h-4 text-yellow-400" />
                    </div>
                    Insurance Details
                  </h2>
                  <p className="text-xs text-gray-500 mt-1 ml-10">Insurance coverage and policy information</p>
                </div>
                {completedSections.has('insurance') && (
                  <span className="px-2 py-1 bg-green-500/10 text-green-400 rounded-lg text-xs font-medium flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Completed
                  </span>
                )}
              </div>
              
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Insurance Provider
                  </label>
                  <input
                    type="text"
                    name="insuranceProvider"
                    value={formData.insuranceProvider}
                    onChange={handleChange}
                    className="w-full bg-slate-900/50 border border-yellow-500/20 rounded-xl py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400/20 transition"
                    placeholder="Jubilee Insurance"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Policy Number
                  </label>
                  <input
                    type="text"
                    name="insurancePolicyNo"
                    value={formData.insurancePolicyNo}
                    onChange={handleChange}
                    className="w-full bg-slate-900/50 border border-yellow-500/20 rounded-xl py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400/20 transition"
                    placeholder="POL-2024-123456"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Insurance Expiry <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type="date"
                      name="insuranceExpiry"
                      value={formData.insuranceExpiry}
                      onChange={handleChange}
                      className="w-full bg-slate-900/50 border border-yellow-500/20 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400/20 transition"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Cover Type
                  </label>
                  <select
                    name="insuranceCoverType"
                    value={formData.insuranceCoverType}
                    onChange={handleChange}
                    className="w-full bg-slate-900/50 border border-yellow-500/20 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400/20 transition"
                  >
                    <option value="Comprehensive">Comprehensive</option>
                    <option value="Third Party">Third Party</option>
                    <option value="Third Party Fire & Theft">Third Party Fire & Theft</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Annual Premium (KES)
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type="number"
                      name="insurancePremium"
                      value={formData.insurancePremium}
                      onChange={handleChange}
                      className="w-full bg-slate-900/50 border border-yellow-500/20 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400/20 transition"
                      placeholder="50000"
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Service & Maintenance Section */}
          <section id="service" className="scroll-mt-24">
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-yellow-500/20 rounded-2xl overflow-hidden hover:border-yellow-400/30 transition">
              <div className="px-6 py-4 bg-gradient-to-r from-slate-900/50 to-slate-800/50 border-b border-yellow-500/20">
                <div>
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <div className="w-8 h-8 bg-yellow-500/10 rounded-lg flex items-center justify-center">
                      <Wrench className="w-4 h-4 text-yellow-400" />
                    </div>
                    Service & Maintenance
                  </h2>
                  <p className="text-xs text-gray-500 mt-1 ml-10">Maintenance schedule and service history</p>
                </div>
              </div>
              
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Current Odometer (km)
                  </label>
                  <div className="relative">
                    <Gauge className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type="number"
                      name="currentOdometer"
                      value={formData.currentOdometer}
                      onChange={handleChange}
                      className="w-full bg-slate-900/50 border border-yellow-500/20 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400/20 transition"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Last Service Date
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type="date"
                      name="lastServiceDate"
                      value={formData.lastServiceDate}
                      onChange={handleChange}
                      className="w-full bg-slate-900/50 border border-yellow-500/20 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400/20 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Last Service Odometer (km)
                  </label>
                  <input
                    type="number"
                    name="lastServiceOdometer"
                    value={formData.lastServiceOdometer}
                    onChange={handleChange}
                    className="w-full bg-slate-900/50 border border-yellow-500/20 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400/20 transition"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Service Interval (km)
                  </label>
                  <input
                    type="number"
                    name="serviceIntervalKm"
                    value={formData.serviceIntervalKm}
                    onChange={handleChange}
                    className="w-full bg-slate-900/50 border border-yellow-500/20 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400/20 transition"
                    placeholder="5000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Service Interval (months)
                  </label>
                  <input
                    type="number"
                    name="serviceIntervalMonths"
                    value={formData.serviceIntervalMonths}
                    onChange={handleChange}
                    className="w-full bg-slate-900/50 border border-yellow-500/20 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400/20 transition"
                    placeholder="6"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Next Service Date
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type="date"
                      name="nextServiceDate"
                      value={formData.nextServiceDate}
                      onChange={handleChange}
                      className="w-full bg-slate-900/50 border border-yellow-500/20 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400/20 transition"
                      readOnly
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Next Service Odometer (km)
                  </label>
                  <input
                    type="number"
                    name="nextServiceOdometer"
                    value={formData.nextServiceOdometer}
                    onChange={handleChange}
                    className="w-full bg-slate-900/50 border border-yellow-500/20 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400/20 transition"
                    readOnly
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Technical Specifications Section */}
          <section id="specs" className="scroll-mt-24">
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-yellow-500/20 rounded-2xl overflow-hidden hover:border-yellow-400/30 transition">
              <div className="px-6 py-4 bg-gradient-to-r from-slate-900/50 to-slate-800/50 border-b border-yellow-500/20">
                <div>
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <div className="w-8 h-8 bg-yellow-500/10 rounded-lg flex items-center justify-center">
                      <Gauge className="w-4 h-4 text-yellow-400" />
                    </div>
                    Technical Specifications
                  </h2>
                  <p className="text-xs text-gray-500 mt-1 ml-10">Vehicle technical details and specifications</p>
                </div>
              </div>
              
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Fuel Type
                  </label>
                  <select
                    name="fuelType"
                    value={formData.fuelType}
                    onChange={handleChange}
                    className="w-full bg-slate-900/50 border border-yellow-500/20 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400/20 transition"
                  >
                    <option value="Diesel">Diesel</option>
                    <option value="Petrol">Petrol</option>
                    <option value="Electric">Electric</option>
                    <option value="Hybrid">Hybrid</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Fuel Tank Capacity (L)
                  </label>
                  <input
                    type="number"
                    name="fuelTankCapacity"
                    value={formData.fuelTankCapacity}
                    onChange={handleChange}
                    className="w-full bg-slate-900/50 border border-yellow-500/20 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400/20 transition"
                    placeholder="80"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Avg Fuel Consumption (km/L)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    name="avgFuelConsumption"
                    value={formData.avgFuelConsumption}
                    onChange={handleChange}
                    className="w-full bg-slate-900/50 border border-yellow-500/20 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400/20 transition"
                    placeholder="8.5"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Transmission
                  </label>
                  <select
                    name="transmission"
                    value={formData.transmission}
                    onChange={handleChange}
                    className="w-full bg-slate-900/50 border border-yellow-500/20 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400/20 transition"
                  >
                    <option value="Manual">Manual</option>
                    <option value="Automatic">Automatic</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Engine Capacity
                  </label>
                  <input
                    type="text"
                    name="engineCapacity"
                    value={formData.engineCapacity}
                    onChange={handleChange}
                    className="w-full bg-slate-900/50 border border-yellow-500/20 rounded-xl py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400/20 transition"
                    placeholder="2000cc"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Seating Capacity
                  </label>
                  <input
                    type="number"
                    name="seatingCapacity"
                    value={formData.seatingCapacity}
                    onChange={handleChange}
                    className="w-full bg-slate-900/50 border border-yellow-500/20 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400/20 transition"
                    placeholder="14"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Financial Information Section */}
          <section id="financial" className="scroll-mt-24">
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-yellow-500/20 rounded-2xl overflow-hidden hover:border-yellow-400/30 transition">
              <div className="px-6 py-4 bg-gradient-to-r from-slate-900/50 to-slate-800/50 border-b border-yellow-500/20">
                <div>
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <div className="w-8 h-8 bg-yellow-500/10 rounded-lg flex items-center justify-center">
                      <CreditCard className="w-4 h-4 text-yellow-400" />
                    </div>
                    Financial Information
                  </h2>
                  <p className="text-xs text-gray-500 mt-1 ml-10">Financial targets and purchase details</p>
                </div>
              </div>
              
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Purchase Date
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type="date"
                      name="purchaseDate"
                      value={formData.purchaseDate}
                      onChange={handleChange}
                      className="w-full bg-slate-900/50 border border-yellow-500/20 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400/20 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Purchase Price (KES)
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type="number"
                      name="purchasePrice"
                      value={formData.purchasePrice}
                      onChange={handleChange}
                      className="w-full bg-slate-900/50 border border-yellow-500/20 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400/20 transition"
                      placeholder="2000000"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Daily Target (KES)
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type="number"
                      name="dailyTarget"
                      value={formData.dailyTarget}
                      onChange={handleChange}
                      className="w-full bg-slate-900/50 border border-yellow-500/20 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400/20 transition"
                      placeholder="5000"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Monthly Target (KES)
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type="number"
                      name="monthlyTarget"
                      value={formData.monthlyTarget}
                      onChange={handleChange}
                      className="w-full bg-slate-900/50 border border-yellow-500/20 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400/20 transition"
                      placeholder="150000"
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Images Upload Section */}
          <section id="images" className="scroll-mt-24">
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-yellow-500/20 rounded-2xl overflow-hidden hover:border-yellow-400/30 transition">
              <div className="px-6 py-4 bg-gradient-to-r from-slate-900/50 to-slate-800/50 border-b border-yellow-500/20 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <div className="w-8 h-8 bg-yellow-500/10 rounded-lg flex items-center justify-center">
                      <Camera className="w-4 h-4 text-yellow-400" />
                    </div>
                    Vehicle Images
                  </h2>
                  <p className="text-xs text-gray-500 mt-1 ml-10">Upload vehicle photos (max {MAX_ADDITIONAL_IMAGES} images)</p>
                </div>
                {completedSections.has('images') && (
                  <span className="px-2 py-1 bg-green-500/10 text-green-400 rounded-lg text-xs font-medium flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Completed
                  </span>
                )}
              </div>
              
              <div className="p-6 space-y-8">
                {/* Main Image */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    Main Vehicle Image <span className="text-rose-400">*</span>
                  </label>
                  <div 
                    className={`border-2 border-dashed rounded-xl p-8 transition cursor-pointer group ${
                      mainImagePreview 
                        ? 'border-green-500/50 bg-green-500/5' 
                        : 'border-yellow-500/20 hover:border-yellow-400/50 bg-slate-900/30'
                    }`}
                  >
                    <input
                      ref={mainImageInputRef}
                      type="file"
                      onChange={handleMainImageChange}
                      accept="image/*"
                      className="hidden"
                      id="main-image"
                    />
                    <label htmlFor="main-image" className="cursor-pointer block text-center">
                      {mainImagePreview ? (
                        <div className="relative">
                          <div className="relative w-full h-64">
                            <img
                              src={mainImagePreview}
                              alt="Main vehicle"
                              className="w-full h-full object-contain rounded-lg"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              setMainImageFile(null);
                              setMainImagePreview(null);
                              if (mainImageInputRef.current) mainImageInputRef.current.value = '';
                            }}
                            className="absolute top-2 right-2 p-2 bg-rose-500/20 rounded-lg hover:bg-rose-500/30 transition backdrop-blur-sm"
                          >
                            <Trash2 className="w-4 h-4 text-rose-400" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="w-20 h-20 bg-yellow-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition">
                            <Upload className="w-10 h-10 text-yellow-400" />
                          </div>
                          <p className="text-gray-400 group-hover:text-yellow-400 transition font-medium">
                            Click to upload main vehicle image
                          </p>
                          <p className="text-sm text-gray-600 mt-2">JPG, PNG, WebP up to 5MB</p>
                        </>
                      )}
                    </label>
                  </div>
                </div>

                {/* Additional Images */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    Additional Images <span className="text-xs text-gray-500">(Optional, max {MAX_ADDITIONAL_IMAGES})</span>
                  </label>
                  <div 
                    className={`border-2 border-dashed rounded-xl p-8 transition cursor-pointer ${
                      isDragging 
                        ? 'border-yellow-400 bg-yellow-500/10' 
                        : 'border-yellow-500/20 hover:border-yellow-400/50 bg-slate-900/30'
                    }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <input
                      ref={additionalImagesInputRef}
                      type="file"
                      onChange={handleAdditionalImagesChange}
                      accept="image/*"
                      multiple
                      className="hidden"
                      id="additional-images"
                    />
                    <label htmlFor="additional-images" className="cursor-pointer block text-center">
                      <div className="w-16 h-16 bg-yellow-500/10 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition">
                        <Plus className="w-8 h-8 text-yellow-400" />
                      </div>
                      <p className="text-gray-400 group-hover:text-yellow-400 transition">
                        {isDragging ? 'Drop images here' : 'Click or drag images here'}
                      </p>
                      <p className="text-xs text-gray-600 mt-2">You can select multiple images (max {MAX_ADDITIONAL_IMAGES})</p>
                    </label>
                  </div>

                  {/* Image Previews */}
                  {additionalImagePreviews.length > 0 && (
                    <div className="mt-6">
                      <p className="text-sm text-gray-400 mb-3">
                        {additionalImagePreviews.length} image{additionalImagePreviews.length > 1 ? 's' : ''} selected
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {additionalImagePreviews.map((preview, index) => (
                          <div key={index} className="relative group">
                            <div className="relative w-full h-32 bg-slate-900/50 rounded-xl overflow-hidden border-2 border-yellow-500/20 group-hover:border-yellow-400/50 transition">
                              <img
                                src={preview}
                                alt={`Additional ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => removeAdditionalImage(index)}
                              className="absolute -top-2 -right-2 p-1.5 bg-rose-500/20 rounded-lg hover:bg-rose-500/30 transition opacity-0 group-hover:opacity-100 backdrop-blur-sm"
                            >
                              <X className="w-3 h-3 text-rose-400" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Additional Notes Section */}
          <section id="notes" className="scroll-mt-24">
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-yellow-500/20 rounded-2xl overflow-hidden hover:border-yellow-400/30 transition">
              <div className="px-6 py-4 bg-gradient-to-r from-slate-900/50 to-slate-800/50 border-b border-yellow-500/20">
                <div>
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <div className="w-8 h-8 bg-yellow-500/10 rounded-lg flex items-center justify-center">
                      <FileText className="w-4 h-4 text-yellow-400" />
                    </div>
                    Additional Notes
                  </h2>
                  <p className="text-xs text-gray-500 mt-1 ml-10">Any additional information about the vehicle</p>
                </div>
              </div>
              
              <div className="p-6">
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows={4}
                  className="w-full bg-slate-900/50 border border-yellow-500/20 rounded-xl py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400/20 transition resize-none"
                  placeholder="Enter any additional notes about the vehicle, special features, or important information..."
                />
              </div>
            </div>
          </section>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-6 sticky bottom-6 z-30">
            <Link
              href="/dashboards/admin/vehicles"
              className="px-6 py-3 border border-yellow-500/20 rounded-xl text-gray-300 font-medium hover:bg-slate-800 hover:border-yellow-400/30 transition flex items-center gap-2"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading || uploadingImages}
              className="px-8 py-3 bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-medium rounded-xl shadow-lg shadow-yellow-500/30 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:from-yellow-300 hover:to-amber-400 transition group relative overflow-hidden"
            >
              {loading || uploadingImages ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>{uploadingImages ? 'Uploading Images...' : 'Saving Vehicle...'}</span>
                </>
              ) : (
                <>
                  <Save className="w-5 h-5 group-hover:scale-110 transition" />
                  Save Vehicle
                </>
              )}
              
              {(loading || uploadingImages) && (
                <div className="absolute bottom-0 left-0 w-full h-1 bg-black/20">
                  <div className="h-full bg-white/50 animate-progress" />
                </div>
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
        @keyframes progress {
          0% { width: 0%; }
          100% { width: 100%; }
        }
        .animate-pulse {
          animation: pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        .animate-slideDown {
          animation: slideDown 0.3s ease-out;
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
        .animate-progress {
          animation: progress 2s linear infinite;
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

function AddVehicleFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-12 h-12 text-yellow-400 animate-spin mx-auto mb-4" />
        <p className="text-gray-400">Loading...</p>
      </div>
    </div>
  );
}

export default function AddVehiclePage() {
  return (
    <Suspense fallback={<AddVehicleFallback />}>
      <AddVehicleContent />
    </Suspense>
  );
}