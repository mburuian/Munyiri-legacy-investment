// app/api/driver/profile/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { verifyAuth } from '../../../../../lib/firebase/admin';

// Define types for the data structures
interface IncomeLog {
  id: string;
  date: Date;
  amount: number;
  description: string | null;
  distanceKm: number | null;
  tripStart: Date | null;
  tripEnd: Date | null;
  startOdometer: number | null;
  endOdometer: number | null;
  type: string;
}

interface Expense {
  id: string;
  date: Date;
  amount: number;
  category: string;
  description: string;
  approved: boolean;
}

interface Trip {
  id: string;
  startTime: Date;
  endTime: Date | null;
  startLocation: string | null;
  endLocation: string | null;
  distanceKm: number | null;
  fare: number | null;
  status: string;
}

interface Alert {
  id: string;
  title: string;
  description: string;
  severity: string;
  dueDate: Date | null;
  resolved: boolean;
  type: string;
}

interface DriverWithRelations {
  id: string;
  userId: string;
  licenseNumber: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  user: {
    name: string | null;
    email: string;
    phone: string | null;
    avatar: string | null;
  } | null;
  assignedVehicle: {
    id: string;
    plateNumber: string;
    model: string;
    capacity: number;
    status: string;
    trips: Trip[];
    photos?: string | null;
  } | null;
  incomeLogs: IncomeLog[];
  expenses: Expense[];
  trips: Trip[];
  alerts: Alert[];
  performanceMetrics: {
    totalIncome: number;
    totalExpenses: number;
    netProfit: number;
    fuelEfficiency: number | null;
    rating: number | null;
  }[];
}

export async function GET(request: NextRequest) {
  try {
    console.log('==================================================');
    console.log('🚀 Driver Profile API Called');
    console.log('==================================================');
    
    // Verify the Firebase token
    const auth = await verifyAuth(request);
    
    console.log('📝 Verifying driver authentication...');
    
    if (!auth.authenticated) {
      console.log('❌ Authentication failed:', auth.error);
      return NextResponse.json(
        { error: auth.error || 'Unauthorized' }, 
        { status: auth.status || 401 }
      );
    }

    // Get the user's email from the auth object
    const userEmail = auth.user?.email;
    
    console.log('✅ Token verified for email:', userEmail);
    console.log('Auth result:', JSON.stringify(auth, null, 2));

    if (!userEmail) {
      console.log('❌ User email not found in token');
      return NextResponse.json(
        { error: 'User email not found in token' }, 
        { status: 401 }
      );
    }

    // Find the user by email first (since we don't store Firebase UID in DB)
    console.log('🔍 Looking up user by email:', userEmail);
    
    const user = await prisma.user.findUnique({
      where: { email: userEmail }
    });

    if (!user) {
      console.log('❌ User not found in database for email:', userEmail);
      return NextResponse.json(
        { error: 'User not found in database' },
        { status: 404 }
      );
    }

    console.log('✅ User found in database:', user.id);

    // Fetch the driver profile with their relations
    const driver = await prisma.driver.findUnique({
      where: { userId: user.id },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            phone: true,
            avatar: true,
          },
        },
        assignedVehicle: {
          include: {
            trips: {
              orderBy: { startTime: 'desc' },
              take: 30,
            },
          },
        },
        incomeLogs: {
          orderBy: { date: 'desc' },
          take: 30,
        },
        expenses: {
          orderBy: { date: 'desc' },
          take: 30,
        },
        trips: {
          orderBy: { startTime: 'desc' },
          take: 30,
        },
        alerts: {
          where: { resolved: false },
          orderBy: { severity: 'desc' },
          take: 5,
        },
        performanceMetrics: {
          orderBy: { date: 'desc' },
          take: 1,
        },
      },
    }) as DriverWithRelations | null;

    if (!driver) {
      console.log('❌ Driver profile not found for user:', user.id);
      return NextResponse.json(
        { error: 'Driver profile not found' }, 
        { status: 404 }
      );
    }

    console.log('✅ Driver profile found:', driver.id);

    // Calculate driver statistics
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayIncome = driver.incomeLogs
      .filter((log: IncomeLog) => new Date(log.date) >= today)
      .reduce((sum: number, log: IncomeLog) => sum + log.amount, 0);

    const todayTrips = driver.trips
      .filter((trip: Trip) => new Date(trip.startTime) >= today && trip.status === 'COMPLETED')
      .length;

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const weekIncome = driver.incomeLogs
      .filter((log: IncomeLog) => new Date(log.date) >= weekAgo)
      .reduce((sum: number, log: IncomeLog) => sum + log.amount, 0);

    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    
    const monthIncome = driver.incomeLogs
      .filter((log: IncomeLog) => new Date(log.date) >= monthAgo)
      .reduce((sum: number, log: IncomeLog) => sum + log.amount, 0);

    const fuelLogged = driver.expenses
      .filter((exp: Expense) => exp.category === 'FUEL')
      .reduce((sum: number, exp: Expense) => sum + exp.amount, 0);

    // Calculate rank based on total income from performance metrics
    const allDrivers = await prisma.driver.findMany({
      where: { status: 'ACTIVE' },
      include: {
        performanceMetrics: {
          orderBy: { date: 'desc' },
          take: 1,
        },
      },
    });
    
    // Calculate total revenue for each driver from their latest performance metrics
    const driversWithRevenue = allDrivers.map(d => ({
      id: d.id,
      totalRevenue: d.performanceMetrics[0]?.totalIncome || 0,
    })).sort((a, b) => b.totalRevenue - a.totalRevenue);
    
    const latestMetrics = driver.performanceMetrics[0];
    const currentRevenue = latestMetrics?.totalIncome || 0;
    const rank = driversWithRevenue.findIndex(d => d.id === driver.id) + 1;

    // Parse photos JSON if it exists
    const vehicle = driver.assignedVehicle;
    let photos: string[] = [];
    if (vehicle && (vehicle as any).photos) {
      try {
        photos = JSON.parse((vehicle as any).photos as string);
      } catch (e) {
        console.error('Error parsing vehicle photos:', e);
      }
    }

    // Calculate trips completed count
    const tripsCompleted = driver.trips.filter((trip: Trip) => trip.status === 'COMPLETED').length;

    console.log('✅ Returning driver profile data');

    return NextResponse.json({
      success: true,
      driver: {
        id: driver.id,
        name: driver.user?.name,
        email: driver.user?.email,
        phone: driver.user?.phone,
        avatar: driver.user?.avatar,
        licenseNumber: driver.licenseNumber,
        status: driver.status.toLowerCase(),
      },
      vehicle: vehicle ? {
        id: vehicle.id,
        plateNumber: vehicle.plateNumber,
        model: vehicle.model,
        capacity: vehicle.capacity,
        status: vehicle.status.toLowerCase(),
        photos: photos,
        // Add vehicle stats from trips
        totalTrips: vehicle.trips.length,
        completedTrips: vehicle.trips.filter((t: Trip) => t.status === 'COMPLETED').length,
        totalDistance: vehicle.trips.reduce((sum: number, t: Trip) => sum + (t.distanceKm || 0), 0),
        totalEarnings: vehicle.trips.reduce((sum: number, t: Trip) => sum + (t.fare || 0), 0),
      } : null,
      stats: {
        todayEarnings: todayIncome,
        todayTrips,
        weekEarnings: weekIncome,
        monthEarnings: monthIncome,
        totalTrips: tripsCompleted,
        fuelLogged: fuelLogged / 150, // Rough estimate: KES 150 per liter
        rating: latestMetrics?.rating || 0,
        rank,
        totalIncome: latestMetrics?.totalIncome || 0,
        totalExpenses: latestMetrics?.totalExpenses || 0,
        netProfit: latestMetrics?.netProfit || 0,
        fuelEfficiency: latestMetrics?.fuelEfficiency || 0,
      },
      recentTrips: driver.trips.slice(0, 10).map((trip: Trip) => ({
        id: trip.id,
        date: trip.startTime.toISOString().split('T')[0],
        startTime: trip.startTime.toLocaleTimeString(),
        endTime: trip.endTime?.toLocaleTimeString() || 'In Progress',
        from: trip.startLocation || 'Unknown',
        to: trip.endLocation || 'Unknown',
        distance: trip.distanceKm || 0,
        earnings: trip.fare || 0,
        status: trip.status.toLowerCase(),
        fuelUsed: trip.distanceKm ? (trip.distanceKm / 8).toFixed(1) : '0',
      })),
      recentIncome: driver.incomeLogs.slice(0, 10).map((log: IncomeLog) => ({
        id: log.id,
        date: log.date.toISOString().split('T')[0],
        amount: log.amount,
        type: log.type.toLowerCase(),
        description: log.description || `${log.type}`,
        tripStart: log.tripStart?.toLocaleTimeString(),
        tripEnd: log.tripEnd?.toLocaleTimeString(),
        distance: log.distanceKm,
      })),
      recentExpenses: driver.expenses.slice(0, 10).map((exp: Expense) => ({
        id: exp.id,
        type: exp.category.toLowerCase(),
        amount: exp.amount,
        date: exp.date.toISOString().split('T')[0],
        description: exp.description,
        status: exp.approved ? 'approved' : 'pending',
      })),
      alerts: driver.alerts.map((alert: Alert) => ({
        id: alert.id,
        title: alert.title,
        description: alert.description,
        severity: alert.severity.toLowerCase(),
        dueDate: alert.dueDate?.toISOString().split('T')[0],
        type: alert.type.toLowerCase(),
      })),
    });

  } catch (error: unknown) {
    console.error('❌ Error in driver profile API:');
    if (error instanceof Error) {
      console.error('   └─ Name:', error.name);
      console.error('   └─ Message:', error.message);
      console.error('   └─ Stack:', error.stack);
      return NextResponse.json(
        { error: error.message || 'Failed to fetch driver profile' },
        { status: 500 }
      );
    }
    console.error('   └─ Unknown error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch driver profile' },
      { status: 500 }
    );
  }
}