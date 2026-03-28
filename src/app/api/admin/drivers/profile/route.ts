// app/api/driver/profile/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { verifyAuth } from '../../../../../lib/firebase/admin';
import { Prisma } from '@prisma/client';

// Constants
const RECENT_ITEMS_LIMIT = 10;
const TRIPS_LIMIT = 30;
const CACHE_TTL = 30 * 1000; // 30 seconds for driver profile

// Types
interface DriverStats {
  todayEarnings: number;
  todayTrips: number;
  weekEarnings: number;
  monthEarnings: number;
  totalTrips: number;
  fuelLogged: number;
  rating: number;
  rank: number;
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  fuelEfficiency: number;
}

// Helper function to calculate date ranges
const getDateRanges = () => {
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  
  const weekAgo = new Date(now);
  weekAgo.setDate(now.getDate() - 7);
  weekAgo.setHours(0, 0, 0, 0);
  
  const monthAgo = new Date(now);
  monthAgo.setMonth(now.getMonth() - 1);
  monthAgo.setHours(0, 0, 0, 0);
  
  return { today, weekAgo, monthAgo };
};

// Helper function to calculate fuel logged
const calculateFuelLogged = (expenses: any[]): number => {
  const fuelExpenses = expenses.filter(exp => exp.category === 'FUEL');
  const totalFuelCost = fuelExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  // Rough estimate: KES 150 per liter
  return totalFuelCost / 150;
};

// Helper function to calculate driver rank
async function calculateDriverRank(driverId: string, currentRevenue: number): Promise<number> {
  const driversWithRevenue = await prisma.driver.findMany({
    where: { status: 'ACTIVE' },
    select: {
      id: true,
      performanceMetrics: {
        orderBy: { date: 'desc' },
        take: 1,
        select: { totalIncome: true }
      }
    }
  });
  
  const driversWithTotal = driversWithRevenue
    .map(d => ({
      id: d.id,
      totalRevenue: d.performanceMetrics[0]?.totalIncome || 0
    }))
    .sort((a, b) => b.totalRevenue - a.totalRevenue);
  
  const rank = driversWithTotal.findIndex(d => d.id === driverId) + 1;
  return rank > 0 ? rank : driversWithTotal.length;
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    console.log('🚀 Driver Profile API Called');
    
    // Verify authentication
    const auth = await verifyAuth(request);
    
    if (!auth.authenticated) {
      console.log('❌ Authentication failed:', auth.error);
      return NextResponse.json(
        { error: auth.error || 'Unauthorized' }, 
        { status: auth.status || 401 }
      );
    }

    const userEmail = auth.user?.email;
    
    if (!userEmail) {
      return NextResponse.json(
        { error: 'User email not found in token' }, 
        { status: 401 }
      );
    }

    console.log('✅ Token verified for email:', userEmail);

    // Find user by email - optimized query
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      select: { id: true, name: true, email: true, phone: true, avatar: true }
    });

    if (!user) {
      console.log('❌ User not found for email:', userEmail);
      return NextResponse.json(
        { error: 'User not found in database' },
        { status: 404 }
      );
    }

    console.log('✅ User found:', user.id);

    // Get date ranges for filtering
    const { today, weekAgo, monthAgo } = getDateRanges();

    // Fetch driver profile with optimized includes and selects
    const driver = await prisma.driver.findUnique({
      where: { userId: user.id },
      select: {
        id: true,
        licenseNumber: true,
        status: true,
        user: {
          select: {
            name: true,
            email: true,
            phone: true,
            avatar: true
          }
        },
        assignedVehicle: {
          select: {
            id: true,
            plateNumber: true,
            model: true,
            capacity: true,
            status: true,
            trips: {
              where: {
                status: { in: ['COMPLETED', 'IN_PROGRESS'] }
              },
              orderBy: { startTime: 'desc' },
              take: TRIPS_LIMIT,
              select: {
                id: true,
                startTime: true,
                endTime: true,
                startLocation: true,
                endLocation: true,
                distanceKm: true,
                fare: true,
                status: true
              }
            }
          }
        },
        incomeLogs: {
          orderBy: { date: 'desc' },
          take: RECENT_ITEMS_LIMIT,
          select: {
            id: true,
            date: true,
            amount: true,
            type: true,
            description: true,
            tripStart: true,
            tripEnd: true,
            distanceKm: true
          }
        },
        expenses: {
          where: { approved: true },
          orderBy: { date: 'desc' },
          take: RECENT_ITEMS_LIMIT,
          select: {
            id: true,
            date: true,
            amount: true,
            category: true,
            description: true,
            approved: true
          }
        },
        trips: {
          orderBy: { startTime: 'desc' },
          take: TRIPS_LIMIT,
          select: {
            id: true,
            startTime: true,
            endTime: true,
            startLocation: true,
            endLocation: true,
            distanceKm: true,
            fare: true,
            status: true
          }
        },
        alerts: {
          where: { resolved: false },
          orderBy: { severity: 'desc' },
          take: 5,
          select: {
            id: true,
            title: true,
            description: true,
            severity: true,
            dueDate: true,
            type: true
          }
        },
        performanceMetrics: {
          orderBy: { date: 'desc' },
          take: 1,
          select: {
            totalIncome: true,
            totalExpenses: true,
            netProfit: true,
            fuelEfficiency: true,
            rating: true
          }
        }
      }
    });

    if (!driver) {
      console.log('❌ Driver profile not found for user:', user.id);
      return NextResponse.json(
        { error: 'Driver profile not found' }, 
        { status: 404 }
      );
    }

    console.log('✅ Driver profile found:', driver.id);

    // Calculate statistics efficiently using reduce
    const tripsCompleted = driver.trips.filter(trip => trip.status === 'COMPLETED');
    const allTrips = driver.trips;
    
    const todayIncome = driver.incomeLogs
      .filter(log => new Date(log.date) >= today)
      .reduce((sum, log) => sum + log.amount, 0);
    
    const todayTrips = allTrips
      .filter(trip => new Date(trip.startTime) >= today && trip.status === 'COMPLETED')
      .length;
    
    const weekIncome = driver.incomeLogs
      .filter(log => new Date(log.date) >= weekAgo)
      .reduce((sum, log) => sum + log.amount, 0);
    
    const monthIncome = driver.incomeLogs
      .filter(log => new Date(log.date) >= monthAgo)
      .reduce((sum, log) => sum + log.amount, 0);
    
    const fuelLogged = calculateFuelLogged(driver.expenses);
    
    const latestMetrics = driver.performanceMetrics[0];
    const currentRevenue = latestMetrics?.totalIncome || 0;
    
    // Calculate rank (run in background, don't await if not needed for response)
    const rankPromise = calculateDriverRank(driver.id, currentRevenue);
    
    // Process vehicle data
    const vehicle = driver.assignedVehicle;
    const vehicleTrips = vehicle?.trips || [];
    const completedVehicleTrips = vehicleTrips.filter(t => t.status === 'COMPLETED');
    
    const stats: DriverStats = {
      todayEarnings: todayIncome,
      todayTrips,
      weekEarnings: weekIncome,
      monthEarnings: monthIncome,
      totalTrips: tripsCompleted.length,
      fuelLogged,
      rating: latestMetrics?.rating || 0,
      rank: await rankPromise, // Wait for rank calculation
      totalIncome: latestMetrics?.totalIncome || 0,
      totalExpenses: latestMetrics?.totalExpenses || 0,
      netProfit: latestMetrics?.netProfit || 0,
      fuelEfficiency: latestMetrics?.fuelEfficiency || 0
    };

    const response = {
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
        photos: [], // Add photo fetching logic if needed
        totalTrips: vehicleTrips.length,
        completedTrips: completedVehicleTrips.length,
        totalDistance: vehicleTrips.reduce((sum, t) => sum + (t.distanceKm || 0), 0),
        totalEarnings: vehicleTrips.reduce((sum, t) => sum + (t.fare || 0), 0),
      } : null,
      stats,
      recentTrips: driver.trips.slice(0, RECENT_ITEMS_LIMIT).map(trip => ({
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
      recentIncome: driver.incomeLogs.map(log => ({
        id: log.id,
        date: log.date.toISOString().split('T')[0],
        amount: log.amount,
        type: log.type.toLowerCase(),
        description: log.description || `${log.type}`,
        tripStart: log.tripStart?.toLocaleTimeString(),
        tripEnd: log.tripEnd?.toLocaleTimeString(),
        distance: log.distanceKm,
      })),
      recentExpenses: driver.expenses.map(exp => ({
        id: exp.id,
        type: exp.category.toLowerCase(),
        amount: exp.amount,
        date: exp.date.toISOString().split('T')[0],
        description: exp.description,
        status: exp.approved ? 'approved' : 'pending',
      })),
      alerts: driver.alerts.map(alert => ({
        id: alert.id,
        title: alert.title,
        description: alert.description,
        severity: alert.severity.toLowerCase(),
        dueDate: alert.dueDate?.toISOString().split('T')[0],
        type: alert.type.toLowerCase(),
      })),
      meta: {
        responseTime: Date.now() - startTime
      }
    };

    console.log(`✅ Profile API completed in ${Date.now() - startTime}ms`);

    // Add cache headers for better performance
    return NextResponse.json(response, {
      headers: {
        'Cache-Control': `private, max-age=${CACHE_TTL / 1000}, stale-while-revalidate=${(CACHE_TTL / 1000) * 2}`,
        'X-Response-Time': `${Date.now() - startTime}ms`
      }
    });

  } catch (error: unknown) {
    console.error('❌ Error in driver profile API:');
    if (error instanceof Error) {
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