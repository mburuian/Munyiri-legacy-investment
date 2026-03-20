// hooks/useAdminData.ts
import { useState, useEffect } from 'react';
import { apiClient } from '..//lib/api-client';
import { useRouter } from 'next/navigation';
import { auth } from '..//lib/firebase/config';

interface DashboardStats {
  totalVehicles: number;
  activeVehicles: number;
  totalDrivers: number;
  activeDrivers: number;
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  tripsCompleted: number;
  fuelConsumed: number;
}

interface Driver {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  assignedVehicle?: {
    plateNumber: string;
    model: string;
  };
  performanceMetrics?: {
    tripsCount: number;
    totalIncome: number;
    rating: number;
  };
}

interface Vehicle {
  id: string;
  plateNumber: string;
  model: string;
  status: string;
  driver?: {
    name: string;
  };
}

interface IncomeLog {
  id: string;
  amount: number;
  type: string;
  description: string;
  date: string;
  driver?: {
    name: string;
  };
  vehicle?: {
    plateNumber: string;
  };
}

interface Expense {
  id: string;
  amount: number;
  category: string;
  description: string;
  date: string;
  approved: boolean;
  vehicle?: {
    plateNumber: string;
  };
  driver?: {
    name: string;
  };
}

interface Alert {
  id: string;
  title: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  type: string;
  dueDate?: string;
  resolved: boolean;
  vehicle?: {
    plateNumber: string;
  };
  driver?: {
    name: string;
  };
}

export function useAdminData() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [income, setIncome] = useState<IncomeLog[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Check if user is authenticated
        const user = auth.currentUser;
        if (!user) {
          router.push('/auth/login');
          return;
        }

        // Fetch all data in parallel
        const [
          statsData,
          driversData,
          vehiclesData,
          incomeData,
          expensesData,
          alertsData
        ] = await Promise.allSettled([
          apiClient.get<DashboardStats>('/api/admin/stats'),
          apiClient.get<{ drivers: Driver[] }>('/api/admin/drivers?limit=5'),
          apiClient.get<{ vehicles: Vehicle[] }>('/api/admin/vehicles?limit=5'),
          apiClient.get<{ income: IncomeLog[] }>('/api/admin/income?limit=5'),
          apiClient.get<{ expenses: Expense[] }>('/api/admin/expenses?limit=5'),
          apiClient.get<{ alerts: Alert[] }>('/api/admin/alerts')
        ]);

        // Process results
        if (statsData.status === 'fulfilled') {
          setStats(statsData.value);
        } else {
          console.error('Failed to fetch stats:', statsData.reason);
        }

        if (driversData.status === 'fulfilled') {
          setDrivers(driversData.value.drivers);
        }

        if (vehiclesData.status === 'fulfilled') {
          setVehicles(vehiclesData.value.vehicles);
        }

        if (incomeData.status === 'fulfilled') {
          setIncome(incomeData.value.income);
        }

        if (expensesData.status === 'fulfilled') {
          setExpenses(expensesData.value.expenses);
        }

        if (alertsData.status === 'fulfilled') {
          setAlerts(alertsData.value.alerts);
        }

      } catch (err) {
        console.error('Error fetching admin data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
        
        // If session expired, redirect to login
        if (err instanceof Error && err.message.includes('Session expired')) {
          router.push('/auth/login?expired=true');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  return {
    loading,
    error,
    stats,
    drivers,
    vehicles,
    income,
    expenses,
    alerts
  };
}