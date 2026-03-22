'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Download,
  Calendar,
  TrendingUp,
  TrendingDown,
  Car,
  Users,
  DollarSign,
  BarChart3,
  PieChart,
  LineChart,
  FileText,
  Filter,
  Search,
  ChevronDown,
  ChevronUp,
  Printer,
  Mail,
  Share2,
  AlertCircle,
  CheckCircle2,
  Clock,
  Target,
  Award,
  Activity,
  Zap,
  Globe,
  Truck,
  Wallet,
  CreditCard,
  Receipt,
  Settings,
  RefreshCw,
  Maximize2,
  Minimize2,
  X,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { auth } from '../../../../lib/firebase/config';
import { User } from 'firebase/auth';

// Types
interface ReportData {
  summary: {
    totalIncome: number;
    totalExpenses: number;
    netProfit: number;
    profitMargin: number;
    totalTrips: number;
    totalDistance: number;
    averageFarePerTrip: number;
    averageIncomePerKm: number;
    activeVehicles: number;
    activeDrivers: number;
    completionRate: number;
  };
  incomeByVehicle: Array<{
    vehicleId: string;
    plateNumber: string;
    model: string;
    totalIncome: number;
    totalTrips: number;
    totalDistance: number;
    avgPerTrip: number;
    avgPerKm: number;
    contribution: number;
  }>;
  expensesByVehicle: Array<{
    vehicleId: string;
    plateNumber: string;
    model: string;
    totalExpenses: number;
    expenseCount: number;
    categories: Array<{
      category: string;
      amount: number;
      count: number;
    }>;
  }>;
  incomeByDriver: Array<{
    driverId: string;
    name: string;
    email: string;
    totalIncome: number;
    totalTrips: number;
    totalDistance: number;
    avgRating: number;
  }>;
  monthlyTrends: Array<{
    month: string;
    income: number;
    expenses: number;
    profit: number;
    trips: number;
  }>;
  topVehicles: Array<{
    plateNumber: string;
    totalIncome: number;
    totalTrips: number;
    efficiency: number;
  }>;
  recentTransactions: Array<{
    id: string;
    date: string;
    type: string;
    amount: number;
    vehicle: string;
    driver: string;
    description: string;
  }>;
}

interface DateRange {
  start: Date;
  end: Date;
}

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom'>('month');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [selectedVehicle, setSelectedVehicle] = useState<string>('all');
  const [selectedDriver, setSelectedDriver] = useState<string>('all');
  const [reportType, setReportType] = useState<'full' | 'income' | 'expenses' | 'vehicles' | 'drivers'>('full');
  const [viewMode, setViewMode] = useState<'summary' | 'detailed'>('summary');
  const [showFilters, setShowFilters] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'pdf' | 'json'>('csv');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user: User | null) => {
      if (!user) {
        window.location.href = '/auth/login';
        return;
      }
      fetchReportData();
    });

    return () => unsubscribe();
  }, [dateRange, customStartDate, customEndDate, selectedVehicle, selectedDriver]);

  const getDateRangeParams = () => {
    const now = new Date();
    let startDate: Date | null = null;
    let endDate: Date | null = null;

    switch (dateRange) {
      case 'today':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        endDate = new Date(now.setHours(23, 59, 59, 999));
        break;
      case 'week':
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        weekStart.setHours(0, 0, 0, 0);
        startDate = weekStart;
        endDate = new Date();
        break;
      case 'month':
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        startDate = monthStart;
        endDate = new Date();
        break;
      case 'quarter':
        const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        startDate = quarterStart;
        endDate = new Date();
        break;
      case 'year':
        const yearStart = new Date(now.getFullYear(), 0, 1);
        startDate = yearStart;
        endDate = new Date();
        break;
      case 'custom':
        if (customStartDate && customEndDate) {
          startDate = new Date(customStartDate);
          endDate = new Date(customEndDate);
        }
        break;
    }

    return { startDate, endDate };
  };

  const fetchReportData = async () => {
    setLoading(true);
    setError(null);

    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Not authenticated');

      const token = await user.getIdToken();
      const { startDate, endDate } = getDateRangeParams();

      let url = '/api/admin/reports?';
      if (startDate) url += `startDate=${startDate.toISOString()}&`;
      if (endDate) url += `endDate=${endDate.toISOString()}&`;
      if (selectedVehicle !== 'all') url += `vehicleId=${selectedVehicle}&`;
      if (selectedDriver !== 'all') url += `driverId=${selectedDriver}&`;
      url += `type=${reportType}`;

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to fetch report data');

      const data: ReportData = await response.json();
      setReportData(data);
    } catch (err) {
      console.error('Error fetching report data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Not authenticated');
      
      const token = await user.getIdToken();
      const { startDate, endDate } = getDateRangeParams();

      const response = await fetch('/api/admin/reports/export', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          format: exportFormat,
          data: reportData,
          dateRange: { start: startDate, end: endDate },
          type: reportType
        })
      });

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${dateRange}-${new Date().toISOString().split('T')[0]}.${exportFormat}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Export error:', err);
      alert('Failed to export report');
    } finally {
      setExporting(false);
    }
  };

  const formatCurrency = (amount: number = 0) => {
    return `KES ${amount.toLocaleString()}`;
  };

  const formatNumber = (num: number = 0) => {
    return num.toLocaleString();
  };

  const formatPercentage = (value: number = 0) => {
    return `${value.toFixed(1)}%`;
  };

  const getProfitColor = (profit: number) => {
    if (profit > 0) return 'text-green-400';
    if (profit < 0) return 'text-red-400';
    return 'text-gray-400';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center px-4">
          <div className="relative">
            <div className="w-16 h-16 sm:w-20 sm:h-20 border-4 border-blue-400/20 border-t-blue-400 rounded-full animate-spin mx-auto mb-4"></div>
            <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-blue-400 absolute top-5 left-1/2 -translate-x-1/2 animate-pulse" />
          </div>
          <p className="text-gray-400 text-sm sm:text-base">Generating report...</p>
        </div>
      </div>
    );
  }

  if (error || !reportData) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-8 h-8 sm:w-10 sm:h-10 text-rose-400" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-4">Error Loading Report</h2>
          <p className="text-gray-400 text-sm sm:text-base mb-6">{error || 'No data available'}</p>
          <button
            onClick={fetchReportData}
            className="px-5 py-2.5 sm:px-6 sm:py-3 bg-gradient-to-r from-blue-400 to-indigo-500 text-black rounded-xl font-semibold hover:from-blue-300 hover:to-indigo-400 transition text-sm sm:text-base"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-10 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 left-10 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl animate-pulse animation-delay-2000"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
        {/* Header */}
        <div className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-xl border border-blue-500/20 rounded-xl sm:rounded-2xl mb-4 sm:mb-6 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
              <Link
                href="/dashboards/admin"
                className="p-2 hover:bg-slate-800 rounded-xl transition border border-blue-500/20 flex-shrink-0"
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </Link>
              <div className="flex-1">
                <h1 className="text-lg sm:text-2xl font-bold flex items-center gap-2">
                  <FileText className="w-5 h-5 sm:w-7 sm:h-7 text-blue-400" />
                  Analytics & Reports
                </h1>
                <p className="text-xs sm:text-sm text-gray-500">Comprehensive financial and operational analytics</p>
              </div>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={handleExport}
                disabled={exporting}
                className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-blue-500/20 border border-blue-500/30 rounded-xl text-blue-400 hover:bg-blue-500/30 transition flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
              >
                {exporting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                Export
              </button>
              <button
                onClick={() => window.print()}
                className="px-3 sm:px-4 py-2 bg-slate-800 border border-blue-500/20 rounded-xl text-gray-300 hover:bg-slate-700 transition flex items-center gap-2 text-sm"
              >
                <Printer className="w-4 h-4" />
                <span className="hidden sm:inline">Print</span>
              </button>
            </div>
          </div>
        </div>

        {/* Filters Panel */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-blue-500/20 rounded-xl sm:rounded-2xl p-3 sm:p-4 mb-4 sm:mb-6">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center justify-between w-full sm:hidden mb-2"
          >
            <span className="text-sm font-medium flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filters & Options
            </span>
            {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          <div className={`${showFilters ? 'block' : 'hidden'} sm:block transition-all`}>
            <div className="flex flex-col gap-3">
              {/* Date Range */}
              <div className="flex flex-wrap gap-2">
                {(['today', 'week', 'month', 'quarter', 'year'] as const).map((range) => (
                  <button
                    key={range}
                    onClick={() => setDateRange(range)}
                    className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl transition text-xs sm:text-sm capitalize ${
                      dateRange === range
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        : 'bg-slate-700/30 text-gray-400 border border-blue-500/10 hover:bg-slate-700/50'
                    }`}
                  >
                    {range}
                  </button>
                ))}
                <button
                  onClick={() => setDateRange('custom')}
                  className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl transition text-xs sm:text-sm ${
                    dateRange === 'custom'
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      : 'bg-slate-700/30 text-gray-400 border border-blue-500/10 hover:bg-slate-700/50'
                  }`}
                >
                  Custom
                </button>
              </div>

              {/* Custom Date Range */}
              {dateRange === 'custom' && (
                <div className="flex flex-wrap gap-2">
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="px-3 py-2 bg-slate-700/30 border border-blue-500/20 rounded-xl text-white text-sm"
                  />
                  <span className="text-gray-500">to</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="px-3 py-2 bg-slate-700/30 border border-blue-500/20 rounded-xl text-white text-sm"
                  />
                </div>
              )}

              {/* Advanced Filters */}
              <div className="flex flex-wrap gap-2">
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value as any)}
                  className="px-3 py-2 bg-slate-700/30 border border-blue-500/20 rounded-xl text-white text-sm"
                >
                  <option value="full">Full Report</option>
                  <option value="income">Income Only</option>
                  <option value="expenses">Expenses Only</option>
                  <option value="vehicles">Vehicles Only</option>
                  <option value="drivers">Drivers Only</option>
                </select>

                <select
                  value={viewMode}
                  onChange={(e) => setViewMode(e.target.value as any)}
                  className="px-3 py-2 bg-slate-700/30 border border-blue-500/20 rounded-xl text-white text-sm"
                >
                  <option value="summary">Summary View</option>
                  <option value="detailed">Detailed View</option>
                </select>

                <select
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value as any)}
                  className="px-3 py-2 bg-slate-700/30 border border-blue-500/20 rounded-xl text-white text-sm"
                >
                  <option value="csv">CSV Format</option>
                  <option value="json">JSON Format</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <div className="bg-gradient-to-br from-green-500/10 to-emerald-600/10 backdrop-blur-sm border border-green-500/20 rounded-xl p-3 sm:p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-gray-400 text-xs">Total Income</p>
              <TrendingUp className="w-4 h-4 text-green-400" />
            </div>
            <p className="text-lg sm:text-2xl font-bold text-green-400">{formatCurrency(reportData.summary.totalIncome)}</p>
            <p className="text-[10px] text-gray-500 mt-1">From {formatNumber(reportData.summary.totalTrips)} trips</p>
          </div>

          <div className="bg-gradient-to-br from-rose-500/10 to-red-600/10 backdrop-blur-sm border border-rose-500/20 rounded-xl p-3 sm:p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-gray-400 text-xs">Total Expenses</p>
              <TrendingDown className="w-4 h-4 text-rose-400" />
            </div>
            <p className="text-lg sm:text-2xl font-bold text-rose-400">{formatCurrency(reportData.summary.totalExpenses)}</p>
            <p className="text-[10px] text-gray-500 mt-1">Operational costs</p>
          </div>

          <div className="bg-gradient-to-br from-blue-500/10 to-indigo-600/10 backdrop-blur-sm border border-blue-500/20 rounded-xl p-3 sm:p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-gray-400 text-xs">Net Profit</p>
              <Wallet className="w-4 h-4 text-blue-400" />
            </div>
            <p className={`text-lg sm:text-2xl font-bold ${getProfitColor(reportData.summary.netProfit)}`}>
              {formatCurrency(reportData.summary.netProfit)}
            </p>
            <p className="text-[10px] text-gray-500 mt-1">Margin: {formatPercentage(reportData.summary.profitMargin)}</p>
          </div>

          <div className="bg-gradient-to-br from-purple-500/10 to-pink-600/10 backdrop-blur-sm border border-purple-500/20 rounded-xl p-3 sm:p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-gray-400 text-xs">Completion Rate</p>
              <Activity className="w-4 h-4 text-purple-400" />
            </div>
            <p className="text-lg sm:text-2xl font-bold text-purple-400">{formatPercentage(reportData.summary.completionRate)}</p>
            <p className="text-[10px] text-gray-500 mt-1">Trips completed</p>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <div className="bg-slate-800/50 backdrop-blur-sm border border-blue-500/20 rounded-xl p-3">
            <p className="text-gray-500 text-xs">Active Vehicles</p>
            <p className="text-xl font-bold">{formatNumber(reportData.summary.activeVehicles)}</p>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-sm border border-blue-500/20 rounded-xl p-3">
            <p className="text-gray-500 text-xs">Active Drivers</p>
            <p className="text-xl font-bold">{formatNumber(reportData.summary.activeDrivers)}</p>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-sm border border-blue-500/20 rounded-xl p-3">
            <p className="text-gray-500 text-xs">Total Distance</p>
            <p className="text-xl font-bold">{formatNumber(reportData.summary.totalDistance)} km</p>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-sm border border-blue-500/20 rounded-xl p-3">
            <p className="text-gray-500 text-xs">Avg per Trip</p>
            <p className="text-xl font-bold">{formatCurrency(reportData.summary.averageFarePerTrip)}</p>
          </div>
        </div>

        {/* Income by Vehicle */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-blue-500/20 rounded-xl sm:rounded-2xl overflow-hidden mb-6">
          <div className="p-4 sm:p-6 border-b border-blue-500/20">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Car className="w-5 h-5 text-blue-400" />
              Income by Vehicle
            </h3>
            <p className="text-sm text-gray-500 mt-1">Performance breakdown by vehicle</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-900/50">
                <tr className="border-b border-blue-500/20">
                  <th className="text-left p-3 text-xs font-medium text-gray-400">Vehicle</th>
                  <th className="text-right p-3 text-xs font-medium text-gray-400">Income</th>
                  <th className="text-right p-3 text-xs font-medium text-gray-400">Trips</th>
                  <th className="text-right p-3 text-xs font-medium text-gray-400">Distance</th>
                  <th className="text-right p-3 text-xs font-medium text-gray-400">Avg/Trip</th>
                  <th className="text-right p-3 text-xs font-medium text-gray-400">Contribution</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-blue-500/10">
                {reportData.incomeByVehicle.slice(0, viewMode === 'summary' ? 5 : undefined).map((vehicle) => (
                  <tr key={vehicle.vehicleId} className="hover:bg-blue-500/5 transition">
                    <td className="p-3">
                      <div>
                        <p className="font-medium text-sm">{vehicle.plateNumber}</p>
                        <p className="text-xs text-gray-500">{vehicle.model}</p>
                      </div>
                    </td>
                    <td className="p-3 text-right text-green-400 font-medium">{formatCurrency(vehicle.totalIncome)}</td>
                    <td className="p-3 text-right">{formatNumber(vehicle.totalTrips)}</td>
                    <td className="p-3 text-right">{formatNumber(vehicle.totalDistance)} km</td>
                    <td className="p-3 text-right">{formatCurrency(vehicle.avgPerTrip)}</td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-400 rounded-full"
                            style={{ width: `${vehicle.contribution}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-400">{formatPercentage(vehicle.contribution)}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Monthly Trends */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-blue-500/20 rounded-xl sm:rounded-2xl p-4 sm:p-6 mb-6">
          <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
            <LineChart className="w-5 h-5 text-blue-400" />
            Monthly Trends
          </h3>
          <div className="overflow-x-auto">
            <div className="min-w-[600px]">
              <div className="grid grid-cols-12 gap-2 mb-2 text-xs text-gray-500">
                <div className="col-span-3">Month</div>
                <div className="col-span-3 text-right">Income</div>
                <div className="col-span-3 text-right">Expenses</div>
                <div className="col-span-3 text-right">Profit</div>
              </div>
              {reportData.monthlyTrends.map((trend, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 py-2 border-b border-blue-500/10">
                  <div className="col-span-3 font-medium text-sm">{trend.month}</div>
                  <div className="col-span-3 text-right text-green-400">{formatCurrency(trend.income)}</div>
                  <div className="col-span-3 text-right text-rose-400">{formatCurrency(trend.expenses)}</div>
                  <div className={`col-span-3 text-right font-medium ${getProfitColor(trend.profit)}`}>
                    {formatCurrency(trend.profit)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Two Column Layout for Detailed View */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Top Vehicles */}
          <div className="bg-slate-800/50 backdrop-blur-sm border border-blue-500/20 rounded-xl p-4 sm:p-6">
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <Award className="w-5 h-5 text-yellow-400" />
              Top Performing Vehicles
            </h3>
            <div className="space-y-3">
              {reportData.topVehicles.map((vehicle, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-slate-700/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-yellow-500/20 rounded-full flex items-center justify-center">
                      <Truck className="w-4 h-4 text-yellow-400" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{vehicle.plateNumber}</p>
                      <p className="text-xs text-gray-500">{formatNumber(vehicle.totalTrips)} trips</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-green-400 font-semibold">{formatCurrency(vehicle.totalIncome)}</p>
                    <p className="text-xs text-gray-500">{formatNumber(vehicle.efficiency)}% efficiency</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Income by Driver */}
          <div className="bg-slate-800/50 backdrop-blur-sm border border-blue-500/20 rounded-xl p-4 sm:p-6">
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-blue-400" />
              Top Performing Drivers
            </h3>
            <div className="space-y-3">
              {reportData.incomeByDriver.slice(0, 5).map((driver) => (
                <div key={driver.driverId} className="flex items-center justify-between p-2 bg-slate-700/30 rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{driver.name}</p>
                    <p className="text-xs text-gray-500">{formatNumber(driver.totalTrips)} trips • {formatNumber(driver.totalDistance)} km</p>
                  </div>
                  <div className="text-right">
                    <p className="text-green-400 font-semibold">{formatCurrency(driver.totalIncome)}</p>
                    <div className="flex items-center gap-1 justify-end">
                      <Award className="w-3 h-3 text-yellow-400" />
                      <span className="text-xs text-gray-400">{driver.avgRating.toFixed(1)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-blue-500/20 rounded-xl sm:rounded-2xl overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-blue-500/20">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Receipt className="w-5 h-5 text-blue-400" />
              Recent Transactions
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-900/50">
                <tr className="border-b border-blue-500/20">
                  <th className="text-left p-3 text-xs font-medium text-gray-400">Date</th>
                  <th className="text-left p-3 text-xs font-medium text-gray-400">Type</th>
                  <th className="text-left p-3 text-xs font-medium text-gray-400">Vehicle</th>
                  <th className="text-left p-3 text-xs font-medium text-gray-400">Driver</th>
                  <th className="text-right p-3 text-xs font-medium text-gray-400">Amount</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-blue-500/10">
                {reportData.recentTransactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-blue-500/5 transition">
                    <td className="p-3 text-sm">{new Date(transaction.date).toLocaleDateString()}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        transaction.type === 'income' 
                          ? 'bg-green-500/20 text-green-400' 
                          : 'bg-rose-500/20 text-rose-400'
                      }`}>
                        {transaction.type}
                      </span>
                    </td>
                    <td className="p-3 text-sm">{transaction.vehicle}</td>
                    <td className="p-3 text-sm">{transaction.driver}</td>
                    <td className={`p-3 text-right font-medium ${
                      transaction.type === 'income' ? 'text-green-400' : 'text-rose-400'
                    }`}>
                      {formatCurrency(transaction.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-6 text-center text-xs text-gray-500">
          <p>Report generated on {new Date().toLocaleString()} • Data is real-time and subject to change</p>
        </div>
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
        @media print {
          .sticky, .fixed, button, .backdrop-blur-xl {
            display: none !important;
          }
          body {
            background: white;
            color: black;
          }
        }
      `}</style>
    </div>
  );
}