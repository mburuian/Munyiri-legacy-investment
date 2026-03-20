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
  Users,
  Star,
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
  Activity
} from "lucide-react";
import { auth } from '../../../../lib/firebase/config';

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
  
  // Performance metrics (from latest metrics)
  rating?: number | null;
  tripsCompleted?: number;
  totalRevenue?: number;
  
  // Assigned vehicle
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

export default function DriversPage() {
  const router = useRouter();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [filteredDrivers, setFilteredDrivers] = useState<Driver[]>([]);
  const [summary, setSummary] = useState<DriversResponse['summary'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [driverToDelete, setDriverToDelete] = useState<Driver | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Search and filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'status' | 'trips' | 'revenue'>('name');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<DriversResponse['pagination'] | null>(null);
  const itemsPerPage = 12;

  useEffect(() => {
    // Check authentication
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.push('/auth/login');
        return;
      }
      loadDrivers();
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!drivers.length) return;
    
    // Apply filters
    let filtered = drivers.filter(driver => {
      const matchesSearch = 
        driver.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        driver.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        driver.phone.includes(searchQuery) ||
        driver.licenseNumber.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || driver.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });

    // Apply sorting
    if (sortBy === 'name') {
      filtered = filtered.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'status') {
      filtered = filtered.sort((a, b) => a.status.localeCompare(b.status));
    } else if (sortBy === 'trips') {
      filtered = filtered.sort((a, b) => (b.tripsCompleted || 0) - (a.tripsCompleted || 0));
    } else if (sortBy === 'revenue') {
      filtered = filtered.sort((a, b) => (b.totalRevenue || 0) - (a.totalRevenue || 0));
    }

    setFilteredDrivers(filtered);
    setCurrentPage(1);
  }, [searchQuery, statusFilter, sortBy, drivers]);

  const loadDrivers = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const user = auth.currentUser;
      if (!user) {
        router.push('/auth/login');
        return;
      }

      const token = await user.getIdToken();
      
      const response = await fetch('/api/admin/drivers', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch drivers');
      const data: DriversResponse = await response.json();
      setDrivers(data.drivers);
      setFilteredDrivers(data.drivers);
      setSummary(data.summary);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error loading drivers:', error);
      setError('Failed to load drivers. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Navigate to driver detail page
  const handleViewDetails = (driver: Driver) => {
    router.push(`/dashboards/admin/driver/${driver.id}`);
  };

  const handleEdit = (driverId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    router.push(`/dashboards/admin/driver/${driverId}/edit`);
  };

  const handleDeleteClick = (driver: Driver, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setDriverToDelete(driver);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!driverToDelete) return;
    
    setDeleteLoading(true);
    try {
      const user = auth.currentUser;
      const token = await user?.getIdToken();
      
      const response = await fetch(`/api/admin/drivers/${driverToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to delete driver');

      await loadDrivers();
      setShowDeleteModal(false);
      setDriverToDelete(null);
    } catch (error) {
      console.error('Error deleting driver:', error);
      setError('Failed to delete driver. Please try again.');
    } finally {
      setDeleteLoading(false);
    }
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
        return <User className="w-4 h-4" />;
    }
  };

  // Pagination
  const totalPages = Math.ceil(filteredDrivers.length / itemsPerPage);
  const paginatedDrivers = filteredDrivers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-yellow-400/20 border-t-yellow-400 rounded-full animate-spin mx-auto mb-4"></div>
            <Users className="w-8 h-8 text-yellow-400 absolute top-6 left-1/2 -translate-x-1/2 animate-pulse" />
          </div>
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
        <div className="absolute top-20 left-10 w-96 h-96 bg-yellow-500/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl animate-pulse animation-delay-2000"></div>
      </div>

      {/* Header */}
      <div className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-xl border-b border-yellow-500/20">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-lg flex items-center justify-center">
                  <Users className="w-4 h-4 text-black" />
                </div>
                <h1 className="text-2xl font-bold text-white">Drivers</h1>
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
                className="px-4 py-2 bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-black rounded-xl flex items-center gap-2 transition shadow-lg shadow-yellow-500/30"
              >
                <PlusCircle className="w-4 h-4" />
                Add Driver
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Filters and Search */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search by name, email, phone, or license..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-800/50 border border-yellow-500/20 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400/50 focus:ring-1 focus:ring-yellow-400/20 transition"
            />
          </div>
          
          <div className="flex gap-2">
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
              <option value="name">Name</option>
              <option value="status">Status</option>
              <option value="trips">Most Trips</option>
              <option value="revenue">Highest Revenue</option>
            </select>

            <button className="p-2.5 bg-slate-800/50 border border-yellow-500/20 rounded-xl hover:bg-slate-700 transition">
              <Download className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Stats Summary */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-yellow-500/20">
              <p className="text-sm text-gray-500">Total Drivers</p>
              <p className="text-2xl font-bold text-white">{summary.totalDrivers}</p>
            </div>
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-yellow-500/20">
              <p className="text-sm text-gray-500">Active</p>
              <p className="text-2xl font-bold text-green-400">{summary.activeDrivers}</p>
            </div>
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-yellow-500/20">
              <p className="text-sm text-gray-500">Off Duty</p>
              <p className="text-2xl font-bold text-gray-400">{summary.offDutyDrivers}</p>
            </div>
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-yellow-500/20">
              <p className="text-sm text-gray-500">On Leave</p>
              <p className="text-2xl font-bold text-amber-400">{summary.onLeaveDrivers}</p>
            </div>
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-yellow-500/20">
              <p className="text-sm text-gray-500">Assigned</p>
              <p className="text-2xl font-bold text-blue-400">{summary.assignedDrivers}</p>
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
          // Grid View
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {paginatedDrivers.map((driver) => {
              const statusIcon = getStatusIcon(driver.status);
              
              return (
                <div
                  key={driver.id}
                  onClick={() => handleViewDetails(driver)}
                  className="group bg-slate-800/50 backdrop-blur-sm border border-yellow-500/20 rounded-2xl overflow-hidden hover:border-yellow-400/50 hover:shadow-xl hover:shadow-yellow-500/10 transition-all cursor-pointer"
                >
                  {/* Driver Avatar */}
                  <div className="relative h-32 bg-gradient-to-br from-yellow-500/20 to-amber-600/20 flex items-center justify-center">
                    {driver.avatar ? (
                      <Image
                        src={driver.avatar}
                        alt={driver.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center">
                        <User className="w-10 h-10 text-black" />
                      </div>
                    )}
                    
                    {/* Status Badge */}
                    <div className="absolute top-3 right-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(driver.status)}`}>
                        {driver.status?.replace('-', ' ').toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* Driver Info */}
                  <div className="p-4">
                    <h3 className="text-lg font-semibold text-white mb-1">{driver.name}</h3>
                    <p className="text-sm text-gray-400 mb-3">{driver.email}</p>
                    
                    {/* License */}
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                      <IdCard className="w-4 h-4" />
                      <span>{driver.licenseNumber}</span>
                    </div>

                    {/* Quick Stats */}
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

                    {/* Vehicle Info */}
                    {driver.assignedVehicle ? (
                      <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                        <Truck className="w-3 h-3" />
                        <span>{driver.assignedVehicle.plateNumber} - {driver.assignedVehicle.model}</span>
                      </div>
                    ) : (
                      <div className="mt-3 text-xs text-gray-600">
                        No vehicle assigned
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          // List View
          <div className="bg-slate-800/50 backdrop-blur-sm border border-yellow-500/20 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-yellow-500/20 bg-slate-900/50">
                    <th className="text-left py-4 px-6 text-xs font-medium text-gray-400 uppercase tracking-wider">Driver</th>
                    <th className="text-left py-4 px-6 text-xs font-medium text-gray-400 uppercase tracking-wider">Contact</th>
                    <th className="text-left py-4 px-6 text-xs font-medium text-gray-400 uppercase tracking-wider">License</th>
                    <th className="text-left py-4 px-6 text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="text-left py-4 px-6 text-xs font-medium text-gray-400 uppercase tracking-wider">Trips</th>
                    <th className="text-left py-4 px-6 text-xs font-medium text-gray-400 uppercase tracking-wider">Revenue</th>
                    <th className="text-left py-4 px-6 text-xs font-medium text-gray-400 uppercase tracking-wider">Vehicle</th>
                    <th className="text-center py-4 px-6 text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-yellow-500/10">
                  {paginatedDrivers.map((driver) => {
                    const statusIcon = getStatusIcon(driver.status);
                    
                    return (
                      <tr 
                        key={driver.id} 
                        onClick={() => handleViewDetails(driver)}
                        className="hover:bg-yellow-500/5 transition-colors cursor-pointer"
                      >
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center flex-shrink-0">
                              <User className="w-5 h-5 text-black" />
                            </div>
                            <div>
                              <p className="font-medium text-white">{driver.name}</p>
                              <p className="text-xs text-gray-500">{driver.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="w-3 h-3 text-gray-500" />
                              <span className="text-gray-300">{driver.phone}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <IdCard className="w-4 h-4 text-gray-500" />
                            <span className="text-sm text-gray-300">{driver.licenseNumber}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm ${getStatusColor(driver.status).split(' ')[1]}`}>
                              {statusIcon}
                            </span>
                            <span className={`text-sm ${getStatusColor(driver.status).split(' ')[1]}`}>
                              {driver.status?.replace('-', ' ').toUpperCase()}
                            </span>
                          </div>
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
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewDetails(driver);
                              }}
                              className="p-1.5 hover:bg-slate-700 rounded-lg transition"
                            >
                              <Eye className="w-4 h-4 text-gray-400" />
                            </button>
                            <button
                              onClick={(e) => handleEdit(driver.id, e)}
                              className="p-1.5 hover:bg-slate-700 rounded-lg transition"
                            >
                              <Edit className="w-4 h-4 text-gray-400" />
                            </button>
                            <button
                              onClick={(e) => handleDeleteClick(driver, e)}
                              className="p-1.5 hover:bg-slate-700 rounded-lg transition"
                            >
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
        {filteredDrivers.length > 0 && (
          <div className="flex items-center justify-between mt-8">
            <p className="text-sm text-gray-500">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredDrivers.length)} of {filteredDrivers.length} drivers
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 bg-slate-800/50 border border-yellow-500/20 rounded-lg hover:bg-slate-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
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
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

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
                    <div className="w-4 h-4 border-2 border-rose-400 border-t-transparent rounded-full animate-spin"></div>
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