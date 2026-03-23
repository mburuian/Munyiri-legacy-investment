"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  // Navigation icons
  Home,
  Car,
  ClipboardList,
  Receipt,
  Bell,
  LogOut,
  Menu,
  ChevronRight,
  ArrowLeft,
  
  // Expense icons
  DollarSign,
  Fuel,
  Wrench,
  ShoppingBag,
  Coffee,
  ParkingSquare,
  TrendingUp,
  TrendingDown,
  Filter,
  Search,
  X,
  Clock,
  Plus,
  
  // Status icons
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Award,
  Sparkles,
  Activity,
  UserCircle,
  Settings,
  Navigation2,
  Radio,
  Timer,
  
  // Action icons
  Download,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  CalendarRange,
  Gauge,
  Camera,
  Upload,
  FileText,
  MoreVertical,
  Edit,
  Trash2,
  Copy,
  
  // Category icons
  Coffee as FoodIcon,
  ShoppingBag as SuppliesIcon,
  Wrench as RepairIcon,
  Fuel as FuelIcon,
  MapPin as ParkingIcon,
  Receipt as OtherIcon,
  CreditCard,
  Banknote,
  Wallet,
  PieChart,
  BarChart3
} from "lucide-react";

// Firebase will be dynamically imported on client side only
let auth: any = null;
let onAuthStateChanged: any = null;

// Types
interface Expense {
  id: string;
  category: 'fuel' | 'maintenance' | 'food' | 'supplies' | 'parking' | 'tolls' | 'fines' | 'other';
  amount: number;
  date: string;
  description: string;
  status: 'pending' | 'completed' | 'rejected';
  receipt?: string;
  vehicle?: {
    plateNumber: string;
    model: string;
  };
  location?: string;
}

interface ExpenseStats {
  totalAmount: number;
  totalCount: number;
  averagePerDay: number;
  byCategory: {
    category: string;
    total: number;
    count: number;
  }[];
  recentDaily: {
    date: string;
    amount: number;
    count: number;
  }[];
}

interface ApiResponse {
  expenses: Expense[];
  summary: ExpenseStats;
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

type DateFilter = 'today' | 'week' | 'month' | 'custom';
type StatusFilter = 'all' | 'pending' | 'completed' | 'rejected';

// Expense categories with icons and colors
const EXPENSE_CATEGORIES = [
  { value: 'fuel', label: 'Fuel', icon: FuelIcon, color: 'yellow', gradient: 'from-yellow-500/20 to-amber-500/20' },
  { value: 'maintenance', label: 'Maintenance', icon: Wrench, color: 'amber', gradient: 'from-amber-500/20 to-orange-500/20' },
  { value: 'food', label: 'Food & Drinks', icon: FoodIcon, color: 'green', gradient: 'from-green-500/20 to-emerald-500/20' },
  { value: 'supplies', label: 'Supplies', icon: SuppliesIcon, color: 'blue', gradient: 'from-blue-500/20 to-cyan-500/20' },
  { value: 'parking', label: 'Parking', icon: ParkingIcon, color: 'purple', gradient: 'from-purple-500/20 to-pink-500/20' },
  { value: 'tolls', label: 'Tolls', icon: TrendingUp, color: 'indigo', gradient: 'from-indigo-500/20 to-blue-500/20' },
  { value: 'fines', label: 'Fines', icon: AlertTriangle, color: 'rose', gradient: 'from-rose-500/20 to-red-500/20' },
  { value: 'other', label: 'Other', icon: OtherIcon, color: 'gray', gradient: 'from-gray-500/20 to-slate-500/20' }
];

function ExpensesContent() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [firebaseReady, setFirebaseReady] = useState(false);
  
  // Data states
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [stats, setStats] = useState<ExpenseStats | null>(null);
  
  // UI states
  const [showFilters, setShowFilters] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showEditExpense, setShowEditExpense] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCategoryBreakdown, setShowCategoryBreakdown] = useState(true);
  const [dateFilter, setDateFilter] = useState<DateFilter>('month');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'chart'>('list');
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);
  
  // Add expense form
  const [expenseForm, setExpenseForm] = useState({
    category: 'fuel',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    location: '',
    receipt: null as File | null
  });
  
  // Edit expense form
  const [editForm, setEditForm] = useState({
    id: '',
    category: '',
    amount: '',
    description: '',
    date: '',
    location: ''
  });
  
  const [submitting, setSubmitting] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Load Firebase dynamically on client side only
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
      loadExpenses();
    });

    return () => unsubscribe();
  }, [firebaseReady]);

  // Auto-hide success message after 3 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const loadExpenses = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    
    setError(null);
    
    try {
      const user = auth?.currentUser;
      if (!user) {
        router.push('/auth/login');
        return;
      }

      const token = await user.getIdToken();
      
      // Build query params
      const params = new URLSearchParams();
      params.append('limit', '100'); // Get enough expenses for stats
      
      const response = await fetch(`/api/driver/expenses?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/auth/login');
          return;
        }
        throw new Error('Failed to load expenses');
      }
      
      const data: ApiResponse = await response.json();
      
      setExpenses(data.expenses || []);
      setStats(data.summary || null);
      
    } catch (error) {
      console.error('Error loading expenses:', error);
      setError('Failed to load expenses. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const user = auth?.currentUser;
      if (!user) {
        router.push('/auth/login');
        return;
      }

      const token = await user.getIdToken();
      
      const formData = new FormData();
      formData.append('category', expenseForm.category);
      formData.append('amount', expenseForm.amount);
      formData.append('description', expenseForm.description);
      formData.append('date', expenseForm.date);
      if (expenseForm.location) {
        formData.append('location', expenseForm.location);
      }
      if (expenseForm.receipt) {
        formData.append('receipt', expenseForm.receipt);
      }

      const response = await fetch('/api/driver/expenses', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add expense');
      }

      // Reset form and refresh
      setExpenseForm({
        category: 'fuel',
        amount: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        location: '',
        receipt: null
      });
      
      setShowAddExpense(false);
      setSuccessMessage('Expense added successfully!');
      await loadExpenses(true);
      
    } catch (error: any) {
      console.error('Error adding expense:', error);
      setError(error.message || 'Failed to add expense');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const user = auth?.currentUser;
      if (!user) {
        router.push('/auth/login');
        return;
      }

      const token = await user.getIdToken();
      
      const response = await fetch('/api/driver/expenses', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          id: editForm.id,
          category: editForm.category,
          amount: parseFloat(editForm.amount),
          description: editForm.description,
          date: editForm.date,
          location: editForm.location
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update expense');
      }

      setShowEditExpense(false);
      setSelectedExpense(null);
      setSuccessMessage('Expense updated successfully!');
      await loadExpenses(true);
      
    } catch (error: any) {
      console.error('Error updating expense:', error);
      setError(error.message || 'Failed to update expense');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExpense = async () => {
    if (!expenseToDelete) return;
    
    setSubmitting(true);
    
    try {
      const user = auth?.currentUser;
      if (!user) {
        router.push('/auth/login');
        return;
      }

      const token = await user.getIdToken();
      
      const response = await fetch(`/api/driver/expenses?id=${expenseToDelete}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete expense');
      }

      setShowDeleteConfirm(false);
      setExpenseToDelete(null);
      setSelectedExpense(null);
      setSuccessMessage('Expense deleted successfully!');
      await loadExpenses(true);
      
    } catch (error: any) {
      console.error('Error deleting expense:', error);
      setError(error.message || 'Failed to delete expense');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (expense: Expense) => {
    setEditForm({
      id: expense.id,
      category: expense.category,
      amount: expense.amount.toString(),
      description: expense.description,
      date: expense.date.split('T')[0],
      location: expense.location || ''
    });
    setShowEditExpense(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setExpenseForm({ ...expenseForm, receipt: e.target.files[0] });
    }
  };

  // Filter expenses based on selected filters
  const getFilteredExpenses = () => {
    let filtered = [...expenses];
    
    // Date filter
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    if (dateFilter === 'today') {
      filtered = filtered.filter(exp => {
        const expDate = new Date(exp.date);
        return expDate >= today;
      });
    } else if (dateFilter === 'week') {
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      filtered = filtered.filter(exp => {
        const expDate = new Date(exp.date);
        return expDate >= weekAgo;
      });
    } else if (dateFilter === 'month') {
      const monthAgo = new Date(today);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      filtered = filtered.filter(exp => {
        const expDate = new Date(exp.date);
        return expDate >= monthAgo;
      });
    } else if (dateFilter === 'custom' && customStartDate && customEndDate) {
      const start = new Date(customStartDate);
      const end = new Date(customEndDate);
      end.setHours(23, 59, 59);
      filtered = filtered.filter(exp => {
        const expDate = new Date(exp.date);
        return expDate >= start && expDate <= end;
      });
    }
    
    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(exp => exp.status === statusFilter);
    }
    
    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(exp => exp.category === categoryFilter);
    }
    
    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(exp => 
        exp.description.toLowerCase().includes(term) ||
        exp.category.toLowerCase().includes(term) ||
        exp.location?.toLowerCase().includes(term)
      );
    }
    
    // Sort
    filtered.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });
    
    return filtered;
  };

  // Get paginated expenses
  const getPaginatedExpenses = () => {
    const filtered = getFilteredExpenses();
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return filtered.slice(start, end);
  };

  // Calculate filtered stats
  const getFilteredStats = () => {
    const filtered = getFilteredExpenses();
    const totalAmount = filtered.reduce((sum, exp) => sum + exp.amount, 0);
    
    // Group by category
    const byCategory = filtered.reduce((acc, exp) => {
      if (!acc[exp.category]) {
        acc[exp.category] = { total: 0, count: 0 };
      }
      acc[exp.category].total += exp.amount;
      acc[exp.category].count += 1;
      return acc;
    }, {} as Record<string, { total: number; count: number }>);
    
    return {
      totalAmount,
      totalCount: filtered.length,
      averageAmount: filtered.length > 0 ? totalAmount / filtered.length : 0,
      byCategory: Object.entries(byCategory).map(([category, data]) => ({
        category,
        ...data
      }))
    };
  };

  const filteredStats = getFilteredStats();
  const filteredExpenses = getFilteredExpenses();
  const paginatedExpenses = getPaginatedExpenses();
  const totalPages = Math.ceil(filteredExpenses.length / itemsPerPage);

  const formatCurrency = (amount: number) => {
    return `KES ${amount.toLocaleString()}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getCategoryIcon = (category: string) => {
    const found = EXPENSE_CATEGORIES.find(c => c.value === category);
    return found?.icon || OtherIcon;
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      fuel: 'text-yellow-400 bg-yellow-500/20',
      maintenance: 'text-amber-400 bg-amber-500/20',
      food: 'text-green-400 bg-green-500/20',
      supplies: 'text-blue-400 bg-blue-500/20',
      parking: 'text-purple-400 bg-purple-500/20',
      tolls: 'text-indigo-400 bg-indigo-500/20',
      fines: 'text-rose-400 bg-rose-500/20',
      other: 'text-gray-400 bg-gray-500/20'
    };
    return colors[category] || colors.other;
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      completed: 'bg-green-500/20 text-green-400 border-green-500/30',
      pending: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      rejected: 'bg-rose-500/20 text-rose-400 border-rose-500/30'
    };
    return styles[status as keyof typeof styles] || styles.pending;
  };

  const resetFilters = () => {
    setDateFilter('month');
    setStatusFilter('all');
    setCategoryFilter('all');
    setSearchTerm('');
    setCustomStartDate('');
    setCustomEndDate('');
    setCurrentPage(1);
  };

  // Show loading while Firebase initializes
  if (!firebaseReady) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-yellow-400/20 border-t-yellow-400 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 sm:w-20 sm:h-20 border-4 border-yellow-400/20 border-t-yellow-400 rounded-full animate-spin mx-auto mb-4"></div>
            <Receipt className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-400 absolute top-5 sm:top-6 left-1/2 -translate-x-1/2 animate-pulse" />
          </div>
          <p className="text-sm sm:text-base text-gray-400">Loading expenses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Success Toast */}
      {successMessage && (
        <div className="fixed top-4 right-4 z-50 animate-slide-down">
          <div className="bg-green-500/90 backdrop-blur-sm text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-3 border border-green-400/30">
            <CheckCircle className="w-5 h-5" />
            <span>{successMessage}</span>
          </div>
        </div>
      )}

      {/* Add Expense Modal */}
      {showAddExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-yellow-500/30 rounded-xl sm:rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-yellow-400" />
                  Add New Expense
                </h3>
                <button
                  onClick={() => setShowAddExpense(false)}
                  className="p-2 hover:bg-slate-800 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddExpense} className="space-y-4">
                {/* Category */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Category</label>
                  <select
                    value={expenseForm.category}
                    onChange={(e) => setExpenseForm({...expenseForm, category: e.target.value})}
                    className="w-full bg-slate-800/50 border border-yellow-500/20 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-yellow-400"
                    required
                  >
                    {EXPENSE_CATEGORIES.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Amount (KES)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="number"
                      value={expenseForm.amount}
                      onChange={(e) => setExpenseForm({...expenseForm, amount: e.target.value})}
                      className="w-full bg-slate-800/50 border border-yellow-500/20 rounded-lg py-2.5 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400"
                      placeholder="Enter amount"
                      required
                      step="0.01"
                      min="0"
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Description</label>
                  <input
                    type="text"
                    value={expenseForm.description}
                    onChange={(e) => setExpenseForm({...expenseForm, description: e.target.value})}
                    className="w-full bg-slate-800/50 border border-yellow-500/20 rounded-lg py-2.5 px-4 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400"
                    placeholder="e.g., Full tank at Shell"
                    required
                  />
                </div>

                {/* Date */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Date</label>
                  <input
                    type="date"
                    value={expenseForm.date}
                    onChange={(e) => setExpenseForm({...expenseForm, date: e.target.value})}
                    className="w-full bg-slate-800/50 border border-yellow-500/20 rounded-lg py-2.5 px-4 text-white focus:outline-none focus:border-yellow-400"
                    required
                  />
                </div>

                {/* Location (Optional) */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Location (Optional)</label>
                  <input
                    type="text"
                    value={expenseForm.location}
                    onChange={(e) => setExpenseForm({...expenseForm, location: e.target.value})}
                    className="w-full bg-slate-800/50 border border-yellow-500/20 rounded-lg py-2.5 px-4 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400"
                    placeholder="e.g., Shell, Mombasa Road"
                  />
                </div>

                {/* Receipt Upload */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Receipt (Optional)</label>
                  <div className="border-2 border-dashed border-yellow-500/20 rounded-lg p-4 text-center hover:border-yellow-400/50 transition cursor-pointer">
                    <input
                      type="file"
                      onChange={handleFileUpload}
                      accept="image/*,.pdf"
                      className="hidden"
                      id="receipt-upload"
                    />
                    <label htmlFor="receipt-upload" className="cursor-pointer block">
                      <Camera className="w-6 h-6 text-gray-500 mx-auto mb-2" />
                      <p className="text-xs text-gray-400">
                        {expenseForm.receipt ? expenseForm.receipt.name : 'Tap to upload receipt'}
                      </p>
                      <p className="text-[10px] text-gray-600 mt-1">PDF or Image (max 5MB)</p>
                    </label>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-semibold py-2.5 rounded-lg hover:from-yellow-300 hover:to-amber-400 transition-all shadow-lg shadow-yellow-500/30 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Add Expense
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Expense Modal */}
      {showEditExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-yellow-500/30 rounded-xl sm:rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Edit className="w-5 h-5 text-yellow-400" />
                  Edit Expense
                </h3>
                <button
                  onClick={() => setShowEditExpense(false)}
                  className="p-2 hover:bg-slate-800 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleEditExpense} className="space-y-4">
                {/* Category */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Category</label>
                  <select
                    value={editForm.category}
                    onChange={(e) => setEditForm({...editForm, category: e.target.value})}
                    className="w-full bg-slate-800/50 border border-yellow-500/20 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-yellow-400"
                    required
                  >
                    {EXPENSE_CATEGORIES.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Amount (KES)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="number"
                      value={editForm.amount}
                      onChange={(e) => setEditForm({...editForm, amount: e.target.value})}
                      className="w-full bg-slate-800/50 border border-yellow-500/20 rounded-lg py-2.5 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400"
                      placeholder="Enter amount"
                      required
                      step="0.01"
                      min="0"
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Description</label>
                  <input
                    type="text"
                    value={editForm.description}
                    onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                    className="w-full bg-slate-800/50 border border-yellow-500/20 rounded-lg py-2.5 px-4 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400"
                    placeholder="e.g., Full tank at Shell"
                    required
                  />
                </div>

                {/* Date */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Date</label>
                  <input
                    type="date"
                    value={editForm.date}
                    onChange={(e) => setEditForm({...editForm, date: e.target.value})}
                    className="w-full bg-slate-800/50 border border-yellow-500/20 rounded-lg py-2.5 px-4 text-white focus:outline-none focus:border-yellow-400"
                    required
                  />
                </div>

                {/* Location */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Location (Optional)</label>
                  <input
                    type="text"
                    value={editForm.location}
                    onChange={(e) => setEditForm({...editForm, location: e.target.value})}
                    className="w-full bg-slate-800/50 border border-yellow-500/20 rounded-lg py-2.5 px-4 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400"
                    placeholder="e.g., Shell, Mombasa Road"
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold py-2.5 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Updating...
                    </>
                  ) : (
                    <>
                      <Edit className="w-4 h-4" />
                      Update Expense
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-rose-500/30 rounded-xl sm:rounded-2xl max-w-md w-full">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-rose-400" />
                  Delete Expense
                </h3>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="p-2 hover:bg-slate-800 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-gray-300 mb-2">
                Are you sure you want to delete this expense?
              </p>
              <p className="text-sm text-gray-500 mb-6">
                This action cannot be undone.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2 bg-slate-800 text-gray-400 rounded-lg border border-yellow-500/20 hover:bg-slate-700 transition text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteExpense}
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-rose-500/20 text-rose-400 rounded-lg border border-rose-500/30 hover:bg-rose-500/30 transition text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {submitting ? (
                    <div className="w-4 h-4 border-2 border-rose-400 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-30 bg-slate-900/80 backdrop-blur-xl border-b border-yellow-500/20">
        <div className="flex items-center justify-between px-3 sm:px-4 md:px-6 py-3 sm:py-4">
          <div className="flex items-center gap-2 sm:gap-4">
            <Link
              href="/dashboards/drivers"
              className="p-1.5 sm:p-2 hover:bg-slate-800 rounded-lg sm:rounded-xl border border-yellow-500/20"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </Link>
            <div>
              <h1 className="text-base sm:text-lg md:text-xl font-bold flex items-center gap-1 sm:gap-2">
                <Receipt className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" />
                Expenses
              </h1>
              <p className="text-xs text-gray-500">Track and manage your expenses</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setShowAddExpense(true)}
              className="p-1.5 sm:p-2 bg-yellow-500/20 text-yellow-400 rounded-lg sm:rounded-xl border border-yellow-500/30 hover:bg-yellow-500/30 transition"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl border transition ${
                showFilters 
                  ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' 
                  : 'border-yellow-500/20 hover:bg-slate-800'
              }`}
            >
              <Filter className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                const modes: ('list' | 'grid' | 'chart')[] = ['list', 'grid', 'chart'];
                const currentIndex = modes.indexOf(viewMode);
                const nextMode = modes[(currentIndex + 1) % modes.length];
                setViewMode(nextMode);
              }}
              className="p-1.5 sm:p-2 hover:bg-slate-800 rounded-lg sm:rounded-xl border border-yellow-500/20 hidden sm:block"
            >
              {viewMode === 'list' && 'Grid'}
              {viewMode === 'grid' && 'Chart'}
              {viewMode === 'chart' && 'List'}
            </button>
            <button
              onClick={() => loadExpenses(true)}
              disabled={refreshing}
              className="p-1.5 sm:p-2 hover:bg-slate-800 rounded-lg sm:rounded-xl border border-yellow-500/20 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center">
              <span className="text-xs sm:text-sm font-bold text-black">
                {auth?.currentUser?.email?.charAt(0).toUpperCase() || 'D'}
              </span>
            </div>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="px-3 sm:px-4 md:px-6 py-3 bg-slate-800/50 border-t border-yellow-500/20">
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search expenses..."
                  className="w-full bg-slate-900/50 border border-yellow-500/20 rounded-lg py-2 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400"
                />
              </div>

              {/* Date Filter */}
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as DateFilter)}
                className="bg-slate-900/50 border border-yellow-500/20 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-400"
              >
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="custom">Custom Range</option>
              </select>

              {/* Category Filter */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-slate-900/50 border border-yellow-500/20 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-400"
              >
                <option value="all">All Categories</option>
                {EXPENSE_CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="bg-slate-900/50 border border-yellow-500/20 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-400"
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
              </select>

              {/* Sort Order */}
              <button
                onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                className="px-3 py-2 bg-slate-900/50 border border-yellow-500/20 rounded-lg text-sm hover:bg-slate-800 transition flex items-center gap-2"
              >
                <CalendarRange className="w-4 h-4" />
                {sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}
              </button>

              {/* Reset Filters */}
              <button
                onClick={resetFilters}
                className="px-3 py-2 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg text-sm hover:bg-rose-500/30 transition"
              >
                Reset
              </button>
            </div>

            {/* Custom Date Range */}
            {dateFilter === 'custom' && (
              <div className="flex gap-3 mt-3">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="flex-1 bg-slate-900/50 border border-yellow-500/20 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-400"
                />
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="flex-1 bg-slate-900/50 border border-yellow-500/20 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-400"
                />
              </div>
            )}
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="p-3 sm:p-4 md:p-6 max-w-7xl mx-auto">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <div className="bg-slate-800/50 backdrop-blur-sm border border-yellow-500/20 rounded-lg sm:rounded-xl p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="w-4 h-4 text-yellow-400" />
              <p className="text-[10px] sm:text-xs text-gray-400">Total Expenses</p>
            </div>
            <p className="text-lg sm:text-xl font-bold text-rose-400">{formatCurrency(filteredStats.totalAmount)}</p>
            <p className="text-[8px] sm:text-xs text-gray-500 mt-1">{filteredStats.totalCount} transactions</p>
          </div>
          
          <div className="bg-slate-800/50 backdrop-blur-sm border border-yellow-500/20 rounded-lg sm:rounded-xl p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-green-400" />
              <p className="text-[10px] sm:text-xs text-gray-400">Average</p>
            </div>
            <p className="text-lg sm:text-xl font-bold text-green-400">{formatCurrency(filteredStats.averageAmount)}</p>
            <p className="text-[8px] sm:text-xs text-gray-500 mt-1">per transaction</p>
          </div>
          
          <div className="bg-slate-800/50 backdrop-blur-sm border border-yellow-500/20 rounded-lg sm:rounded-xl p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-2">
              <FuelIcon className="w-4 h-4 text-yellow-400" />
              <p className="text-[10px] sm:text-xs text-gray-400">Fuel</p>
            </div>
            <p className="text-lg sm:text-xl font-bold text-yellow-400">
              {formatCurrency(filteredStats.byCategory.find(c => c.category === 'fuel')?.total || 0)}
            </p>
            <p className="text-[8px] sm:text-xs text-gray-500 mt-1">
              {filteredStats.byCategory.find(c => c.category === 'fuel')?.count || 0} transactions
            </p>
          </div>
          
          <div className="bg-slate-800/50 backdrop-blur-sm border border-yellow-500/20 rounded-lg sm:rounded-xl p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <p className="text-[10px] sm:text-xs text-gray-400">Completed</p>
            </div>
            <p className="text-lg sm:text-xl font-bold text-green-400">
              {formatCurrency(expenses.filter(e => e.status === 'completed').reduce((sum, e) => sum + e.amount, 0))}
            </p>
            <p className="text-[8px] sm:text-xs text-gray-500 mt-1">
              {expenses.filter(e => e.status === 'completed').length} transactions
            </p>
          </div>
        </div>

        {/* Category Breakdown */}
        {showCategoryBreakdown && filteredStats.byCategory.length > 0 && (
          <div className="bg-slate-800/50 backdrop-blur-sm border border-yellow-500/20 rounded-xl sm:rounded-2xl p-4 sm:p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm sm:text-base font-semibold flex items-center gap-2">
                <PieChart className="w-4 h-4 text-yellow-400" />
                Category Breakdown
              </h3>
              <button
                onClick={() => setShowCategoryBreakdown(false)}
                className="text-gray-500 hover:text-gray-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {filteredStats.byCategory
                .sort((a, b) => b.total - a.total)
                .map(({ category, total, count }) => {
                  const percentage = (total / filteredStats.totalAmount) * 100;
                  const CategoryIcon = getCategoryIcon(category);
                  const categoryInfo = EXPENSE_CATEGORIES.find(c => c.value === category);
                  
                  return (
                    <div key={category} className="space-y-1">
                      <div className="flex items-center justify-between text-xs sm:text-sm">
                        <div className="flex items-center gap-2">
                          <div className={`p-1 rounded ${getCategoryColor(category)}`}>
                            <CategoryIcon className="w-3 h-3" />
                          </div>
                          <span>{categoryInfo?.label || category}</span>
                          <span className="text-gray-500">({count})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{formatCurrency(total)}</span>
                          <span className="text-gray-500 text-[10px]">{percentage.toFixed(1)}%</span>
                        </div>
                      </div>
                      <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${categoryInfo?.gradient || 'from-gray-500 to-gray-600'}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Expenses View */}
        {filteredExpenses.length > 0 ? (
          <>
            {viewMode === 'list' && (
              <div className="bg-slate-800/50 backdrop-blur-sm border border-yellow-500/20 rounded-xl sm:rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-yellow-500/20 bg-slate-900/50">
                        <th className="text-left p-3 sm:p-4 text-xs sm:text-sm font-medium text-gray-400">Date</th>
                        <th className="text-left p-3 sm:p-4 text-xs sm:text-sm font-medium text-gray-400">Category</th>
                        <th className="text-left p-3 sm:p-4 text-xs sm:text-sm font-medium text-gray-400">Description</th>
                        <th className="text-left p-3 sm:p-4 text-xs sm:text-sm font-medium text-gray-400">Amount</th>
                        <th className="text-left p-3 sm:p-4 text-xs sm:text-sm font-medium text-gray-400">Status</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-yellow-500/10">
                      {paginatedExpenses.map((expense) => {
                        const CategoryIcon = getCategoryIcon(expense.category);
                        const categoryInfo = EXPENSE_CATEGORIES.find(c => c.value === expense.category);
                        
                        return (
                          <tr 
                            key={expense.id} 
                            className="hover:bg-yellow-500/5 transition cursor-pointer"
                            onClick={() => setSelectedExpense(expense)}
                          >
                            <td className="p-3 sm:p-4">
                              <div className="text-xs sm:text-sm">{formatDate(expense.date)}</div>
                             </td>
                            <td className="p-3 sm:p-4">
                              <div className="flex items-center gap-2">
                                <div className={`p-1.5 rounded-lg ${getCategoryColor(expense.category)}`}>
                                  <CategoryIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                                </div>
                                <span className="text-xs sm:text-sm capitalize">{categoryInfo?.label || expense.category}</span>
                              </div>
                             </td>
                            <td className="p-3 sm:p-4">
                              <div className="text-xs sm:text-sm max-w-[200px] truncate">{expense.description}</div>
                              {expense.location && (
                                <div className="text-[10px] text-gray-500">{expense.location}</div>
                              )}
                             </td>
                            <td className="p-3 sm:p-4">
                              <div className="text-xs sm:text-sm font-bold text-rose-400">
                                {formatCurrency(expense.amount)}
                              </div>
                             </td>
                            <td className="p-3 sm:p-4">
                              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] sm:text-xs font-medium border ${getStatusBadge(expense.status)}`}>
                                {expense.status === 'completed' && <CheckCircle className="w-3 h-3" />}
                                {expense.status === 'pending' && <Clock className="w-3 h-3" />}
                                {expense.status === 'rejected' && <X className="w-3 h-3" />}
                                {expense.status === 'completed' ? 'Completed' : expense.status}
                              </span>
                             </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {viewMode === 'grid' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {paginatedExpenses.map((expense) => {
                  const CategoryIcon = getCategoryIcon(expense.category);
                  const categoryInfo = EXPENSE_CATEGORIES.find(c => c.value === expense.category);
                  
                  return (
                    <div
                      key={expense.id}
                      onClick={() => setSelectedExpense(expense)}
                      className="bg-slate-800/50 backdrop-blur-sm border border-yellow-500/20 rounded-lg sm:rounded-xl p-4 hover:border-yellow-400/50 transition cursor-pointer"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className={`p-2 rounded-lg ${getCategoryColor(expense.category)}`}>
                            <CategoryIcon className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-medium">{categoryInfo?.label || expense.category}</p>
                            <p className="text-[10px] text-gray-500">{formatDate(expense.date)}</p>
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-[10px] font-medium border ${getStatusBadge(expense.status)}`}>
                          {expense.status === 'completed' ? 'Completed' : expense.status}
                        </span>
                      </div>

                      <p className="text-sm font-medium mb-2">{expense.description}</p>
                      
                      {expense.location && (
                        <p className="text-[10px] text-gray-500 mb-2">{expense.location}</p>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-yellow-500/20">
                        <span className="text-xs text-gray-400">Amount</span>
                        <span className="text-lg font-bold text-rose-400">{formatCurrency(expense.amount)}</span>
                      </div>

                      {expense.receipt && (
                        <div className="mt-2 flex items-center gap-1 text-[10px] text-blue-400">
                          <Camera className="w-3 h-3" />
                          <span>Receipt attached</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {viewMode === 'chart' && (
              <div className="bg-slate-800/50 backdrop-blur-sm border border-yellow-500/20 rounded-xl sm:rounded-2xl p-4 sm:p-6">
                <h3 className="text-sm sm:text-base font-semibold mb-4 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-yellow-400" />
                  Daily Expenses
                </h3>
                
                {/* Simple chart representation */}
                <div className="space-y-2">
                  {paginatedExpenses.slice(0, 10).map((expense) => (
                    <div key={expense.id} className="flex items-center gap-2">
                      <div className="w-20 text-[10px] text-gray-500">{formatDate(expense.date)}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div 
                            className="h-6 bg-gradient-to-r from-rose-500 to-pink-500 rounded"
                            style={{ width: `${(expense.amount / filteredStats.totalAmount) * 100}%` }}
                          />
                          <span className="text-xs font-medium">{formatCurrency(expense.amount)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 sm:mt-6">
                <p className="text-xs sm:text-sm text-gray-500">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredExpenses.length)} of {filteredExpenses.length} expenses
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 bg-slate-800/50 border border-yellow-500/20 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-700 transition"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 bg-slate-800/50 border border-yellow-500/20 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-700 transition"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="bg-slate-800/50 backdrop-blur-sm border border-yellow-500/20 rounded-xl sm:rounded-2xl p-8 sm:p-12 text-center">
            <Receipt className="w-12 h-12 sm:w-16 sm:h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg sm:text-xl font-semibold mb-2">No Expenses Found</h3>
            <p className="text-sm text-gray-500 mb-6">
              {searchTerm || statusFilter !== 'all' || categoryFilter !== 'all' || dateFilter !== 'month'
                ? 'Try adjusting your filters'
                : 'You haven\'t added any expenses yet'}
            </p>
            <button
              onClick={() => setShowAddExpense(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-400 to-amber-500 text-black rounded-lg font-semibold hover:from-yellow-300 hover:to-amber-400 transition text-sm"
            >
              <Plus className="w-4 h-4" />
              Add Your First Expense
            </button>
          </div>
        )}

        {/* Expense Details Modal */}
        {selectedExpense && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="bg-slate-900 border border-yellow-500/30 rounded-xl sm:rounded-2xl max-w-md w-full">
              <div className="p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-yellow-400" />
                    Expense Details
                  </h3>
                  <button
                    onClick={() => setSelectedExpense(null)}
                    className="p-2 hover:bg-slate-800 rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Category & Status */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-lg ${getCategoryColor(selectedExpense.category)}`}>
                        {(() => {
                          const Icon = getCategoryIcon(selectedExpense.category);
                          return <Icon className="w-5 h-5" />;
                        })()}
                      </div>
                      <div>
                        <p className="text-sm font-medium capitalize">{selectedExpense.category}</p>
                        <p className="text-xs text-gray-500">{formatDate(selectedExpense.date)}</p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadge(selectedExpense.status)}`}>
                      {selectedExpense.status === 'completed' ? 'Completed' : selectedExpense.status}
                    </span>
                  </div>

                  {/* Amount */}
                  <div className="bg-slate-800/30 rounded-lg p-4">
                    <p className="text-xs text-gray-400 mb-1">Amount</p>
                    <p className="text-2xl font-bold text-rose-400">{formatCurrency(selectedExpense.amount)}</p>
                  </div>

                  {/* Description */}
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Description</p>
                    <p className="text-sm">{selectedExpense.description}</p>
                  </div>

                  {/* Location */}
                  {selectedExpense.location && (
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Location</p>
                      <p className="text-sm">{selectedExpense.location}</p>
                    </div>
                  )}

                  {/* Vehicle */}
                  {selectedExpense.vehicle && (
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Vehicle</p>
                      <p className="text-sm">{selectedExpense.vehicle.plateNumber} - {selectedExpense.vehicle.model}</p>
                    </div>
                  )}

                  {/* Receipt */}
                  {selectedExpense.receipt && (
                    <div>
                      <p className="text-xs text-gray-400 mb-2">Receipt</p>
                      <a
                        href={selectedExpense.receipt}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg border border-blue-500/30 hover:bg-blue-500/30 transition text-sm"
                      >
                        <Camera className="w-4 h-4" />
                        View Receipt
                      </a>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-4 border-t border-yellow-500/20">
                    <button
                      onClick={() => {
                        setSelectedExpense(null);
                        openEditModal(selectedExpense);
                      }}
                      className="flex-1 px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg border border-blue-500/30 hover:bg-blue-500/30 transition text-sm flex items-center justify-center gap-2"
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        setExpenseToDelete(selectedExpense.id);
                        setShowDeleteConfirm(true);
                        setSelectedExpense(null);
                      }}
                      className="flex-1 px-4 py-2 bg-rose-500/20 text-rose-400 rounded-lg border border-rose-500/30 hover:bg-rose-500/30 transition text-sm flex items-center justify-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <style jsx>{`
        @keyframes slideDown {
          from {
            transform: translateY(-100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-down {
          animation: slideDown 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

function ExpensesFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-yellow-400/20 border-t-yellow-400 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-400">Loading...</p>
      </div>
    </div>
  );
}

export default function ExpensesPage() {
  return (
    <Suspense fallback={<ExpensesFallback />}>
      <ExpensesContent />
    </Suspense>
  );
}